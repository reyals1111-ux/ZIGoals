import type {ContributionEvent, PrivateGoal} from './positions';
import {eventValueForGoal} from './goal-intelligence';

/**
 * G1, the pace forecast (Session AA-Cloud Part 2): "At this pace: about 14 March", from the person's own recorded
 * progress only. It is an estimate from the pace so far, never a promise: no growth is assumed, nothing is invented, and
 * with too little history it says so ("Not enough history yet") instead of guessing.
 *
 * The pace is the least-squares slope of the recorded progress over the last 180 days (at least 3 records over at least
 * 14 days). The range comes from the same slope over the window's earlier and later halves: the faster of the two gives
 * the earliest date, the slower the latest (none when the slower half did not move forward).
 */
export type ForecastPoint = {day: string; value: number};
export type ForecastState = 'not-enough' | 'no-pace' | 'reached' | 'estimate';
export type Forecast = {
  state: ForecastState;
  /** The central estimate (state "estimate"). */
  date?: string;
  /** The range: earliest from the faster half, latest from the slower half (null: the slower half did not move forward). */
  earliest?: string;
  latest?: string | null;
  /** Units a day at the central pace. */
  perDay?: number;
  points: number;
  spanDays: number;
};
export const FORECAST = {minPoints: 3, minDays: 14, windowDays: 180, maxYears: 100} as const;

const DAY = 86_400_000;
const toTime = (day: string) => Date.parse(`${day}T12:00:00Z`);
const dayOf = (time: number) => new Date(time).toISOString().slice(0, 10);
export const addDays = (day: string, n: number) => dayOf(toTime(day) + n * DAY);
export const daysBetween = (from: string, to: string) => Math.round((toTime(to) - toTime(from)) / DAY);

/** Least-squares slope (units a day) through points given as [x days, value]; null for fewer than two distinct days. */
export function slope(points: readonly (readonly [number, number])[]): number | null {
  if (points.length < 2) return null;
  const n = points.length, mx = points.reduce((a, [x]) => a + x, 0) / n, my = points.reduce((a, [, y]) => a + y, 0) / n;
  let num = 0, den = 0;
  for (const [x, y] of points) { num += (x - mx) * (y - my); den += (x - mx) ** 2; }
  return den === 0 ? null : num / den;
}

const reach = (today: string, remaining: number, perDay: number | null) => {
  if (perDay === null || !(perDay > 0)) return null;
  const days = Math.ceil(remaining / perDay);
  return days > FORECAST.maxYears * 366 ? null : addDays(today, days);
};

/**
 * The forecast from progress points (each a day and the progress counted by then, in the goal's own unit), the value
 * counted now and the target. Points after today are ignored; several on one day count as that day's last.
 */
export function paceForecast(points: readonly ForecastPoint[], current: number, target: number, today: string): Forecast {
  const from = addDays(today, -(FORECAST.windowDays - 1));
  const byDay = new Map<string, number>();
  for (const p of [...points].sort((a, b) => a.day.localeCompare(b.day))) if (p.day >= from && p.day <= today && Number.isFinite(p.value)) byDay.set(p.day, p.value);
  const days = [...byDay.keys()], spanDays = days.length ? daysBetween(days[0]!, days.at(-1)!) : 0;
  if (Number.isFinite(current) && Number.isFinite(target) && target > 0 && current >= target) return {state: 'reached', points: days.length, spanDays};
  if (days.length < FORECAST.minPoints || spanDays < FORECAST.minDays) return {state: 'not-enough', points: days.length, spanDays};
  const xy = days.map(d => [daysBetween(days[0]!, d), byDay.get(d)!] as const);
  const perDay = slope(xy);
  const remaining = target - current;
  if (perDay === null || !(perDay > 0) || !(remaining > 0)) return {state: 'no-pace', perDay: perDay ?? 0, points: days.length, spanDays};
  const mid = spanDays / 2, early = slope(xy.filter(([x]) => x <= mid)), late = slope(xy.filter(([x]) => x >= mid));
  const rates = [early, late].filter((r): r is number => r !== null);
  const fast = Math.max(perDay, ...rates), slow = Math.min(perDay, ...rates);
  const date = reach(today, remaining, perDay);
  if (!date) return {state: 'no-pace', perDay, points: days.length, spanDays};
  return {state: 'estimate', date, earliest: reach(today, remaining, fast) ?? date, latest: reach(today, remaining, slow), perDay, points: days.length, spanDays};
}

/**
 * A private Goal's progress points: the running total of its own recorded contributions (in minus out, reward income
 * excluded, as "On track?" counts them), shifted so the last point is the value counted now. Events in another unit
 * than the Goal's are skipped, never converted (eventValueForGoal).
 */
export function privateGoalPoints(goal: PrivateGoal, events: readonly ContributionEvent[], current: number, today: string): ForecastPoint[] {
  const scale = 10 ** goal.decimals, totals = new Map<string, number>();
  let running = 0;
  const own = events.filter(e => e.goalId === goal.id && e.goalScope === 'private' && e.provenance !== 'REWARD_INCOME').sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  for (const e of own) {
    const day = e.occurredAt.slice(0, 10);
    if (day > today) continue;
    const units = eventValueForGoal(e, goal);
    if (units === null) continue;
    running += (e.direction === 'IN' ? 1 : -1) * Number(units) / scale;
    totals.set(day, running);
  }
  if (!totals.size) return [];
  const shift = current - running;
  return [...totals].map(([day, value]) => ({day, value: value + shift}));
}

/** The words for a forecast, labelled as an estimate (G1). `format` writes a day the person's way. */
export function forecastWords(f: Forecast, format: (day: string) => string): {headline: string; detail: string} {
  switch (f.state) {
    case 'reached': return {headline: 'Target reached', detail: 'The counted value has reached the target.'};
    case 'not-enough': return {headline: 'Not enough history yet', detail: `A forecast needs at least ${FORECAST.minPoints} recorded steps over ${FORECAST.minDays} days or more.`};
    case 'no-pace': return {headline: 'No forecast at this pace', detail: 'Your recorded progress has not moved forward lately, so no date follows from it.'};
    case 'estimate': return {
      headline: `At this pace: about ${format(f.date!)}`,
      detail: f.latest ? `Between ${format(f.earliest!)} and ${format(f.latest)}. An estimate from your pace so far, not a promise.` : `From ${format(f.earliest!)} at the earliest. An estimate from your pace so far, not a promise.`,
    };
  }
}
