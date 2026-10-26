import {addLocalDays} from '../local-date';
import type {HealthData} from '../health';

/**
 * N2: the weight trend, an exponentially weighted moving average over the daily readings (α 0.1 per day, so one
 * reading moves the line a tenth of the way; days without a reading carry the line forward), the weekly rate of change
 * and the goal line. Grams in, grams out; the view shows the unit.
 * Session AH (TR10; B-011, N-058, N-120): one weekly rate for every view (the trend card, the coach, the energy estimate):
 * the least-squares slope of the readings in the 28 days ending today, times seven. It no longer depends on the window a
 * caller draws (the coach's 14 days and the card's 42 gave −0.1 and −0.2 for one real −0.28 kg a week), and the slow
 * smoothed line no longer understates it. It needs two readings at least seven days apart.
 */
export const RATE_WINDOW_DAYS = 28;
/** Grams per week, from the readings on or before `today` within the rate window; null without enough span. */
export function weeklyRateOf(weights: Pick<HealthData, 'weights'>['weights'], today: string): number | null {
  const start = addLocalDays(today, -(RATE_WINDOW_DAYS - 1)), day = (d: string) => Date.parse(`${d}T00:00:00Z`) / 86_400_000;
  const rows = weights.filter(w => w.date >= start && w.date <= today).map(w => ({x: day(w.date), y: w.grams}));
  if (rows.length < 2) return null;
  const xs = rows.map(r => r.x), span = Math.max(...xs) - Math.min(...xs);
  if (span < 7) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / rows.length, my = rows.reduce((a, r) => a + r.y, 0) / rows.length;
  const sxy = rows.reduce((a, r) => a + (r.x - mx) * (r.y - my), 0), sxx = rows.reduce((a, r) => a + (r.x - mx) ** 2, 0);
  return sxx ? Math.round(sxy / sxx * 7) : null;
}
export const TREND_ALPHA = 0.1;
export type TrendPoint = {date: string; grams: number | null; trend: number | null};
export type WeightTrend = {points: TrendPoint[]; latestTrend: number | null; weeklyRate: number | null; readings: number; goalGrams: number | null; latestReading: {date: string; grams: number} | null};
export function weightTrend(data: Pick<HealthData, 'weights' | 'targets'>, today: string, days = 42): WeightTrend {
  const byDate = new Map(data.weights.filter(w => w.date <= today).map(w => [w.date, w.grams]));
  const first = addLocalDays(today, -(days - 1));
  // Seed the line from the readings before the window, so the first shown point is not a cold start.
  let line: number | null = null;
  for (const w of [...data.weights].filter(w => w.date < first).sort((a, b) => a.date.localeCompare(b.date))) line = line === null ? w.grams : line + TREND_ALPHA * (w.grams - line);
  const points: TrendPoint[] = [];
  let readings = 0;
  for (let i = 0; i < days; i++) {
    const date = addLocalDays(first, i), grams = byDate.get(date) ?? null;
    if (grams !== null) { readings++; line = line === null ? grams : line + TREND_ALPHA * (grams - line); }
    points.push({date, grams, trend: line === null ? null : Math.round(line)});
  }
  const latestTrend = points[points.length - 1]!.trend;
  const last = [...data.weights].filter(w => w.date <= today).sort((a, b) => b.date.localeCompare(a.date))[0];
  return {points, latestTrend, weeklyRate: latestTrend !== null ? weeklyRateOf(data.weights, today) : null, readings, goalGrams: data.targets.weightGrams, latestReading: last ? {date: last.date, grams: last.grams} : null};
}
