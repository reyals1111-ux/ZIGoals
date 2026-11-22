import {addDays} from '../zone-time';
import {dailySeries, inBedMinutes, nightDay, nightsIn, type DayPoint} from './engine';
import type {Sleep} from './schema';

/**
 * Session AV lane 2 (body; LEDGER #123 and #124, Sleep Cycle's statistics and weekly report): time to fall asleep per
 * night (the `latencyMin` the person typed or an import gave; a night without one stays empty, never zero), grouped by
 * week or month, and "your usual" — the benchmark from the person's own nights, never outside data: the median of the
 * nights logged in the 90 days before this week (at least 7 of them). The week beside the usual in plain numbers. Pure.
 */
export type LatencyPoint = {date: string; latency: number | null};
/** Per day, the main night's time to fall asleep (the longest night that day), or null. */
export function latencySeries(s: Sleep, today: string, days: number): LatencyPoint[] {
  const nights = nightsIn(s, today, days);
  return Array.from({length: days}, (_, i) => {
    const date = addDays(today, i + 1 - days), on = nights.filter(n => nightDay(n) === date);
    const main = on.length ? on.reduce((a, b) => inBedMinutes(b) > inBedMinutes(a) ? b : a) : null;
    return {date, latency: main?.latencyMin ?? null};
  });
}
const weekStart = (d: string) => { const t = new Date(`${d}T12:00:00Z`); t.setUTCDate(t.getUTCDate() - (t.getUTCDay() + 6) % 7); return t.toISOString().slice(0, 10); };
export type LatencyGroup = {key: string; start: string; latency: number | null; nights: number};
export function groupLatency(points: readonly LatencyPoint[], by: 'week' | 'month'): LatencyGroup[] {
  const groups = new Map<string, {start: string; v: number[]}>();
  for (const p of points) { const key = by === 'month' ? p.date.slice(0, 7) : weekStart(p.date), g = groups.get(key) ?? {start: p.date, v: []}; if (p.latency !== null) g.v.push(p.latency); groups.set(key, g); }
  return [...groups].map(([key, g]) => ({key, start: g.start, nights: g.v.length, latency: g.v.length ? Math.round(g.v.reduce((a, b) => a + b, 0) / g.v.length) : null}));
}
const median = (v: number[]) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };
export const USUAL_DAYS = 90, USUAL_MIN_NIGHTS = 7;
export type Usual = {nights: number; from: string; to: string; asleep: number | null; bed: number | null; wake: number | null; latency: number | null; quality: number | null};
/** The median of the nights logged in the 90 days before the 7 days ending `today`; null with fewer than 7. */
export function usualSleep(s: Sleep, today: string): Usual | null {
  const to = addDays(today, -7), points = dailySeries(s, to, USUAL_DAYS).filter(p => p.asleep !== null), lat = latencySeries(s, to, USUAL_DAYS).map(p => p.latency).filter((n): n is number => n !== null);
  if (points.length < USUAL_MIN_NIGHTS) return null;
  const m = (f: (p: DayPoint) => number | null) => { const v = median(points.map(f).filter((n): n is number => n !== null)); return v === null ? null : Math.round(v * 10) / 10; };
  return {nights: points.length, from: addDays(to, 1 - USUAL_DAYS), to, asleep: m(p => p.asleep), bed: m(p => p.bed), wake: m(p => p.wake), latency: lat.length >= 3 ? Math.round(median(lat)!) : null, quality: m(p => p.quality)};
}
export type WeekVsUsual = {nights: number; usual: Usual; asleep: number | null; bed: number | null; wake: number | null; latency: number | null; quality: number | null};
/** The last 7 days' averages beside the usual (null when either side is missing). */
export function weekVsUsual(s: Sleep, today: string): WeekVsUsual | null {
  const usual = usualSleep(s, today); if (!usual) return null;
  const week = dailySeries(s, today, 7).filter(p => p.asleep !== null), lat = latencySeries(s, today, 7).map(p => p.latency).filter((n): n is number => n !== null);
  if (!week.length) return null;
  const avg = (v: number[]) => v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null;
  return {nights: week.length, usual, asleep: avg(week.map(p => p.asleep!)), bed: avg(week.map(p => p.bed!)), wake: avg(week.map(p => p.wake!)), latency: lat.length ? Math.round(avg(lat)!) : null, quality: avg(week.filter(p => p.quality !== null).map(p => p.quality!))};
}
