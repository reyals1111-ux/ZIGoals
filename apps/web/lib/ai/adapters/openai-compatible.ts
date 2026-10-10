import {AiError, mapHttpError, mapNetworkError} from '../errors';
import {sseEvents, parseJson, fetchWithStall} from '../sse';
import type {ChatEvent, ChatRequest} from '../types';

/**
 * Chat Completions over server-sent events: OpenAI, xAI and OpenRouter (whose docs state OpenAI compatibility), and any
 * local OpenAI-compatible server such as LM Studio (docs/product/YOUR_AI_V1.md §1). Facts applied here, read 2026-10-04:
 * `stream: true` streams `data: {chunk}` lines ended by `data: [DONE]`; `stream_options.include_usage` adds one usage
 * chunk before it; OpenAI's output cap is `max_completion_tokens` (the others take `max_tokens`); OpenAI's `store`
 * is sent as `false`; OpenRouter reads `HTTP-Referer`/`X-Title` and may put an error object into a 200 stream.
 */
export type OpenAiFlavor = 'openai' | 'xai' | 'openrouter' | 'local';
type ToolDelta = {index?: number; id?: string | null; type?: string | null; function?: {name?: string | null; arguments?: string | null} | null};
// Session Z-Local Part 3: OpenAI reports the prompt tokens served from its cache as `prompt_tokens_details.cached_tokens`
// (a part of `prompt_tokens`, never on top of it); it is read as `cacheRead` where present, as the documentation shows it.
type Chunk = {choices?: {delta?: {content?: string | null; tool_calls?: ToolDelta[] | null}; finish_reason?: string | null}[]; usage?: {prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: {cached_tokens?: number} | null} | null; error?: {code?: number | string; message?: string; type?: string}};
const count = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
export function openAiHeaders(flavor: OpenAiFlavor, key: string | null, appOrigin?: string): Record<string, string> {
  const headers: Record<string, string> = {'content-type': 'application/json', accept: 'text/event-stream'};
  if (key) headers.authorization = `Bearer ${key}`;
  if (flavor === 'openrouter') { if (appOrigin) headers['http-referer'] = appOrigin; headers['x-title'] = 'ZIGoals'; }
  return headers;
}
/**
 * Session V Part 6, tool calls on this wire (read 2026-10-05, research §A1/A4/A5/A7): tools as `{type:'function',
 * function:{name, description, parameters}}`, no `strict` and no `tool_choice` (auto is the default with tools); an
 * assistant turn that called tools carries `tool_calls`, each result follows as `{role:'tool', tool_call_id, content}`.
 */
function openAiMessage(m: ChatRequest['messages'][number]): Record<string, unknown> {
  if (m.role === 'tool') return {role: 'tool', tool_call_id: m.toolCallId, content: m.content};
  if (m.role === 'assistant' && m.toolCalls?.length) return {role: 'assistant', content: m.content || null, tool_calls: m.toolCalls.map(c => ({id: c.id, type: 'function', function: {name: c.name, arguments: c.arguments}}))};
  // Session V Part 7: a photo goes as an image_url content part with a data URL, after the words (read 2026-10-05).
  if (m.role === 'user' && m.images?.length) return {role: 'user', content: [{type: 'text', text: m.content}, ...m.images.map(i => ({type: 'image_url', image_url: {url: `data:${i.mime};base64,${i.data}`}}))]};
  return {role: m.role, content: m.content};
}
export function openAiBody(flavor: OpenAiFlavor, request: Pick<ChatRequest, 'model' | 'system' | 'messages' | 'maxOutputTokens' | 'tools'>): Record<string, unknown> {
  const body: Record<string, unknown> = {model: request.model, stream: true, messages: [{role: 'system', content: request.system}, ...request.messages.map(openAiMessage)]};
  if (flavor === 'openai') { body.max_completion_tokens = request.maxOutputTokens; body.store = false; body.stream_options = {include_usage: true}; }
  else { body.max_tokens = request.maxOutputTokens; if (flavor !== 'local') body.stream_options = {include_usage: true}; }
  if (request.tools?.length) body.tools = request.tools.map(t => ({type: 'function', function: {name: t.name, description: t.description, parameters: t.parameters}}));
  return body;
}
export async function* streamOpenAiCompatible(request: ChatRequest, flavor: OpenAiFlavor, base: string): AsyncGenerator<ChatEvent> {
  const fetcher = request.fetcher ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  let response: Response;
  try {
    response = await fetchWithStall(fetcher, `${base}/v1/chat/completions`, {method: 'POST', headers: openAiHeaders(flavor, request.key, request.appOrigin), body: JSON.stringify(openAiBody(flavor, request)), signal: request.signal, cache: 'no-store', credentials: 'omit', mode: 'cors'});
  } catch (error) { throw mapNetworkError(request.provider, error, {local: flavor === 'local', online: typeof navigator === 'undefined' ? undefined : navigator.onLine}); }
  if (!response.ok) throw mapHttpError(request.provider, response.status, await response.text().catch(() => ''), response.headers);
  if (!response.body) throw new AiError('unreadable', 'The provider sent an empty answer.', {provider: request.provider});
  let reason: string | null = null;
  // Tool calls arrive as fragments merged by `index`: the id and name on the first, the arguments in pieces (xAI sends
  // each call whole, which merges the same way). They are emitted once the stream has ended.
  const calls = new Map<number, {id: string; name: string; arguments: string}>();
  const flush = function* (): Generator<ChatEvent> { for (const [i, c] of [...calls].sort(([a], [b]) => a - b)) if (c.name) yield {type: 'tool-call', call: {id: c.id || `call_${i}`, name: c.name, arguments: c.arguments}}; calls.clear(); };
  for await (const event of sseEvents(response.body, request.signal)) {
    if (event.data.trim() === '[DONE]') { yield* flush(); yield {type: 'done', reason}; return; }
    const chunk = parseJson(event.data) as Chunk;
    if (chunk.error) throw mapHttpError(request.provider, Number(chunk.error.code) || 500, JSON.stringify({error: chunk.error}));
    const choice = chunk.choices?.[0];
    const delta = choice?.delta?.content;
    if (typeof delta === 'string' && delta) yield {type: 'text', delta};
    for (const piece of choice?.delta?.tool_calls ?? []) {
      const index = typeof piece.index === 'number' ? piece.index : calls.size, current = calls.get(index) ?? {id: '', name: '', arguments: ''};
      if (piece.id) current.id = piece.id;
      if (piece.function?.name) current.name = piece.function.name;
      if (typeof piece.function?.arguments === 'string') current.arguments += piece.function.arguments;
      calls.set(index, current);
    }
    if (choice?.finish_reason) reason = choice.finish_reason;
    if (chunk.usage) { const cacheRead = count(chunk.usage.prompt_tokens_details?.cached_tokens); yield {type: 'usage', input: count(chunk.usage.prompt_tokens), output: count(chunk.usage.completion_tokens), ...(cacheRead !== null ? {cacheRead} : {})}; }
  }
  yield* flush();
  yield {type: 'done', reason};
}
