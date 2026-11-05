import {addLocalDays} from '../local-date';
import type {HealthData} from '../health';

/**
 * N2: the weight trend, an exponentially weighted moving average over the daily readings (α 0.1 per day, so one
 * (Session AL fourth pass, X3-16: with its steady-slope lag added back, see lagOf below)
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
/**
 * Session AL (P-MO-70 / P-PR-23; MO-149, X3-16): what the weekly rate still needs, in words the coach can say. The coach
 * said "two in the last week will do" to a person with seven daily readings: the rate needs readings at least SEVEN days
 * apart within the last 28 days, which six or seven daily readings in one week are not. `readyOn` is the first day a
 * reading would give the rate (the first reading plus seven days), or null when there is no reading in the window.
 */
export type RateReadiness = {readings: number; first: string | null; last: string | null; readyOn: string | null; ready: boolean};
export function rateReadiness(weights: Pick<HealthData, 'weights'>['weights'], today: string): RateReadiness {
  const start = addLocalDays(today, -(RATE_WINDOW_DAYS - 1));
  const days = [...new Set(weights.filter(w => w.date >= start && w.date <= today).map(w => w.date))].sort();
  const first = days[0] ?? null, last = days.at(-1) ?? null;
  return {readings: days.length, first, last, readyOn: first ? addLocalDays(first, 7) : null, ready: weeklyRateOf(weights, today) !== null};
}
export const TREND_ALPHA = 0.1;
/**
 * Session AL fourth pass (X3-16): the smoothed line trailed a steady change by days (seven daily readings from 182.4 to
 * 178.2 lb read a trend of 181.2). An average of the past lags a steady slope by about (1 − α) / α readings, so the line
 * adds that lag back, from the weekly rate (the least-squares slope, needs readings seven days apart) and the mean gap
 * between readings. It only moves toward the latest reading and at most nine tenths of the way, so a single noisy
 * reading still moves it a little and the line stays a smoothed estimate, never the last reading itself.
 */
export const LAG_SHARE_MAX = 0.9;
function lagOf(weights: Pick<HealthData, 'weights'>['weights'], date: string, line: number, latest: number | null, updates: number): number {
  if (latest === null || updates < 1) return 0;
  // The slope behind the lag: the least-squares slope of the readings in the rate window, from three readings over three
  // days or more (the weekly rate shown waits for seven days; this only straightens the line).
  const start = addLocalDays(date, -(RATE_WINDOW_DAYS - 1)), day = (d: string) => Date.parse(`${d}T00:00:00Z`) / 86_400_000;
  const rows = weights.filter(w => w.date >= start && w.date <= date).map(w => ({x: day(w.date), y: w.grams}));
  const seen = [...new Set(rows.map(r => r.x))].sort((a, b) => a - b);
  if (seen.length < 3 || seen.at(-1)! - seen[0]! < 3) return 0;
  const mx = rows.reduce((a, r) => a + r.x, 0) / rows.length, my = rows.reduce((a, r) => a + r.y, 0) / rows.length;
  const sxx = rows.reduce((a, r) => a + (r.x - mx) ** 2, 0), perDay = sxx ? rows.reduce((a, r) => a + (r.x - mx) * (r.y - my), 0) / sxx : 0;
  const gapDays = (seen.at(-1)! - seen[0]!) / (seen.length - 1);
  const lag = perDay * gapDays * (1 - TREND_ALPHA) / TREND_ALPHA * (1 - (1 - TREND_ALPHA) ** updates);
  const room = latest - line;
  if (room === 0 || Math.sign(lag) !== Math.sign(room)) return 0;
  return Math.sign(room) * Math.min(Math.abs(lag), Math.abs(room) * LAG_SHARE_MAX);
}
export type TrendPoint = {date: string; grams: number | null; trend: number | null};
export type WeightTrend = {points: TrendPoint[]; latestTrend: number | null; weeklyRate: number | null; readings: number; goalGrams: number | null; latestReading: {date: string; grams: number} | null};
export function weightTrend(data: Pick<HealthData, 'weights' | 'targets'>, today: string, days = 42): WeightTrend {
  const byDate = new Map(data.weights.filter(w => w.date <= today).map(w => [w.date, w.grams]));
  const first = addLocalDays(today, -(days - 1));
  // Seed the line from the readings before the window, so the first shown point is not a cold start.
  let line: number | null = null;
  for (const w of [...data.weights].filter(w => w.date < first).sort((a, b) => a.date.localeCompare(b.date))) line = line === null ? w.grams : line + TREND_ALPHA * (w.grams - line);
  const points: TrendPoint[] = [];
  let readings = 0, updates = Math.max(0, [...data.weights].filter(w => w.date < first).length - 1), lastSeen: number | null = null;
  for (let i = 0; i < days; i++) {
    const date = addLocalDays(first, i), grams = byDate.get(date) ?? null;
    if (grams !== null) { readings++; if (line !== null) updates++; line = line === null ? grams : line + TREND_ALPHA * (grams - line); lastSeen = grams; }
    points.push({date, grams, trend: line === null ? null : Math.round(line + lagOf(data.weights, date, line, lastSeen, updates))});
  }
  const latestTrend = points[points.length - 1]!.trend;
  const last = [...data.weights].filter(w => w.date <= today).sort((a, b) => b.date.localeCompare(a.date))[0];
  return {points, latestTrend, weeklyRate: latestTrend !== null ? weeklyRateOf(data.weights, today) : null, readings, goalGrams: data.targets.weightGrams, latestReading: last ? {date: last.date, grams: last.grams} : null};
}
