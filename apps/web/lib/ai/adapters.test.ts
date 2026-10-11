import {expect, test} from 'vitest';
import {collectReply, streamChat} from './chat';
import {AiError} from './errors';
import {ANTHROPIC_ERROR_EVENT, ANTHROPIC_STREAM, ERROR_BODIES, FAKE_KEY, GEMINI_BLOCKED, GEMINI_STREAM, OLLAMA_MODEL_ERROR, OLLAMA_STREAM, OPENAI_STREAM, OPENROUTER_MIDSTREAM_ERROR, OPENROUTER_STREAM} from './fixtures/mock-streams';
import type {ChatRequest} from './types';

// ADR-012, Part 1: each wire, from the documented request to the parsed stream, against MOCK fixtures (no network).
type Call = {url: string; init: RequestInit};
function body(text: string, size = 11): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text); let offset = 0;
  return new ReadableStream({pull(controller) { if (offset >= bytes.length) { controller.close(); return; } controller.enqueue(bytes.slice(offset, offset + size)); offset += size; }});
}
/** A fetcher that records the one request and answers with a fixture (a stream, or an error body). */
function answering(answer: {stream?: string; status?: number; body?: string; headers?: Record<string, string>; contentType?: string}) {
  const calls: Call[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({url: String(input), init: init ?? {}});
    if (answer.stream !== undefined) return new Response(body(answer.stream), {status: 200, headers: {'content-type': answer.contentType ?? 'text/event-stream'}});
    return new Response(answer.body ?? '', {status: answer.status ?? 500, headers: answer.headers});
  };
  return {calls, fetcher};
}
const base = (provider: ChatRequest['provider'], extra: Partial<ChatRequest> = {}): Omit<ChatRequest, 'fetcher'> => ({provider, model: 'mock-model', system: 'MOCK system prompt', messages: [{role: 'user', content: 'Hello ✓'}, {role: 'assistant', content: 'Hi'}, {role: 'user', content: 'Again'}], maxOutputTokens: 512, key: FAKE_KEY, appOrigin: 'https://alpha.zigoals.app', ...extra});
const requestBody = (call: Call) => JSON.parse(String(call.init.body)) as Record<string, unknown>;
const headers = (call: Call) => call.init.headers as Record<string, string>;
const noKeyInUrl = (call: Call) => { expect(call.url).not.toContain(FAKE_KEY); expect(call.url).not.toMatch(/[?&]key=/); };

test('OpenAI: chat completions with the documented fields; text, usage and the stop reason come back', async () => {
  const {calls, fetcher} = answering({stream: OPENAI_STREAM});
  const reply = await collectReply(streamChat({...base('openai'), fetcher}));
  expect(reply).toEqual({text: 'MOCK reply ✓ from OpenAI', usage: {input: 120, output: 7}, reason: 'stop'});
  const call = calls[0]!; noKeyInUrl(call);
  expect(call.url).toBe('https://api.openai.com/v1/chat/completions'); expect(call.init.method).toBe('POST');
  expect(headers(call).authorization).toBe(`Bearer ${FAKE_KEY}`); expect(call.init.credentials).toBe('omit');
  const sent = requestBody(call);
  expect(sent).toMatchObject({model: 'mock-model', stream: true, store: false, max_completion_tokens: 512, stream_options: {include_usage: true}});
  expect(sent.messages).toEqual([{role: 'system', content: 'MOCK system prompt'}, {role: 'user', content: 'Hello ✓'}, {role: 'assistant', content: 'Hi'}, {role: 'user', content: 'Again'}]);
  expect(sent).not.toHaveProperty('max_tokens');
});
test('xAI: the same wire with max_tokens and no store field', async () => {
  const {calls, fetcher} = answering({stream: OPENAI_STREAM});
  expect((await collectReply(streamChat({...base('xai'), fetcher}))).text).toBe('MOCK reply ✓ from OpenAI');
  expect(calls[0]!.url).toBe('https://api.x.ai/v1/chat/completions');
  const sent = requestBody(calls[0]!); expect(sent.max_tokens).toBe(512); expect(sent).not.toHaveProperty('store'); expect(sent).not.toHaveProperty('max_completion_tokens');
});
test('OpenRouter: app headers, comment lines ignored, a mid-stream error maps to its code', async () => {
  const ok = answering({stream: OPENROUTER_STREAM});
  const reply = await collectReply(streamChat({...base('openrouter'), fetcher: ok.fetcher}));
  expect(reply).toEqual({text: 'MOCK reply via OpenRouter', usage: {input: 80, output: 5}, reason: 'stop'});
  expect(ok.calls[0]!.url).toBe('https://openrouter.ai/api/v1/chat/completions');
  expect(headers(ok.calls[0]!)).toMatchObject({'http-referer': 'https://alpha.zigoals.app', 'x-title': 'ZIGoals', authorization: `Bearer ${FAKE_KEY}`});
  const failing = answering({stream: OPENROUTER_MIDSTREAM_ERROR});
  const error = await collectReply(streamChat({...base('openrouter'), fetcher: failing.fetcher})).catch(e => e as AiError);
  expect(error).toBeInstanceOf(AiError); expect((error as AiError).kind).toBe('no-credit'); expect((error as AiError).status).toBe(402);
});
test('Anthropic: the three headers, max_tokens and system; usage merged from message_start and message_delta; an error event ends the stream', async () => {
  const ok = answering({stream: ANTHROPIC_STREAM});
  const reply = await collectReply(streamChat({...base('anthropic'), fetcher: ok.fetcher}));
  expect(reply).toEqual({text: 'MOCK reply from Anthropic ✓', usage: {input: 25, output: 9}, reason: 'end_turn'});
  const call = ok.calls[0]!; noKeyInUrl(call);
  expect(call.url).toBe('https://api.anthropic.com/v1/messages');
  expect(headers(call)).toMatchObject({'x-api-key': FAKE_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true'});
  expect(headers(call)).not.toHaveProperty('authorization');
  expect(requestBody(call)).toMatchObject({model: 'mock-model', max_tokens: 512, system: 'MOCK system prompt', stream: true});
  expect((requestBody(call).messages as unknown[]).length).toBe(3);
  const failing = answering({stream: ANTHROPIC_ERROR_EVENT});
  const error = await collectReply(streamChat({...base('anthropic'), fetcher: failing.fetcher})).catch(e => e as AiError);
  expect((error as AiError).kind).toBe('overloaded');
});
test('Gemini: the key in a header and never in the URL, roles mapped to model, usage, a safety block', async () => {
  const ok = answering({stream: GEMINI_STREAM});
  const reply = await collectReply(streamChat({...base('gemini', {model: 'models/mock-model'}), fetcher: ok.fetcher}));
  expect(reply).toEqual({text: 'MOCK reply from Gemini ✓', usage: {input: 40, output: 6}, reason: 'STOP'});
  const call = ok.calls[0]!; noKeyInUrl(call);
  expect(call.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/mock-model:streamGenerateContent?alt=sse');
  expect(headers(call)['x-goog-api-key']).toBe(FAKE_KEY);
  const sent = requestBody(call) as {systemInstruction: {parts: {text: string}[]}; contents: {role: string}[]; generationConfig: {maxOutputTokens: number}};
  expect(sent.systemInstruction.parts[0]!.text).toBe('MOCK system prompt'); expect(sent.contents.map(c => c.role)).toEqual(['user', 'model', 'user']); expect(sent.generationConfig.maxOutputTokens).toBe(512);
  const blocked = answering({stream: GEMINI_BLOCKED});
  expect(((await collectReply(streamChat({...base('gemini'), fetcher: blocked.fetcher})).catch(e => e as AiError)) as AiError).kind).toBe('blocked');
});
test('Ollama: NDJSON over /api/chat, num_predict as the cap, counts as usage, a missing model', async () => {
  const ok = answering({stream: OLLAMA_STREAM, contentType: 'application/x-ndjson'});
  const reply = await collectReply(streamChat({...base('local', {key: null, baseUrl: 'http://127.0.0.1:11434', localServer: 'ollama'}), fetcher: ok.fetcher}));
  expect(reply).toEqual({text: 'MOCK reply from Ollama ✓', usage: {input: 30, output: 6}, reason: 'stop'});
  expect(ok.calls[0]!.url).toBe('http://127.0.0.1:11434/api/chat'); expect(headers(ok.calls[0]!)).not.toHaveProperty('authorization');
  expect(requestBody(ok.calls[0]!)).toMatchObject({model: 'mock-model', stream: true, options: {num_predict: 512}});
  const missing = answering({status: 404, body: OLLAMA_MODEL_ERROR});
  const error = await collectReply(streamChat({...base('local', {key: null, baseUrl: 'http://127.0.0.1:11434', localServer: 'ollama'}), fetcher: missing.fetcher})).catch(e => e as AiError);
  expect((error as AiError).kind).toBe('model-missing');
});
test('an OpenAI-compatible local server: /v1 path, no key, no stream_options', async () => {
  const {calls, fetcher} = answering({stream: OPENAI_STREAM});
  expect((await collectReply(streamChat({...base('local', {key: null, baseUrl: 'http://localhost:1234', localServer: 'openai-compatible'}), fetcher}))).text).toBe('MOCK reply ✓ from OpenAI');
  expect(calls[0]!.url).toBe('http://localhost:1234/v1/chat/completions'); expect(headers(calls[0]!)).not.toHaveProperty('authorization');
  expect(requestBody(calls[0]!)).not.toHaveProperty('stream_options'); expect(requestBody(calls[0]!).max_tokens).toBe(512);
});
test('a failed answer becomes an AiError whose message never carries the key; a silent local server is local-unreachable; a stop is aborted', async () => {
  const unauthorized = answering({status: ERROR_BODIES.openai401.status, body: ERROR_BODIES.openai401.body});
  const error = await collectReply(streamChat({...base('openai'), fetcher: unauthorized.fetcher})).catch(e => e as AiError);
  expect((error as AiError).kind).toBe('bad-key'); expect((error as AiError).message).not.toContain(FAKE_KEY);
  const dead: typeof fetch = async () => { throw new TypeError('Failed to fetch'); };
  expect(((await collectReply(streamChat({...base('local', {key: null, baseUrl: 'http://localhost:1234', localServer: 'openai-compatible'}), fetcher: dead})).catch(e => e as AiError)) as AiError).kind).toBe('local-unreachable');
  const controller = new AbortController();
  const endless: typeof fetch = async () => new Response(new ReadableStream<Uint8Array>({start(c) { c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"MOCK start"}}]}\n\n')); }, pull() { return new Promise<void>(() => undefined); }}), {status: 200});
  const read = collectReply(streamChat({...base('openai'), fetcher: endless, signal: controller.signal}));
  await new Promise(resolve => setTimeout(resolve, 10)); controller.abort();
  expect(((await read.catch(e => e as AiError)) as AiError).kind).toBe('aborted');
  const missingAddress = await collectReply(streamChat({...base('local', {key: null, localServer: 'ollama'})})).catch(e => e as AiError);
  expect((missingAddress as AiError).kind).toBe('local-unreachable');
});

// Session Z-Local Part 3 (ADR-020 L2, L3): prompt caching, the effort mapping and the cache usage fields on the Anthropic wire.
const anthropicEvents = (usageStart: string, usageDelta: string) => [
  'event: message_start', `data: {"type":"message_start","message":{"id":"msg_MOCK","type":"message","role":"assistant","content":[],"model":"mock-model","stop_reason":null,"usage":${usageStart}}}`, '',
  'event: content_block_start', 'data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}', '',
  'event: content_block_delta', 'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"cached ✓"}}', '',
  'event: content_block_stop', 'data: {"type":"content_block_stop","index":0}', '',
  'event: message_delta', `data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":${usageDelta}}`, '',
  'event: message_stop', 'data: {"type":"message_stop"}', '',
].join('\n') + '\n';
const ANTHROPIC_CACHED = anthropicEvents('{"input_tokens":30,"cache_creation_input_tokens":4000,"cache_read_input_tokens":8000,"output_tokens":1}', '{"output_tokens":12}');
test('Anthropic: the body carries the automatic cache marker and the effort of the quick reply; "Think deeper" asks for high', async () => {
  const quick = answering({stream: ANTHROPIC_STREAM});
  await collectReply(streamChat({...base('anthropic'), fetcher: quick.fetcher}));
  expect(requestBody(quick.calls[0]!)).toMatchObject({cache_control: {type: 'ephemeral'}, output_config: {effort: 'low'}});
  expect(requestBody(quick.calls[0]!)).not.toHaveProperty('thinking');
  const deep = answering({stream: ANTHROPIC_STREAM});
  await collectReply(streamChat({...base('anthropic', {think: true}), fetcher: deep.fetcher}));
  expect(requestBody(deep.calls[0]!)).toMatchObject({output_config: {effort: 'high'}});
});
test('Anthropic: system blocks that concatenate to the prompt travel as text blocks with cache markers on the stable ones; blocks that do not match are ignored', async () => {
  const system = 'STABLE part\n\nRECORDS part\n\nthe question';
  const ok = answering({stream: ANTHROPIC_STREAM});
  await collectReply(streamChat({...base('anthropic', {system, systemBlocks: [{text: 'STABLE part', cache: true}, {text: '\n\nRECORDS part', cache: true}, {text: '\n\nthe question'}]}), fetcher: ok.fetcher}));
  expect(requestBody(ok.calls[0]!).system).toEqual([{type: 'text', text: 'STABLE part', cache_control: {type: 'ephemeral'}}, {type: 'text', text: '\n\nRECORDS part', cache_control: {type: 'ephemeral'}}, {type: 'text', text: '\n\nthe question'}]);
  const off = answering({stream: ANTHROPIC_STREAM});
  await collectReply(streamChat({...base('anthropic', {system, systemBlocks: [{text: 'STABLE part', cache: true}, {text: 'something else'}]}), fetcher: off.fetcher}));
  expect(requestBody(off.calls[0]!).system).toBe(system);
  // Every other wire sends the plain string (the blocks are Anthropic's only).
  const openai = answering({stream: OPENAI_STREAM});
  await collectReply(streamChat({...base('openai', {system, systemBlocks: [{text: 'STABLE part', cache: true}, {text: '\n\nRECORDS part\n\nthe question'}]}), fetcher: openai.fetcher}));
  expect((requestBody(openai.calls[0]!).messages as {content: string}[])[0]!.content).toBe(system);
});
test('Anthropic: the cache counts are read beside input (message_start) and the cumulative output (message_delta)', async () => {
  const ok = answering({stream: ANTHROPIC_CACHED});
  const reply = await collectReply(streamChat({...base('anthropic'), fetcher: ok.fetcher}));
  expect(reply).toEqual({text: 'cached ✓', usage: {input: 30, output: 12, cacheWrite: 4000, cacheRead: 8000}, reason: 'end_turn'});
});
test('Anthropic: a 400 that names output_config sends the same request once more without it; any other 400 is the error it was', async () => {
  const calls: Call[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({url: String(input), init: init ?? {}});
    const sent = JSON.parse(String(init?.body)) as Record<string, unknown>;
    if (sent.output_config) return new Response('{"type":"error","error":{"type":"invalid_request_error","message":"output_config: Extra inputs are not permitted"}}', {status: 400});
    return new Response(body(ANTHROPIC_STREAM), {status: 200, headers: {'content-type': 'text/event-stream'}});
  };
  const reply = await collectReply(streamChat({...base('anthropic'), fetcher}));
  expect(reply.text).toBe('MOCK reply from Anthropic ✓');
  expect(calls).toHaveLength(2);
  expect(requestBody(calls[0]!)).toHaveProperty('output_config'); expect(requestBody(calls[1]!)).not.toHaveProperty('output_config');
  expect(requestBody(calls[1]!)).toMatchObject({cache_control: {type: 'ephemeral'}});
  const other = answering({status: 400, body: '{"type":"error","error":{"type":"invalid_request_error","message":"messages: at least one message is required"}}'});
  const error = await collectReply(streamChat({...base('anthropic'), fetcher: other.fetcher})).catch(e => e as AiError);
  expect(error).toBeInstanceOf(AiError); expect(other.calls).toHaveLength(1);
});
test('OpenAI: the cached part of the prompt is read as cacheRead from prompt_tokens_details; absent, no cache field appears', async () => {
  const cached = ['data: {"id":"chatcmpl-MOCK","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant","content":"hi"},"finish_reason":null}]}', '',
    'data: {"id":"chatcmpl-MOCK","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}', '',
    'data: {"id":"chatcmpl-MOCK","object":"chat.completion.chunk","choices":[],"usage":{"prompt_tokens":1200,"completion_tokens":7,"total_tokens":1207,"prompt_tokens_details":{"cached_tokens":1024}}}', '', 'data: [DONE]', ''].join('\n') + '\n';
  const ok = answering({stream: cached});
  expect((await collectReply(streamChat({...base('openai'), fetcher: ok.fetcher}))).usage).toEqual({input: 1200, output: 7, cacheRead: 1024});
  const plain = answering({stream: OPENAI_STREAM});
  expect((await collectReply(streamChat({...base('openai'), fetcher: plain.fetcher}))).usage).toEqual({input: 120, output: 7});
});
test('Anthropic: cache: false (the measurement\'s "before") sends no marker and the plain system string', async () => {
  const ok = answering({stream: ANTHROPIC_STREAM});
  await collectReply(streamChat({...base('anthropic', {system: 'A\n\nB', systemBlocks: [{text: 'A', cache: true}, {text: '\n\nB'}], cache: false}), fetcher: ok.fetcher}));
  const sent = requestBody(ok.calls[0]!);
  expect(sent).not.toHaveProperty('cache_control'); expect(sent.system).toBe('A\n\nB'); expect(sent).toMatchObject({output_config: {effort: 'low'}});
});
