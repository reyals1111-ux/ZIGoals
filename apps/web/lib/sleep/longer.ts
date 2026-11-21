import type {DayPoint} from './engine';

/**
 * Session AV (owner follow-up 1, F-SLEEP-LONG; Sleep Cycle's long-range trends): the daily points of 90 days or a year
 * grouped into weeks (Monday first) or calendar months — the average time asleep and the average quality of the nights
 * logged in each, and how many were logged. A group with no logged night stays empty (never zero). Pure.
 */
export type SleepGroup = {key: string; start: string; end: string; nights: number; asleep: number | null; quality: number | null; days: number};
const weekStart = (d: string) => { const t = new Date(`${d}T12:00:00Z`), back = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - back); return t.toISOString().slice(0, 10); };
export function groupSleep(points: readonly DayPoint[], by: 'week' | 'month'): SleepGroup[] {
  const groups = new Map<string, {start: string; end: string; days: number; asleep: number[]; quality: number[]}>();
  for (const p of points) {
    const key = by === 'month' ? p.date.slice(0, 7) : weekStart(p.date), g = groups.get(key) ?? {start: p.date, end: p.date, days: 0, asleep: [], quality: []};
    g.end = p.date; g.days++;
    if (p.asleep !== null) g.asleep.push(p.asleep);
    if (p.quality !== null) g.quality.push(p.quality);
    groups.set(key, g);
  }
  const avg = (v: number[]) => v.length ? Math.round(v.reduce((t, n) => t + n, 0) / v.length) : null;
  return [...groups].map(([key, g]) => ({key, start: g.start, end: g.end, days: g.days, nights: g.asleep.length, asleep: avg(g.asleep), quality: g.quality.length ? Math.round(g.quality.reduce((t, n) => t + n, 0) / g.quality.length * 10) / 10 : null}));
}
/** "On average 7 h 10 min a night over the 52 nights logged" — the whole range at once, or null with none logged. */
export function rangeAverage(points: readonly DayPoint[]): {asleep: number; nights: number} | null {
  const logged = points.filter(p => p.asleep !== null);
  return logged.length ? {asleep: Math.round(logged.reduce((t, p) => t + p.asleep!, 0) / logged.length), nights: logged.length} : null;
}
