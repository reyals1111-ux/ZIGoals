import {getAppStorage, isShowcase} from '../showcase-storage';
import {getAccountScope} from '../account-session';
import {applicationServerKey, clearPushRecord, postPush, readPushRecord} from '../push/client';
import {deviceZone} from '../push/support';
import {appRegistration, registerAppWorker} from '../sw/register';
import {forgetNotifyDatabases, kvDelete, kvGet, kvPut, readActions} from './db';
import {currentPlan} from './sync';
import {registrationKey, type Registration, type Snooze} from './plan';

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
/** Resolves once this registration's own /sw.js worker is active (or redundant), at most `ms` later; never throws. */
export function appWorkerActive(reg: ServiceWorkerRegistration, ms = 10_000): Promise<void> {
  const ours = (w: ServiceWorker | null | undefined): w is ServiceWorker => !!w && new URL(w.scriptURL, self.location.href).pathname === '/sw.js';
  return new Promise(resolve => {
    const worker = [reg.installing, reg.waiting, reg.active].find(ours);
    if (!worker || worker.state === 'activated' || worker.state === 'redundant') { resolve(); return; }
    const timer = setTimeout(done, ms);
    function done() { clearTimeout(timer); worker!.removeEventListener('statechange', check); resolve(); }
    function check() { if (worker!.state === 'activated' || worker!.state === 'redundant') done(); }
    worker.addEventListener('statechange', check);
  });
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
    // Session AK (CI-P, the same race as the account path): subscribe once /sw.js itself is this scope's active worker,
    // never while an account /push-sw.js still holds it (Q15's switch), or the pushes reach the wrong worker.
    await appWorkerActive(reg);
    const existing = await reg.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();
    sub = await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey)});
  } catch (error) {
    return {ok: false, message: error instanceof Error && error.name === 'NotAllowedError' ? BLOCKED : 'This browser could not set up notifications right now. Try again later.'};
  }
  const identity = newIdentity();
  // The action queue is made here, by the page: the service worker never creates a database (security review F8), so a
  // "Done" tapped before ZIGoals opens again still has somewhere to wait.
  try { await kvPut('device', identity); await readActions(); } catch { await sub.unsubscribe().catch(() => {}); return {ok: false, message: 'This device could not keep the setting (its storage refused), so nothing was set up.'}; }
  const result = await refreshNotifications({force: true, endpoint: sub.endpoint});
  if (!result.ok) { await turnOffNotifications(); return {ok: false, message: result.message}; }
  return {ok: true, note: result.message};
}
export type Refresh = {ok: boolean; message: string; sent: boolean};
/** The "Snooze 1 h" taps the worker queued (applied or not: applying one changes no record); none when the queue cannot be read. */
export async function queuedSnoozes(): Promise<Snooze[]> {
  try { return (await readActions()).filter(a => a.type === 'snooze' && Array.isArray(a.items)).map(a => ({at: a.at, items: a.items!})); } catch { return []; }
}
/** Nothing to wake for: the Worker refuses an empty wake list (security review F2). */
export const emptyRegistration = (r: Registration) => r.wakes.length + r.once.length === 0;
/**
 * Keeps the snapshot and the wake list current: the snapshot is rewritten every time; the wake list is sent again only
 * when it changed, or once a day (which also keeps the Worker's 30-day record alive). With nothing to wake for, the
 * device's server record leaves instead (DELETE with its secret), once per change: the identity and the subscription
 * stay, so the next reminder registers again.
 */
export async function refreshNotifications({force = false, endpoint, now = Date.now()}: {force?: boolean; endpoint?: string; now?: number} = {}): Promise<Refresh> {
  const identity = await kvGet<Identity>('device').catch(() => undefined);
  if (!identity) return {ok: true, message: '', sent: false};
  // Session AK (journey bug J5-2): a "Snooze 1 h" the worker queued stays in the snapshot and the wake list.
  const plan = await currentPlan(now, await queuedSnoozes());
  if (!plan) return {ok: true, message: '', sent: false};
  await kvPut('snapshot', plan.snapshot).catch(() => {});
  const zone = deviceZone(), key = registrationKey(zone, plan.snapshot.quiet, plan.registration), stored = await kvGet<StoredRegistration>('registration').catch(() => undefined);
  const message = [plan.refused.length ? `${plan.refused.length} reminder ${plan.refused.length === 1 ? 'time falls' : 'times fall'} inside your quiet hours and will not notify.` : '', plan.dropped ? `Only the ${48} earliest wake times are kept; ${plan.dropped} later ${plan.dropped === 1 ? 'one is' : 'ones are'} left out.` : ''].filter(Boolean).join(' ');
  const empty = emptyRegistration(plan.registration);
  if (!force && stored && stored.key === key && (empty || now - stored.at < 20 * 3_600_000)) return {ok: true, message, sent: false};
  const sub = endpoint ? null : await (await appRegistration())?.pushManager.getSubscription();
  const target = endpoint ?? sub?.endpoint;
  if (!target) { await turnOffNotifications(); return {ok: false, message: 'Your browser gave up its push subscription, so notifications are off on this device. Turn them on again when you like.', sent: false}; }
  const body = {endpoint: target, zone, quiet: plan.snapshot.quiet, ...plan.registration};
  if (empty) {
    try {
      const res = await api('DELETE', identity);
      if (!res.ok && res.status !== 404) return {ok: false, message: 'The notification times could not be sent right now; ZIGoals tries again later.', sent: false};
    } catch { return {ok: false, message: 'The notification times could not be sent right now; ZIGoals tries again later.', sent: false}; }
    await kvPut('registration', {key, at: now, body} satisfies StoredRegistration).catch(() => {});
    return {ok: true, message, sent: true};
  }
  try {
    const res = await api('PUT', {...body, ...identity});
    if (res.status === 404) { await kvDelete('device').catch(() => {}); return {ok: false, message: 'The notification service no longer knew this device. Turn notifications on again.', sent: false}; }
    if (!res.ok) { const data = await res.json().catch(() => ({})) as {message?: string}; return {ok: false, message: data.message ?? 'The notification times could not be sent right now; ZIGoals tries again later.', sent: false}; }
  } catch { return {ok: false, message: 'The notification times could not be sent right now; ZIGoals tries again later.', sent: false}; }
  await kvPut('registration', {key, at: now, body} satisfies StoredRegistration).catch(() => {});
  return {ok: true, message, sent: true};
}
/**
 * Off on this device (and the first step of Erase everything): the notifications already shown close (security review
 * F8), then the server record (DELETE with the secret), the browser subscription and both databases leave. The worker
 * stays for offline use.
 */
export async function turnOffNotifications(): Promise<void> {
  await closeShownNotifications();
  const identity = await kvGet<Identity>('device').catch(() => undefined);
  if (identity) { try { await api('DELETE', identity); } catch { /* the Worker deletes it after 30 days, or at its first 404/410 */ } }
  try { const sub = await (await appRegistration())?.pushManager.getSubscription(); await sub?.unsubscribe(); } catch { /* nothing to undo */ }
  await forgetNotifyDatabases();
}
/** Every notification this app's worker shows (its own and ADR-010's, one scope) closes; never throws. */
export async function closeShownNotifications(): Promise<void> {
  try { for (const note of await (await appRegistration())?.getNotifications() ?? []) note.close(); } catch { /* nothing shown */ }
}
export async function sendTestNotification(): Promise<string> {
  const identity = await kvGet<Identity>('device').catch(() => undefined);
  if (!identity) return 'Turn notifications on first.';
  const stored = await kvGet<StoredRegistration>('registration').catch(() => undefined);
  if (stored && emptyRegistration(stored.body)) return 'Nothing is set to notify yet. Turn on a notification type or give a habit a reminder time, then try again.';
  try {
    const res = await api('POST', identity);
    return res.ok ? 'A test notification is on its way. It can take up to a minute.' : res.status === 429 ? 'Three test notifications an hour at most. Try again later.' : 'The test notification could not be sent right now.';
  } catch { return 'The test notification could not be sent right now.'; }
}
