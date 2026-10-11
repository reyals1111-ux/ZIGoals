import * as z from 'zod';
import {TIME, type PushSchedule, type QuietHours} from './schedule';

/**
 * This device's push record (ADR-010): {version: 1, subscriptionId, endpointHash, quiet, lastSyncDay}, through
 * getAppStorage() like every device key; unreadable bytes read as "off" (`unreadable` says so) and are never rewritten.
 * The endpoint itself is not kept: its hash is enough to notice that the browser replaced the subscription.
 */
export const PUSH_KEY = 'zigoals:push:v1';
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const pushRecordSchema = z.strictObject({version: z.literal(1), subscriptionId: z.uuid(), endpointHash: z.string().regex(/^[0-9a-f]{64}$/), quiet: z.strictObject({from: z.string().regex(TIME), to: z.string().regex(TIME)}), lastSyncDay: day});
export type PushRecord = z.infer<typeof pushRecordSchema>;
type Read = Pick<Storage, 'getItem'>;
type ReadWrite = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function readPushRecord(storage: Read): {data: PushRecord | null; unreadable: boolean} {
  let raw: string | null;
  try { raw = storage.getItem(PUSH_KEY); } catch { return {data: null, unreadable: true}; }
  if (raw === null) return {data: null, unreadable: false};
  try { const parsed = pushRecordSchema.safeParse(JSON.parse(raw)); return parsed.success ? {data: parsed.data, unreadable: false} : {data: null, unreadable: true}; } catch { return {data: null, unreadable: true}; }
}
/** Throws, with nothing written, when the record is invalid or storage refuses. */
export function writePushRecord(storage: ReadWrite, record: PushRecord): PushRecord { const valid = pushRecordSchema.parse(record); storage.setItem(PUSH_KEY, JSON.stringify(valid)); return valid; }
export function clearPushRecord(storage: ReadWrite): void { storage.removeItem(PUSH_KEY); }
/** SHA-256 of a text, as lower-case hex. */
export async function sha256Hex(text: string): Promise<string> { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(b => b.toString(16).padStart(2, '0')).join(''); }
/** The VAPID public key as the bytes `pushManager.subscribe` wants (an uncompressed P-256 point). */
export function applicationServerKey(publicKey: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]{87}$/.test(publicKey)) throw Error('The push public key is not valid.');
  const binary = atob(publicKey.replace(/-/g, '+').replace(/_/g, '/') + '='), out = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  if (out.length !== 65 || out[0] !== 4) throw Error('The push public key is not valid.');
  return out;
}
export type SubscriptionKeys = {endpoint: string; p256dh: string; auth: string};
/** The three values of a browser subscription the Worker needs, or null when the browser gave none. */
export function subscriptionKeys(json: {endpoint?: string; keys?: Record<string, string>} | null | undefined): SubscriptionKeys | null {
  const endpoint = json?.endpoint, p256dh = json?.keys?.p256dh, auth = json?.keys?.auth;
  return endpoint && p256dh && auth ? {endpoint, p256dh, auth} : null;
}
export type PushAction =
  | {action: 'subscribe'; endpoint: string; p256dh: string; auth: string; zone: string; quiet: QuietHours; schedules: PushSchedule[]}
  | {action: 'schedule'; subscriptionId: string; zone: string; quiet: QuietHours; schedules: PushSchedule[]}
  | {action: 'unsubscribe'; subscriptionId: string}
  | {action: 'delete-all'};
export type PushAnswer = {status: number; data: Record<string, unknown>};
/** One call to /api/push for the active account. Throws on a transport failure or an unreadable answer. */
export async function postPush(action: PushAction, account: string, fetcher: typeof fetch = fetch): Promise<PushAnswer> {
  const response = await fetcher('/api/push', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Zigoals-Account': account}, body: JSON.stringify(action), cache: 'no-store', signal: AbortSignal.timeout(20000)});
  const text = await response.text();
  if (text.length > 100_000) throw Error('The answer was too large.');
  let data: unknown = {};
  try { data = text ? JSON.parse(text) : {}; } catch { throw Error('The answer could not be read.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('The answer could not be read.');
  return {status: response.status, data: data as Record<string, unknown>};
}
export type Availability = {available: true; publicKey: string} | {available: false};
/** Whether this build has push configured: GET /api/push answers the public key, or 503 while the flag is off. */
export async function pushAvailability(fetcher: typeof fetch = fetch): Promise<Availability> {
  const response = await fetcher('/api/push', {cache: 'no-store', signal: AbortSignal.timeout(15000)});
  if (response.status !== 200) return {available: false};
  const data = z.object({publicKey: z.string().regex(/^[A-Za-z0-9_-]{87}$/)}).safeParse(await response.json());
  return data.success ? {available: true, publicKey: data.data.publicKey} : {available: false};
}
/** Plain words for a refusal from the route or the Worker. */
export function pushRefusalMessage(answer: PushAnswer): string {
  const code = typeof answer.data.error === 'string' ? answer.data.error : '';
  switch (code) {
    case 'PUSH_UNAVAILABLE': return 'Reminders while ZIGoals is closed are not available in this build.';
    case 'SIGN_IN_REQUIRED': case 'VERIFIED_SESSION_REQUIRED': return 'Sign in to your account first; reminders while ZIGoals is closed need a signed-in account.';
    case 'ACCOUNT_CHANGED': return 'Your account changed. Sign in again and try once more.';
    case 'SUBSCRIPTION_LIMIT': return 'This account already has reminders on five devices. Turn them off on one device first.';
    case 'SCHEDULE_LIMIT': return 'Too many reminder times: at most 20 can be sent while ZIGoals is closed.';
    case 'ENDPOINT_NOT_ALLOWED': return 'This browser\'s push service is not one ZIGoals sends to yet.';
    case 'TOO_MANY_REQUESTS': return 'Too many changes in a short time. Try again in an hour.';
    default: return typeof answer.data.message === 'string' ? answer.data.message : 'Reminders while ZIGoals is closed could not be set up right now. Try again later.';
  }
}
