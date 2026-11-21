import {clockFromMidnight, clockFromNoon, type DayPoint} from './engine';

/**
 * Session AV (owner follow-up 1, F-SLEEP-LONG; Sleep Cycle's long-range trends): the daily points of 90 days or a year
 * grouped into weeks (Monday first) or calendar months — the average time asleep and the average quality of the nights
 * logged in each, and how many were logged. A group with no logged night stays empty (never zero). Pure.
 */
export type SleepGroup = {key: string; start: string; end: string; nights: number; asleep: number | null; quality: number | null; days: number;
  /** Session AV (q3 #46): the average bedtime and wake time ("23:10", "07:05") of the nights logged in the group, or null. */
  bed: string | null; wake: string | null};
/** Session AV (q3 #46): a year by month is the last 12 calendar months (this month and the 11 before), never 13 part-months. */
export const YEAR_MONTHS = 12;
export function lastMonths(points: readonly DayPoint[], months = YEAR_MONTHS): DayPoint[] {
  const last = points.at(-1); if (!last) return [];
  const y = Number(last.date.slice(0, 4)), m = Number(last.date.slice(5, 7)) - 1 - (months - 1), first = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  return points.filter(p => p.date.slice(0, 7) >= first);
}
const weekStart = (d: string) => { const t = new Date(`${d}T12:00:00Z`), back = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - back); return t.toISOString().slice(0, 10); };
export function groupSleep(points: readonly DayPoint[], by: 'week' | 'month'): SleepGroup[] {
  const groups = new Map<string, {start: string; end: string; days: number; asleep: number[]; quality: number[]; bed: number[]; wake: number[]}>();
  for (const p of points) {
    const key = by === 'month' ? p.date.slice(0, 7) : weekStart(p.date), g = groups.get(key) ?? {start: p.date, end: p.date, days: 0, asleep: [], quality: [], bed: [], wake: []};
    g.end = p.date; g.days++;
    if (p.asleep !== null) g.asleep.push(p.asleep);
    if (p.quality !== null) g.quality.push(p.quality);
    if (p.asleep !== null && p.bed !== null) g.bed.push(p.bed);
    if (p.asleep !== null && p.wake !== null) g.wake.push(p.wake);
    groups.set(key, g);
  }
  const avg = (v: number[]) => v.length ? Math.round(v.reduce((t, n) => t + n, 0) / v.length) : null;
  return [...groups].map(([key, g]) => ({key, start: g.start, end: g.end, days: g.days, nights: g.asleep.length, asleep: avg(g.asleep), quality: g.quality.length ? Math.round(g.quality.reduce((t, n) => t + n, 0) / g.quality.length * 10) / 10 : null,
    bed: g.bed.length ? clockFromNoon(avg(g.bed)!) : null, wake: g.wake.length ? clockFromMidnight(avg(g.wake)!) : null}));
}
/** "On average 7 h 10 min a night over the 52 nights logged" — the whole range at once, or null with none logged. */
export function rangeAverage(points: readonly DayPoint[]): {asleep: number; nights: number} | null {
  const logged = points.filter(p => p.asleep !== null);
  return logged.length ? {asleep: Math.round(logged.reduce((t, p) => t + p.asleep!, 0) / logged.length), nights: logged.length} : null;
}
