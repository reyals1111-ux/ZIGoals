import {isLinkProvider, providerInfo, type LinkProvider} from './providers';

/**
 * Connecting a health service (Session W Part 8, the OAuth rules of the plan): a full-page visit to the provider (the app
 * isolates its window, so no popup) with a 128-bit `state` that is used once, bound to the provider and the account and
 * valid for 10 minutes; Oura also gets PKCE (S256). The pending record lives in this tab's session storage only, and is
 * read and removed, and the address cleaned of the code, before anything is awaited, so a reload, a second tab or React
 * running an effect twice can never use a code again. A refusal at the provider (`error=access_denied`) is said plainly.
 */
export const PENDING_KEY = 'zigoals:link-pending:v1';
const LIFETIME_MS = 10 * 60_000;
type Pending = {provider: LinkProvider; state: string; scope: string; at: number; verifier?: string};
const b64url = (bytes: Uint8Array) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
export const randomToken = (bytes = 16) => b64url(crypto.getRandomValues(new Uint8Array(bytes)));
export async function challengeFor(verifier: string): Promise<string> { return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))); }
/** The provider's address with ZIGoals' public client id, the one redirect address, the scopes and the state. */
export function authorizeUrl(provider: LinkProvider, {clientId, redirectUri}: {clientId: string; redirectUri: string}, state: string, challenge?: string): string {
  const info = providerInfo(provider), url = new URL(info.authorize);
  url.search = new URLSearchParams({response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope: info.scopes.join(info.scopeSeparator), state, ...(provider === 'strava' ? {approval_prompt: 'auto'} : {}), ...(challenge ? {code_challenge: challenge, code_challenge_method: 'S256'} : {})}).toString();
  return url.href;
}
/** Prepares the visit: the pending record in this tab, then the provider's address to go to. */
export async function beginLink(provider: LinkProvider, config: {clientId: string; redirectUri: string}, scope: string, storage: Storage = sessionStorage, now = Date.now()): Promise<string> {
  const state = randomToken(16), verifier = providerInfo(provider).pkce ? randomToken(48) : undefined;
  const pending: Pending = {provider, state, scope, at: now, ...(verifier ? {verifier} : {})};
  storage.setItem(PENDING_KEY, JSON.stringify(pending));
  return authorizeUrl(provider, config, state, verifier ? await challengeFor(verifier) : undefined);
}
export type Callback = {kind: 'none'} | {kind: 'denied'; provider: LinkProvider | null} | {kind: 'refused'; message: string} | {kind: 'code'; provider: LinkProvider; code: string; verifier?: string};
/**
 * The provider's answer in the address, checked against this tab's pending record, which is removed whatever the answer.
 * Synchronous on purpose: the caller cleans the address right after, before any await.
 */
export function readCallback(search: string, scope: string | null, storage: Storage = sessionStorage, now = Date.now()): Callback {
  const params = new URLSearchParams(search), state = params.get('state'), code = params.get('code'), error = params.get('error');
  if (!state || (!code && !error)) return {kind: 'none'};
  let pending: Pending | null = null;
  try { const raw = storage.getItem(PENDING_KEY); storage.removeItem(PENDING_KEY); const p = raw ? JSON.parse(raw) as Pending : null; pending = p && isLinkProvider(p.provider) && typeof p.state === 'string' ? p : null; } catch { pending = null; }
  if (!pending || pending.state !== state) return {kind: 'refused', message: 'This answer from a health service did not match a connection started in this tab, so it was ignored. Start again from Devices.'};
  if (now - pending.at > LIFETIME_MS) return {kind: 'refused', message: 'The connection took longer than 10 minutes, so it was not finished. Start again from Devices.'};
  if (scope === null || pending.scope !== scope) return {kind: 'refused', message: 'Your account changed or locked while connecting, so nothing was kept. Unlock it and connect again.'};
  if (error) return {kind: 'denied', provider: pending.provider};
  return {kind: 'code', provider: pending.provider, code: code!, ...(pending.verifier ? {verifier: pending.verifier} : {})};
}
