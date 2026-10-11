import {expect, test} from 'vitest';
import {AiError} from './errors';
import {FAKE_KEY, MODEL_LISTS} from './fixtures/mock-streams';
import {detectLocalServer, kindOf, listModels} from './models';
import {normalizeLocalBaseUrl} from './providers';

// ADR-012, Part 1: the person's own model list, filtered to what can chat, from each provider's documented endpoint.
function serving(routes: Record<string, {status?: number; json?: unknown; text?: string}>) {
  const calls: {url: string; headers: Record<string, string>}[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input); calls.push({url, headers: (init?.headers ?? {}) as Record<string, string>});
    const route = Object.entries(routes).find(([prefix]) => url.startsWith(prefix))?.[1];
    if (!route) throw new TypeError('Failed to fetch');
    return new Response(route.text ?? JSON.stringify(route.json ?? {}), {status: route.status ?? 200, headers: {'content-type': 'application/json'}});
  };
  return {calls, fetcher};
}
const ids = (models: {id: string; kind: string}[], kind = 'chat') => models.filter(m => m.kind === kind).map(m => m.id);

test('kindOf reads ids cautiously: chat unless clearly embeddings, images, audio, moderation or transcription', () => {
  expect(kindOf('mock-chat')).toBe('chat'); expect(kindOf('whisper-1')).toBe('transcription'); expect(kindOf('gpt-4o-transcribe')).toBe('transcription');
  for (const id of ['text-embedding-x', 'dall-e-3', 'tts-1', 'omni-moderation', 'gpt-realtime', 'sora-2', 'imagen-4', 'veo-3']) expect(kindOf(id), id).toBe('other');
});
test('OpenAI: /v1/models with the bearer header; duplicates dropped; transcription models kept apart', async () => {
  const {calls, fetcher} = serving({'https://api.openai.com/v1/models': {json: MODEL_LISTS.openai}});
  const models = await listModels({provider: 'openai', key: FAKE_KEY, fetcher});
  expect(ids(models)).toEqual(['mock-chat-1']); expect(ids(models, 'transcription')).toEqual(['whisper-1', 'mock-transcribe']); expect(ids(models, 'other')).toEqual(['text-embedding-mock', 'dall-e-mock']);
  expect(calls[0]!.headers.authorization).toBe(`Bearer ${FAKE_KEY}`); expect(calls[0]!.url).not.toContain(FAKE_KEY);
});
test('Anthropic: /v1/models with the three headers; every listed model chats; display names are the labels', async () => {
  const {calls, fetcher} = serving({'https://api.anthropic.com/v1/models': {json: MODEL_LISTS.anthropic}});
  expect(await listModels({provider: 'anthropic', key: FAKE_KEY, fetcher})).toEqual([{id: 'mock-claude-a', label: 'Mock Claude A', kind: 'chat'}, {id: 'mock-claude-b', label: 'Mock Claude B', kind: 'chat'}]);
  expect(calls[0]!.headers).toMatchObject({'x-api-key': FAKE_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true'});
});
test('Gemini: pages followed by nextPageToken, generateContent required, the models/ prefix stripped, the key in a header', async () => {
  const {calls, fetcher} = serving({'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&pageToken=MOCK-PAGE-2': {json: MODEL_LISTS.geminiPage2}, 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200': {json: MODEL_LISTS.geminiPage1}});
  const models = await listModels({provider: 'gemini', key: FAKE_KEY, fetcher});
  expect(ids(models)).toEqual(['mock-gemini-chat', 'mock-gemini-chat-2']); expect(ids(models, 'other')).toEqual(['mock-embedding', 'mock-gemini-image']);
  expect(calls).toHaveLength(2); for (const call of calls) { expect(call.headers['x-goog-api-key']).toBe(FAKE_KEY); expect(call.url).not.toMatch(/[?&]key=/); }
});
test('OpenRouter: output and input modalities decide; a model without architecture is read by its id', async () => {
  const {fetcher} = serving({'https://openrouter.ai/api/v1/models': {json: MODEL_LISTS.openrouter}});
  const models = await listModels({provider: 'openrouter', key: FAKE_KEY, fetcher});
  expect(ids(models)).toEqual(['mock/chat-model', 'mock/legacy']); expect(ids(models, 'other')).toEqual(['mock/image-model']);
  expect(models[0]!.label).toBe('Mock Chat');
});
test('local: Ollama is detected by /api/version and listed from /api/tags; an OpenAI-compatible server from /v1/models; nothing at all is unreachable', async () => {
  const ollama = serving({'http://127.0.0.1:11434/api/version': {json: {version: '0.12.0'}}, 'http://127.0.0.1:11434/api/tags': {json: MODEL_LISTS.ollama}});
  expect(await detectLocalServer({baseUrl: 'http://127.0.0.1:11434', key: null, fetcher: ollama.fetcher})).toBe('ollama');
  expect(ids(await listModels({provider: 'local', key: null, baseUrl: 'http://127.0.0.1:11434', fetcher: ollama.fetcher}))).toEqual(['mock-llama:8b']);
  const studio = serving({'http://localhost:1234/api/version': {status: 404, text: 'Not found'}, 'http://localhost:1234/v1/models': {json: MODEL_LISTS.lmstudio}});
  expect(await detectLocalServer({baseUrl: 'http://localhost:1234', key: null, fetcher: studio.fetcher})).toBe('openai-compatible');
  expect(ids(await listModels({provider: 'local', key: null, baseUrl: 'http://localhost:1234', localServer: 'openai-compatible', fetcher: studio.fetcher}))).toEqual(['mock-local-chat']);
  const locked = serving({'http://localhost:1234/api/version': {status: 404}, 'http://localhost:1234/v1/models': {status: 401, text: '{"error":"Unauthorized"}'}});
  expect(((await detectLocalServer({baseUrl: 'http://localhost:1234', key: null, fetcher: locked.fetcher}).catch(e => e as AiError)) as AiError).kind).toBe('bad-key');
  const silent = serving({});
  expect(((await detectLocalServer({baseUrl: 'http://localhost:9', key: null, fetcher: silent.fetcher}).catch(e => e as AiError)) as AiError).kind).toBe('local-unreachable');
  expect(((await listModels({provider: 'local', key: null, fetcher: silent.fetcher}).catch(e => e as AiError)) as AiError).kind).toBe('local-unreachable');
});
test('normalizeLocalBaseUrl accepts localhost and 127.0.0.1 over http only, without credentials, query or fragment', () => {
  expect(normalizeLocalBaseUrl(' http://localhost:11434/ ')).toBe('http://localhost:11434');
  expect(normalizeLocalBaseUrl('http://127.0.0.1:1234/v1/')).toBe('http://127.0.0.1:1234/v1');
  for (const bad of ['https://localhost:1234', 'http://192.168.1.10:11434', 'http://example.com', 'http://user:pw@localhost:1234', 'http://localhost:1234/?x=1', 'nonsense']) expect(() => normalizeLocalBaseUrl(bad), bad).toThrow();
});
