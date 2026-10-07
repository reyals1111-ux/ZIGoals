import type {ContributionEvent, PrivateGoal} from '../positions';
import {eventValueForGoal} from '../goal-intelligence';

/**
 * "On track?" for a Goal (Session W Part 11), from its own numbers only and with zero return: what is left, what it
 * would take a week or a month (30 days) to reach the target by its date, the net recorded contributions per 30 days
 * over the last 90 days, and the date that pace would reach the target. Nothing assumes growth; the "what if" below is
 * the person's own rate, worked out on the page and never stored.
 */
const DAY = 86_400_000;
const days = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY);
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b;
export type Pace = {perMonth: bigint; windowDays: number; counted: number; skipped: number};
export type OnTrack = {remaining: bigint; daysLeft: number | null; perWeek: bigint | null; perMonth: bigint | null; pace: Pace | null; projected: string | null};
export const PACE_DAYS = 90, MIN_PACE_DAYS = 14;
/**
 * Net recorded contributions (in minus out, reversals included as they are recorded) of the last 90 days in the Goal's
 * own unit, by the same rule as Funding Wealth's "actual contributed" (eventValueForGoal: the Goal's asset, or a value
 * at the time in a value Goal's currency); reward income is not a contribution; any other event is counted as skipped,
 * never converted. Null while the Goal is younger than 14 days or nothing counted.
 */
export function paceOf(goal: PrivateGoal, events: readonly ContributionEvent[], today: string): Pace | null {
  const born = goal.createdAt.slice(0, 10), from = addDays(today, -(PACE_DAYS - 1)), start = born > from ? born : from, windowDays = days(start, today) + 1;
  if (windowDays < MIN_PACE_DAYS) return null;
  let net = 0n, counted = 0, skipped = 0;
  for (const e of events) {
    if (e.goalId !== goal.id || e.goalScope !== 'private' || e.provenance === 'REWARD_INCOME') continue;
    const day = e.occurredAt.slice(0, 10);
    if (day < start || day > today) continue;
    const units = eventValueForGoal(e, goal);
    if (units === null) { skipped++; continue; }
    net += e.direction === 'IN' ? units : -units; counted++;
  }
  if (!counted) return null;
  return {perMonth: net * 30n / BigInt(windowDays), windowDays, counted, skipped};
}
export function onTrack(goal: PrivateGoal, current: bigint, events: readonly ContributionEvent[], today: string): OnTrack {
  const remaining = BigInt(goal.target) > current ? BigInt(goal.target) - current : 0n;
  const daysLeft = goal.targetDate ? days(today, goal.targetDate) : null;
  const perWeek = remaining > 0n && daysLeft !== null && daysLeft > 0 ? ceilDiv(remaining * 7n, BigInt(daysLeft)) : null;
  const perMonth = remaining > 0n && daysLeft !== null && daysLeft > 0 ? ceilDiv(remaining * 30n, BigInt(daysLeft)) : null;
  const pace = paceOf(goal, events, today);
  const projected = remaining > 0n && pace && pace.perMonth > 0n ? addDays(today, Number(ceilDiv(remaining * 30n, pace.perMonth))) : null;
  return {remaining, daysLeft, perWeek, perMonth, pace, projected: projected && projected <= '9999-12-31' ? projected : null};
}
/**
 * The person's own "what if": months until the target with a yearly rate they typed (compounded monthly) and a monthly
 * amount they typed, from what is there now; null beyond 100 years. An illustration of their assumption, not a forecast.
 */
export function whatIfMonths(current: number, target: number, monthly: number, yearlyPercent: number): number | null {
  if (!(current >= 0) || !(target > 0) || !(monthly >= 0) || !(yearlyPercent >= 0) || yearlyPercent > 100) return null;
  if (current >= target) return 0;
  const r = Math.pow(1 + yearlyPercent / 100, 1 / 12) - 1;
  let value = current;
  for (let month = 1; month <= 1200; month++) { value = value * (1 + r) + monthly; if (value >= target) return month; }
  return null;
}
