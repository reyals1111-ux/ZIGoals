import {addLocalDays} from '../local-date';
import {formatDate, formatWeekday} from '../visual-format';
import {finished} from './engine';
import type {Workouts} from './schema';

/**
 * Session AV (owner follow-up 1, F-WORKOUT-CALENDAR; Hevy's calendar): a month of finished workouts as weeks, Monday
 * first — each day with the workouts done on it and its words for a screen reader — and how many days of the month had
 * one. Days before the 1st and after the last are shown as the edge of the grid. Pure.
 */
export type CalendarDay = {date: string; day: number; inMonth: boolean; today: boolean; names: string[]; words: string};
export type WorkoutMonth = {month: string; weeks: CalendarDay[][]; weekdays: string[]; days: number; sessions: number};
const pad = (n: number) => String(n).padStart(2, '0');
export const shiftMonthKey = (month: string, n: number) => { const y = Number(month.slice(0, 4)), m = Number(month.slice(5, 7)) - 1 + n; return `${y + Math.floor(m / 12)}-${pad(((m % 12) + 12) % 12 + 1)}`; };
export function workoutMonth(w: Workouts, month: string, today: string): WorkoutMonth {
  const first = `${month}-01`, last = addLocalDays(`${shiftMonthKey(month, 1)}-01`, -1);
  const byDay = new Map<string, string[]>();
  for (const x of finished(w)) if (x.date >= first && x.date <= last) byDay.set(x.date, [...(byDay.get(x.date) ?? []), x.name]);
  const weekday = (d: string) => (new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday 0
  let at = addLocalDays(first, -weekday(first));
  const weeks: CalendarDay[][] = [];
  while (at <= last) {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++, at = addLocalDays(at, 1)) {
      const names = byDay.get(at) ?? [], inMonth = at >= first && at <= last;
      week.push({date: at, day: Number(at.slice(8)), inMonth, today: at === today, names, words: `${formatDate(at, {weekday: true, year: false})}: ${names.length ? names.join(', ') : 'no workout'}`});
    }
    weeks.push(week);
  }
  return {month, weeks, weekdays: weeks[0]!.map(d => formatWeekday(d.date)), days: byDay.size, sessions: [...byDay.values()].reduce((n, v) => n + v.length, 0)};
}
