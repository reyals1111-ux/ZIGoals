import {habitDay, type Habit, type HabitData} from '../habits';
import {journalTimeZone} from '../journal-zone';
import {addLocalDays, localWeekday} from '../local-date';
import {wallClock} from '../zone-time';

/**
 * A habit's patterns (Session W Part 10), from its own entries only: the days it was done by weekday and week over the
 * last 12 weeks, and the time check-ins are usually saved (labelled as save times: a check-in may be saved later than
 * the habit was done). Rest days (skips) and days not scheduled count for nothing either way; today counts once done.
 */
export const WEEKS = 12;
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export type Tally = {done: number; scheduled: number};
/** Whether a day counts, and whether it was done: scheduled, not a rest day, and past (or done today). */
function tally(habit: Habit, date: string, today: string): Tally | null {
  const day = habitDay(habit, date, today);
  if (!day.scheduled || day.status === 'skipped') return null;
  const done = day.status === 'complete';
  return date < today || done ? {done: done ? 1 : 0, scheduled: 1} : null;
}
const mondayOf = (date: string) => addLocalDays(date, -((localWeekday(date) + 6) % 7));
/** Days done of days scheduled, per weekday (Monday first), over the last 12 weeks. */
export function byWeekday(habit: Habit, today: string): {weekday: number; done: number; scheduled: number}[] {
  const sums = new Map<number, Tally>(WEEKDAY_ORDER.map(d => [d, {done: 0, scheduled: 0}]));
  const from = addLocalDays(mondayOf(today), -7 * (WEEKS - 1));
  for (let date = from < habit.startDate ? habit.startDate : from; date <= today; date = addLocalDays(date, 1)) {
    const t = tally(habit, date, today); if (!t) continue;
    const s = sums.get(localWeekday(date))!; s.done += t.done; s.scheduled += t.scheduled;
  }
  return WEEKDAY_ORDER.map(weekday => ({weekday, ...sums.get(weekday)!}));
}
/** Days done of days scheduled, per week (Monday to Sunday), for the last 12 weeks, oldest first. */
export function byWeek(habit: Habit, today: string): {weekStart: string; done: number; scheduled: number}[] {
  const first = addLocalDays(mondayOf(today), -7 * (WEEKS - 1));
  return Array.from({length: WEEKS}, (_, i) => {
    const weekStart = addLocalDays(first, i * 7), sum: Tally = {done: 0, scheduled: 0};
    for (let d = 0; d < 7; d++) {
      const date = addLocalDays(weekStart, d);
      if (date > today || date < habit.startDate) continue;
      const t = tally(habit, date, today); if (t) { sum.done += t.done; sum.scheduled += t.scheduled; }
    }
    return {weekStart, ...sum};
  });
}
/** The habits' zone: their own, then the journal zone, then the device's. */
export const habitsZone = (data: Pick<HabitData, 'timeZone'>) => data.timeZone ?? journalTimeZone() ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
/**
 * When check-ins are usually saved: the middle save time (to the quarter hour) of the logged check-ins of the last
 * 60 days, from at least five; null with fewer.
 */
export function usualSaveTime(habit: Habit, zone: string, today: string): {clock: string; n: number} | null {
  const from = addLocalDays(today, -59);
  const minutes = habit.entries.filter(e => e.disposition === 'logged' && e.count > 0 && e.date >= from && e.date <= today).map(e => wallClock(Date.parse(e.updatedAt), zone).minutes).sort((a, b) => a - b);
  if (minutes.length < 5) return null;
  const mid = minutes.length % 2 ? minutes[(minutes.length - 1) / 2]! : (minutes[minutes.length / 2 - 1]! + minutes[minutes.length / 2]!) / 2;
  const q = (Math.round(mid / 15) * 15) % 1440;
  return {clock: `${String(Math.floor(q / 60)).padStart(2, '0')}:${String(q % 60).padStart(2, '0')}`, n: minutes.length};
}
