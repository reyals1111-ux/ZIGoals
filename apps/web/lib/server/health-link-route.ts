import 'server-only';
import {z} from 'zod';
import {readSessionCookie} from './session-cookie';
/**
 * `/api/health-link` (Session W Part 8, [TIER 3] (egress serverOnly)): the app's own door to the health-link Worker, so
 * the browser's connect-src never gains a provider or Worker origin. GET answers the deployment's providers; POST carries
 * one action ({action: 'token' | 'refresh' | 'data' | 'register' | 'revoke', provider, …}). Both need the session cookie
 * and the account header, confirmed with private sync's session registry exactly like /api/zigi, then go to the Worker
 * with the bearer, the app's origin and the account. The Worker's origin is a secret on the app Worker; while it (or the
 * sync origin) is unset every request answers 503 and nothing is fetched. Nothing here is logged or kept: tokens pass
 * through once on their way to the person's own device.
 */
export type HealthLinkConfig = {syncOrigin: string; linkOrigin: string};
const origin = (value: string) => { try { return new URL(value).origin === value && value.startsWith('https://'); } catch { return false; } };
const configSchema = z.object({syncOrigin: z.string().regex(/^https:\/\/[a-z0-9.-]+\.workers\.dev$/), linkOrigin: z.string().max(253).refine(origin)}).strict();
export const HEALTH_LINK_UNAVAILABLE = {error: 'HEALTH_LINK_UNAVAILABLE', message: 'Linking a health account is not set up in this build.'};
/** The Worker's own caps (workers/health-link/limits.mjs): requests 16 KiB, answers 4 MiB. */
export const LINK_REQUEST_BYTES = 16_384, LINK_RESPONSE_BYTES = 4_194_304;
const ACTIONS = new Set(['token', 'refresh', 'data', 'register', 'revoke']);
const reply = (data: unknown, status = 200) => Response.json(data, {status, headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}});
async function readBounded(source: Request | Response, max: number): Promise<string> {
  const reader = source.body?.getReader(); if (!reader) throw Error('Missing body');
  const chunks: Uint8Array[] = []; let total = 0;
  try { while (true) { const part = await reader.read(); if (part.done) break; total += part.value.length; if (total > max) throw Error('Too large'); chunks.push(part.value); } }
  catch (e) { await reader.cancel().catch(() => {}); throw e; }
  const all = new Uint8Array(total); let offset = 0; for (const c of chunks) { all.set(c, offset); offset += c.length; }
  return new TextDecoder('utf-8', {fatal: true}).decode(all);
}
const jsonOf = async (response: Response) => { try { return JSON.parse(await readBounded(response, LINK_RESPONSE_BYTES)) as unknown; } catch { return {error: 'HEALTH_LINK_SERVICE_UNAVAILABLE'}; } };
export async function healthLinkRequest(request: Request, config: HealthLinkConfig | null, fetcher: typeof fetch = fetch): Promise<Response> {
  const self = new URL(request.url).origin;
  if (request.method !== 'GET' && request.method !== 'POST') return reply({error: 'METHOD_NOT_ALLOWED'}, 405);
  if (request.method === 'POST' && request.headers.get('origin') !== self) return reply({error: 'ORIGIN_DENIED'}, 403);
  const parsed = configSchema.safeParse(config);
  if (!parsed.success) return reply(HEALTH_LINK_UNAVAILABLE, 503);
  const cfg = parsed.data;
  let body: string | null = null, action = '';
  if (request.method === 'POST') {
    if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') return reply({error: 'JSON_REQUIRED'}, 415);
    if (Number(request.headers.get('content-length') ?? 0) > LINK_REQUEST_BYTES) return reply({error: 'REQUEST_TOO_LARGE'}, 413);
    try { body = await readBounded(request, LINK_REQUEST_BYTES); const value = JSON.parse(body) as {action?: unknown}; action = typeof value?.action === 'string' ? value.action : ''; }
    catch (e) { return e instanceof Error && e.message === 'Too large' ? reply({error: 'REQUEST_TOO_LARGE'}, 413) : reply({error: 'INVALID_REQUEST'}, 400); }
    if (!ACTIONS.has(action)) return reply({error: 'INVALID_REQUEST'}, 400);
  }
  const cookie = readSessionCookie(request);
  if (cookie.duplicate) return reply({error: 'DUPLICATE_SESSION_COOKIE', message: 'Sign in again.'}, 400);
  if (!cookie.token) return reply({error: 'SIGN_IN_REQUIRED'}, 401);
  const account = z.uuid().safeParse(request.headers.get('x-zigoals-account')); if (!account.success) return reply({error: 'ACCOUNT_REQUIRED'}, 400);
  const headers = {origin: self, authorization: `Bearer ${cookie.token}`, 'x-zigoals-account': account.data.toLowerCase()};
  try {
    const allowed = await fetcher(`${cfg.syncOrigin}/v1/sessions`, {headers, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(10000)}); await allowed.body?.cancel().catch(() => {});
    if (!allowed.ok) return allowed.status === 409 ? reply({error: 'ACCOUNT_CHANGED'}, 409) : allowed.status === 401 || allowed.status === 403 || allowed.status === 410 ? reply({error: 'SIGN_IN_REQUIRED'}, 401) : reply({error: 'ACCOUNT_STATUS_UNAVAILABLE'}, 503);
    const remote = request.method === 'GET'
      ? await fetcher(`${cfg.linkOrigin}/v1/config`, {headers, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(10000)})
      : await fetcher(`${cfg.linkOrigin}/v1/${action}`, {method: 'POST', headers: {...headers, 'content-type': 'application/json'}, body, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(25000)});
    return reply(await jsonOf(remote), remote.status);
  } catch { return reply({error: 'HEALTH_LINK_SERVICE_UNAVAILABLE', message: 'The health-link service could not be reached right now. Try again later.'}, 503); }
}
