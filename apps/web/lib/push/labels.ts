import type {HabitData} from '../habits';
import type {Reminders} from '../reminders/schema';
import {habitWeekdays, TIME, weekdayBit} from './schedule';

/**
 * Reminder names in notifications, opt-in (Session V Part 13; owner-approved, ADR-014 "Owner-approved changes", which
 * changes ADR-010 rule 2 for people who turn it on). Off by default. Only with Settings → Reminders → "Show what a
 * reminder is for in notifications" does this device keep a small table of its habit reminders' names in IndexedDB
 * `zigoals-push-labels-v1`, which the push service worker only reads. The text is composed on the device when a push
 * arrives: the payload stays {"v":1}, and the server and the push Worker learn nothing new (ADR-010 rule 1 holds).
 * Water and habits that tick themselves off from Health always keep the generic text, and so does a push that matches
 * no reminder due in the last 30 minutes (the push's own time to live). The table is emptied when the switch, push or
 * the account changes, and on erase.
 */
export const LABELS_DB = 'zigoals-push-labels-v1', LABELS_STORE = 'labels';
export const GENERIC_TEXT = 'A reminder from ZIGoals';
export const MAX_LABEL = 60, MAX_ROWS = 40, LABEL_WINDOW_MINUTES = 30;
export type LabelRow = {id: string; time: string; zone: string; weekdays: number; label: string};
/** One plain line: no control characters or line breaks, at most 60 characters. */
export function cleanLabel(title: string): string {
  const flat = title.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim();
  return flat.length > MAX_LABEL ? `${flat.slice(0, MAX_LABEL - 1)}…` : flat;
}
/**
 * The rows for this device: one per habit reminder with the same time, zone and weekdays its push schedule has.
 * `healthLinked` lists habits that tick themselves off from Health; null (unreadable) leaves every habit out.
 */
export function labelRows({reminders, habits, healthLinked, zone, today}: {reminders: Reminders; habits: HabitData | undefined; healthLinked: ReadonlySet<string> | null; zone: string; today: string}): LabelRow[] {
  if (!habits || !healthLinked) return [];
  const rows: LabelRow[] = [];
  for (const [habitId, reminder] of Object.entries(reminders.habits)) {
    const habit = habits.habits.find(h => h.id === habitId);
    if (!habit || healthLinked.has(habitId) || !TIME.test(reminder.time)) continue;
    const weekdays = habitWeekdays(habits, habitId, today), label = cleanLabel(habit.title);
    if (weekdays && label) rows.push({id: habitId, time: reminder.time, zone, weekdays, label});
  }
  return rows.sort((a, b) => a.time.localeCompare(b.time) || a.label.localeCompare(b.label)).slice(0, MAX_ROWS);
}
/** The clock ("HH:MM") and JavaScript weekday of an instant in a zone; null for a zone this browser does not know. */
export function zoneClock(now: Date, zone: string): {clock: string; weekday: number} | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {timeZone: zone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit', weekday: 'short'}).formatToParts(now);
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return weekday < 0 ? null : {clock: `${get('hour')}:${get('minute')}`, weekday};
  } catch { return null; }
}
const minutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
/**
 * The notification text for a push arriving now: the names of the reminders due in the last 30 minutes on their own
 * day, at most three; otherwise the generic line. `public/push-sw.js` carries the same rule in plain JavaScript (the
 * worker imports nothing), and a test runs both on the same cases.
 */
export function labelText(rows: readonly LabelRow[], now: Date): string {
  const names: string[] = [];
  for (const row of rows) {
    const here = zoneClock(now, row.zone);
    if (!here || !(row.weekdays & weekdayBit(here.weekday))) continue;
    const late = minutes(here.clock) - minutes(row.time);
    if (late >= 0 && late <= LABEL_WINDOW_MINUTES && !names.includes(row.label)) names.push(row.label);
  }
  if (!names.length) return GENERIC_TEXT;
  const shown = names.slice(0, 3).join(', '), more = names.length - 3;
  return `${names.length === 1 ? 'Reminder' : 'Reminders'}: ${shown}${more > 0 ? ` and ${more} more` : ''}`;
}
