import {habitCalendarDay} from '../habits';
import {localDate} from '../local-date';
import {readReminders} from '../reminders/store';
import {getAppStorage, isShowcase} from '../showcase-storage';
import {AI_OPTIONS_KEY} from '../ai/store/keys';
import {readHabitHealthLinks} from '../habit-health-links/store';
import {readPushRecord} from './client';
import {storedHabits} from './device';
import {labelRows} from './labels';
import {clearPushLabels, writePushLabels} from './labels-db';
import {deviceZone} from './support';

/**
 * Session V Part 13 (opt-in, owner-approved; ADR-014): keeps the table of reminder names the push worker may read equal
 * to this device's habit reminders while push is on and the person turned on "Show what a reminder is for in
 * notifications"; deletes it otherwise (the switch off, push off, Showcase, another account, unreadable records). Loaded
 * by the shell's PushSync only on a device with push on, or when ZIGi's options, push or the account change, and by
 * lib/push/device.ts when push goes off. Never throws, sends nothing.
 */
/** The switch (`zigoals:ai-options:v1` `notificationNames`), read with plain checks: anything unreadable is off. */
export function namesOn(storage: Pick<Storage, 'getItem'>): boolean {
  try { const o: unknown = JSON.parse(storage.getItem(AI_OPTIONS_KEY) ?? 'null'); return !!o && typeof o === 'object' && (o as {version?: unknown}).version === 1 && (o as {notificationNames?: unknown}).notificationNames === true; } catch { return false; }
}
let queue: Promise<void> = Promise.resolve();
/**
 * One change at a time, each reading the records when its turn comes. A sync that began before the switch went on (a
 * reminder change, an account check) can never delete the table after the newer sync wrote it.
 */
function inTurn(task: () => Promise<void>): Promise<void> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}
export function syncPushLabels(): Promise<void> { return inTurn(() => syncNow(new Date())); }
/** Push is going off (turn off, a lost subscription, sign-out, deletion): the table goes, in turn with any sync. */
export function forgetPushLabels(): Promise<void> { return inTurn(clearPushLabels); }
async function syncNow(now: Date): Promise<void> {
  try {
    const storage = getAppStorage();
    const on = !isShowcase() && readPushRecord(storage).data !== null && namesOn(storage);
    if (!on) { await clearPushLabels(); return; }
    const habits = await storedHabits(storage), links = readHabitHealthLinks(storage);
    const today = habits ? habitCalendarDay(habits, now) : localDate(now);
    await writePushLabels(labelRows({reminders: readReminders(storage).data, habits, healthLinked: links.unreadable ? null : new Set(Object.keys(links.data.links)), zone: deviceZone(), today}));
  } catch { await clearPushLabels(); }
}
