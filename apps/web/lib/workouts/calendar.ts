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

/**
 * Session AV lane 2 (body; LEDGER #118, Hevy's yearly calendar and consistency streak): a calendar year as its twelve
 * months (each laid out as `workoutMonth` does), with the days trained in the year, and the streak of weeks in a row with
 * at least one finished workout — this week counts once it has one, and a week not over yet never breaks the streak —
 * with the longest such run. From the person's own log. Pure.
 */
export type WorkoutYear = {year: number; months: WorkoutMonth[]; days: number; sessions: number};
export function workoutYear(w: Workouts, year: number, today: string): WorkoutYear {
  const months = Array.from({length: 12}, (_, i) => workoutMonth(w, `${year}-${pad(i + 1)}`, today));
  return {year, months, days: months.reduce((n, m) => n + m.days, 0), sessions: months.reduce((n, m) => n + m.sessions, 0)};
}
const mondayOf = (d: string) => addLocalDays(d, -((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7));
export type WeekStreak = {current: number; best: number; thisWeek: boolean};
/**
 * Session AV lane 2, round 5 (LEDGER #374, Gentler Streak's status): `pauses` are the days a workout status covered
 * (lib/workouts/status.ts `pausesOf`). A week a pause touches and that has no workout is passed over: it neither counts
 * nor breaks the streak. Without pauses the streak is exactly as before.
 */
export function weekStreak(w: Workouts, today: string, pauses: readonly {from: string; to: string}[] = []): WeekStreak {
  const weeks = new Set(finished(w).filter(x => x.date <= today).map(x => mondayOf(x.date))), now = mondayOf(today), thisWeek = weeks.has(now);
  const paused = (monday: string) => pauses.some(p => p.from <= addLocalDays(monday, 6) && p.to >= monday);
  let current = 0;
  for (let at = thisWeek ? now : addLocalDays(now, -7), i = 0; i < 1100; at = addLocalDays(at, -7), i++) {
    if (weeks.has(at)) current++; else if (!paused(at)) break;
  }
  const sorted = [...weeks].sort();
  const bridged = (prev: string, k: string) => { for (let at = addLocalDays(prev, 7); at < k; at = addLocalDays(at, 7)) if (!paused(at)) return false; return true; };
  let best = 0, run = 0, prev = '';
  for (const k of sorted) { run = prev && (addLocalDays(prev, 7) === k || (pauses.length > 0 && bridged(prev, k))) ? run + 1 : 1; best = Math.max(best, run); prev = k; }
  return {current, best, thisWeek};
}
