import {LICHESS} from './lichess';

/**
 * Session AK (ADR-036 Q8, lane C): connecting Lichess with OAuth 2 PKCE from the browser, as Lichess documents it
 * (OpenAPI v2.0.178, read 2026-10-31; docs/research/session-ak/FORMATS.md (c)): an unregistered public client (the
 * client id is any unique string), S256 only, a token that lasts about a year, no refresh token. A full-page visit (the
 * app isolates its window, so no popup) with a 128-bit `state` used once, valid for 10 minutes, and a 64-character
 * verifier. The pending record lives in this tab's session storage only, and is read and removed, with the address
 * cleaned, before anything is awaited. The answer comes back to /app/chess?lichess=callback.
 */
export const LICHESS_CLIENT_ID = 'zigoals.app';
export const LICHESS_AUTHORIZE = `${LICHESS}/oauth`, LICHESS_TOKEN = `${LICHESS}/api/token`;
/** Board API play; Lichess's challenge endpoints also accept a board:play token (their security lists it). */
export const LICHESS_SCOPES = ['board:play'] as const;
export const LICHESS_PENDING_KEY = 'zigoals:lichess-pending:v1';
export const LICHESS_CALLBACK = '/app/chess?lichess=callback';
const LIFETIME_MS = 10 * 60_000;
type Pending = {state: string; verifier: string; at: number};

const b64url = (bytes: Uint8Array) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
/** A random URL-safe string from `bytes` random bytes (48 bytes → 64 characters, inside PKCE's 43–128). */
export const randomToken = (bytes = 16) => b64url(crypto.getRandomValues(new Uint8Array(bytes)));
/** RFC 7636 S256: base64url(SHA-256(verifier)) without padding, by WebCrypto. */
export async function s256(verifier: string): Promise<string> {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) throw new Error('A PKCE verifier has 43 to 128 unreserved characters.');
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
}
export const lichessRedirectUri = (origin: string) => `${origin}${LICHESS_CALLBACK}`;
/** Prepares the visit: the pending record in this tab, then Lichess's address to go to. */
export async function beginLichess(origin: string, storage: Storage = sessionStorage, now = Date.now()): Promise<string> {
  const state = randomToken(16), verifier = randomToken(48);
  storage.setItem(LICHESS_PENDING_KEY, JSON.stringify({state, verifier, at: now} satisfies Pending));
  const url = new URL(LICHESS_AUTHORIZE);
  url.search = new URLSearchParams({response_type: 'code', client_id: LICHESS_CLIENT_ID, redirect_uri: lichessRedirectUri(origin), code_challenge_method: 'S256', code_challenge: await s256(verifier), scope: LICHESS_SCOPES.join(' '), state}).toString();
  return url.href;
}
export type LichessCallback = {kind: 'none'} | {kind: 'denied'} | {kind: 'refused'; message: string} | {kind: 'code'; code: string; verifier: string};
export const isLichessCallback = (search: string) => new URLSearchParams(search).get('lichess') === 'callback';
/** Synchronous on purpose: the caller cleans the address right after, before any await. The pending record goes whatever the answer. */
export function readLichessCallback(search: string, storage: Storage = sessionStorage, now = Date.now()): LichessCallback {
  const params = new URLSearchParams(search), state = params.get('state'), code = params.get('code'), error = params.get('error');
  if (params.get('lichess') !== 'callback' || !state || (!code && !error)) return {kind: 'none'};
  let pending: Pending | null = null;
  try {
    const raw = storage.getItem(LICHESS_PENDING_KEY); storage.removeItem(LICHESS_PENDING_KEY);
    const p = raw ? JSON.parse(raw) as Partial<Pending> : null;
    pending = p && typeof p.state === 'string' && typeof p.verifier === 'string' && typeof p.at === 'number' ? p as Pending : null;
  } catch { pending = null; }
  if (!pending || pending.state !== state) return {kind: 'refused', message: 'This answer from Lichess did not match a connection started in this tab, so it was ignored. Connect again.'};
  if (now - pending.at > LIFETIME_MS || now < pending.at) return {kind: 'refused', message: 'Connecting took longer than 10 minutes, so it was not finished. Connect again.'};
  if (error) return {kind: 'denied'};
  if (!code || code.length > 512) return {kind: 'refused', message: 'Lichess sent an answer this page cannot read. Connect again.'};
  return {kind: 'code', code, verifier: pending.verifier};
}
export type LichessGrant = {accessToken: string; expiresAt: string | null};
export const TOKEN_PATTERN = /^[A-Za-z0-9_.~-]{8,512}$/;
/** The token exchange: a form POST to Lichess with the code, the verifier, and the same redirect address and client id. */
export async function exchangeLichessCode({origin, code, verifier}: {origin: string; code: string; verifier: string}, fetcher: typeof fetch = fetch, now = Date.now()): Promise<LichessGrant> {
  const body = new URLSearchParams({grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: lichessRedirectUri(origin), client_id: LICHESS_CLIENT_ID});
  let response: Response;
  try { response = await fetcher(LICHESS_TOKEN, {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: body.toString(), credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', mode: 'cors', signal: AbortSignal.timeout(15_000)}); }
  catch { throw new Error('Lichess could not be reached. Nothing was kept; connect again.'); }
  const text = (await response.text().catch(() => '')).slice(0, 16_384);
  let data: unknown = null; try { data = JSON.parse(text); } catch { data = null; }
  const d = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  if (!response.ok || typeof d.access_token !== 'string' || !TOKEN_PATTERN.test(d.access_token) || typeof d.token_type !== 'string' || d.token_type.toLowerCase() !== 'bearer') throw new Error('Lichess did not accept the connection. Nothing was kept; connect again.');
  const expires = typeof d.expires_in === 'number' && Number.isFinite(d.expires_in) && d.expires_in > 0 ? new Date(now + Math.min(d.expires_in, 2 * 366 * 86400) * 1000).toISOString() : null;
  return {accessToken: d.access_token, expiresAt: expires};
}
