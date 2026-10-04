import {AiError, mapHttpError, mapNetworkError} from './errors';
import {PROVIDERS} from './providers';

/**
 * OpenRouter's documented OAuth PKCE flow for third-party web apps (openrouter.ai/docs/use-cases/oauth-pkce, verified
 * 2026-10-04; ADR-012 decision 7). The browser makes a random verifier, sends its SHA-256 challenge to
 * https://openrouter.ai/auth with the callback address, and OpenRouter returns to the callback with a one-time `code`
 * in the URL (not a key, not personal data). The browser exchanges code + verifier at POST /api/v1/auth/keys and
 * receives a key the person controls on OpenRouter. The pending verifier lives in this tab's session storage for a
 * few minutes; the callback URL is cleaned at once. Nothing touches ZIGoals' servers.
 */
export const OPENROUTER_PKCE_KEY = 'zigoals:ai:openrouter-pkce:v1';
export const OPENROUTER_CALLBACK_PARAM = 'ai-auth';
export const OPENROUTER_CALLBACK_PATH = '/app/settings';
const PENDING_MAX_AGE_MS = 10 * 60_000;
type Pending = {version: 1; verifier: string; at: number; remember: boolean};
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
/** A 43–128 character verifier (RFC 7636) and its S256 challenge. */
export async function pkcePair(random: (length: number) => Uint8Array = length => crypto.getRandomValues(new Uint8Array(length))): Promise<{verifier: string; challenge: string}> {
  const verifier = base64url(random(64));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  return {verifier, challenge: base64url(digest)};
}
export const callbackUrl = (origin: string) => `${origin}${OPENROUTER_CALLBACK_PATH}?${OPENROUTER_CALLBACK_PARAM}=openrouter`;
/** Stores the verifier for this tab and returns the address to open. */
export async function beginOpenRouterSignIn({origin, remember, storage, now = Date.now()}: {origin: string; remember: boolean; storage: Pick<Storage, 'setItem'>; now?: number}): Promise<string> {
  const {verifier, challenge} = await pkcePair();
  const pending: Pending = {version: 1, verifier, at: now, remember};
  storage.setItem(OPENROUTER_PKCE_KEY, JSON.stringify(pending));
  const url = new URL(`${PROVIDERS.openrouter.origin}/auth`);
  url.searchParams.set('callback_url', callbackUrl(origin));
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}
/** The one-time code from a callback address, or null when this is not the callback. */
export function readOpenRouterCallback(href: string): string | null {
  try { const url = new URL(href); if (url.searchParams.get(OPENROUTER_CALLBACK_PARAM) !== 'openrouter') return null; const code = url.searchParams.get('code'); return code && /^[A-Za-z0-9._~-]{8,512}$/.test(code) ? code : null; } catch { return null; }
}
/** The same address without the callback parameters, for history.replaceState. */
export function cleanedCallbackUrl(href: string): string {
  const url = new URL(href); url.searchParams.delete(OPENROUTER_CALLBACK_PARAM); url.searchParams.delete('code'); url.hash = '#your-ai';
  return `${url.pathname}${url.search}${url.hash}`;
}
export function readPending(storage: Pick<Storage, 'getItem' | 'removeItem'>, now = Date.now()): Pending | null {
  let raw: string | null; try { raw = storage.getItem(OPENROUTER_PKCE_KEY); } catch { return null; }
  if (!raw) return null;
  try { const value = JSON.parse(raw) as Pending; if (value.version !== 1 || typeof value.verifier !== 'string' || typeof value.at !== 'number' || now - value.at > PENDING_MAX_AGE_MS) return null; return {version: 1, verifier: value.verifier, at: value.at, remember: !!value.remember}; } catch { return null; }
}
/** Exchanges the code for the key; the pending verifier is removed whatever happens. */
export async function exchangeOpenRouterCode({code, storage, fetcher = fetch, now = Date.now()}: {code: string; storage: Pick<Storage, 'getItem' | 'removeItem'>; fetcher?: typeof fetch; now?: number}): Promise<{key: string; remember: boolean}> {
  const pending = readPending(storage, now);
  try { storage.removeItem(OPENROUTER_PKCE_KEY); } catch { /* nothing to remove */ }
  if (!pending) throw new AiError('request', 'The sign-in took too long or started in another tab. Start it again from Settings.', {provider: 'openrouter'});
  let response: Response;
  try { response = await fetcher(`${PROVIDERS.openrouter.origin}/api/v1/auth/keys`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({code, code_verifier: pending.verifier, code_challenge_method: 'S256'})}); }
  catch (error) { throw mapNetworkError('openrouter', error, {local: false, online: typeof navigator === 'undefined' ? undefined : navigator.onLine}); }
  if (!response.ok) throw mapHttpError('openrouter', response.status, await response.text().catch(() => ''), response.headers);
  let key: unknown; try { key = ((await response.json()) as {key?: unknown}).key; } catch { throw new AiError('unreadable', 'OpenRouter\'s answer could not be read.', {provider: 'openrouter'}); }
  if (typeof key !== 'string' || key.length < 8) throw new AiError('unreadable', 'OpenRouter returned no key.', {provider: 'openrouter'});
  return {key, remember: pending.remember};
}
