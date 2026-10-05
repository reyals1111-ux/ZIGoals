import {AiError, mapHttpError, mapNetworkError} from '../errors';
import {ndjson} from '../sse';
import type {ChatEvent, ChatRequest} from '../types';

/**
 * Ollama's native chat API (docs/product/YOUR_AI_V1.md §1, read 2026-10-04): `POST /api/chat` streams one JSON object
 * per line, `{message:{role,content}, done}`; the last line carries `prompt_eval_count` and `eval_count`, and
 * `done_reason`. The output cap is `options.num_predict`. No key: the server runs on this computer.
 */
type Line = {message?: {content?: string}; done?: boolean; done_reason?: string; prompt_eval_count?: number; eval_count?: number; error?: string};
const count = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
export function ollamaBody(request: Pick<ChatRequest, 'model' | 'system' | 'messages' | 'maxOutputTokens'>): Record<string, unknown> {
  return {model: request.model, stream: true, options: {num_predict: request.maxOutputTokens}, messages: [{role: 'system', content: request.system}, ...request.messages.map(m => ({role: m.role, content: m.content}))]};
}
export async function* streamOllama(request: ChatRequest, base: string): AsyncGenerator<ChatEvent> {
  const fetcher = request.fetcher ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  const headers: Record<string, string> = {'content-type': 'application/json'};
  if (request.key) headers.authorization = `Bearer ${request.key}`;
  let response: Response;
  try {
    response = await fetcher(`${base}/api/chat`, {method: 'POST', headers, body: JSON.stringify(ollamaBody(request)), signal: request.signal, cache: 'no-store', credentials: 'omit', mode: 'cors'});
  } catch (error) { throw mapNetworkError(request.provider, error, {local: true, online: typeof navigator === 'undefined' ? undefined : navigator.onLine}); }
  if (!response.ok) throw mapHttpError(request.provider, response.status, await response.text().catch(() => ''), response.headers);
  if (!response.body) throw new AiError('unreadable', 'The server sent an empty answer.', {provider: request.provider});
  for await (const value of ndjson(response.body, request.signal)) {
    const line = value as Line;
    if (line.error) throw mapHttpError(request.provider, /not found/i.test(line.error) ? 404 : 500, JSON.stringify({error: line.error}));
    const text = line.message?.content;
    if (typeof text === 'string' && text) yield {type: 'text', delta: text};
    if (line.done) {
      const input = count(line.prompt_eval_count), output = count(line.eval_count);
      if (input !== null || output !== null) yield {type: 'usage', input, output};
      yield {type: 'done', reason: line.done_reason ?? null}; return;
    }
  }
  yield {type: 'done', reason: null};
}
