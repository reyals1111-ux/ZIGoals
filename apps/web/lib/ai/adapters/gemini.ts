import {AiError, mapHttpError, mapNetworkError} from '../errors';
import {sseEvents, parseJson} from '../sse';
import type {ChatEvent, ChatRequest} from '../types';

/**
 * Gemini's `streamGenerateContent` with `alt=sse` (docs/product/YOUR_AI_V1.md §1, read 2026-10-04). The key goes in the
 * `x-goog-api-key` header, never in the URL. Roles are `user` and `model`; the system prompt is `systemInstruction`;
 * each `data:` payload is a GenerateContentResponse with `candidates[0].content.parts[].text`, `finishReason` and
 * `usageMetadata.promptTokenCount`/`candidatesTokenCount`. A blocked prompt comes back as `promptFeedback.blockReason`.
 */
type Response_ = {candidates?: {content?: {parts?: {text?: string}[]}; finishReason?: string}[]; usageMetadata?: {promptTokenCount?: number; candidatesTokenCount?: number}; promptFeedback?: {blockReason?: string}; error?: {code?: number; message?: string; status?: string}};
const count = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
/** Model ids are listed as `models/<id>`; the chat path wants the bare id. */
export const geminiModelId = (name: string) => name.replace(/^models\//, '');
export function geminiBody(request: Pick<ChatRequest, 'system' | 'messages' | 'maxOutputTokens'>): Record<string, unknown> {
  return {systemInstruction: {parts: [{text: request.system}]}, contents: request.messages.map(m => ({role: m.role === 'assistant' ? 'model' : 'user', parts: [{text: m.content}]})), generationConfig: {maxOutputTokens: request.maxOutputTokens}};
}
export async function* streamGemini(request: ChatRequest, origin: string): AsyncGenerator<ChatEvent> {
  const fetcher = request.fetcher ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  let response: Response;
  try {
    response = await fetcher(`${origin}/v1beta/models/${encodeURIComponent(geminiModelId(request.model))}:streamGenerateContent?alt=sse`, {method: 'POST', headers: {'content-type': 'application/json', accept: 'text/event-stream', 'x-goog-api-key': request.key ?? ''}, body: JSON.stringify(geminiBody(request)), signal: request.signal, cache: 'no-store', credentials: 'omit', mode: 'cors'});
  } catch (error) { throw mapNetworkError(request.provider, error, {local: false, online: typeof navigator === 'undefined' ? undefined : navigator.onLine}); }
  if (!response.ok) throw mapHttpError(request.provider, response.status, await response.text().catch(() => ''), response.headers);
  if (!response.body) throw new AiError('unreadable', 'The provider sent an empty answer.', {provider: request.provider});
  let reason: string | null = null;
  for await (const sse of sseEvents(response.body, request.signal)) {
    const chunk = parseJson(sse.data) as Response_;
    if (chunk.error) throw mapHttpError(request.provider, chunk.error.code ?? 500, JSON.stringify({error: chunk.error}));
    if (chunk.promptFeedback?.blockReason) throw new AiError('blocked', 'Your AI declined to answer this message (its safety filter).', {provider: request.provider});
    const candidate = chunk.candidates?.[0];
    const text = (candidate?.content?.parts ?? []).map(part => part.text ?? '').join('');
    if (text) yield {type: 'text', delta: text};
    if (candidate?.finishReason) reason = candidate.finishReason;
    if (chunk.usageMetadata) yield {type: 'usage', input: count(chunk.usageMetadata.promptTokenCount), output: count(chunk.usageMetadata.candidatesTokenCount)};
  }
  yield {type: 'done', reason};
}
