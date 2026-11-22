import {notifyPrefsSchema, type NotifyPrefs} from './notify/prefs';
import {addDays, weekdayBit, weekdayOf} from './notify/zone';
import type {HealthData} from './health';
import {measurementHistory, readingDay} from './body-measurements';

/**
 * Session AV lane 2 (health r3; LEDGER #286, Carb Manager's weigh-in reminders): an opt-in reminder to weigh in at a
 * chosen time — every day, on chosen weekdays, or once a month on a chosen day (1–28) — skipped once a weight is logged
 * that day. Kept as `weighIn` in this device's notification prefs (`zigoals:notify:v1`). The reminder never says a weight.
 * Pure.
 */
export type WeighIn = {time: string; repeat: 'daily' | 'weekdays' | 'monthly'; weekdays?: number; day?: number};
export const EVERY_DAY = 127;
export const WEEKDAY_BITS = [['Mon', 'Monday', 1], ['Tue', 'Tuesday', 2], ['Wed', 'Wednesday', 4], ['Thu', 'Thursday', 8], ['Fri', 'Friday', 16], ['Sat', 'Saturday', 32], ['Sun', 'Sunday', 64]] as const;
export const DEFAULT_WEIGH_IN: WeighIn = {time: '07:30', repeat: 'weekdays', weekdays: 1};
export const weighInOf = (p: NotifyPrefs): WeighIn | null => p.weighIn ?? null;
/** Sets (or, with null, removes) the reminder; setting it also switches the Weigh-in notifications on. */
export function withWeighIn(p: NotifyPrefs, w: WeighIn | null): NotifyPrefs {
  if (!w) { const {weighIn: _drop, ...rest} = p; void _drop; return notifyPrefsSchema.parse(rest); }
  const clean = {time: w.time, repeat: w.repeat, ...(w.repeat === 'weekdays' ? {weekdays: w.weekdays && w.weekdays & EVERY_DAY ? w.weekdays & EVERY_DAY : 1} : {}), ...(w.repeat === 'monthly' ? {day: Math.min(28, Math.max(1, w.day ?? 1))} : {})};
  return notifyPrefsSchema.parse({...p, weighIn: clean, types: {...p.types, weighIn: true}});
}
/** The weekday mask it wakes on (daily: every day; monthly: none, its days are dated). */
export const weighInMask = (w: WeighIn): number => w.repeat === 'daily' ? EVERY_DAY : w.repeat === 'weekdays' ? (w.weekdays ?? 0) & EVERY_DAY : 0;
/** Whether `day` is one of the reminder's days (review B3B-9: the card says today's is quiet only on such a day). */
export const weighInDueOn = (w: WeighIn, day: string): boolean => w.repeat === 'monthly' ? Number(day.slice(8, 10)) === (w.day ?? 1) : !!(weighInMask(w) & weekdayBit(weekdayOf(day)));
/** A monthly reminder's dates from today through the next 31 days. */
export function monthlyDates(w: WeighIn, today: string): string[] {
  if (w.repeat !== 'monthly') return [];
  const out: string[] = [];
  for (let i = 0; i <= 31; i++) { const d = addDays(today, i); if (Number(d.slice(8, 10)) === (w.day ?? 1)) out.push(d); }
  return out;
}
/**
 * Whether a weight is logged on `day`: in the daily weight list, or as a timed weight reading in Health → Measurements on
 * that day of its own zone (review B3B-3; the two are joined as lib/body-measurements.ts latestWeightObservation joins them).
 */
export function weighedInOn(health: HealthData | null | undefined, day: string): boolean {
  if (!health) return false;
  if (health.weights.some(x => x.date === day)) return true;
  try { return measurementHistory(health, 'weight').readings.some(r => readingDay(r) === day); } catch { return false; }
}
/** What the notification plan needs: the time, the weekday mask, a monthly reminder's dates, and whether today has a weight. */
export function weighInPlanInput(w: WeighIn | null, weighedInToday: boolean, today: string): {time: string; weekdays: number; dates: string[]; doneToday: boolean} | null {
  if (!w) return null;
  return {time: w.time, weekdays: weighInMask(w), dates: monthlyDates(w, today), doneToday: weighedInToday};
}
const ordinal = (d: number) => `${d}${d === 1 || d === 21 ? 'st' : d === 2 || d === 22 ? 'nd' : d === 3 || d === 23 ? 'rd' : 'th'}`;
/** "Every day at 07:30", "Mon and Thu at 07:30", "On the 1st of each month at 07:30". */
export function weighInWords(w: WeighIn, clock: (t: string) => string = t => t): string {
  if (w.repeat === 'daily') return `Every day at ${clock(w.time)}`;
  if (w.repeat === 'monthly') return `On the ${ordinal(w.day ?? 1)} of each month at ${clock(w.time)}`;
  const days = WEEKDAY_BITS.filter(([, , bit]) => (w.weekdays ?? 0) & bit).map(([name]) => name);
  return `${days.length === 7 ? 'Every day' : days.length > 1 ? `${days.slice(0, -1).join(', ')} and ${days.at(-1)}` : days[0] ?? 'No day'} at ${clock(w.time)}`;
}
