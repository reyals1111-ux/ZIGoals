import {habitDay, type Habit} from '../habits';
import {addLocalDays, localWeekday} from '../local-date';
import {habitStrength} from './strength';
import {WEEKDAY_ORDER} from './stats';

/**
 * Session AV lane 2 (habits pillar; LEDGER #187 Loop's habit score with its chart, #190 its history and frequency
 * charts): a habit's longer history, derived from its own days (nothing stored). The strength (lib/habits-v2/strength.ts,
 * unchanged) at the end of each of the last 52 weeks; days done of days scheduled by month, quarter or year since the
 * habit began; and, per month, the days done on each weekday. A rest day or an unscheduled day counts for nothing
 * either way, as everywhere. Pure.
 */
export const HISTORY_WEEKS = 52;
const mondayOf = (date: string) => addLocalDays(date, -((localWeekday(date) + 6) % 7));
/** The strength at the end of each week (Sunday; this week, today), oldest first; null while under seven scheduled days. */
export function strengthByWeek(habit: Habit, today: string, weeks = HISTORY_WEEKS): {weekEnd: string; score: number | null}[] {
  const thisMonday = mondayOf(today);
  return Array.from({length: weeks}, (_, i) => {
    const monday = addLocalDays(thisMonday, -7 * (weeks - 1 - i)), end = i === weeks - 1 ? today : addLocalDays(monday, 6);
    return {weekEnd: end, score: end < habit.startDate ? null : habitStrength(habit, end)?.score ?? null};
  });
}
export type PeriodUnit = 'month' | 'quarter' | 'year';
const periodOf = (date: string, unit: PeriodUnit) => unit === 'year' ? date.slice(0, 4) : unit === 'month' ? date.slice(0, 7) : `${date.slice(0, 4)}-Q${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1}`;
const LIMIT: Record<PeriodUnit, number> = {month: 24, quarter: 12, year: 10};
function counted(habit: Habit, date: string, today: string): {done: number} | null {
  const day = habitDay(habit, date, today);
  if (!day.scheduled || day.status === 'skipped') return null;
  const done = day.status === 'complete';
  return date < today || done ? {done: done ? 1 : 0} : null;
}
/** Days done of days scheduled per month, quarter or year, newest first (at most 24 months, 12 quarters, 10 years). */
export function totalsBy(habit: Habit, today: string, unit: PeriodUnit): {period: string; done: number; scheduled: number}[] {
  const sums = new Map<string, {done: number; scheduled: number}>();
  const from = addLocalDays(today, -3660) > habit.startDate ? addLocalDays(today, -3660) : habit.startDate;
  for (let d = from; d <= today; d = addLocalDays(d, 1)) {
    const c = counted(habit, d, today); if (!c) continue;
    const key = periodOf(d, unit), s = sums.get(key) ?? {done: 0, scheduled: 0};
    s.done += c.done; s.scheduled++; sums.set(key, s);
  }
  return [...sums.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, LIMIT[unit]).map(([period, s]) => ({period, ...s}));
}
/** Per month (newest first, the last 12), the days done on each weekday, Monday first. */
export function weekdayByMonth(habit: Habit, today: string, months = 12): {month: string; days: number[]}[] {
  const out = new Map<string, number[]>(), first = `${addLocalDays(`${today.slice(0, 7)}-01`, -31 * (months - 1)).slice(0, 7)}-01`;
  for (let d = first < habit.startDate ? habit.startDate : first; d <= today; d = addLocalDays(d, 1)) {
    const c = counted(habit, d, today); if (!c?.done) continue;
    const row = out.get(d.slice(0, 7)) ?? [0, 0, 0, 0, 0, 0, 0];
    row[WEEKDAY_ORDER.indexOf(localWeekday(d) as (typeof WEEKDAY_ORDER)[number])]!++;
    out.set(d.slice(0, 7), row);
  }
  return [...out.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, months).map(([month, days]) => ({month, days}));
}
