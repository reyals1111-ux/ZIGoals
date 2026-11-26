'use client';
import {readDeviceRecord, type DeviceRecordSpec} from '../../lib/device-record';
import {getAppStorage} from '../../lib/showcase-storage';
import {NOTIFY_PREFS, taskAgainOf} from '../../lib/notify/prefs';
import {REMINDERS_PLAN, quietHours} from '../../lib/reminders-plan/schema';
import type {Again} from '../../lib/tasks/remind-again';
export {dueReminders, nextRing} from '../../lib/tasks/reminder-rings';

/**
 * Session AW Part 2 (speed, attempt 2): the reminder rows' repeats as one chunk (components/tasks/use-remind-again.ts asks
 * for it as the page starts): the rings (lib/tasks/reminder-rings.ts) and the two records they follow — this device's
 * default repeat (lib/notify/prefs.ts `taskAgain`) and the quiet hours that hold the repeats (the reminders plan's), read
 * exactly as useDeviceRecord reads them (an unreadable record counts as empty).
 */
export const AGAIN_KEYS: readonly string[] = [NOTIFY_PREFS.key, REMINDERS_PLAN.key];
export function readAgain(): {fallback: Again | null; quiet: {from: string; to: string}} {
  const read = <T,>(spec: DeviceRecordSpec<T>): T => { try { return readDeviceRecord(getAppStorage(), spec).data; } catch { return spec.empty(); } };
  const fallback = taskAgainOf(read(NOTIFY_PREFS)), quiet = quietHours(read(REMINDERS_PLAN));
  return {fallback: fallback ? {every: fallback.every, times: fallback.times} : null, quiet: {from: quiet.from, to: quiet.to}};
}
