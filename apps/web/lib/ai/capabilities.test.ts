import {expect, test} from 'vitest';
import {dataMode, dataModeLine, isToolRejection, readCapability, toolListTokens, UNKNOWN} from './capabilities';
import {AiError, mapHttpError} from './errors';
import {FAKE_KEY} from './fixtures/mock-streams';

// Session V Part 6: which models are offered ZIGi's tools. Documented providers are tried; OpenRouter, Ollama and
// LM Studio answer from their own metadata (MOCK answers shaped after the docs read 2026-10-05); nothing is guessed.
type Seen = {url: string; init: RequestInit};
function answering(answer: unknown, status = 200) {
  const seen: Seen[] = [];
  const fetcher: typeof fetch = async (input, init) => { seen.push({url: String(input), init: init ?? {}}); return new Response(JSON.stringify(answer), {status, headers: {'content-type': 'application/json'}}); };
  return {seen, fetcher};
}

test('OpenAI, Anthropic, Gemini and xAI document tools for chat models: no request is made', async () => {
  for (const provider of ['openai', 'anthropic', 'gemini', 'xai'] as const) {
    const {seen, fetcher} = answering({});
    expect(await readCapability({provider, model: 'mock-model', key: FAKE_KEY, fetcher})).toEqual({tools: true, vision: null});
    expect(seen).toEqual([]);
  }
});
test('OpenRouter: supported_parameters and input_modalities from its public model list, without the key', async () => {
  const list = {data: [{id: 'mock/tools-and-images', supported_parameters: ['max_tokens', 'tools', 'tool_choice'], architecture: {input_modalities: ['text', 'image']}}, {id: 'mock/plain', supported_parameters: ['max_tokens'], architecture: {input_modalities: ['text']}}, {id: 'mock/bare'}]};
  const {seen, fetcher} = answering(list);
  expect(await readCapability({provider: 'openrouter', model: 'mock/tools-and-images', key: FAKE_KEY, fetcher})).toEqual({tools: true, vision: true});
  expect(seen[0]!.url).toBe('https://openrouter.ai/api/v1/models');
  expect(JSON.stringify(seen[0]!.init)).not.toContain(FAKE_KEY); expect(seen[0]!.init.credentials).toBe('omit');
  expect(await readCapability({provider: 'openrouter', model: 'mock/plain', key: null, fetcher})).toEqual({tools: false, vision: false});
  expect(await readCapability({provider: 'openrouter', model: 'mock/bare', key: null, fetcher})).toEqual(UNKNOWN);
  expect(await readCapability({provider: 'openrouter', model: 'mock/absent', key: null, fetcher})).toEqual(UNKNOWN);
});
test('Ollama: POST /api/show with the model, capabilities named in the answer', async () => {
  const {seen, fetcher} = answering({capabilities: ['completion', 'tools', 'thinking']});
  expect(await readCapability({provider: 'local', localServer: 'ollama', baseUrl: 'http://127.0.0.1:11434', model: 'mock:8b', key: null, fetcher})).toEqual({tools: true, vision: false});
  expect(seen[0]!.url).toBe('http://127.0.0.1:11434/api/show'); expect(seen[0]!.init.method).toBe('POST'); expect(JSON.parse(String(seen[0]!.init.body))).toEqual({model: 'mock:8b'});
  const plain = answering({capabilities: ['completion', 'vision']});
  expect(await readCapability({provider: 'local', localServer: 'ollama', baseUrl: 'http://127.0.0.1:11434', model: 'mock:2b', key: null, fetcher: plain.fetcher})).toEqual({tools: false, vision: true});
  const old = answering({modelfile: 'MOCK'});
  expect(await readCapability({provider: 'local', localServer: 'ollama', baseUrl: 'http://127.0.0.1:11434', model: 'mock:old', key: null, fetcher: old.fetcher})).toEqual(UNKNOWN);
});
test('LM Studio: GET /api/v1/models, the model by key or loaded instance; another local server publishes nothing', async () => {
  const list = {models: [{type: 'llm', key: 'mock-tools', loaded_instances: [{id: 'mock-tools:2'}], capabilities: {vision: false, trained_for_tool_use: true}}, {type: 'llm', key: 'mock-plain', loaded_instances: [], capabilities: {vision: true, trained_for_tool_use: false}}, {type: 'embedding', key: 'mock-embed', loaded_instances: []}]};
  const {seen, fetcher} = answering(list);
  const lm = (model: string, key: string | null = null) => readCapability({provider: 'local', localServer: 'openai-compatible', baseUrl: 'http://localhost:1234', model, key, fetcher});
  expect(await lm('mock-tools')).toEqual({tools: true, vision: false});
  expect(await lm('mock-tools:2')).toEqual({tools: true, vision: false});
  expect(await lm('mock-plain', 'lm-token-FAKE')).toEqual({tools: false, vision: true});
  expect(seen[0]!.url).toBe('http://localhost:1234/api/v1/models'); expect((seen[2]!.init.headers as Record<string, string>).authorization).toBe('Bearer lm-token-FAKE');
  expect(await lm('mock-embed')).toEqual(UNKNOWN);
  const other = answering({error: 'not found'}, 404);
  expect(await readCapability({provider: 'local', localServer: 'openai-compatible', baseUrl: 'http://localhost:8080', model: 'x', key: null, fetcher: other.fetcher})).toEqual(UNKNOWN);
  const dead: typeof fetch = async () => { throw new TypeError('Failed to fetch'); };
  expect(await readCapability({provider: 'local', localServer: 'ollama', baseUrl: 'http://127.0.0.1:11434', model: 'x', key: null, fetcher: dead})).toEqual(UNKNOWN);
});
test('the data mode: the person\'s setting first, then the session\'s fallback, then the metadata', () => {
  expect(dataMode(undefined, null, false)).toBe('tools'); expect(dataMode('auto', {tools: true, vision: null}, false)).toBe('tools');
  expect(dataMode('auto', {tools: false, vision: null}, false)).toBe('attach'); expect(dataMode('auto', UNKNOWN, false)).toBe('tools');
  expect(dataMode('tools', {tools: false, vision: null}, false)).toBe('tools'); expect(dataMode('attach', {tools: true, vision: null}, false)).toBe('attach');
  expect(dataMode('tools', null, true)).toBe('attach'); expect(dataMode('auto', null, true)).toBe('attach');
  expect(dataModeLine('tools', false)).toBe('Your AI asks ZIGi for the records it needs (tools); each lookup is shown under the answer.');
  expect(dataModeLine('tools', false, 1534)).toBe('Your AI asks ZIGi for the records it needs (tools); each lookup is shown under the answer. The tool list adds about 1,600 tokens to each request.');
  expect(toolListTokens([])).toBe(0); expect(toolListTokens([{name: 'abcd', description: 'abcd', parameters: {}}])).toBe(Math.ceil(JSON.stringify([{name: 'abcd', description: 'abcd', parameters: {}}]).length / 4));
  expect(dataModeLine('attach', true)).toBe('Your model did not take ZIGi\'s tools, so the records chosen from your question are attached instead.');
});
test('a rejection worth one try without tools: 400, 422, or a 404 that names tools; never a key, credit or rate problem', () => {
  expect(isToolRejection(mapHttpError('openai', 400, '{"error":{"message":"Invalid schema for function","type":"invalid_request_error"}}'))).toBe(true);
  expect(isToolRejection(mapHttpError('local', 400, '{"error":"registry.ollama.ai/library/mock does not support tools"}'))).toBe(true);
  expect(isToolRejection(mapHttpError('openrouter', 422, '{"error":{"message":"MOCK"}}'))).toBe(true);
  expect(isToolRejection(mapHttpError('openrouter', 404, '{"error":{"message":"No endpoints found that support tool use."}}'))).toBe(true);
  expect(isToolRejection(mapHttpError('openai', 404, '{"error":{"message":"The model mock does not exist"}}'))).toBe(false);
  for (const status of [401, 402, 403, 429, 500, 503]) expect(isToolRejection(mapHttpError('openai', status, '{}'))).toBe(false);
  expect(isToolRejection(new AiError('aborted', 'Stopped.'))).toBe(false); expect(isToolRejection(new Error('x'))).toBe(false);
});
