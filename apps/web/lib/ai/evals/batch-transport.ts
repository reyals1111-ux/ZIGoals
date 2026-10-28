import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {anthropicBody, anthropicHeaders} from '../adapters/anthropic';
import {estimateCost} from '../pricing';
import type {ChatEvent, ChatRequest} from '../types';

/**
 * Session AI (A1, ADR-034): the Message Batches API as a transport for the real-model harness. Every case runs through
 * the app's own turn code (the read-only tool loop, the repair round, later turns of a conversation) concurrently; each
 * request a case makes is queued here instead of streamed, and once every running case is waiting on a reply the queue
 * goes out as ONE batch (half price, the same cache markers as the app's own request). The batch's results come back
 * as the events the streaming adapter yields (text, tool calls, usage, done), so nothing downstream changes. A tool
 * round or a later turn simply becomes the next batch. The key travels only in the request headers to the API origin.
 */
const ORIGIN = 'https://api.anthropic.com';
type BatchResult = {type: string; message?: {content: {type: string; text?: string; id?: string; name?: string; input?: unknown}[]; usage?: Record<string, number>; stop_reason?: string | null}; error?: unknown};
type Pending = {id: string; params: Record<string, unknown>; resolve: (r: BatchResult) => void; reject: (e: Error) => void};
export type BatchLog = {batchId: string; requests: number; costUsd: number; wallMs: number};
const KEY_PATTERN = new RegExp(`${['sk', 'ant', ''].join('-')}[A-Za-z0-9_-]+`, 'g');
export const redact = (text: string) => text.replace(KEY_PATTERN, '***');

export class BatchQueue {
  private pending: Pending[] = [];
  private active = 0;
  private seq = 0;
  private flushing = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  readonly batches: BatchLog[] = [];
  spentUsd = 0;
  constructor(private readonly opts: {key: string; model: string; pollMs?: number; capUsd?: number; forecastPerRequest?: number; log?: (line: string) => void;
    /** Each ended batch's own usage is written here at once (`batch-<id>.json`, the ledger's batch-file shape), so a run that
     * stops early still leaves its spend on the ledger; the run file then says its cost is counted in these files. */
    recordDir?: string}) {}
  /** A case starts: the queue waits for it before sending a batch. */
  enter() { this.active++; }
  /** A case ends: it no longer holds the batch back. */
  leave() { this.active--; this.schedule(); }
  /** The streaming adapter's interface, served from a batch. */
  stream = (request: ChatRequest): AsyncGenerator<ChatEvent> => this.serve(request);
  private async *serve(request: ChatRequest): AsyncGenerator<ChatEvent> {
    const {stream: _stream, ...params} = anthropicBody(request, {effort: true}); void _stream;
    const result = await new Promise<BatchResult>((resolve, reject) => { this.pending.push({id: `r${++this.seq}`, params, resolve, reject}); this.schedule(); });
    if (result.type !== 'succeeded' || !result.message) {
      const detail = (result.error as {error?: {message?: string}} | undefined)?.error?.message;
      throw new Error(`batch result ${result.type}${detail ? `: ${redact(String(detail)).slice(0, 160)}` : ''}`);
    }
    const u = result.message.usage ?? {};
    for (const block of result.message.content) {
      if (block.type === 'text' && block.text) yield {type: 'text', delta: block.text};
      else if (block.type === 'tool_use' && block.name) yield {type: 'tool-call', call: {id: block.id ?? `toolu_${this.seq}`, name: block.name, arguments: JSON.stringify(block.input ?? {})}};
    }
    yield {type: 'usage', input: u.input_tokens ?? null, output: u.output_tokens ?? null, ...(u.cache_creation_input_tokens != null ? {cacheWrite: u.cache_creation_input_tokens} : {}), ...(u.cache_read_input_tokens != null ? {cacheRead: u.cache_read_input_tokens} : {})};
    yield {type: 'done', reason: result.message.stop_reason ?? null};
  }
  private schedule() {
    if (this.timer) clearTimeout(this.timer);
    // A short pause lets every case that is about to ask (after a quick local tool round) join the same batch.
    this.timer = setTimeout(() => { this.timer = null; void this.flush(); }, 200);
  }
  private async flush() {
    if (this.flushing || !this.pending.length || this.pending.length < this.active) return;
    this.flushing = true;
    const batch = this.pending.splice(0);
    try {
      const forecast = batch.length * (this.opts.forecastPerRequest ?? 0);
      if (this.opts.capUsd && this.spentUsd + forecast > this.opts.capUsd) throw new Error(`capped: $${this.spentUsd.toFixed(4)} spent, the next batch's forecast $${forecast.toFixed(4)} would pass the cap $${this.opts.capUsd.toFixed(2)}`);
      const results = await this.send(batch);
      for (const p of batch) p.resolve(results.get(p.id) ?? {type: 'missing'});
    } catch (e) {
      const error = e instanceof Error ? new Error(redact(e.message)) : new Error('batch failed');
      for (const p of batch) p.reject(error);
    } finally { this.flushing = false; if (this.pending.length) this.schedule(); }
  }
  private async send(batch: Pending[]): Promise<Map<string, BatchResult>> {
    const headers = {...anthropicHeaders(this.opts.key), 'content-type': 'application/json', accept: 'application/json'};
    const started = Date.now();
    const created = await fetch(`${ORIGIN}/v1/messages/batches`, {method: 'POST', headers, body: JSON.stringify({requests: batch.map(p => ({custom_id: p.id, params: p.params}))})});
    if (!created.ok) throw new Error(`batch create → ${created.status} ${redact((await created.text().catch(() => '')).slice(0, 200))}`);
    const batchId = (JSON.parse(await created.text()) as {id: string}).id;
    this.opts.log?.(`batch ${batchId}: ${batch.length} requests submitted`);
    for (let status = 'in_progress'; status !== 'ended';) {
      await new Promise(r => setTimeout(r, this.opts.pollMs ?? 15_000));
      const res = await fetch(`${ORIGIN}/v1/messages/batches/${batchId}`, {headers});
      if (!res.ok) throw new Error(`batch status → ${res.status}`);
      const b = JSON.parse(await res.text()) as {processing_status: string; request_counts: Record<string, number>};
      status = b.processing_status;
      if (status !== 'ended') this.opts.log?.(`batch ${batchId}: ${status} ${JSON.stringify(b.request_counts)}`);
    }
    const res = await fetch(`${ORIGIN}/v1/messages/batches/${batchId}/results`, {headers});
    if (!res.ok) throw new Error(`batch results → ${res.status}`);
    const rows = new Map((await res.text()).split('\n').filter(Boolean).map(l => JSON.parse(l) as {custom_id: string; result: BatchResult}).map(r => [r.custom_id, r.result] as const));
    let cost = 0;
    const tokens = {input: 0, output: 0, cacheWrite: 0, cacheRead: 0};
    for (const r of rows.values()) {
      const u = r.message?.usage; if (!u) continue;
      const usage = {input: u.input_tokens ?? 0, output: u.output_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0};
      tokens.input += usage.input; tokens.output += usage.output; tokens.cacheWrite += usage.cacheWrite; tokens.cacheRead += usage.cacheRead;
      cost += estimateCost(this.opts.model, usage, {batch: true}) ?? 0;
    }
    if (this.opts.recordDir) {
      // Priced per request here; the file's own token sums are priced once by the ledger (equal unless Haiku's long-prompt card applies).
      mkdirSync(this.opts.recordDir, {recursive: true});
      writeFileSync(join(this.opts.recordDir, `batch-${batchId}.json`), JSON.stringify({summary: {provider: 'anthropic', model: this.opts.model, batch: true, batchId, requests: rows.size, tokens, costUsd: cost, endedAt: new Date().toISOString()}}, null, 1));
    }
    this.spentUsd += cost;
    const log = {batchId, requests: batch.length, costUsd: cost, wallMs: Date.now() - started};
    this.batches.push(log);
    this.opts.log?.(`batch ${batchId}: ended, ${batch.length} requests, $${cost.toFixed(4)}, ${Math.round(log.wallMs / 1000)} s`);
    return rows;
  }
}
