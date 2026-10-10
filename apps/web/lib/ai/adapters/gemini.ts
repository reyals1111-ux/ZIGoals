import {AiError, mapHttpError, mapNetworkError} from '../errors';
import {sseEvents, parseJson, fetchWithStall} from '../sse';
import type {ChatEvent, ChatRequest} from '../types';

/**
 * Gemini's `streamGenerateContent` with `alt=sse` (docs/product/YOUR_AI_V1.md §1, read 2026-10-04). The key goes in the
 * `x-goog-api-key` header, never in the URL. Roles are `user` and `model`; the system prompt is `systemInstruction`;
 * each `data:` payload is a GenerateContentResponse with `candidates[0].content.parts[].text`, `finishReason` and
 * `usageMetadata.promptTokenCount`/`candidatesTokenCount`. A blocked prompt comes back as `promptFeedback.blockReason`.
 */
type Part = {text?: string; functionCall?: {id?: string; name?: string; args?: Record<string, unknown>}; thoughtSignature?: string; thought?: boolean};
type Response_ = {candidates?: {content?: {parts?: Part[]}; finishReason?: string}[]; usageMetadata?: {promptTokenCount?: number; candidatesTokenCount?: number}; promptFeedback?: {blockReason?: string}; error?: {code?: number; message?: string; status?: string}};
const count = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
/** Model ids are listed as `models/<id>`; the chat path wants the bare id. */
export const geminiModelId = (name: string) => name.replace(/^models\//, '');
/**
 * Session V Part 6, function calling on generateContent (read 2026-10-05, research §A3): tools as
 * `{functionDeclarations:[{name, description, parametersJsonSchema}]}`, no toolConfig (AUTO is the default). Calls
 * arrive whole as `functionCall` parts. The model's turn is echoed back unchanged (its parts carry thought signatures),
 * and the results go back as `functionResponse` parts in a turn with role `user`.
 */
const parsedArgs = (text: string): Record<string, unknown> => { try { const v = JSON.parse(text || '{}') as unknown; return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}; } catch { return {}; } };
const resultObject = (text: string): Record<string, unknown> => { try { const v = JSON.parse(text) as unknown; return v && typeof v === 'object' && !Array.isArray(v) ? {result: v} : {result: text}; } catch { return {result: text}; } };
function geminiContents(messages: ChatRequest['messages']): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const m of messages) {
    if (m.role === 'tool') {
      const part = {functionResponse: {...(m.toolCallId && !m.toolCallId.startsWith('gemini_') ? {id: m.toolCallId} : {}), name: m.name, response: resultObject(m.content)}}, last = out.at(-1);
      if (last && last.role === 'user' && Array.isArray(last.parts) && (last.parts as {functionResponse?: unknown}[]).every(p => p.functionResponse)) (last.parts as unknown[]).push(part);
      else out.push({role: 'user', parts: [part]});
    } else if (m.role === 'assistant' && m.toolCalls?.length) out.push(m.raw && typeof m.raw === 'object' ? m.raw as Record<string, unknown> : {role: 'model', parts: [...(m.content ? [{text: m.content}] : []), ...m.toolCalls.map(c => ({functionCall: {name: c.name, args: parsedArgs(c.arguments)}}))]});
    // Session V Part 7: a photo as an inlineData part before the words (read 2026-10-05, research §A3).
    else if (m.role === 'user' && m.images?.length) out.push({role: 'user', parts: [...m.images.map(i => ({inlineData: {mimeType: i.mime, data: i.data}})), {text: m.content}]});
    else out.push({role: m.role === 'assistant' ? 'model' : 'user', parts: [{text: m.content}]});
  }
  return out;
}
export function geminiBody(request: Pick<ChatRequest, 'system' | 'messages' | 'maxOutputTokens' | 'tools'>): Record<string, unknown> {
  const body: Record<string, unknown> = {systemInstruction: {parts: [{text: request.system}]}, contents: geminiContents(request.messages), generationConfig: {maxOutputTokens: request.maxOutputTokens}};
  if (request.tools?.length) body.tools = [{functionDeclarations: request.tools.map(t => ({name: t.name, description: t.description, parametersJsonSchema: t.parameters}))}];
  return body;
}
export async function* streamGemini(request: ChatRequest, origin: string): AsyncGenerator<ChatEvent> {
  const fetcher = request.fetcher ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  let response: Response;
  try {
    response = await fetchWithStall(fetcher, `${origin}/v1beta/models/${encodeURIComponent(geminiModelId(request.model))}:streamGenerateContent?alt=sse`, {method: 'POST', headers: {'content-type': 'application/json', accept: 'text/event-stream', 'x-goog-api-key': request.key ?? ''}, body: JSON.stringify(geminiBody(request)), signal: request.signal, cache: 'no-store', credentials: 'omit', mode: 'cors'});
  } catch (error) { throw mapNetworkError(request.provider, error, {local: false, online: typeof navigator === 'undefined' ? undefined : navigator.onLine}); }
  if (!response.ok) throw mapHttpError(request.provider, response.status, await response.text().catch(() => ''), response.headers);
  if (!response.body) throw new AiError('unreadable', 'The provider sent an empty answer.', {provider: request.provider});
  let reason: string | null = null, called = 0;
  // Every part the model sent, in order, so its turn can be echoed back unchanged when it called a function.
  const parts: Part[] = [];
  for await (const sse of sseEvents(response.body, request.signal)) {
    const chunk = parseJson(sse.data) as Response_;
    if (chunk.error) throw mapHttpError(request.provider, chunk.error.code ?? 500, JSON.stringify({error: chunk.error}));
    if (chunk.promptFeedback?.blockReason) throw new AiError('blocked', 'Your AI declined to answer this message (its safety filter).', {provider: request.provider});
    const candidate = chunk.candidates?.[0];
    const text = (candidate?.content?.parts ?? []).filter(part => !part.thought).map(part => part.text ?? '').join('');
    if (request.tools?.length) parts.push(...(candidate?.content?.parts ?? []));
    for (const part of candidate?.content?.parts ?? []) if (part.functionCall?.name) yield {type: 'tool-call', call: {id: part.functionCall.id ?? `gemini_${called++}`, name: part.functionCall.name, arguments: JSON.stringify(part.functionCall.args ?? {})}};
    if (text) yield {type: 'text', delta: text};
    if (candidate?.finishReason) reason = candidate.finishReason;
    if (chunk.usageMetadata) yield {type: 'usage', input: count(chunk.usageMetadata.promptTokenCount), output: count(chunk.usageMetadata.candidatesTokenCount)};
  }
  if (parts.some(p => p.functionCall)) yield {type: 'model-turn', raw: {role: 'model', parts}};
  yield {type: 'done', reason};
}
