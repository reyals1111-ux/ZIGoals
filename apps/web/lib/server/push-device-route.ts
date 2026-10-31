import 'server-only';
import * as z from 'zod';
/**
 * `/api/push-device` (Session AK Part 2, ADR-036 Q3, owner decision D1): the device push path for the public Alpha, with
 * no account. GET says whether notifications are switched on in this build; PUT (register or refresh), DELETE and POST
 * (a test notification) forward one checked body to the device push Worker. Off until the owner flips the committed
 * switch (config/public-integrations.json `pushDeviceEnabled`) AND sets the Worker's origin: until then 503 "being
 * switched on". The body carries a random device id and secret, a push endpoint, a zone, quiet hours and wake minutes —
 * never a name, a kind, a count or an amount. Nothing is logged or kept here.
 */
export type PushDeviceConfig = {enabled: boolean; publicKey: string | null; workerOrigin: string | null};
export const SWITCHING_ON = {error: 'PUSH_SWITCHING_ON', message: 'Notifications are being switched on. Your reminders still show inside ZIGoals.'};
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/), id = z.uuid(), secret = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const minute = z.number().int().positive().max(99_999_999);
export const registrationSchema = z.object({
  id, secret, endpoint: z.string().url().max(2048).startsWith('https://'), zone: z.string().min(1).max(100).regex(/^[A-Za-z0-9_+\-/]+$/),
  quiet: z.object({from: time, to: time}).strict(),
  wakes: z.array(z.object({m: z.number().int().min(0).max(1439), d: z.number().int().min(1).max(127)}).strict()).max(48),
  once: z.array(minute).max(48), skips: z.array(minute).max(96),
}).strict().refine(r => r.wakes.length + r.once.length <= 48);
const identitySchema = z.object({id, secret}).strict();
const reply = (data: unknown, status = 200) => Response.json(data, {status, headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}});
async function bounded(source: Request | Response, max: number): Promise<unknown> {
  const reader = source.body?.getReader(); if (!reader) throw Error('Missing body');
  const chunks: Uint8Array[] = []; let total = 0;
  try { while (true) { const part = await reader.read(); if (part.done) break; total += part.value.length; if (total > max) throw Error('Too large'); chunks.push(part.value); } }
  catch (e) { await reader.cancel().catch(() => {}); throw e; }
  const all = new Uint8Array(total); let offset = 0; for (const c of chunks) { all.set(c, offset); offset += c.length; }
  return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(all));
}
const originOk = (value: string | null) => { if (!value) return false; try { const u = new URL(value); return u.origin === value && (u.protocol === 'https:' || u.hostname === '127.0.0.1'); } catch { return false; } };
export async function pushDeviceRequest(request: Request, config: PushDeviceConfig, fetcher: typeof fetch = fetch): Promise<Response> {
  const self = new URL(request.url).origin, ready = config.enabled && !!config.publicKey && originOk(config.workerOrigin);
  if (request.method === 'GET') return reply(ready ? {enabled: true, publicKey: config.publicKey} : {enabled: false, ...SWITCHING_ON});
  if (!['PUT', 'DELETE', 'POST'].includes(request.method)) return reply({error: 'METHOD_NOT_ALLOWED'}, 405);
  if (request.headers.get('origin') !== self) return reply({error: 'ORIGIN_DENIED'}, 403);
  if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') return reply({error: 'JSON_REQUIRED'}, 415);
  let body: unknown;
  try { const raw = await bounded(request, 4096); body = request.method === 'PUT' ? registrationSchema.parse(raw) : identitySchema.parse(raw); }
  catch { return reply({error: 'INVALID_DEVICE_REQUEST'}, 400); }
  // DELETE still reaches the Worker when the switch was turned off again later, so Erase everything can always remove a
  // device registered earlier; with no Worker origin at all nothing was ever registered.
  if (!ready && !(request.method === 'DELETE' && originOk(config.workerOrigin))) return reply(SWITCHING_ON, 503);
  try {
    const path = request.method === 'POST' ? '/v1/device/test' : '/v1/device';
    const remote = await fetcher(`${config.workerOrigin}${path}`, {method: request.method, headers: {origin: self, 'content-type': 'application/json'}, body: JSON.stringify(body), redirect: 'manual', signal: AbortSignal.timeout(10_000), cache: 'no-store'});
    return reply(await bounded(remote, 8192), remote.status);
  } catch { return reply({error: 'PUSH_SERVICE_UNAVAILABLE', message: 'Notifications could not be reached right now. Try again later.'}, 503); }
}
