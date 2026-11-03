import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {streamChat} from './chat';
import {AiError} from './errors';
import {GUARDED_PHOTO_REFUSAL, guardRequest, REDACTION_NOTE, sendDecision, STRICT_REFUSAL} from './privacy-mode';
import {AI_MEMORY_KEY} from './store/keys';
import type {ChatEvent, ChatRequest} from './types';
import {NOVA_SETUP_KEY} from '../nova/setup';

/**
 * Lane NC (owner follow-up 2, N3 step 2, N9): the privacy mode at the send path, with a MOCK adapter (the real
 * OpenAI-compatible wire, its fetch answered here): what the provider would receive is read from the request body.
 */
const storage = (values: Record<string, string> = {}) => ({getItem: (k: string) => values[k] ?? null});
const withMode = (mode: string, extra: Record<string, string> = {}) => storage({[NOVA_SETUP_KEY]: JSON.stringify({version: 1, privacyMode: mode}), ...extra});
const PRIVATE = 'Dinner with my sister Anna at 12 Abbey Road; I owe her €1,234.56 from BE68 5390 0754 7034.';
const SYSTEM_A = 'You are ZIGi.\n', SYSTEM_B = 'Records: rent 950.00 EUR · Goal Emergency Fund now 4321.99 EUR\n';
function request(provider: ChatRequest['provider'], fetcher: typeof fetch, extra: Partial<ChatRequest> = {}): ChatRequest {
  return {provider, model: 'mock-chat', system: SYSTEM_A + SYSTEM_B, systemBlocks: [{text: SYSTEM_A, cache: true}, {text: SYSTEM_B}], messages: [{role: 'user', content: 'Hello'}, {role: 'assistant', content: 'Hi.'}, {role: 'user', content: PRIVATE}], maxOutputTokens: 64, key: provider === 'local' ? null : 'sk-test-key-0000000000000000', baseUrl: provider === 'local' ? 'http://127.0.0.1:1234' : undefined, localServer: provider === 'local' ? 'openai-compatible' : undefined, fetcher, ...extra};
}
/** A MOCK provider: records every body and answers one short streamed reply. */
function mockProvider() {
  const bodies: string[] = [], urls: string[] = [];
  const fetcher = (async (url: RequestInfo | URL, init?: RequestInit) => {
    urls.push(String(url)); bodies.push(String(init?.body ?? ''));
    const sse = `data: ${JSON.stringify({choices: [{delta: {content: 'ok'}, finish_reason: 'stop'}]})}\n\ndata: [DONE]\n\n`;
    return new Response(sse, {status: 200, headers: {'content-type': 'text/event-stream'}});
  }) as typeof fetch;
  return {fetcher, bodies, urls};
}
/** The send path's own order (use-chat-session.ts, `counted`): the guard, then the wire. */
async function send(r: ChatRequest, store: ReturnType<typeof storage>, hosted = false): Promise<ChatEvent[]> {
  const guarded = await guardRequest(r, {hosted, storage: store});
  const out: ChatEvent[] = []; for await (const e of streamChat(guarded)) out.push(e); return out;
}

describe('the decision', () => {
  test('no mode and Relaxed send; Strict refuses a cloud; Guarded redacts a cloud; a local model always sends', () => {
    expect(sendDecision(null, {provider: 'openai'})).toBe('send');
    expect(sendDecision('relaxed', {provider: 'anthropic'})).toBe('send');
    expect(sendDecision('strict', {provider: 'gemini'})).toBe('refuse');
    expect(sendDecision('strict', {provider: 'local', hosted: true})).toBe('refuse');
    expect(sendDecision('guarded', {provider: 'openrouter'})).toBe('redact');
    for (const mode of [null, 'strict', 'guarded', 'relaxed'] as const) expect(sendDecision(mode, {provider: 'local', model: 'qwen3.5:9b'})).toBe('send');
  });
  test('Ollama\'s cloud models look local but are a cloud: Strict refuses them, Guarded redacts them', () => {
    for (const model of ['gemma4:cloud', 'gpt-oss:120b-cloud', 'gemma4:31b-cloud']) {
      expect(sendDecision('strict', {provider: 'local', model})).toBe('refuse');
      expect(sendDecision('guarded', {provider: 'local', model})).toBe('redact');
      expect(sendDecision(null, {provider: 'local', model})).toBe('send');
    }
    expect(sendDecision('strict', {provider: 'local', model: 'cloudy-llama:7b'})).toBe('send');
  });
});

describe('at the send path, with a MOCK adapter', () => {
  test('no mode chosen: today\'s behaviour, the very same request object, sent as it is', async () => {
    const {fetcher, bodies} = mockProvider(), r = request('openai', fetcher);
    expect(await guardRequest(r, {storage: storage()})).toBe(r);
    await send(r, storage());
    expect(bodies[0]).toContain('Anna'); expect(bodies[0]).toContain('BE68 5390 0754 7034');
  });
  test('Relaxed: unchanged, to a cloud too', async () => {
    const {fetcher, bodies} = mockProvider(), r = request('xai', fetcher);
    expect(await guardRequest(r, {storage: withMode('relaxed')})).toBe(r);
    await send(r, withMode('relaxed'));
    expect(bodies[0]).toContain('12 Abbey Road');
  });
  test('Strict refuses a cloud provider and ZIGoals hosted before any request; a local model is reached unchanged', async () => {
    const cloud = mockProvider();
    await expect(send(request('anthropic', cloud.fetcher), withMode('strict'))).rejects.toMatchObject({kind: 'blocked', message: STRICT_REFUSAL});
    await expect(send(request('local', cloud.fetcher), withMode('strict'), true)).rejects.toBeInstanceOf(AiError);
    expect(cloud.bodies).toHaveLength(0);
    const local = mockProvider(), r = request('local', local.fetcher);
    expect(await guardRequest(r, {storage: withMode('strict')})).toBe(r);
    await send(r, withMode('strict'));
    expect(local.urls[0]).toBe('http://127.0.0.1:1234/v1/chat/completions');
    expect(local.bodies[0]).toContain('Anna');
  });
  test('Guarded sends a cloud model the redacted text only, the system blocks still whole, with the placeholder note', async () => {
    const {fetcher, bodies} = mockProvider();
    await send(request('openai', fetcher), withMode('guarded'));
    const body = JSON.parse(bodies[0]!) as {messages: {role: string; content: string}[]};
    const all = JSON.stringify(body);
    for (const secret of ['Anna', '12 Abbey Road', '1,234.56', 'BE68', '950.00', '4321.99']) expect(all).not.toContain(secret);
    expect(body.messages.at(-1)!.content).toBe('Dinner with my sister [name] at [address]; I owe her about €1,200 from [IBAN].');
    expect(body.messages[0]!.content).toBe(`You are ZIGi.\nRecords: rent about 950 EUR · Goal Emergency Fund now about 4,300 EUR\n${REDACTION_NOTE}`);
    const guarded = await guardRequest(request('openai', fetcher), {storage: withMode('guarded')});
    expect(guarded.systemBlocks!.map(b => b.text).join('')).toBe(guarded.system);
    expect(guarded.systemBlocks![0]!.cache).toBe(true);
  });
  test('Guarded: names from the person\'s own notes are redacted anywhere; tool results are redacted too', async () => {
    const memory = JSON.stringify({version: 1, notes: [{id: 'note_1', text: 'My partner Lena plans our money', category: 'other', source: 'person', createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z'}]});
    const store = withMode('guarded', {[AI_MEMORY_KEY]: memory}), {fetcher} = mockProvider();
    const r = request('gemini', fetcher, {messages: [{role: 'user', content: 'Will Lena like it?'}, {role: 'assistant', content: '', toolCalls: [{id: 'c1', name: 'money_log', arguments: '{}'}]}, {role: 'tool', toolCallId: 'c1', name: 'money_log', content: '{"note":"gift for Lena","amount":"49.90 EUR"}'}]});
    const out = await guardRequest(r, {storage: store});
    expect(out.messages[0]!.content).toBe('Will [name] like it?');
    expect(out.messages[2]!.content).toBe('{"note":"gift for [name]","amount":"about 50 EUR"}');
    expect(out.messages[1]).toMatchObject({toolCalls: [{id: 'c1'}]});
  });
  test('Guarded refuses a photo to a cloud model; nothing with nothing to redact gets no note', async () => {
    const {fetcher, bodies} = mockProvider();
    const photo = request('openai', fetcher, {messages: [{role: 'user', content: 'My lunch', images: [{mime: 'image/jpeg', data: 'AAAA'}]}]});
    await expect(send(photo, withMode('guarded'))).rejects.toMatchObject({message: GUARDED_PHOTO_REFUSAL});
    expect(bodies).toHaveLength(0);
    const plain = await guardRequest(request('openai', fetcher, {system: 'Plain.', systemBlocks: undefined, messages: [{role: 'user', content: 'How are my habits?'}]}), {storage: withMode('guarded')});
    expect(plain.system).toBe('Plain.');
  });
  test('a damaged setup record reads as Strict (fail closed)', async () => {
    const {fetcher, bodies} = mockProvider();
    await expect(send(request('openai', fetcher), storage({[NOVA_SETUP_KEY]: '{not json'}))).rejects.toMatchObject({kind: 'blocked'});
    expect(bodies).toHaveLength(0);
  });
});

test('the chat hook calls the guard in its one send wrapper, before the wire and ZIGoals hosted', () => {
  const source = readFileSync(fileURLToPath(new URL('../../components/ai/use-chat-session.ts', import.meta.url)), 'utf8');
  const counted = source.split('\n').filter(line => line.includes('const counted = async function*'));
  expect(counted).toHaveLength(1);
  const line = counted[0]!;
  expect(line.indexOf('guardRequest(r')).toBeGreaterThan(0);
  expect(line.indexOf('guardRequest(r')).toBeLessThan(line.indexOf('streamChat(r)'));
  expect(line.indexOf('guardRequest(r')).toBeLessThan(line.indexOf('streamHosted(r'));
  // Every request of the hook goes through `counted`: nothing else calls the wire directly.
  expect(source.match(/streamChat\(/g)).toHaveLength(1);
});

describe('recovery words in what leaves (F10 R1-F7)', () => {
  test('hides a saved recovery-word run in a tool result in every mode, and leaves an ordinary request as it is', async () => {
    // Built at run time from the repository's word list (the secret-pattern scan reads source text).
    const seed = readFileSync(new URL('../../../../scripts/bip39-english.txt', import.meta.url), 'utf8').trim().split('\n').slice(0, 12).join(' ');
    const request: ChatRequest = {provider: 'local', model: 'llama3', baseUrl: 'http://127.0.0.1:11434/v1', key: null, maxOutputTokens: 64, system: 'Be brief.', messages: [{role: 'user', content: 'What did I save?'}, {role: 'assistant', content: `Your note says: ${seed}. Buy milk.`}]};
    for (const mode of ['strict', 'guarded', 'relaxed'] as const) {
      const out = await guardRequest(request, {mode, knownNames: []});
      expect(out.messages[1]!.content).not.toContain('abandon ability');
      expect(out.messages[1]!.content).toContain('Buy milk.');
    }
    const plain: ChatRequest = {...request, messages: [{role: 'user', content: 'Hello'}]};
    expect(await guardRequest(plain, {mode: 'relaxed', knownNames: []})).toBe(plain);
  });
});
