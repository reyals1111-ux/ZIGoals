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
type Event = {type?: string; index?: number; message?: {usage?: {input_tokens?: number}}; content_block?: {type?: string; id?: string; name?: string}; delta?: {type?: string; text?: string; partial_json?: string; stop_reason?: string | null}; usage?: {output_tokens?: number}; error?: {type?: string; message?: string}};
const count = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
const STATUS_OF_TYPE: Record<string, number> = {invalid_request_error: 400, authentication_error: 401, billing_error: 402, permission_error: 403, not_found_error: 404, rate_limit_error: 429, api_error: 500, overloaded_error: 529};
export function anthropicHeaders(key: string | null): Record<string, string> {
  return {'content-type': 'application/json', accept: 'text/event-stream', 'x-api-key': key ?? '', 'anthropic-version': ANTHROPIC_VERSION, 'anthropic-dangerous-direct-browser-access': 'true'};
}
/**
 * Session V Part 6, tool calls on the Messages API (read 2026-10-05, research §A2): tools as `{name, description,
 * input_schema}`; `tool_choice` is never sent (auto is the default, and Opus 5.5 / Sonnet 5.5 refuse `any` and `tool`).
 * An assistant turn that called tools carries `tool_use` blocks; the results go back in ONE user turn whose
 * `tool_result` blocks come first, right after it.
 */
const parsedInput = (text: string): Record<string, unknown> => { try { const v = JSON.parse(text || '{}') as unknown; return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}; } catch { return {}; } };
function anthropicMessages(messages: ChatRequest['messages']): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const m of messages) {
    if (m.role === 'tool') {
      const block = {type: 'tool_result', tool_use_id: m.toolCallId, content: m.content}, last = out.at(-1);
      if (last && last.role === 'user' && Array.isArray(last.content) && (last.content as {type?: string}[]).every(b => b.type === 'tool_result')) (last.content as unknown[]).push(block);
      else out.push({role: 'user', content: [block]});
    } else if (m.role === 'assistant' && m.toolCalls?.length) out.push({role: 'assistant', content: [...(m.content ? [{type: 'text', text: m.content}] : []), ...m.toolCalls.map(c => ({type: 'tool_use', id: c.id, name: c.name, input: parsedInput(c.arguments)}))]});
    // Session V Part 7: a photo as a base64 image block before the words (read 2026-10-05, research §A2).
    else if (m.role === 'user' && m.images?.length) out.push({role: 'user', content: [...m.images.map(i => ({type: 'image', source: {type: 'base64', media_type: i.mime, data: i.data}})), {type: 'text', text: m.content}]});
    else out.push({role: m.role, content: m.content});
  }
  return out;
}
export function anthropicBody(request: Pick<ChatRequest, 'model' | 'system' | 'messages' | 'maxOutputTokens' | 'tools'>): Record<string, unknown> {
  const body: Record<string, unknown> = {model: request.model, max_tokens: request.maxOutputTokens, system: request.system, stream: true, messages: anthropicMessages(request.messages)};
  if (request.tools?.length) body.tools = request.tools.map(t => ({name: t.name, description: t.description, input_schema: t.parameters}));
  return body;
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
  // A tool_use block starts with its id and name; its input arrives as partial JSON, whole at content_block_stop.
  const blocks = new Map<number, {id: string; name: string; json: string}>();
  for await (const sse of sseEvents(response.body, request.signal)) {
    const event = parseJson(sse.data) as Event, type = event.type ?? sse.event ?? '';
    if (type === 'error') throw mapHttpError(request.provider, STATUS_OF_TYPE[event.error?.type ?? ''] ?? 500, JSON.stringify({error: event.error}));
    if (type === 'message_start') { const input = count(event.message?.usage?.input_tokens); if (input !== null) yield {type: 'usage', input, output: null}; }
    else if (type === 'content_block_start' && event.content_block?.type === 'tool_use' && typeof event.index === 'number') blocks.set(event.index, {id: event.content_block.id ?? `toolu_${event.index}`, name: event.content_block.name ?? '', json: ''});
    else if (type === 'content_block_delta' && event.delta?.type === 'input_json_delta' && typeof event.index === 'number') { const b = blocks.get(event.index); if (b) b.json += event.delta.partial_json ?? ''; }
    else if (type === 'content_block_stop' && typeof event.index === 'number' && blocks.has(event.index)) { const b = blocks.get(event.index)!; blocks.delete(event.index); if (b.name) yield {type: 'tool-call', call: {id: b.id, name: b.name, arguments: b.json || '{}'}}; }
    else if (type === 'content_block_delta' && event.delta?.type === 'text_delta' && event.delta.text) yield {type: 'text', delta: event.delta.text};
    else if (type === 'message_delta') { if (event.delta?.stop_reason) reason = event.delta.stop_reason; const output = count(event.usage?.output_tokens); if (output !== null) yield {type: 'usage', input: null, output}; }
    else if (type === 'message_stop') { yield {type: 'done', reason}; return; }
  }
  yield {type: 'done', reason};
}
