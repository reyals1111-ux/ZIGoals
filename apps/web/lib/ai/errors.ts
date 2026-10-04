import type {ProviderId} from './providers';

/**
 * Errors from the person's own provider, in plain words (ADR-012, Part 1). The kind drives the interface's fix steps;
 * the message never repeats a request header or body, and anything that looks like a key is scrubbed out of a
 * provider's text before it is shown. Status codes and types come from each provider's documentation
 * (docs/product/YOUR_AI_V1.md §1).
 */
export type AiErrorKind = 'bad-key' | 'no-credit' | 'rate-limit' | 'model-missing' | 'local-unreachable' | 'cors' | 'offline' | 'overloaded' | 'blocked' | 'request' | 'server' | 'aborted' | 'unreadable';
export class AiError extends Error {
  readonly kind: AiErrorKind;
  readonly status: number | null;
  readonly retryAfterSeconds: number | null;
  readonly provider: ProviderId | null;
  constructor(kind: AiErrorKind, message: string, options: {status?: number | null; retryAfterSeconds?: number | null; provider?: ProviderId | null; cause?: unknown} = {}) {
    super(message, options.cause === undefined ? undefined : {cause: options.cause});
    this.name = 'AiError'; this.kind = kind; this.status = options.status ?? null; this.retryAfterSeconds = options.retryAfterSeconds ?? null; this.provider = options.provider ?? null;
  }
}
const KEY_PATTERNS = [/sk-[A-Za-z0-9_-]{6,}/g, /AIza[0-9A-Za-z_-]{10,}/g, /xai-[A-Za-z0-9_-]{6,}/g, /\bBearer\s+[A-Za-z0-9._~+/=-]{6,}/gi, /\bgsk_[A-Za-z0-9]{6,}/g, /sk-or-v1-[0-9a-f]{6,}/g];
/** Anything shaped like a provider key or bearer token becomes "[key]". */
export function scrubSecrets(text: string): string { return KEY_PATTERNS.reduce((out, pattern) => out.replace(pattern, '[key]'), text); }
/** `Retry-After` as whole seconds (a delay or an HTTP date), or null. */
export function retryAfterSeconds(headers: Headers | null | undefined, now = Date.now()): number | null {
  const value = headers?.get('retry-after'); if (!value) return null;
  const seconds = Number(value); if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds));
  const date = Date.parse(value); return Number.isFinite(date) ? Math.max(0, Math.ceil((date - now) / 1000)) : null;
}
export type ParsedErrorBody = {type: string | null; code: string | null; status: string | null; message: string | null};
/** The error object of an OpenAI, Anthropic, Gemini, OpenRouter or Ollama answer, whatever its exact shape. */
export function parseErrorBody(text: string): ParsedErrorBody {
  const empty: ParsedErrorBody = {type: null, code: null, status: null, message: null};
  let value: unknown; try { value = JSON.parse(text); } catch { return {...empty, message: text.trim() ? text.trim().slice(0, 240) : null}; }
  if (Array.isArray(value)) value = value[0];
  if (!value || typeof value !== 'object') return empty;
  const root = value as Record<string, unknown>, error = root.error;
  if (typeof error === 'string') return {...empty, message: error};
  const e = (error && typeof error === 'object' ? error : root) as Record<string, unknown>;
  const str = (v: unknown) => typeof v === 'string' ? v : typeof v === 'number' ? String(v) : null;
  return {type: str(e.type), code: str(e.code), status: str(e.status), message: str(e.message)};
}
const detailOf = (parsed: ParsedErrorBody) => parsed.message ? scrubSecrets(parsed.message).slice(0, 240) : '';
/** A failed HTTP answer, mapped by status and the provider's own error type or code. */
export function mapHttpError(provider: ProviderId, status: number, bodyText: string, headers?: Headers | null): AiError {
  const parsed = parseErrorBody(bodyText), detail = detailOf(parsed), retry = retryAfterSeconds(headers);
  const code = `${parsed.code ?? ''} ${parsed.type ?? ''} ${parsed.status ?? ''}`.toLowerCase();
  const o = {status, provider, retryAfterSeconds: retry};
  if (status === 401 || /authentication|invalid_api_key|unauthenticated|invalid credentials/.test(code)) return new AiError('bad-key', 'The key was not accepted. Check it in Settings → ZIGi · your AI, or create a new one at your provider.', o);
  if (status === 402 || /insufficient_quota|credit_balance|billing|spend_limit|usage_limit|insufficient credits/.test(code)) return new AiError('no-credit', 'Your provider reports no credit or a spending limit for this key. Top up or raise the limit there; nothing is billed by ZIGoals.', o);
  if (status === 403) {
    if (provider === 'gemini' || /permission/.test(code)) return new AiError('bad-key', 'This key is not allowed to use that model or service. Check the key\'s permissions at your provider.', o);
    return new AiError('blocked', detail ? `Your provider refused the request: ${detail}` : 'Your provider refused the request.', o);
  }
  if (status === 429) return new AiError('rate-limit', retry ? `Your provider is rate-limiting this key. Try again in about ${retry} s.` : 'Your provider is rate-limiting this key. Try again in a moment.', o);
  if (status === 404) return /model/i.test(detail) || provider === 'local' ? new AiError('model-missing', detail ? `That model is not available here: ${detail}` : 'That model is not available with this key or server. Choose another one.', o) : new AiError('request', detail || 'The provider did not find what the app asked for.', o);
  if (status === 408) return new AiError('server', 'The provider timed out. Try again.', o);
  if (status === 413) return new AiError('request', 'The message is too large for your provider. Lower the context budget in Settings.', o);
  if (status === 502 || status === 503 || status === 529 || /overloaded|unavailable/.test(code)) return new AiError('overloaded', retry ? `Your provider is overloaded right now. Try again in about ${retry} s.` : 'Your provider is overloaded right now. Try again in a moment.', o);
  if (status >= 500) return new AiError('server', 'Your provider had an internal error. Try again in a moment.', o);
  return new AiError('request', detail ? `Your provider rejected the request: ${detail}` : 'Your provider rejected the request.', o);
}
export const isAbortLike = (error: unknown): boolean => (error as {name?: unknown} | null)?.name === 'AbortError' || (error instanceof AiError && error.kind === 'aborted');
/** A fetch that never got an answer: stopped, offline, a local server that is not running, or a browser-side refusal (CORS). */
export function mapNetworkError(provider: ProviderId, error: unknown, context: {local: boolean; online?: boolean}): AiError {
  if (error instanceof AiError) return error;
  if (isAbortLike(error)) return new AiError('aborted', 'Stopped.', {provider});
  if (context.online === false) return new AiError('offline', 'You are offline. Your AI needs a connection; your records stay on this device.', {provider, cause: error});
  if (context.local) return new AiError('local-unreachable', 'No local server answered. Start it, allow this page\'s origin, and try again.', {provider, cause: error});
  return new AiError('cors', 'Your provider could not be reached from this browser. Check your connection; if you are online, the provider refused the browser\'s request.', {provider, cause: error});
}
/** Fix steps for the interface, as data: provider-specific where the documentation gives a switch to flip. */
export function errorSteps(error: AiError, context: {providerName: string; local?: {server: 'ollama' | 'openai-compatible' | null; baseUrl: string}; hostedPage: boolean; keysUrl: string | null}): string[] {
  switch (error.kind) {
    case 'bad-key': return [`Open Settings → ZIGi · your AI and paste the key again.`, context.keysUrl ? `Or create a new key at ${context.keysUrl}.` : 'Or check the server\'s token setting.'];
    case 'no-credit': return [`Add credit or raise the limit at ${context.providerName}.`, 'ZIGoals bills nothing; costs are between you and your provider.'];
    case 'rate-limit': return [error.retryAfterSeconds ? `Wait about ${error.retryAfterSeconds} s, then send again.` : 'Wait a moment, then send again.', 'Shorter messages and a smaller context budget help.'];
    case 'model-missing': return ['Choose another model in the header.', 'A local server needs the model pulled or loaded first.'];
    case 'local-unreachable': {
      const steps = [`Start the server at ${context.local?.baseUrl ?? 'its address'} on this computer.`];
      if (context.local?.server !== 'openai-compatible') steps.push(context.hostedPage ? 'Ollama: allow this site with OLLAMA_ORIGINS=https://alpha.zigoals.app, then restart Ollama.' : 'Ollama allows pages on localhost and 127.0.0.1 by default.');
      if (context.local?.server !== 'ollama') steps.push('LM Studio: Developer → Server Settings → turn "Enable CORS" on.');
      if (context.hostedPage) steps.push('Chrome 142+ asks once to "connect to devices on your local network": allow it.');
      steps.push('A phone cannot reach a computer\'s localhost: use a cloud provider there.');
      return steps;
    }
    case 'cors': return ['Check that you are online.', `If you are, ${context.providerName} refused the browser\'s request; try again in a moment.`];
    case 'offline': return ['Reconnect, then send again. Nothing was lost.'];
    case 'overloaded': return [error.retryAfterSeconds ? `Try again in about ${error.retryAfterSeconds} s.` : 'Try again in a moment.'];
    case 'blocked': return ['Rephrase, or choose another model.'];
    case 'request': return ['Try a shorter message, or choose another model.'];
    case 'server': return ['Try again in a moment.'];
    case 'unreadable': return ['Try again; if it keeps happening, choose another model or provider.'];
    case 'aborted': return [];
  }
}
