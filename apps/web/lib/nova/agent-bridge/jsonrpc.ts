/**
 * Session AM-2 (step 4c): JSON-RPC 2.0 framing for the hand-written MCP client (./client.ts). Pure.
 *
 * NOVA only ever sends a request or a notification and reads the one response that carries its own id. Whatever else a
 * server puts on the wire is data to skip: its notifications (progress, log lines), its own requests to the client
 * (sampling, roots, elicitation: NOVA offers none of those capabilities and never answers them), a response to an id NOVA
 * did not send, a batch. Nothing a server sends is ever run, followed or obeyed.
 */
export type RpcId = number;
export type RpcRequest = {jsonrpc: '2.0'; id: RpcId; method: string; params?: Record<string, unknown>};
export type RpcNotification = {jsonrpc: '2.0'; method: string; params?: Record<string, unknown>};
export type RpcError = {code: number; message: string};
export type RpcAnswer = {id: RpcId; ok: true; result: Record<string, unknown>} | {id: RpcId; ok: false; error: RpcError};
export const RPC_MESSAGE_MAX = 300;

export const rpcRequest = (id: RpcId, method: string, params?: Record<string, unknown>): RpcRequest => ({jsonrpc: '2.0', id, method, ...(params ? {params} : {})});
export const rpcNotification = (method: string, params?: Record<string, unknown>): RpcNotification => ({jsonrpc: '2.0', method, ...(params ? {params} : {})});

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
/** One message as an answer to `id`, or null when it is anything else (a notification, a server request, another id, not JSON-RPC 2.0, both or neither of result and error). */
export function answerIn(message: unknown, id: RpcId): RpcAnswer | null {
  if (!isObject(message) || message.jsonrpc !== '2.0' || message.id !== id || 'method' in message) return null;
  const hasResult = 'result' in message, hasError = 'error' in message;
  if (hasResult === hasError) return null;
  if (hasResult) return isObject(message.result) ? {id, ok: true, result: message.result} : null;
  const error = message.error;
  if (!isObject(error) || typeof error.code !== 'number' || !Number.isFinite(error.code)) return null;
  const text = typeof error.message === 'string' ? error.message : '';
  return {id, ok: false, error: {code: error.code, message: text.replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, RPC_MESSAGE_MAX)}};
}
/** A decoded body (one message, or a batch array): the answer to `id` if it is there. */
export function answerInBody(body: unknown, id: RpcId): RpcAnswer | null {
  for (const message of Array.isArray(body) ? body.slice(0, 64) : [body]) { const answer = answerIn(message, id); if (answer) return answer; }
  return null;
}
/** JSON text to a value, or `undefined` when it is not JSON (never throws). */
export function parseJson(text: string): unknown {
  try { return JSON.parse(text) as unknown; } catch { return undefined; }
}
