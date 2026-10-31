import {getAppStorage, isShowcase} from '../showcase-storage';
import {getAccountScope} from '../account-session';
import {applicationServerKey, clearPushRecord, postPush, readPushRecord} from '../push/client';
import {deviceZone} from '../push/support';
import {appRegistration, registerAppWorker} from '../sw/register';
import {forgetNotifyDatabases, kvDelete, kvGet, kvPut} from './db';
import {currentPlan} from './sync';
import {registrationKey, type Registration} from './plan';

/**
 * Session AK Part 2 (ADR-036 Q3, Q15, A1–A4): this device's notifications. Everything starts from a tap (permission is
 * asked inside it); afterwards the page keeps the snapshot and the wake list up to date (NotifySync). The device's push
 * identity is a random id and secret in IndexedDB; the server learns only them, the push endpoint, the zone, quiet hours
 * and wake minutes.
 */
export type Identity = {id: string; secret: string};
export type StoredRegistration = {key: string; at: number; body: Registration & {endpoint: string; zone: string; quiet: {from: string; to: string}}};
export type Status = {enabled: true; publicKey: string} | {enabled: false; message: string};
export type TurnOn = {ok: true; note: string} | {ok: false; message: string};
export const BLOCKED = 'Notifications are blocked for ZIGoals in your device settings. Allow them there, then try again.';
const api = (method: string, body?: unknown) => fetch('/api/push-device', {method, headers: body ? {'content-type': 'application/json'} : {}, ...(body ? {body: JSON.stringify(body)} : {}), cache: 'no-store'});
export async function notifyStatus(): Promise<Status> {
  try {
    const res = await api('GET'), data = await res.json() as {enabled?: boolean; publicKey?: string; message?: string};
    return data.enabled && typeof data.publicKey === 'string' ? {enabled: true, publicKey: data.publicKey} : {enabled: false, message: data.message ?? 'Notifications are being switched on.'};
  } catch { return {enabled: false, message: 'Notifications could not be checked right now.'}; }
}
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const newIdentity = (): Identity => ({id: crypto.randomUUID(), secret: b64url(crypto.getRandomValues(new Uint8Array(32)))});
export async function notifyOn(): Promise<boolean> { try { return !!(await kvGet<Identity>('device')); } catch { return false; } }
/**
 * ADR-036 Q15 (A3): one push path per device. An ADR-010 account subscription on this device is removed from the account
 * Worker first (best effort), and its record forgotten, so no reminder can arrive twice.
 */
async function retireAccountPath(): Promise<void> {
  const storage = getAppStorage(), record = readPushRecord(storage).data, account = getAccountScope();
  if (!record) return;
  if (account) { try { await postPush({action: 'unsubscribe', subscriptionId: record.subscriptionId}, account); } catch { /* the old subscription is replaced below; its server copy then answers 404/410 and leaves */ } }
  clearPushRecord(storage);
  try { await (await import('../push/labels-sync')).forgetPushLabels(); } catch { /* nothing to delete */ }
}
/** From a tap: permission, the worker, a fresh subscription to this build's key, the identity, the first registration. */
export async function turnOnNotifications(publicKey: string): Promise<TurnOn> {
  if (isShowcase()) return {ok: false, message: 'Notifications are not set up from the Showcase: its example data never reaches a notification.'};
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return {ok: false, message: permission === 'denied' ? BLOCKED : 'Notifications were not allowed, so nothing was set up.'};
  const reg = await registerAppWorker();
  if (!reg) return {ok: false, message: 'This browser cannot run ZIGoals’ service worker, so notifications are not available here.'};
  await retireAccountPath();
  let sub: PushSubscription;
  try {
    await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();
    sub = await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey)});
  } catch (error) {
    return {ok: false, message: error instanceof Error && error.name === 'NotAllowedError' ? BLOCKED : 'This browser could not set up notifications right now. Try again later.'};
  }
  const identity = newIdentity();
  try { await kvPut('device', identity); } catch { await sub.unsubscribe().catch(() => {}); return {ok: false, message: 'This device could not keep the setting (its storage refused), so nothing was set up.'}; }
  const result = await refreshNotifications({force: true, endpoint: sub.endpoint});
  if (!result.ok) { await turnOffNotifications(); return {ok: false, message: result.message}; }
  return {ok: true, note: result.message};
}
export type Refresh = {ok: boolean; message: string; sent: boolean};
/**
 * Keeps the snapshot and the wake list current: the snapshot is rewritten every time; the wake list is sent again only
 * when it changed, or once a day (which also keeps the Worker's 30-day record alive).
 */
export async function refreshNotifications({force = false, endpoint, now = Date.now()}: {force?: boolean; endpoint?: string; now?: number} = {}): Promise<Refresh> {
  const identity = await kvGet<Identity>('device').catch(() => undefined);
  if (!identity) return {ok: true, message: '', sent: false};
  const plan = await currentPlan(now);
  if (!plan) return {ok: true, message: '', sent: false};
  await kvPut('snapshot', plan.snapshot).catch(() => {});
  const zone = deviceZone(), key = registrationKey(zone, plan.snapshot.quiet, plan.registration), stored = await kvGet<StoredRegistration>('registration').catch(() => undefined);
  const message = [plan.refused.length ? `${plan.refused.length} reminder ${plan.refused.length === 1 ? 'time falls' : 'times fall'} inside your quiet hours and will not notify.` : '', plan.dropped ? `Only the ${48} earliest wake times are kept; ${plan.dropped} later ${plan.dropped === 1 ? 'one is' : 'ones are'} left out.` : ''].filter(Boolean).join(' ');
  if (!force && stored && stored.key === key && now - stored.at < 20 * 3_600_000) return {ok: true, message, sent: false};
  const sub = endpoint ? null : await (await appRegistration())?.pushManager.getSubscription();
  const target = endpoint ?? sub?.endpoint;
  if (!target) { await turnOffNotifications(); return {ok: false, message: 'Your browser gave up its push subscription, so notifications are off on this device. Turn them on again when you like.', sent: false}; }
  const body = {endpoint: target, zone, quiet: plan.snapshot.quiet, ...plan.registration};
  try {
    const res = await api('PUT', {...body, ...identity});
    if (res.status === 404) { await kvDelete('device').catch(() => {}); return {ok: false, message: 'The notification service no longer knew this device. Turn notifications on again.', sent: false}; }
    if (!res.ok) { const data = await res.json().catch(() => ({})) as {message?: string}; return {ok: false, message: data.message ?? 'The notification times could not be sent right now; ZIGoals tries again later.', sent: false}; }
  } catch { return {ok: false, message: 'The notification times could not be sent right now; ZIGoals tries again later.', sent: false}; }
  await kvPut('registration', {key, at: now, body} satisfies StoredRegistration).catch(() => {});
  return {ok: true, message, sent: true};
}
/** Off on this device: the server record (DELETE with the secret), the browser subscription and both databases leave. The worker stays for offline use. */
export async function turnOffNotifications(): Promise<void> {
  const identity = await kvGet<Identity>('device').catch(() => undefined);
  if (identity) { try { await api('DELETE', identity); } catch { /* the Worker deletes it after 30 days, or at its first 404/410 */ } }
  try { const sub = await (await appRegistration())?.pushManager.getSubscription(); await sub?.unsubscribe(); } catch { /* nothing to undo */ }
  await forgetNotifyDatabases();
}
export async function sendTestNotification(): Promise<string> {
  const identity = await kvGet<Identity>('device').catch(() => undefined);
  if (!identity) return 'Turn notifications on first.';
  try {
    const res = await api('POST', identity);
    return res.ok ? 'A test notification is on its way. It can take up to a minute.' : res.status === 429 ? 'Three test notifications an hour at most. Try again later.' : 'The test notification could not be sent right now.';
  } catch { return 'The test notification could not be sent right now.'; }
}
