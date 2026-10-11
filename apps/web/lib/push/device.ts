import {HABITS_KEY, habitCalendarDay, habitDataSchema, type HabitData} from '../habits';
import {localDate} from '../local-date';
import {readReminders} from '../reminders/store';
import {getAppStorage} from '../showcase-storage';
import {getAccountScope} from '../account-session';
import {applicationServerKey, clearPushRecord, postPush, pushRefusalMessage, readPushRecord, sha256Hex, subscriptionKeys, writePushRecord, type PushAnswer, type PushRecord} from './client';
import {DEFAULT_QUIET, deriveSchedules, type Derived, type QuietHours} from './schedule';
import {deviceZone} from './support';
import {isDurableMarker, readDurableStore} from '../vault/local';

/**
 * The browser side of push reminders (ADR-010): the one service worker at /push-sw.js, the browser's subscription,
 * the calls to /api/push and this device's record. Nothing here runs on view: turnOnPush starts from a tap, and the
 * schedule refresh runs only while the device holds a record.
 */
export const SW_URL = '/push-sw.js', SW_SCOPE = '/';
export const PUSH_CHANGE = 'zigoals:push-change';
export type TurnOn = {ok: true; record: PushRecord; note: string} | {ok: false; message: string};
export const BLOCKED = 'Notifications are blocked for ZIGoals in your device settings. Allow them there, then try again.';
export const NOT_ALLOWED = 'Notifications were not allowed, so nothing was set up.';
export const LOST = 'Your browser gave up its push subscription, so reminders while ZIGoals is closed are off. Turn them on again in Settings when you like.';
/**
 * This device's habits as stored, for the weekday masks; undefined when there are none or they do not read. Once the
 * account vault keeps the habits in its durable store, the browser key holds only a pointer, and the pointer is
 * followed (Session V Part 13 found that it was not: every habit reminder was then left out of the schedule).
 */
export async function storedHabits(storage: Storage): Promise<HabitData | undefined> {
  try {
    const raw = storage.getItem(HABITS_KEY); if (raw === null) return undefined;
    if (isDurableMarker(raw)) return await readDurableStore(storage, HABITS_KEY, habitDataSchema);
    const parsed = habitDataSchema.safeParse(JSON.parse(raw)); return parsed.success ? parsed.data : undefined;
  } catch { return undefined; }
}
/** The schedule set this device would send now. */
export async function currentSchedules(quiet: QuietHours, now = new Date()): Promise<Derived & {today: string}> {
  const storage = getAppStorage(), habits = await storedHabits(storage), today = habits ? habitCalendarDay(habits, now) : localDate(now);
  return {...deriveSchedules({reminders: readReminders(storage).data, habits, zone: deviceZone(), quiet, today}), today};
}
/** Plain words for refused and dropped rows, or an empty string. */
export function scheduleNote(derived: Derived, quiet: QuietHours): string {
  const parts: string[] = [];
  if (derived.refused.length) parts.push(`${derived.refused.map(r => `${r.title} at ${r.time}`).join(', ')} ${derived.refused.length === 1 ? 'falls' : 'fall'} inside your quiet hours (${quiet.from}–${quiet.to}) and ${derived.refused.length === 1 ? 'is' : 'are'} not sent while ZIGoals is closed.`);
  if (derived.dropped) parts.push(`Only the 20 earliest reminder times are sent while ZIGoals is closed; ${derived.dropped} later ${derived.dropped === 1 ? 'one is' : 'ones are'} left out.`);
  return parts.join(' ');
}
async function registration(): Promise<ServiceWorkerRegistration | undefined> { return navigator.serviceWorker?.getRegistration(SW_SCOPE); }
/**
 * Unsubscribes in the browser, unregisters the worker and deletes the opted-in names table (Session V Part 13, loaded
 * only now); never throws.
 */
async function forgetInBrowser(): Promise<void> {
  try { const reg = await registration(); const sub = await reg?.pushManager.getSubscription(); await sub?.unsubscribe(); await reg?.unregister(); } catch { /* nothing left to undo */ }
  try { await (await import('./labels-sync')).forgetPushLabels(); } catch { /* nothing to delete */ }
}
/**
 * From a tap: permission (asked first, inside the gesture), the worker, the browser subscription, the subscribe call
 * with the current schedule set, then this device's record. Any failure after the subscription undoes it.
 */
export async function turnOnPush({account, publicKey, quiet = DEFAULT_QUIET}: {account: string; publicKey: string; quiet?: QuietHours}): Promise<TurnOn> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return {ok: false, message: permission === 'denied' ? BLOCKED : NOT_ALLOWED};
  const key = applicationServerKey(publicKey);
  let reg: ServiceWorkerRegistration, sub: PushSubscription;
  try {
    reg = await navigator.serviceWorker.register(SW_URL, {scope: SW_SCOPE});
    await navigator.serviceWorker.ready;
    // A subscription left by an earlier account or key on this browser is replaced, never reused: its old address
    // then answers 404 or 410 and leaves the other account's server data by itself.
    const existing = await reg.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();
    sub = await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: key});
  } catch (error) {
    await forgetInBrowser();
    const name = error instanceof Error ? error.name : '';
    return {ok: false, message: name === 'NotAllowedError' ? BLOCKED : name === 'NotSupportedError' ? 'This browser does not support reminders while ZIGoals is closed.' : 'This browser could not set up push reminders right now. Try again later.'};
  }
  const keys = subscriptionKeys(sub.toJSON());
  if (!keys) { await forgetInBrowser(); return {ok: false, message: 'This browser gave no usable push subscription, so nothing was set up.'}; }
  const derived = await currentSchedules(quiet), zone = deviceZone();
  let answer: PushAnswer;
  try { answer = await postPush({action: 'subscribe', ...keys, zone, quiet, schedules: derived.schedules}, account); }
  catch { await forgetInBrowser(); return {ok: false, message: 'Reminders while ZIGoals is closed could not be set up right now. Try again later.'}; }
  if (answer.status !== 200 || typeof answer.data.subscriptionId !== 'string') { await forgetInBrowser(); return {ok: false, message: pushRefusalMessage(answer)}; }
  const record: PushRecord = {version: 1, subscriptionId: answer.data.subscriptionId, endpointHash: await sha256Hex(keys.endpoint), quiet, lastSyncDay: derived.today};
  try { writePushRecord(getAppStorage(), record); }
  catch {
    try { await postPush({action: 'unsubscribe', subscriptionId: record.subscriptionId}, account); } catch { /* best effort */ }
    await forgetInBrowser();
    return {ok: false, message: 'This device could not keep the setting, so reminders while ZIGoals is closed were turned off again on the server.'};
  }
  return {ok: true, record, note: scheduleNote(derived, quiet)};
}
/** Turns push off: the server first (best effort), then the browser, then this device's record. */
export async function turnOffPush({account}: {account: string | null}): Promise<{confirmed: boolean}> {
  const storage = getAppStorage(), record = readPushRecord(storage).data;
  let confirmed = !record;
  if (record && account) { try { const answer = await postPush({action: 'unsubscribe', subscriptionId: record.subscriptionId}, account); confirmed = answer.status === 200; } catch { confirmed = false; } }
  await forgetInBrowser();
  clearPushRecord(storage);
  return {confirmed};
}
export type SyncOutcome = {state: 'off' | 'kept' | 'synced' | 'resubscribed' | 'lost' | 'sign-in' | 'unavailable' | 'failed'; message?: string};
/**
 * Keeps the server's schedule set equal to this device's reminder times: once a day while the record exists, and
 * whenever a reminder time changes. A replaced browser subscription re-subscribes; a subscription the server no longer
 * knows is created again; a lost browser subscription turns the feature off on this device.
 */
export async function syncPushSchedules({account, force = false, now = new Date()}: {account: string | null; force?: boolean; now?: Date}): Promise<SyncOutcome> {
  const storage = getAppStorage(), record = readPushRecord(storage).data;
  if (!record) return {state: 'off'};
  const derived = await currentSchedules(record.quiet, now);
  if (!force && record.lastSyncDay === derived.today) return {state: 'kept'};
  if (!account) return {state: 'sign-in', message: 'Sign in again to keep reminders while ZIGoals is closed up to date.'};
  const reg = await registration(), sub = await reg?.pushManager.getSubscription(), keys = sub ? subscriptionKeys(sub.toJSON()) : null;
  if (!reg || !sub || !keys) {
    try { await postPush({action: 'unsubscribe', subscriptionId: record.subscriptionId}, account); } catch { /* best effort */ }
    await forgetInBrowser(); clearPushRecord(storage);
    return {state: 'lost', message: LOST};
  }
  const zone = deviceZone(), hash = await sha256Hex(keys.endpoint);
  let answer: PushAnswer;
  try {
    answer = hash === record.endpointHash
      ? await postPush({action: 'schedule', subscriptionId: record.subscriptionId, zone, quiet: record.quiet, schedules: derived.schedules}, account)
      : await postPush({action: 'subscribe', ...keys, zone, quiet: record.quiet, schedules: derived.schedules}, account);
    if (answer.status === 404 && answer.data.error === 'SUBSCRIPTION_UNKNOWN') answer = await postPush({action: 'subscribe', ...keys, zone, quiet: record.quiet, schedules: derived.schedules}, account);
  } catch { return {state: 'failed', message: 'Reminder times could not be refreshed on the server right now.'}; }
  if (answer.status === 401 || answer.status === 409) return {state: 'sign-in', message: pushRefusalMessage(answer)};
  if (answer.status === 503 && answer.data.error === 'PUSH_UNAVAILABLE') return {state: 'unavailable', message: pushRefusalMessage(answer)};
  if (answer.status !== 200) return {state: 'failed', message: pushRefusalMessage(answer)};
  const subscriptionId = typeof answer.data.subscriptionId === 'string' ? answer.data.subscriptionId : record.subscriptionId;
  const resubscribed = subscriptionId !== record.subscriptionId || hash !== record.endpointHash;
  try { writePushRecord(storage, {...record, subscriptionId, endpointHash: hash, lastSyncDay: derived.today}); } catch { /* the next open tries again */ }
  const note = scheduleNote(derived, record.quiet);
  return {state: resubscribed ? 'resubscribed' : 'synced', ...(note ? {message: note} : {})};
}
/**
 * Before sign-out and account or cloud deletion: on sign-out this device's subscription leaves the server (unsubscribe);
 * on deletion the account's whole push data does (delete-all). Then this browser forgets its subscription and record.
 * Sign-out sends nothing from a device without a record. Deletion always asks the server to delete the account's push
 * data while the account is known (Session X Part 8): the device that deletes the account may never have turned push
 * on while another device did, and that device's subscription and schedules must not wait 30 days for the prune.
 * Where push is not set up, /api/push answers 503 and nothing changes. Never throws.
 */
export async function forgetPushOnThisDevice({deleteAll}: {deleteAll: boolean}): Promise<void> {
  try {
    const account = getAccountScope(), storage = getAppStorage(), record = readPushRecord(storage).data;
    if (!record) {
      if (deleteAll && account) { try { await postPush({action: 'delete-all'}, account); } catch { /* best effort */ } }
      return;
    }
    if (account) { try { await postPush(deleteAll ? {action: 'delete-all'} : {action: 'unsubscribe', subscriptionId: record.subscriptionId}, account); } catch { /* best effort */ } }
    await forgetInBrowser();
    clearPushRecord(storage);
  } catch { /* locked or unavailable storage: nothing to forget here */ }
}
/**
 * After "Revoke other sessions": the account's push data leaves the server (the revoked devices can no longer refresh
 * it), and this device, when it holds a record, subscribes again at once. Never throws.
 */
export async function revokeOtherDevicesPush(account: string): Promise<void> {
  try {
    const record = readPushRecord(getAppStorage()).data;
    await postPush({action: 'delete-all'}, account);
    if (record) await syncPushSchedules({account, force: true});
  } catch { /* best effort */ }
}
