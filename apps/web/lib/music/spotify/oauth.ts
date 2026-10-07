import {challengeFor, randomToken} from '../../health-link/oauth';

/**
 * Connecting Spotify (Session W Part 20): Authorization Code with PKCE from the browser, as Spotify documents it for
 * JavaScript web apps (https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow, read 2026-10-07).
 * A full-page visit (the app isolates its window, so no popup) with a 128-bit `state` used once, bound to this tab, the
 * account scope and 10 minutes; a 64-character verifier (43–128 allowed: letters, digits, `_`, `.`, `-`, `~`), its
 * SHA-256 challenge base64url-encoded without `=`. The pending record lives in this tab's session storage only and is
 * read and removed, with the address cleaned, before anything is awaited. One fixed redirect address per origin, no query.
 */
export const SPOTIFY_AUTHORIZE = 'https://accounts.spotify.com/authorize';
export const SPOTIFY_TOKEN = 'https://accounts.spotify.com/api/token';
/** Read the playback state and the current track; control playback and devices (scopes page, read 2026-10-07). */
export const SPOTIFY_SCOPES = ['user-read-playback-state', 'user-read-currently-playing', 'user-modify-playback-state'] as const;
export const SPOTIFY_CALLBACK_PATH = '/app/music/spotify';
export const MUSIC_PENDING_KEY = 'zigoals:music-pending:v1';
const LIFETIME_MS = 10 * 60_000;
type Pending = {state: string; verifier: string; scope: string; back: string; at: number};
/** Spotify client ids are 32 hexadecimal characters; anything else means "not set up". */
export const validClientId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{32}$/i.test(value);
export const redirectUri = (origin: string) => `${origin}${SPOTIFY_CALLBACK_PATH}`;
/** Only an address inside the app may be returned to after connecting. */
export const safeBack = (path: string) => /^\/app(?:[/?#][^\s\\]*)?$/.test(path) && !/\/\.\.?(?:[/?#]|$)/.test(path) && !path.startsWith(SPOTIFY_CALLBACK_PATH) ? path : '/app/settings';

export async function beginSpotify({clientId, origin, scope, back}: {clientId: string; origin: string; scope: string; back: string}, storage: Storage = sessionStorage, now = Date.now()): Promise<string> {
  const state = randomToken(16), verifier = randomToken(48);
  storage.setItem(MUSIC_PENDING_KEY, JSON.stringify({state, verifier, scope, back: safeBack(back), at: now} satisfies Pending));
  const url = new URL(SPOTIFY_AUTHORIZE);
  url.search = new URLSearchParams({client_id: clientId, response_type: 'code', redirect_uri: redirectUri(origin), code_challenge_method: 'S256', code_challenge: await challengeFor(verifier), state, scope: SPOTIFY_SCOPES.join(' ')}).toString();
  return url.href;
}
export type SpotifyCallback = {kind: 'none'} | {kind: 'denied'; back: string} | {kind: 'refused'; message: string} | {kind: 'code'; code: string; verifier: string; back: string};
/** Synchronous on purpose: the caller cleans the address right after, before any await. The pending record goes whatever the answer. */
export function readSpotifyCallback(search: string, scope: string, storage: Storage = sessionStorage, now = Date.now()): SpotifyCallback {
  const params = new URLSearchParams(search), state = params.get('state'), code = params.get('code'), error = params.get('error');
  if (!state || (!code && !error)) return {kind: 'none'};
  let pending: Pending | null = null;
  try { const raw = storage.getItem(MUSIC_PENDING_KEY); storage.removeItem(MUSIC_PENDING_KEY); const p = raw ? JSON.parse(raw) as Pending : null; pending = p && typeof p.state === 'string' && typeof p.verifier === 'string' ? p : null; } catch { pending = null; }
  if (!pending || pending.state !== state) return {kind: 'refused', message: 'This answer from Spotify did not match a connection started in this tab, so it was ignored. Connect again from Settings → Music.'};
  if (now - pending.at > LIFETIME_MS) return {kind: 'refused', message: 'Connecting took longer than 10 minutes, so it was not finished. Connect again from Settings → Music.'};
  if (pending.scope !== scope) return {kind: 'refused', message: 'Your account changed or locked while connecting, so nothing was kept. Connect again.'};
  if (error) return {kind: 'denied', back: safeBack(pending.back)};
  return {kind: 'code', code: code!, verifier: pending.verifier, back: safeBack(pending.back)};
}
