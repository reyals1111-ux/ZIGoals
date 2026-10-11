import 'server-only';
import * as z from 'zod';
import {readSessionCookie} from './session-cookie';
/**
 * `/api/zigi` (Session V Part 17, ADR-014 S2): the app's own door to ZIGoals hosted, so the browser's connect-src never
 * gains a relay origin. GET answers the account's entitlement; POST streams one reply. Both need the session cookie
 * (an HttpOnly bearer the page cannot read) and the account header, confirmed with private sync's session registry
 * exactly like /api/push, then go to the relay with the bearer, the app's origin and the account. The relay origin is a
 * secret on the app Worker; while it (or the sync origin) is unset every request answers 503 and nothing is fetched.
 * Nothing here is logged or kept: the chat body passes through once, the reply streams back as it arrives, with no
 * time limit on the body (only on the relay starting to answer). The relay itself rebuilds what the provider gets.
 */
export type ZigiConfig = {syncOrigin: string; relayOrigin: string};
const origin = (value: string) => { try { return new URL(value).origin === value && value.startsWith('https://'); } catch { return false; } };
const configSchema = z.object({syncOrigin: z.string().regex(/^https:\/\/[a-z0-9.-]+\.workers\.dev$/), relayOrigin: z.string().max(253).refine(origin)}).strict();
export const HOSTED_UNAVAILABLE = {error: 'HOSTED_UNAVAILABLE', message: 'ZIGoals hosted is not available in this build.'};
/** The relay's own cap (workers/zigi-relay/limits.mjs requestBytes): a larger body is refused here unread. */
export const CHAT_BYTES = 1_048_576;
const reply = (data: unknown, status = 200) => Response.json(data, {status, headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}});
async function readBounded(source: Request | Response, max: number): Promise<string> {
  const reader = source.body?.getReader(); if (!reader) throw Error('Missing body');
  const chunks: Uint8Array[] = []; let total = 0;
  try { while (true) { const part = await reader.read(); if (part.done) break; total += part.value.length; if (total > max) throw Error('Too large'); chunks.push(part.value); } }
  catch (e) { await reader.cancel().catch(() => {}); throw e; }
  const all = new Uint8Array(total); let offset = 0; for (const c of chunks) { all.set(c, offset); offset += c.length; }
  return new TextDecoder('utf-8', {fatal: true}).decode(all);
}
const jsonOf = async (response: Response) => { try { return JSON.parse(await readBounded(response, 32768)) as unknown; } catch { return {error: 'HOSTED_SERVICE_UNAVAILABLE'}; } };
export async function zigiRequest(request: Request, config: ZigiConfig | null, fetcher: typeof fetch = fetch): Promise<Response> {
  const self = new URL(request.url).origin;
  if (request.method !== 'GET' && request.method !== 'POST') return reply({error: 'METHOD_NOT_ALLOWED'}, 405);
  if (request.method === 'POST' && request.headers.get('origin') !== self) return reply({error: 'ORIGIN_DENIED'}, 403);
  const parsed = configSchema.safeParse(config);
  if (!parsed.success) return reply(HOSTED_UNAVAILABLE, 503);
  const cfg = parsed.data;
  let body: string | null = null;
  if (request.method === 'POST') {
    if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') return reply({error: 'JSON_REQUIRED'}, 415);
    if (Number(request.headers.get('content-length') ?? 0) > CHAT_BYTES) return reply({error: 'REQUEST_TOO_LARGE'}, 413);
    try { body = await readBounded(request, CHAT_BYTES); JSON.parse(body); }
    catch (e) { return e instanceof Error && e.message === 'Too large' ? reply({error: 'REQUEST_TOO_LARGE'}, 413) : reply({error: 'INVALID_CHAT_REQUEST'}, 400); }
  }
  const cookie = readSessionCookie(request);
  if (cookie.duplicate) return reply({error: 'DUPLICATE_SESSION_COOKIE', message: 'Sign in again.'}, 400);
  if (!cookie.token) return reply({error: 'SIGN_IN_REQUIRED'}, 401);
  const account = z.uuid().safeParse(request.headers.get('x-zigoals-account')); if (!account.success) return reply({error: 'ACCOUNT_REQUIRED'}, 400);
  const fence = account.data.toLowerCase(), headers = {origin: self, authorization: `Bearer ${cookie.token}`, 'x-zigoals-account': fence};
  try {
    // Revocation and sign-out live in private sync's session registry: a session it no longer lists gets nothing here.
    const allowed = await fetcher(`${cfg.syncOrigin}/v1/sessions`, {headers, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(10000)}); await allowed.body?.cancel().catch(() => {});
    if (!allowed.ok) return allowed.status === 409 ? reply({error: 'ACCOUNT_CHANGED'}, 409) : allowed.status === 401 || allowed.status === 403 || allowed.status === 410 ? reply({error: 'SIGN_IN_REQUIRED'}, 401) : reply({error: 'ACCOUNT_STATUS_UNAVAILABLE'}, 503);
    if (request.method === 'GET') {
      const remote = await fetcher(`${cfg.relayOrigin}/v1/entitlement`, {headers, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(10000)});
      return reply(await jsonOf(remote), remote.ok ? 200 : remote.status);
    }
    // Only the wait for the relay to start answering is limited; the reply then streams for as long as it takes.
    const starting = new AbortController(), timer = setTimeout(() => starting.abort(), 25000);
    const abort = () => starting.abort(); request.signal?.addEventListener('abort', abort, {once: true});
    let remote: Response;
    try { remote = await fetcher(`${cfg.relayOrigin}/v1/chat`, {method: 'POST', headers: {...headers, 'content-type': 'application/json'}, body, redirect: 'manual', cache: 'no-store', signal: starting.signal}); }
    finally { clearTimeout(timer); }
    if (remote.ok && remote.body && remote.headers.get('content-type')?.startsWith('text/event-stream')) return new Response(remote.body, {status: 200, headers: {'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}});
    return reply(await jsonOf(remote), remote.ok ? 502 : remote.status);
  } catch { return reply({error: 'HOSTED_SERVICE_UNAVAILABLE', message: 'ZIGoals hosted could not be reached right now. Try again later.'}, 503); }
}
