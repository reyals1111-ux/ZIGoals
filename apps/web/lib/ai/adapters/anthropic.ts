import {AiError, mapHttpError, mapNetworkError} from '../errors';
import {sseEvents, parseJson} from '../sse';
import type {ChatEvent, ChatRequest} from '../types';

/**
 * The Messages API over server-sent events (docs/product/YOUR_AI_V1.md §1, read 2026-10-04): `x-api-key`,
 * `anthropic-version: 2023-06-01`, and `anthropic-dangerous-direct-browser-access: true`, the opt-in the official SDK
 * sends for browser use. `max_tokens` is required. Events: message_start (input tokens), content_block_delta
 * (text_delta), message_delta (output tokens, stop_reason), message_stop; an `error` event can follow a 200.
 */
export const ANTHROPIC_VERSION = '2023-06-01';
type Event = {type?: string; message?: {usage?: {input_tokens?: number}}; delta?: {type?: string; text?: string; stop_reason?: string | null}; usage?: {output_tokens?: number}; error?: {type?: string; message?: string}};
const count = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
const STATUS_OF_TYPE: Record<string, number> = {invalid_request_error: 400, authentication_error: 401, billing_error: 402, permission_error: 403, not_found_error: 404, rate_limit_error: 429, api_error: 500, overloaded_error: 529};
export function anthropicHeaders(key: string | null): Record<string, string> {
  return {'content-type': 'application/json', accept: 'text/event-stream', 'x-api-key': key ?? '', 'anthropic-version': ANTHROPIC_VERSION, 'anthropic-dangerous-direct-browser-access': 'true'};
}
export function anthropicBody(request: Pick<ChatRequest, 'model' | 'system' | 'messages' | 'maxOutputTokens'>): Record<string, unknown> {
  return {model: request.model, max_tokens: request.maxOutputTokens, system: request.system, stream: true, messages: request.messages.map(m => ({role: m.role, content: m.content}))};
}
export async function* streamAnthropic(request: ChatRequest, origin: string): AsyncGenerator<ChatEvent> {
  const fetcher = request.fetcher ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  let response: Response;
  try {
    response = await fetcher(`${origin}/v1/messages`, {method: 'POST', headers: anthropicHeaders(request.key), body: JSON.stringify(anthropicBody(request)), signal: request.signal, cache: 'no-store', credentials: 'omit', mode: 'cors'});
  } catch (error) { throw mapNetworkError(request.provider, error, {local: false, online: typeof navigator === 'undefined' ? undefined : navigator.onLine}); }
  if (!response.ok) throw mapHttpError(request.provider, response.status, await response.text().catch(() => ''), response.headers);
  if (!response.body) throw new AiError('unreadable', 'The provider sent an empty answer.', {provider: request.provider});
  let reason: string | null = null;
  for await (const sse of sseEvents(response.body, request.signal)) {
    const event = parseJson(sse.data) as Event, type = event.type ?? sse.event ?? '';
    if (type === 'error') throw mapHttpError(request.provider, STATUS_OF_TYPE[event.error?.type ?? ''] ?? 500, JSON.stringify({error: event.error}));
    if (type === 'message_start') { const input = count(event.message?.usage?.input_tokens); if (input !== null) yield {type: 'usage', input, output: null}; }
    else if (type === 'content_block_delta' && event.delta?.type === 'text_delta' && event.delta.text) yield {type: 'text', delta: event.delta.text};
    else if (type === 'message_delta') { if (event.delta?.stop_reason) reason = event.delta.stop_reason; const output = count(event.usage?.output_tokens); if (output !== null) yield {type: 'usage', input: null, output}; }
    else if (type === 'message_stop') { yield {type: 'done', reason}; return; }
  }
  yield {type: 'done', reason};
}
