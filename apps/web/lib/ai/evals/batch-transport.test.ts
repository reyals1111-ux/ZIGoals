import {mkdtempSync, readdirSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, describe, expect, test, vi} from 'vitest';
import {BatchQueue, redact} from './batch-transport';
import type {ChatEvent, ChatRequest} from '../types';

/** Session AI (A1): the batch transport against a mocked Message Batches API (no key, no network). */
const request = (text: string): ChatRequest => ({provider: 'anthropic', model: 'claude-haiku-5-5', system: 'S', messages: [{role: 'user', content: text}], maxOutputTokens: 64, key: 'test-key'});
const drain = async (events: AsyncGenerator<ChatEvent>) => { const out: ChatEvent[] = []; for await (const e of events) out.push(e); return out; };
function mockApi(reply: (customId: string, body: Record<string, unknown>) => unknown) {
  const submitted: {custom_id: string; params: Record<string, unknown>}[][] = [];
  let polls = 0;
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/v1/messages/batches') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as {requests: {custom_id: string; params: Record<string, unknown>}[]};
      submitted.push(body.requests);
      return new Response(JSON.stringify({id: `msgbatch_${submitted.length}`}), {status: 200});
    }
    if (url.endsWith('/results')) {
      const batch = submitted.at(-1)!;
      return new Response(batch.map(r => JSON.stringify({custom_id: r.custom_id, result: reply(r.custom_id, r.params)})).join('\n'), {status: 200});
    }
    polls++;
    return new Response(JSON.stringify({processing_status: polls % 2 ? 'in_progress' : 'ended', request_counts: {}}), {status: 200});
  });
  vi.stubGlobal('fetch', fetchMock);
  return {submitted, fetchMock};
}
afterEach(() => vi.unstubAllGlobals());

describe('the batch transport', () => {
  test('waits for every running case, sends one batch, and replays text, tool calls, usage and done', async () => {
    const {submitted} = mockApi(id => ({type: 'succeeded', message: {stop_reason: id === 'r1' ? 'tool_use' : 'end_turn', usage: {input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 100}, content: id === 'r1' ? [{type: 'text', text: 'Looking.'}, {type: 'tool_use', id: 'toolu_1', name: 'water', input: {range: 'today'}}] : [{type: 'text', text: 'Hi.'}]}}));
    const dir = mkdtempSync(join(tmpdir(), 'zigi-batch-'));
    const queue = new BatchQueue({key: 'test-key', model: 'claude-haiku-5-5', pollMs: 1, recordDir: dir});
    queue.enter(); queue.enter();
    const [a, b] = await Promise.all([drain(queue.stream(request('one'))), drain(queue.stream(request('two')))]);
    queue.leave(); queue.leave();
    expect(submitted).toHaveLength(1);
    expect(submitted[0]).toHaveLength(2);
    expect(submitted[0]![0]!.params.stream).toBeUndefined();
    expect(a).toEqual([{type: 'text', delta: 'Looking.'}, {type: 'tool-call', call: {id: 'toolu_1', name: 'water', arguments: '{"range":"today"}'}}, {type: 'usage', input: 10, output: 5, cacheRead: 100}, {type: 'done', reason: 'tool_use'}]);
    expect(b.at(0)).toEqual({type: 'text', delta: 'Hi.'});
    // The batch's spend is on disk at once, in the ledger's batch-file shape.
    const files = readdirSync(dir);
    expect(files).toEqual(['batch-msgbatch_1.json']);
    const record = JSON.parse(readFileSync(join(dir, files[0]!), 'utf8')) as {summary: {batch: boolean; requests: number; tokens: Record<string, number>}};
    expect(record.summary).toMatchObject({batch: true, requests: 2, tokens: {input: 20, output: 10, cacheWrite: 0, cacheRead: 200}});
    expect(queue.spentUsd).toBeGreaterThan(0);
  });
  test('a failed request becomes an error for its case only; a cap refuses the next batch before it is sent', async () => {
    const {submitted} = mockApi(id => id === 'r1' ? {type: 'errored', error: {error: {message: 'bad request'}}} : {type: 'succeeded', message: {content: [{type: 'text', text: 'ok'}], usage: {input_tokens: 1, output_tokens: 1}}});
    const queue = new BatchQueue({key: 'test-key', model: 'claude-haiku-5-5', pollMs: 1, capUsd: 1, forecastPerRequest: 0.6});
    queue.enter(); queue.enter();
    const results = await Promise.allSettled([drain(queue.stream(request('one'))), drain(queue.stream(request('two')))]);
    expect(results.map(r => r.status)).toEqual(['rejected', 'rejected']);
    expect(String((results[0] as PromiseRejectedResult).reason)).toMatch(/capped/);
    expect(submitted).toHaveLength(0);
  });
  test('an error text never carries a key', () => {
    expect(redact(`bad ${['sk', 'ant', 'api03', 'abcDEF123'].join('-')} here`)).toBe('bad *** here');
  });
});
