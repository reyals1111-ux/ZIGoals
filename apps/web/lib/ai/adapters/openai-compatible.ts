import {AiError, mapHttpError, mapNetworkError} from '../errors';
import {sseEvents, parseJson} from '../sse';
import type {ChatEvent, ChatRequest} from '../types';

/**
 * Chat Completions over server-sent events: OpenAI, xAI and OpenRouter (whose docs state OpenAI compatibility), and any
 * local OpenAI-compatible server such as LM Studio (docs/product/YOUR_AI_V1.md §1). Facts applied here, read 2026-10-04:
 * `stream: true` streams `data: {chunk}` lines ended by `data: [DONE]`; `stream_options.include_usage` adds one usage
 * chunk before it; OpenAI's output cap is `max_completion_tokens` (the others take `max_tokens`); OpenAI's `store`
 * is sent as `false`; OpenRouter reads `HTTP-Referer`/`X-Title` and may put an error object into a 200 stream.
 */
export type OpenAiFlavor = 'openai' | 'xai' | 'openrouter' | 'local';
type Chunk = {choices?: {delta?: {content?: string | null}; finish_reason?: string | null}[]; usage?: {prompt_tokens?: number; completion_tokens?: number} | null; error?: {code?: number | string; message?: string; type?: string}};
const count = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
export function openAiHeaders(flavor: OpenAiFlavor, key: string | null, appOrigin?: string): Record<string, string> {
  const headers: Record<string, string> = {'content-type': 'application/json', accept: 'text/event-stream'};
  if (key) headers.authorization = `Bearer ${key}`;
  if (flavor === 'openrouter') { if (appOrigin) headers['http-referer'] = appOrigin; headers['x-title'] = 'ZIGoals'; }
  return headers;
}
export function openAiBody(flavor: OpenAiFlavor, request: Pick<ChatRequest, 'model' | 'system' | 'messages' | 'maxOutputTokens'>): Record<string, unknown> {
  const body: Record<string, unknown> = {model: request.model, stream: true, messages: [{role: 'system', content: request.system}, ...request.messages.map(m => ({role: m.role, content: m.content}))]};
  if (flavor === 'openai') { body.max_completion_tokens = request.maxOutputTokens; body.store = false; body.stream_options = {include_usage: true}; }
  else { body.max_tokens = request.maxOutputTokens; if (flavor !== 'local') body.stream_options = {include_usage: true}; }
  return body;
}
export async function* streamOpenAiCompatible(request: ChatRequest, flavor: OpenAiFlavor, base: string): AsyncGenerator<ChatEvent> {
  const fetcher = request.fetcher ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  let response: Response;
  try {
    response = await fetcher(`${base}/v1/chat/completions`, {method: 'POST', headers: openAiHeaders(flavor, request.key, request.appOrigin), body: JSON.stringify(openAiBody(flavor, request)), signal: request.signal, cache: 'no-store', credentials: 'omit', mode: 'cors'});
  } catch (error) { throw mapNetworkError(request.provider, error, {local: flavor === 'local', online: typeof navigator === 'undefined' ? undefined : navigator.onLine}); }
  if (!response.ok) throw mapHttpError(request.provider, response.status, await response.text().catch(() => ''), response.headers);
  if (!response.body) throw new AiError('unreadable', 'The provider sent an empty answer.', {provider: request.provider});
  let reason: string | null = null;
  for await (const event of sseEvents(response.body, request.signal)) {
    if (event.data.trim() === '[DONE]') { yield {type: 'done', reason}; return; }
    const chunk = parseJson(event.data) as Chunk;
    if (chunk.error) throw mapHttpError(request.provider, Number(chunk.error.code) || 500, JSON.stringify({error: chunk.error}));
    const choice = chunk.choices?.[0];
    const delta = choice?.delta?.content;
    if (typeof delta === 'string' && delta) yield {type: 'text', delta};
    if (choice?.finish_reason) reason = choice.finish_reason;
    if (chunk.usage) yield {type: 'usage', input: count(chunk.usage.prompt_tokens), output: count(chunk.usage.completion_tokens)};
  }
  yield {type: 'done', reason};
}
