import type {LinkTokens} from '../links/token-store';
import type {LinkProvider} from './providers';

/**
 * The app's side of `/api/health-link` (Session W Part 8): each call names the account (the route checks it against the
 * session) and one action. The answers' errors become plain sentences; nothing is logged.
 */
export type LinkConfig = {redirectUri: string; providers: {id: LinkProvider; clientId: string}[]};
export class LinkError extends Error { constructor(readonly code: string, message: string) { super(message); this.name = 'LinkError'; } }
const WORDS: Record<string, string> = {
  HEALTH_LINK_UNAVAILABLE: 'Linking a health account is not set up for this ZIGoals yet.',
  HEALTH_LINK_CONFIGURATION_REQUIRED: 'Linking a health account is not set up for this ZIGoals yet.',
  HEALTH_LINK_PAUSED: 'Linking health accounts is paused for now. Your records stay as they are.',
  SIGN_IN_REQUIRED: 'Sign in to your ZIGoals account (Settings) to link a health account.',
  ACCOUNT_CHANGED: 'Your account changed in another tab. Reload this page.',
  RECONNECT_REQUIRED: 'The link expired or was removed at the service. Connect again.',
  TOKEN_EXPIRED: 'The link expired. Connect again.',
  PROVIDER_FORBIDDEN: 'The service refused access (a membership may have ended, or access was removed there).',
  PROVIDER_BUSY: 'The service is busy. Try again later.',
  PROVIDER_PAUSED: 'The service has been failing, so ZIGoals is waiting before asking again.',
  ACCOUNT_DAILY_REQUESTS: 'Today’s syncs for this service are used up. Try again tomorrow.',
  GLOBAL_DAILY_REQUESTS: 'Today’s syncs for this service are used up for everyone. Try again tomorrow.',
  PROVIDER_NOT_CONFIGURED: 'This service is not set up for this ZIGoals.',
};
async function send(account: string, init: RequestInit): Promise<unknown> {
  const response = await fetch('/api/health-link', {...init, headers: {...(init.headers ?? {}), 'x-zigoals-account': account}, cache: 'no-store', credentials: 'same-origin'});
  let json: {error?: string} | null = null; try { json = await response.json() as {error?: string}; } catch { json = null; }
  if (!response.ok || (json && typeof json.error === 'string')) { const code = json?.error ?? `HTTP_${response.status}`; throw new LinkError(code, WORDS[code] ?? 'The health service could not be reached right now. Try again later.'); }
  return json;
}
const post = (account: string, body: Record<string, unknown>) => send(account, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});
export async function linkConfig(account: string): Promise<LinkConfig> { return await send(account, {method: 'GET'}) as LinkConfig; }
export async function exchangeCode(account: string, provider: LinkProvider, code: string, verifier?: string): Promise<LinkTokens & {userId?: string}> { return await post(account, {action: 'token', provider, code, ...(verifier ? {verifier} : {})}) as LinkTokens & {userId?: string}; }
export async function refreshTokens(account: string, provider: LinkProvider, refreshToken: string): Promise<LinkTokens & {userId?: string}> { return await post(account, {action: 'refresh', provider, refreshToken}) as LinkTokens & {userId?: string}; }
export async function linkData(account: string, provider: LinkProvider, accessToken: string, request: string, params?: Record<string, string>): Promise<unknown> { return (await post(account, {action: 'data', provider, accessToken, request, ...(params ? {params} : {})}) as {data: unknown}).data; }
export async function registerPolar(account: string, accessToken: string, memberId: string): Promise<void> { await post(account, {action: 'register', provider: 'polar', accessToken, memberId}); }
export async function revokeLink(account: string, provider: LinkProvider, accessToken: string, userId?: string): Promise<boolean> { return ((await post(account, {action: 'revoke', provider, accessToken, ...(userId ? {userId} : {})})) as {ok?: boolean}).ok === true; }
