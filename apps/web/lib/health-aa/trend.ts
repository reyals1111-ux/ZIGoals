import {addLocalDays} from '../local-date';
import type {HealthData} from '../health';

/**
 * N2: the weight trend, an exponentially weighted moving average over the daily readings (α 0.1 per day, so one
 * reading moves the line a tenth of the way; days without a reading carry the line forward), the weekly rate of change
 * (the trend today against the trend seven days ago) and the goal line. Grams in, grams out; the view shows the unit.
 */
export const TREND_ALPHA = 0.1;
export type TrendPoint = {date: string; grams: number | null; trend: number | null};
export type WeightTrend = {points: TrendPoint[]; latestTrend: number | null; weeklyRate: number | null; readings: number; goalGrams: number | null};
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
  const latestTrend = points[points.length - 1]!.trend, weekAgo = points[points.length - 8]?.trend ?? null;
  return {points, latestTrend, weeklyRate: latestTrend !== null && weekAgo !== null && readings >= 2 ? latestTrend - weekAgo : null, readings, goalGrams: data.targets.weightGrams};
}
