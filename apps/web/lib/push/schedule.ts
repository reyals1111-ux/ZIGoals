import {habitDay, type HabitData} from '../habits';
import {addLocalDays, localWeekday} from '../local-date';
import type {Reminders} from '../reminders/schema';

/**
 * What the push Worker is told (ADR-010): only times ("HH:MM" on the device's clock), the device's zone and weekday
 * masks, derived from this device's reminder times and the habit journal. Never a title, a count or a kind.
 */
export type PushSchedule = {time: string; zone: string; weekdays: number};
export type QuietHours = {from: string; to: string};
export const MAX_SCHEDULES = 20, EVERY_DAY = 127, DEFAULT_QUIET: QuietHours = {from: '22:00', to: '07:00'};
export const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
/** Monday = 1, Tuesday = 2 … Sunday = 64, from a JavaScript weekday (0 = Sunday). */
export const weekdayBit = (weekday: number) => 1 << ((weekday + 6) % 7);
/** Whether "HH:MM" lies in the quiet window [from, to), which may wrap midnight; from = to means no window. */
export function inQuietWindow(time: string, quiet: QuietHours): boolean { if (quiet.from === quiet.to) return false; return quiet.from < quiet.to ? time >= quiet.from && time < quiet.to : time >= quiet.from || time < quiet.to; }
const OFF = new Set(['skipped', 'planned-skip', 'paused', 'archived', 'not-started', 'not-scheduled']);
/** The weekdays of the coming week on which a habit is scheduled and not skipped, as a mask; 0 when none. */
export function habitWeekdays(habits: HabitData, habitId: string, today: string): number {
  const habit = habits.habits.find(h => h.id === habitId); if (!habit) return 0;
  let mask = 0;
  // Each coming day is read as if it were today: habitDay says "future" (unscheduled) for days ahead otherwise.
  for (let n = 0; n < 7; n++) { const date = addLocalDays(today, n), day = habitDay(habit, date, date); if (day.scheduled && !OFF.has(day.status)) mask |= weekdayBit(localWeekday(date)); }
  return mask;
}
export type Derived = {schedules: PushSchedule[]; refused: {title: string; time: string}[]; dropped: number};
/**
 * The schedule set for this device: one row per distinct (time, weekdays) among the habit reminders (weekdays from
 * the journal's coming week) and the water reminder (every day); rows inside the quiet window are refused and
 * listed by title; the 20 earliest times are kept and the rest counted as dropped.
 */
export function deriveSchedules({reminders, habits, zone, quiet, today}: {reminders: Reminders; habits: HabitData | undefined; zone: string; quiet: QuietHours; today: string}): Derived {
  const rows = new Map<string, PushSchedule>(), refused: Derived['refused'] = [];
  const add = (title: string, time: string, weekdays: number) => {
    if (!TIME.test(time) || weekdays === 0) return;
    if (inQuietWindow(time, quiet)) { refused.push({title, time}); return; }
    rows.set(`${time}|${weekdays}`, {time, zone, weekdays});
  };
  for (const [habitId, reminder] of Object.entries(reminders.habits)) {
    const habit = habits?.habits.find(h => h.id === habitId); if (!habit || !habits) continue;
    add(habit.title, reminder.time, habitWeekdays(habits, habitId, today));
  }
  if (reminders.water) add('Water', reminders.water.time, EVERY_DAY);
  const sorted = [...rows.values()].sort((a, b) => a.time.localeCompare(b.time) || a.weekdays - b.weekdays);
  return {schedules: sorted.slice(0, MAX_SCHEDULES), refused: refused.sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title)), dropped: Math.max(0, sorted.length - MAX_SCHEDULES)};
}
