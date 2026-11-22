import {addLocalDays} from '../local-date';
import {scaleSeries} from './engine';
import type {Scales} from './store';

/**
 * Session AV lane 2 (habits pillar; LEDGER #189, Daylio's scale statistics): one scale over the last 30, 90 or 365 days —
 * the days rated, the average, the lowest and highest, how often each level came, and the ratings in order for a small
 * chart (an unrated day is a gap, never a level). Derived from `zigoals:scales:v1`; nothing stored. Pure.
 */
export const STAT_SPANS = [30, 90, 365] as const;
export type StatSpan = (typeof STAT_SPANS)[number];
export type ScaleStats = {span: StatSpan; from: string; to: string; rated: number; average: number | null; low: number | null; high: number | null; counts: [number, number, number, number, number]; points: {date: string; value: number}[]; mostly: number | null};
export function scaleStats(rec: Pick<Scales, 'days'>, id: string, today: string, span: StatSpan): ScaleStats {
  const from = addLocalDays(today, -(span - 1)), points = scaleSeries(rec, id).filter(p => p.date >= from && p.date <= today);
  const counts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const p of points) counts[p.value - 1]!++;
  const total = points.reduce((n, p) => n + p.value, 0), top = Math.max(...counts);
  return {span, from, to: today, rated: points.length, average: points.length ? Math.round(total / points.length * 10) / 10 : null,
    low: points.length ? Math.min(...points.map(p => p.value)) : null, high: points.length ? Math.max(...points.map(p => p.value)) : null,
    counts, points, mostly: top > 0 ? counts.indexOf(top) + 1 : null};
}
