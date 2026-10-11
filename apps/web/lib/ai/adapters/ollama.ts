import {AiError, mapHttpError, mapNetworkError} from '../errors';
import {ndjson, fetchWithStall} from '../sse';
import type {ChatEvent, ChatRequest} from '../types';

/**
 * Ollama's native chat API (docs/product/YOUR_AI_V1.md §1, read 2026-10-04): `POST /api/chat` streams one JSON object
 * per line, `{message:{role,content}, done}`; the last line carries `prompt_eval_count` and `eval_count`, and
 * `done_reason`. The output cap is `options.num_predict`. No key: the server runs on this computer.
 */
type Line = {message?: {content?: string; tool_calls?: {function?: {name?: string; arguments?: unknown}}[]}; done?: boolean; done_reason?: string; prompt_eval_count?: number; eval_count?: number; error?: string};
const count = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
/**
 * Session V Part 6, tool calling on /api/chat (read 2026-10-05, research §A6): tools as `{type:'function', function:
 * {name, description, parameters}}`; calls arrive whole in `message.tool_calls` with arguments as an object; results go
 * back as `{role:'tool', tool_name, content}`.
 */
const argsObject = (text: string): Record<string, unknown> => { try { const v = JSON.parse(text || '{}') as unknown; return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}; } catch { return {}; } };
function ollamaMessage(m: ChatRequest['messages'][number]): Record<string, unknown> {
  if (m.role === 'tool') return {role: 'tool', tool_name: m.name, content: m.content};
  if (m.role === 'assistant' && m.toolCalls?.length) return {role: 'assistant', content: m.content, tool_calls: m.toolCalls.map(c => ({type: 'function', function: {name: c.name, arguments: argsObject(c.arguments)}}))};
  // Session V Part 7: photos as base64 in `images`, without a data: prefix (read 2026-10-05, research §A6).
  if (m.role === 'user' && m.images?.length) return {role: 'user', content: m.content, images: m.images.map(i => i.data)};
  return {role: m.role, content: m.content};
}
export function ollamaBody(request: Pick<ChatRequest, 'model' | 'system' | 'messages' | 'maxOutputTokens' | 'tools' | 'think' | 'format'>): Record<string, unknown> {
  // `think` (Session X-Local Part 6d): off unless asked; a model without thinking accepts the field (checked on phi4-mini).
  const body: Record<string, unknown> = {model: request.model, stream: true, think: request.think === true, options: {num_predict: request.maxOutputTokens}, messages: [{role: 'system', content: request.system}, ...request.messages.map(ollamaMessage)]};
  if (request.tools?.length) body.tools = request.tools.map(t => ({type: 'function', function: {name: t.name, description: t.description, parameters: t.parameters}}));
  // Phase 2: structured output on the repair round (Ollama enforces the JSON schema; the reply is then the JSON alone).
  if (request.format) body.format = request.format;
  return body;
}
export async function* streamOllama(request: ChatRequest, base: string): AsyncGenerator<ChatEvent> {
  const fetcher = request.fetcher ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  const headers: Record<string, string> = {'content-type': 'application/json'};
  if (request.key) headers.authorization = `Bearer ${request.key}`;
  let response: Response;
  try {
    response = await fetchWithStall(fetcher, `${base}/api/chat`, {method: 'POST', headers, body: JSON.stringify(ollamaBody(request)), signal: request.signal, cache: 'no-store', credentials: 'omit', mode: 'cors'});
  } catch (error) { throw mapNetworkError(request.provider, error, {local: true, online: typeof navigator === 'undefined' ? undefined : navigator.onLine}); }
  if (!response.ok) throw mapHttpError(request.provider, response.status, await response.text().catch(() => ''), response.headers);
  if (!response.body) throw new AiError('unreadable', 'The server sent an empty answer.', {provider: request.provider});
  let calls = 0;
  for await (const value of ndjson(response.body, request.signal)) {
    const line = value as Line;
    if (line.error) throw mapHttpError(request.provider, /not found/i.test(line.error) ? 404 : 500, JSON.stringify({error: line.error}));
    const text = line.message?.content;
    if (typeof text === 'string' && text) yield {type: 'text', delta: text};
    for (const call of line.message?.tool_calls ?? []) if (call.function?.name) yield {type: 'tool-call', call: {id: `ollama_${calls++}`, name: call.function.name, arguments: typeof call.function.arguments === 'string' ? call.function.arguments : JSON.stringify(call.function.arguments ?? {})}};
    if (line.done) {
      const input = count(line.prompt_eval_count), output = count(line.eval_count);
      if (input !== null || output !== null) yield {type: 'usage', input, output};
      yield {type: 'done', reason: line.done_reason ?? null}; return;
    }
  }
  yield {type: 'done', reason: null};
}
