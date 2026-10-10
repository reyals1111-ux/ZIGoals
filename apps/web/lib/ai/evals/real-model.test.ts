import {mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {streamChat} from '../chat';
import {parseReply} from '../actions/parse';
import {fenceStructured, needsRepair, repairPrompt, structuredFormat} from '../actions/repair';
import {applyDayCue} from '../actions/day-cue';
import {reviseEdits} from '../actions/revise';
import {stripDeclinedBlocks} from '../actions/decline';
import {detectIntent, refusedBlocksMayRepair, wantsCard} from '../intent';
import {buildSystemParts} from '../context/specialists';
import {buildPageContext, type BuilderInput} from '../context/builders';
import {consent} from '../context/consent';
type PageContext = ReturnType<typeof buildPageContext>;
import {emptyWeeklyReview} from '../../weekly-review/schema';
import type {PageArea} from '../settings';
import {questionContext} from '../context/question';
import {Handles} from '../handles';
import {localAnswer} from '../local-answers/engine';
import {listModels} from '../models';
import {PRICES_AS_OF, estimateCost} from '../pricing';
import {anthropicBody, anthropicHeaders} from '../adapters/anthropic';
import {runWithTools} from '../tool-loop';
import {toolEnv, type ToolSources} from '../tools/env';
import {DAY, gatesFor, sentinelsIn, settingsWith, showcaseSources, withHandHealth, withPortfolios, withSentinels} from '../tools/fixtures';
import {runTool} from '../tools/registry';
import type {ChatEvent, ChatMessage, ChatRequest} from '../types';
import {SPOKEN} from './corpus-spoken';
import {CORPUS, IMPORTANT, type ModelCase} from './corpus';
import {goldenSources} from './run';
import {factNumbers, score, type Call, type Observed, type Score} from './score';

/**
 * The real-model harness (Session X-Local Part 6c): the corpus through the app's own pipeline (the system prompt with
 * the page's specialist, the question-aware context, the read-only tool loop, the whitelist parser) against a real
 * model, scored by `score.ts`. It never runs by itself: only with ZIGI_REAL_MODEL=1 and a model in the environment,
 * from the owner's machines, on fictional records only. Results are written as JSON (and the Markdown summary is built
 * from them) under ZIGI_OUT.
 *
 * Local models over the Ollama wire (X-Local):
 *   ZIGI_REAL_MODEL=1 ZIGI_MODEL_BASE=http://127.0.0.1:11435 ZIGI_MODEL=gemma4:12b ZIGI_HOST="RTX 5090" \
 *   ZIGI_CASES=all|important|ids:<id,id,…>|<id regex> ZIGI_LIMIT=<n> ZIGI_REPEAT=1 ZIGI_DATA_MODE=tools|attach ZIGI_OUT=<the runs worktree's real-model folder> \
 *   pnpm exec vitest run apps/web/lib/ai/evals/real-model.test.ts
 * Real Claude (Session Z-Local Part 2): ZIGI_PROVIDER=anthropic ZIGI_MODEL=claude-sonnet-5-5, the key as ANTHROPIC_TEST_KEY
 * in this process's environment only (never an argument, never written anywhere; a run whose model is not in the key's
 * /v1/models list stops before any case). ZIGI_NO_CACHE=1 sends no cache marker (Part 3's "before" measurement).
 * Every turn records its usage (input, output, cache writes and reads: thinking tokens are output) and its cost at the
 * dated price table (`lib/ai/pricing.ts`), so the API ledger is summed from these files.
 */
const env = process.env, enabled = env.ZIGI_REAL_MODEL === '1';
const PROVIDER: 'local' | 'anthropic' = env.ZIGI_PROVIDER === 'anthropic' ? 'anthropic' : 'local';
const BASE = env.ZIGI_MODEL_BASE ?? 'http://127.0.0.1:11435', MODEL = env.ZIGI_MODEL ?? '', HOST = env.ZIGI_HOST ?? (PROVIDER === 'anthropic' ? 'Anthropic API' : 'unknown host'), REPEAT = Math.max(1, Number(env.ZIGI_REPEAT ?? '1'));
const MODE = env.ZIGI_DATA_MODE === 'attach' ? 'attach' : 'tools', OUT = env.ZIGI_OUT ?? join(tmpdir(), 'zigoals-real-model'), FILTER = env.ZIGI_CASES ?? 'important', LIMIT = Number(env.ZIGI_LIMIT ?? '0');
const TIMEOUT_MS = Number(env.ZIGI_CASE_TIMEOUT_MS ?? '180000'), THINK = env.ZIGI_THINK === '1', NO_CACHE = env.ZIGI_NO_CACHE === '1';
/**
 * Session Z-Local Part 8: ZIGI_BATCH=1 sends every selected case's FIRST turn as one request of a Message Batch (real Claude,
 * attach mode, no tools, no repair round) and scores the replies when the batch ends: the monthly evaluation's mode, at
 * half price. Multi-turn cases contribute their first turn only; local-first cases are scored on the device as always.
 */
const BATCH = env.ZIGI_BATCH === '1' && PROVIDER === 'anthropic';
/**
 * Session Z-Local Part 6 (ADR-020 L23): ZIGI_PAGE_CONTEXT=1 sends the page's own records with stable handles on every turn,
 * as the app does (`use-chat-session` passes the page context and seeds the tool handles with the page's), so a long chat
 * keeps h1 = the same habit from turn to turn. Off by default so a round's corpus stages stay comparable; on for the
 * fix rounds and the final runs, and recorded in each file's summary and name.
 */
const PAGE = env.ZIGI_PAGE_CONTEXT === '1';
const pathFor = (page: PageArea) => `/app/${page === 'today' ? '' : page}`;
function pageFor(c: ModelCase, sources: ToolSources, health: boolean): PageContext {
  const input: BuilderInput = {area: c.page, pathname: pathFor(c.page), consent: consent({settings: settingsWith(health), area: c.page, pathname: pathFor(c.page), layoutHasHealth: true, accountActive: false, accountHealthPermitted: null}), now: sources.now, habitDay: sources.habitDay, healthDay: sources.healthDay,
    habits: sources.habits, health: sources.health, fasting: sources.fasting, platform: sources.platform, localGoals: sources.localGoals, metadata: sources.metadata, quotes: sources.quotes,
    portfolio: sources.portfolio ? {data: sources.portfolio.data, priceOf: coin => sources.portfolio!.priceOf(coin, 'USD')?.price} : null, week: c.page === 'today' ? {weekStart: '2026-09-29', weekEnd: sources.habitDay, review: sources.weekly ?? emptyWeeklyReview()} : null};
  return buildPageContext(input, new Handles([]));
}
/** The key for the real-Claude mode, read once from this process's environment; never printed, never stored. */
const KEY = PROVIDER === 'anthropic' ? env.ANTHROPIC_TEST_KEY ?? null : null;
/** Session Z-Local Part 4: `ZIGI_SET=spoken` runs the held-out spoken corpus instead of the typed one (same scorer, same harness). */
const SET: readonly ModelCase[] = env.ZIGI_SET === 'spoken' ? SPOKEN : CORPUS;
const selected = (): ModelCase[] => {
  const all = FILTER === 'all' ? [...SET] : FILTER === 'important' ? [...(env.ZIGI_SET === 'spoken' ? SPOKEN.filter(c => c.important) : IMPORTANT)] : FILTER.startsWith('ids:') ? FILTER.slice(4).split(',').map(id => id.trim()).filter(Boolean).map(id => SET.find(c => c.id === id)).filter((c): c is ModelCase => !!c) : SET.filter(c => new RegExp(FILTER).test(c.id));
  return LIMIT > 0 ? all.slice(0, LIMIT) : all;
};
export type Tokens = {input: number | null; output: number | null; cacheWrite: number | null; cacheRead: number | null};
export type CaseRun = {id: string; repeat: number; kind: string; area: string; lang: string; turn: number; pass: boolean; checks: Score['checks']; cards: number; rejected: number; hint: string | null; refused: boolean; firstTokenMs: number | null; totalMs: number; tokens: Tokens; requests: number; costUsd: number | null; calls: Call[]; repaired?: boolean; reply: string; error: string | null};
const emptyTokens = (): Tokens => ({input: null, output: null, cacheWrite: null, cacheRead: null});
/** The counts of one request added to a turn's totals (a tool loop and the repair round make several requests). */
function addUsage(total: Tokens, event: Extract<ChatEvent, {type: 'usage'}>): Tokens {
  const sum = (a: number | null, b: number | null | undefined) => b === null || b === undefined ? a : (a ?? 0) + b;
  return {input: sum(total.input, event.input), output: sum(total.output, event.output), cacheWrite: sum(total.cacheWrite, event.cacheWrite), cacheRead: sum(total.cacheRead, event.cacheRead)};
}
function sourcesFor(c: ModelCase): ToolSources {
  let s = withPortfolios(withHandHealth(showcaseSources()));
  if (c.sentinels) s = withSentinels(s);
  return goldenSources(s);
}
async function runTurn(c: ModelCase, ask: string, history: ChatMessage[], sources: ToolSources, page: PageContext | null): Promise<{observed: Observed; reply: string; repaired: boolean; firstTokenMs: number | null; totalMs: number; tokens: Tokens; requests: number; error: string | null}> {
  const health = c.health !== 'closed', gates = gatesFor(health, c.page, `/app/${c.page === 'today' ? '' : c.page}`, {settings: settingsWith(health)});
  const toolHandles = new Handles(page?.handles ?? []), provider = toolEnv(sources, gates, 'provider', toolHandles), local = toolEnv(sources, gates, 'local');
  const context = questionContext(ask, sources, gates, page?.handles ?? []);
  // Session X-Local Phase 2 (P2.2a): tools mode carries the question-chosen records too, exactly as the app does
  // (`use-chat-session` passes the page context with `tools: true`); the router's own pre-run calls count as calls, since
  // the device made them for this question. Before this the harness measured a configuration the app never uses (tools
  // and no records), and punished every lookup the app would have answered from its pre-run records.
  const contextText = context?.text ?? null;
  const prerun: Call[] = MODE === 'tools' ? (context?.sources ?? []).filter(src => src.call.tool !== 'about_me').map(src => ({name: src.call.tool, args: (src.call.args ?? null) as Record<string, unknown> | null, accepted: true})) : [];
  // Session Z-Local Part 3: the prompt in blocks (the stable prefix cached on the Anthropic wire), the same string as before.
  const parts = buildSystemParts({area: c.page, context: contextText, customInstructions: '', providerName: PROVIDER === 'anthropic' ? 'Anthropic' : 'Ollama', tools: MODE === 'tools', today: DAY, healthShared: health, pageContext: page?.text || null});
  const system = parts.prompt;
  const messages: ChatMessage[] = [...history, {role: 'user', content: ask}];
  const calls: Call[] = [...prerun], started = Date.now(); let first: number | null = null, reply = '', tokens = emptyTokens(), requests = 0, error: string | null = null;
  // ZIGI_THINK=1 lets a thinking model think (the app's "Think deeper"); the default is the app's quick reply (think off on
  // Ollama, effort low on Claude).
  const wire: ChatRequest = PROVIDER === 'anthropic'
    ? {provider: 'anthropic', model: MODEL, system, ...(NO_CACHE ? {cache: false} : {systemBlocks: parts.blocks}), messages, maxOutputTokens: 1024, key: KEY, signal: AbortSignal.timeout(TIMEOUT_MS), think: THINK}
    : {provider: 'local', localServer: 'ollama', model: MODEL, system, messages, maxOutputTokens: 1024, key: null, baseUrl: BASE, signal: AbortSignal.timeout(TIMEOUT_MS), think: THINK};
  const counted = async function* (r: ChatRequest) { let seen = false; for await (const event of streamChat(r)) { if (!seen) { seen = true; requests++; } yield event; } };
  try {
    if (MODE === 'tools') {
      for await (const event of runWithTools({...wire, env: provider, stream: counted})) {
        if (event.type === 'text') { if (first === null) first = Date.now() - started; reply += event.delta; }
        else if (event.type === 'usage') tokens = {input: event.input, output: event.output, cacheWrite: event.cacheWrite ?? null, cacheRead: event.cacheRead ?? null};
        else if (event.type === 'tool-result') calls.push({name: event.call.name, args: event.args, accepted: !('error' in event.result && event.result.error)});
      }
    } else {
      for await (const event of counted(wire)) {
        if (event.type === 'text') { if (first === null) first = Date.now() - started; reply += event.delta; }
        else if (event.type === 'usage') tokens = {input: event.input, output: event.output, cacheWrite: event.cacheWrite ?? null, cacheRead: event.cacheRead ?? null};
      }
    }
  } catch (e) { error = e instanceof Error ? e.message : String(e); }
  // Session X-Local Phase 2 (P2.2b): the app's one bounded repair round, here too, so the harness measures what the app
  // does: a card asked for and none given (or every block refused) gets one more ask, with Ollama's structured output
  // (the other wires get the plain retry, as in the app).
  let repaired = false;
  if (!error && reply.trim()) {
    const first = parseReply(reply), intent = detectIntent(ask);
    if (needsRepair(first, {askedForCard: wantsCard(intent, reply), refusedMayRepair: refusedBlocksMayRepair(intent, reply)})) {
      const again: ChatMessage[] = [...messages, {role: 'assistant', content: reply}, {role: 'user', content: repairPrompt(first)}];
      let second = '';
      try { for await (const event of counted({...wire, messages: again, ...(PROVIDER === 'local' ? {format: structuredFormat()} : {})})) { if (event.type === 'text') second += event.delta; else if (event.type === 'usage') tokens = addUsage(tokens, event); } } catch { second = ''; }
      if (second.trim()) { reply = fenceStructured(second); repaired = true; }
    }
    // Round 6 (ADR-017 S69), as the app does: the message's own day for a log card that said today.
    reply = applyDayCue(reply, ask, DAY);
    // Round 8 (ADR-017 S74), as the app does: a correction of a card that was only proposed becomes that card again, corrected.
    reply = reviseEdits(reply, [...history].reverse().find(m => m.role === 'assistant')?.content ?? null, [...(page?.handles ?? []), ...(context?.handles ?? []), ...toolHandles.list]);
    // Round 9 (ADR-017 S75), as the app does: a money ask the reply declines in words carries no card.
    reply = stripDeclinedBlocks(reply, ask);
  }
  const totalMs = Date.now() - started;
  // Facts from the device's own tools, for the same question; the local-first answer from the lookup engine.
  const facts = (c.expect.facts ?? []).map(fact => { const result = runTool(fact.tool, fact.args ?? {}, local); return {fact, numbers: factNumbers(result).slice(0, fact.pick === 'first' ? 1 : 6), text: JSON.stringify(result)}; });
  const localReply = localAnswer(ask, local), sentinelsSeen = c.sentinels ? sentinelsIn(system + JSON.stringify(messages) + reply + JSON.stringify(calls)) : undefined;
  return {observed: {text: reply, calls, facts, local: {answered: localReply.kind !== 'none'}, sentinelsSeen, pageArea: PAGE ? c.page : undefined}, reply, repaired, firstTokenMs: first, totalMs, tokens, requests, error};
}
const BATCH_ORIGIN = 'https://api.anthropic.com';
async function runBatch(cases: ModelCase[]): Promise<{runs: CaseRun[]; batchId: string; wallMs: number}> {
  type Prepared = {c: ModelCase; ask: string; sources: ToolSources; context: ReturnType<typeof questionContext>; page: PageContext | null; system: string; params: Record<string, unknown>};
  const prepared: Prepared[] = [], runs: CaseRun[] = [];
  for (const c of cases) {
    const sources = sourcesFor(c), ask = c.ask;
    if (c.expect.localFirst) {
      const local = toolEnv(sources, gatesFor(c.health !== 'closed', c.page), 'local'), reply = localAnswer(ask, local);
      const s = score(c.expect, {text: reply.kind === 'none' ? '' : reply.text, calls: [], local: {answered: reply.kind !== 'none'}, sentinelsSeen: c.sentinels ? sentinelsIn(reply.kind === 'none' ? '' : reply.text) : undefined});
      runs.push({id: c.id, repeat: 1, kind: c.kind, area: c.area, lang: c.lang, turn: 0, pass: s.pass, checks: s.checks, cards: s.cards, rejected: s.rejected, hint: s.hint, refused: s.refused, firstTokenMs: 0, totalMs: 0, tokens: {input: 0, output: 0, cacheWrite: 0, cacheRead: 0}, requests: 0, costUsd: 0, calls: [], reply: reply.kind === 'none' ? '' : reply.text, repaired: false, error: null});
      continue;
    }
    const health = c.health !== 'closed', gates = gatesFor(health, c.page, `/app/${c.page === 'today' ? '' : c.page}`, {settings: settingsWith(health)});
    const page = PAGE ? pageFor(c, sources, health) : null, context = questionContext(ask, sources, gates, page?.handles ?? []);
    const parts = buildSystemParts({area: c.page, context: context?.text ?? null, customInstructions: '', providerName: 'Anthropic', tools: false, today: DAY, healthShared: health, pageContext: page?.text || null});
    // The adapter's body minus `stream` (the Batches API refuses it); everything else (cache markers, effort) is the app's own request.
    const {stream: _stream, ...params} = anthropicBody({model: MODEL, system: parts.prompt, ...(NO_CACHE ? {cache: false} : {systemBlocks: parts.blocks}), messages: [{role: 'user', content: ask}], maxOutputTokens: 1024, think: THINK}, {effort: true}); void _stream;
    prepared.push({c, ask, sources, context, page, system: parts.prompt, params});
  }
  // The cap (ZIGI_MAX_USD, Part 8): the forecast at batch prices, ~12,000 prompt and ~300 output tokens per case with a 25 % margin, is refused before anything is submitted.
  const cap = Number(env.ZIGI_MAX_USD ?? '0'), forecast = 1.25 * prepared.length * (estimateCost(MODEL, {input: 12_000, output: 300, cacheWrite: 0, cacheRead: 0}, {batch: true}) ?? 0);
  console.info(`batch forecast: ${prepared.length} requests ≈ $${forecast.toFixed(2)} at batch prices${cap > 0 ? ` (cap $${cap.toFixed(2)})` : ''}`);
  if (cap > 0 && forecast > cap) throw new Error(`refused: the batch forecast $${forecast.toFixed(2)} is over the cap $${cap.toFixed(2)}; nothing was submitted`);
  const headers = {...anthropicHeaders(KEY), 'content-type': 'application/json'};
  const started = Date.now();
  const created = await fetch(`${BATCH_ORIGIN}/v1/messages/batches`, {method: 'POST', headers, body: JSON.stringify({requests: prepared.map(p => ({custom_id: p.c.id.slice(0, 64), params: p.params}))})});
  if (!created.ok) throw new Error(`batch create → ${created.status}`);
  const batchId = (JSON.parse(await created.text()) as {id: string}).id;
  console.info(`batch ${batchId}: ${prepared.length} requests submitted; polling every 30 s`);
  let status = 'in_progress';
  while (status !== 'ended') {
    await new Promise(r => setTimeout(r, 30_000));
    const res = await fetch(`${BATCH_ORIGIN}/v1/messages/batches/${batchId}`, {headers});
    if (!res.ok) throw new Error(`batch status → ${res.status}`);
    const b = JSON.parse(await res.text()) as {processing_status: string; request_counts: Record<string, number>};
    status = b.processing_status; console.info(`batch ${batchId}: ${status} ${JSON.stringify(b.request_counts)}`);
  }
  const results = await fetch(`${BATCH_ORIGIN}/v1/messages/batches/${batchId}/results`, {headers});
  if (!results.ok) throw new Error(`batch results → ${results.status}`);
  const wallMs = Date.now() - started;
  const rows = new Map((await results.text()).split('\n').filter(Boolean).map(l => JSON.parse(l) as {custom_id: string; result: {type: string; message?: {content: {type: string; text?: string}[]; usage?: Record<string, number>}; error?: unknown}}).map(r => [r.custom_id, r.result] as const));
  for (const p of prepared) {
    const result = rows.get(p.c.id.slice(0, 64)), local = toolEnv(p.sources, gatesFor(p.c.health !== 'closed', p.c.page, `/app/${p.c.page === 'today' ? '' : p.c.page}`, {settings: settingsWith(p.c.health !== 'closed')}), 'local');
    let reply = '', error: string | null = null, tokens = emptyTokens();
    if (!result) error = 'no result in the batch';
    else if (result.type !== 'succeeded' || !result.message) error = `batch result ${result.type}${(result.error as {error?: {message?: string}} | undefined)?.error?.message ? `: ${String((result.error as {error?: {message?: string}}).error?.message).replace(new RegExp(`${['sk', 'ant', ''].join('-')}[A-Za-z0-9_-]+`, 'g'), '***').slice(0, 160)}` : ''}`;
    else {
      reply = result.message.content.filter(b => b.type === 'text').map(b => b.text ?? '').join('');
      const u = result.message.usage ?? {};
      tokens = {input: u.input_tokens ?? null, output: u.output_tokens ?? null, cacheWrite: u.cache_creation_input_tokens ?? null, cacheRead: u.cache_read_input_tokens ?? null};
      reply = stripDeclinedBlocks(reviseEdits(applyDayCue(reply, p.ask, DAY), null, [...(p.page?.handles ?? []), ...(p.context?.handles ?? [])]), p.ask);
    }
    const facts = (p.c.expect.facts ?? []).map(fact => { const r = runTool(fact.tool, fact.args ?? {}, local); return {fact, numbers: factNumbers(r).slice(0, fact.pick === 'first' ? 1 : 6), text: JSON.stringify(r)}; });
    const localReply = localAnswer(p.ask, local), sentinelsSeen = p.c.sentinels ? sentinelsIn(p.system + p.ask + reply) : undefined;
    const {tools: _tools, toolsNot: _toolsNot, ...withoutTools} = p.c.expect; void _tools; void _toolsNot;
    const s = score(withoutTools, {text: reply, calls: [], facts, local: {answered: localReply.kind !== 'none'}, sentinelsSeen});
    const costUsd = estimateCost(MODEL, tokens, {batch: true});
    runs.push({id: p.c.id, repeat: 1, kind: p.c.kind, area: p.c.area, lang: p.c.lang, turn: 0, pass: s.pass && !error, checks: error ? [...s.checks, {name: 'error', pass: false, detail: error}] : s.checks, cards: s.cards, rejected: s.rejected, hint: s.hint, refused: s.refused, firstTokenMs: null, totalMs: wallMs, tokens, requests: 1, costUsd, calls: [], reply, repaired: false, error});
    console.info(`${s.pass && !error ? 'PASS' : 'FAIL'} ${p.c.id} batch $${(costUsd ?? 0).toFixed(4)}${error ? ` ERROR ${error}` : ''}`);
  }
  return {runs, batchId, wallMs};
}
describe.skipIf(!enabled || !MODEL)('ZIGi against a real model (owner machines only)', () => {
  const cases = selected();
  test(`${cases.length} cases × ${REPEAT} on ${MODEL} (${HOST}, ${MODE}${NO_CACHE ? ', no cache' : ''})`, async () => {
    if (PROVIDER === 'anthropic') {
      // The exact model id must be one the key can reach (the brief: ids from /v1/models); the list never names the key.
      if (!KEY) throw new Error('ANTHROPIC_TEST_KEY is not in this process\'s environment.');
      const ids = (await listModels({provider: 'anthropic', key: KEY})).map(m => m.id);
      if (!ids.includes(MODEL)) throw new Error(`Model ${MODEL} is not in the key's model list (${ids.filter(id => /^claude-/.test(id)).slice(0, 12).join(', ')}).`);
    }
    const runs: CaseRun[] = [], startedAt = new Date().toISOString();
    let batchId: string | null = null;
    if (BATCH) { const b = await runBatch(cases); runs.push(...b.runs); batchId = b.batchId; }
    else for (const c of cases) for (let repeat = 1; repeat <= REPEAT; repeat++) {
      const sources = sourcesFor(c), history: ChatMessage[] = [], page = PAGE ? pageFor(c, sources, c.health !== 'closed') : null;
      const turns = [{ask: c.ask, expect: c.expect}, ...(c.turns ?? [])];
      for (let t = 0; t < turns.length; t++) {
        const turn = turns[t]!;
        // A local-first case is scored on the device alone: the model is never called for it.
        if (turn.expect.localFirst) {
          const local = toolEnv(sources, gatesFor(c.health !== 'closed', c.page), 'local'), reply = localAnswer(turn.ask, local);
          const s = score(turn.expect, {text: reply.kind === 'none' ? '' : reply.text, calls: [], local: {answered: reply.kind !== 'none'}, sentinelsSeen: c.sentinels ? sentinelsIn(reply.kind === 'none' ? '' : reply.text) : undefined});
          runs.push({id: c.id, repeat, kind: c.kind, area: c.area, lang: c.lang, turn: t, pass: s.pass, checks: s.checks, cards: s.cards, rejected: s.rejected, hint: s.hint, refused: s.refused, firstTokenMs: 0, totalMs: 0, tokens: {input: 0, output: 0, cacheWrite: 0, cacheRead: 0}, requests: 0, costUsd: 0, calls: [], reply: reply.kind === 'none' ? '' : reply.text, error: null});
          continue;
        }
        const r = await runTurn(c, turn.ask, history, sources, page);
        // Attach mode has no tools to call: the expected-tool checks do not apply there (the records are in the prompt).
        const {tools: _tools, toolsNot: _toolsNot, ...withoutTools} = turn.expect; void _tools; void _toolsNot;
        const s = score(MODE === 'attach' ? withoutTools : turn.expect, r.observed);
        const costUsd = PROVIDER === 'anthropic' ? estimateCost(MODEL, r.tokens) : null;
        runs.push({id: c.id, repeat, kind: c.kind, area: c.area, lang: c.lang, turn: t, pass: s.pass && !r.error, checks: r.error ? [...s.checks, {name: 'error', pass: false, detail: r.error}] : s.checks, cards: s.cards, rejected: s.rejected, hint: s.hint, refused: s.refused, firstTokenMs: r.firstTokenMs, totalMs: r.totalMs, tokens: r.tokens, requests: r.requests, costUsd, calls: [...r.observed.calls], reply: r.reply.slice(0, 4000), repaired: r.repaired, error: r.error});
        history.push({role: 'user', content: turn.ask}, {role: 'assistant', content: r.reply});
        console.info(`${s.pass && !r.error ? 'PASS' : 'FAIL'} ${c.id}${t ? `/t${t}` : ''}${REPEAT > 1 ? ` #${repeat}` : ''} ${r.totalMs} ms${costUsd !== null ? ` $${costUsd.toFixed(4)}` : ''}${r.error ? ` ERROR ${r.error.slice(0, 80)}` : ''}${s.pass ? '' : ` [${s.checks.filter(x => !x.pass).map(x => `${x.name}${x.detail ? `: ${x.detail.slice(0, 60)}` : ''}`).join('; ')}]`}`);
      }
    }
    const passed = runs.filter(r => r.pass).length, byKind: Record<string, {passed: number; total: number}> = {};
    for (const r of runs) { byKind[r.kind] ??= {passed: 0, total: 0}; byKind[r.kind]!.total++; if (r.pass) byKind[r.kind]!.passed++; }
    const timed = runs.filter(r => r.totalMs > 0), median = (xs: number[]) => xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]! : null;
    const sumOf = (pick: (r: CaseRun) => number | null) => timed.reduce((s, r) => s + (pick(r) ?? 0), 0);
    const summary = {provider: PROVIDER, model: MODEL, host: HOST, mode: MODE, think: THINK, cache: PROVIDER === 'anthropic' ? !NO_CACHE : null, base: 'redacted', pageContext: PAGE, set: env.ZIGI_SET === 'spoken' ? 'spoken' : 'typed', ...(BATCH ? {batch: true, batchId} : {}), startedAt, finishedAt: new Date().toISOString(), cases: cases.length, repeat: REPEAT, runs: runs.length, passed, rate: runs.length ? passed / runs.length : 0, byKind,
      latency: {firstTokenMedianMs: median(timed.map(r => r.firstTokenMs ?? 0)), totalMedianMs: median(timed.map(r => r.totalMs))},
      tokens: {input: sumOf(r => r.tokens.input), output: sumOf(r => r.tokens.output), cacheWrite: sumOf(r => r.tokens.cacheWrite), cacheRead: sumOf(r => r.tokens.cacheRead)}, requests: sumOf(r => r.requests),
      costUsd: PROVIDER === 'anthropic' ? sumOf(r => r.costUsd) : null, pricesAsOf: PROVIDER === 'anthropic' ? PRICES_AS_OF : null, unreported: timed.filter(r => r.tokens.input === null && r.tokens.output === null && !r.error).length};
    mkdirSync(OUT, {recursive: true});
    const stamp = startedAt.replace(/[:.]/g, '-'), file = join(OUT, `${HOST.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${MODEL.replace(/[^a-z0-9.]+/gi, '-')}-${MODE}${THINK ? '-think' : ''}${NO_CACHE ? '-nocache' : ''}${PAGE ? '-page' : ''}${env.ZIGI_SET === 'spoken' ? '-spoken' : ''}-${FILTER === 'all' ? 'all' : FILTER === 'important' ? 'important' : 'subset'}${LIMIT ? `-${LIMIT}` : ''}-${stamp}.json`);
    writeFileSync(file, JSON.stringify({summary, runs}, null, 1));
    console.info(`ZIGi real model: ${passed}/${runs.length} (${(summary.rate * 100).toFixed(1)}%) on ${MODEL} @ ${HOST}; first token median ${summary.latency.firstTokenMedianMs} ms, total median ${summary.latency.totalMedianMs} ms${summary.costUsd !== null ? `; cost $${summary.costUsd.toFixed(4)}` : ''}; written to ${file}`);
    expect(runs.length).toBeGreaterThan(0);
  }, 24 * 60 * 60 * 1000);
});
