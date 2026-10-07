import {z} from 'zod';
import {SPOTIFY_TOKEN, redirectUri} from './oauth';
import type {LinkTokens} from '../../links/token-store';

/**
 * Spotify's token endpoint (tutorials/code-pkce-flow and tutorials/refreshing-tokens, read 2026-10-07): a form-encoded
 * POST from the browser with the public client id and no secret. An access token lasts an hour; a refresh may or may not
 * return a new refresh token (keep the old one when it does not); `invalid_grant` means start connecting again.
 */
export class SpotifyReconnect extends Error { constructor() { super('Spotify asks you to connect again. Your choices are kept.'); this.name = 'SpotifyReconnect'; } }
const tokenSchema = z.object({access_token: z.string().min(1).max(4000), token_type: z.string(), expires_in: z.number().int().positive().max(86400), refresh_token: z.string().min(1).max(4000).optional(), scope: z.string().max(1000).optional()});
const errorSchema = z.object({error: z.string().max(100), error_description: z.string().max(500).optional()});
async function post(body: URLSearchParams, fetcher: typeof fetch): Promise<z.infer<typeof tokenSchema>> {
  const response = await fetcher(SPOTIFY_TOKEN, {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: body.toString(), credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: AbortSignal.timeout(15000)});
  const text = await response.text();
  let data: unknown; try { data = JSON.parse(text); } catch { data = null; }
  if (!response.ok) { const error = errorSchema.safeParse(data); if (error.success && error.data.error === 'invalid_grant') throw new SpotifyReconnect(); throw Error('Spotify did not answer as expected. Nothing was changed.'); }
  const parsed = tokenSchema.safeParse(data);
  if (!parsed.success || parsed.data.token_type.toLowerCase() !== 'bearer') throw Error('Spotify did not answer as expected. Nothing was changed.');
  return parsed.data;
}
const sealed = (data: z.infer<typeof tokenSchema>, now: number, previous?: string): LinkTokens => ({accessToken: data.access_token, ...(data.refresh_token ?? previous ? {refreshToken: data.refresh_token ?? previous} : {}), expiresAt: new Date(now + (data.expires_in - 60) * 1000).toISOString(), ...(data.scope ? {scope: data.scope} : {})});
export async function exchangeCode({clientId, origin, code, verifier}: {clientId: string; origin: string; code: string; verifier: string}, fetcher: typeof fetch = fetch, now = Date.now()): Promise<LinkTokens> {
  return sealed(await post(new URLSearchParams({grant_type: 'authorization_code', code, redirect_uri: redirectUri(origin), client_id: clientId, code_verifier: verifier}), fetcher), now);
}
export async function refreshTokens({clientId, tokens}: {clientId: string; tokens: LinkTokens}, fetcher: typeof fetch = fetch, now = Date.now()): Promise<LinkTokens> {
  if (!tokens.refreshToken) throw new SpotifyReconnect();
  return sealed(await post(new URLSearchParams({grant_type: 'refresh_token', refresh_token: tokens.refreshToken, client_id: clientId}), fetcher), now, tokens.refreshToken);
}
export const tokensFresh = (tokens: LinkTokens, now = Date.now()) => !!tokens.expiresAt && Date.parse(tokens.expiresAt) > now;
