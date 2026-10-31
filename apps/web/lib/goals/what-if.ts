import {addDays, daysBetween, privateGoalPoints, type ForecastPoint} from '../goal-forecast';
import type {ContributionEvent, PrivateGoal} from '../positions';

/**
 * Session AK (6.2 / Q14): "At your pace over the last 30 days you reach the target on <date>", and the person's own
 * what-ifs on top of it: an extra amount a month, a different regular contribution, a habit that adds a little each time,
 * or a new target date (then: the pace it needs). From the goal's own recorded progress only; nothing assumes growth.
 * Always shown as PROJECTION_LABEL. Pure; amounts are plain numbers in the goal's own unit (euros, km, books…).
 *
 * The 30-day pace is the progress made since the last record on or before the window's start; with no record that old,
 * from the first record in the window when it is at least 14 days old. Otherwise the pace is unknown ("not enough
 * history"), never zero.
 */
export const PROJECTION_LABEL = 'A projection from your own data, never a guarantee.';
export const PACE_WINDOW_DAYS = 30, MIN_PACE_SPAN_DAYS = 14, MAX_PROJECTION_DAYS = 100 * 366;
export type PaceState = 'reached' | 'not-enough' | 'no-pace' | 'estimate';
export type Pace30 = {state: PaceState; perDay: number | null; perMonth: number | null; date: string | null; spanDays: number; points: number};
const finite = (n: number) => Number.isFinite(n);
/** The day a pace (units a day) reaches what is left; null when it never does or only after 100 years. */
export function reachDate(today: string, remaining: number, perDay: number): string | null {
  if (!(remaining > 0)) return today;
  if (!(perDay > 0) || !finite(perDay)) return null;
  // A hair under a whole day is float noise (3,000 at 1,000/30 a day is 90 days, not 91).
  const days = Math.max(1, Math.ceil(remaining / perDay - 1e-9));
  return days > MAX_PROJECTION_DAYS ? null : addDays(today, days);
}
export function pace30(points: readonly ForecastPoint[], current: number, target: number, today: string): Pace30 {
  const known = points.filter(p => p.day <= today && finite(p.value)).sort((a, b) => a.day.localeCompare(b.day));
  const none = (state: PaceState, spanDays = 0): Pace30 => ({state, perDay: null, perMonth: null, date: null, spanDays, points: known.length});
  if (finite(current) && finite(target) && target > 0 && current >= target) return none('reached');
  if (!finite(current) || !(target > 0)) return none('not-enough');
  const start = addDays(today, -PACE_WINDOW_DAYS);
  const before = known.filter(p => p.day <= start).at(-1);
  const base = before ?? known.find(p => p.day > start);
  if (!base) return none('not-enough');
  const spanDays = before ? PACE_WINDOW_DAYS : daysBetween(base.day, today);
  if (spanDays < MIN_PACE_SPAN_DAYS) return none('not-enough', spanDays);
  const perDay = (current - base.value) / spanDays;
  const date = reachDate(today, target - current, perDay);
  if (!(perDay > 0) || !date) return {state: 'no-pace', perDay, perMonth: perDay * 30, date: null, spanDays, points: known.length};
  return {state: 'estimate', perDay, perMonth: perDay * 30, date, spanDays, points: known.length};
}
/** A private goal's 30-day pace from its own contributions (G1's points: in minus out, reward income excluded). */
export function privateGoalPace30(goal: PrivateGoal, events: readonly ContributionEvent[], current: number, today: string): Pace30 {
  return pace30(privateGoalPoints(goal, events, current, today), current, Number(goal.target) / 10 ** goal.decimals, today);
}

export type ContributionEvery = 'week' | 'two-weeks' | 'month';
const PER_DAY: Record<ContributionEvery, number> = {week: 1 / 7, 'two-weeks': 1 / 14, month: 1 / 30};
export type WhatIfInputs = {
  /** An extra amount every month on top of the pace. */
  extraPerMonth?: number;
  /** A regular contribution instead of the recorded pace ("€200 every two weeks"). */
  regular?: {amount: number; every: ContributionEvery} | null;
  /** A habit added: what one completion adds, and how many times a week. */
  habit?: {perTime: number; timesPerWeek: number} | null;
  /** A new target date: the pace it would need. */
  targetDate?: string | null;
};
export type Required = {daysLeft: number; perDay: number; perWeek: number; perMonth: number};
export type WhatIf = {
  /** Where the pace comes from: the recorded 30 days, a planned regular amount, or only the what-ifs (no recorded pace yet). */
  basis: 'recorded' | 'regular' | 'additions-only';
  perDay: number; perMonth: number;
  /** The date this pace reaches the target; null: not at this pace. */
  date: string | null;
  /** Days earlier (negative) or later than the recorded pace's date; null when either has no date. */
  shiftDays: number | null;
  required: Required | null;
  /** True when the what-if pace reaches the target by the target date (null without one). */
  meetsTargetDate: boolean | null;
};
/** The pace a target date needs from now; null when the date is not after today or the target is reached. */
export function requiredPace(current: number, target: number, today: string, targetDate: string): Required | null {
  const daysLeft = daysBetween(today, targetDate), remaining = target - current;
  if (!(daysLeft > 0) || !(remaining > 0) || !finite(remaining)) return null;
  const perDay = remaining / daysLeft;
  return {daysLeft, perDay, perWeek: perDay * 7, perMonth: perDay * 30};
}
const nonNegative = (n: number | undefined) => n !== undefined && finite(n) && n > 0 ? n : 0;
export function whatIf({current, target, today, pace}: {current: number; target: number; today: string; pace: Pace30}, inputs: WhatIfInputs = {}): WhatIf {
  const regular = inputs.regular && nonNegative(inputs.regular.amount) > 0 ? nonNegative(inputs.regular.amount) * PER_DAY[inputs.regular.every] : null;
  const recorded = pace.perDay !== null && (pace.state === 'estimate' || pace.state === 'no-pace') ? pace.perDay : null;
  const basis: WhatIf['basis'] = regular !== null ? 'regular' : recorded !== null ? 'recorded' : 'additions-only';
  const habit = inputs.habit ? nonNegative(inputs.habit.perTime) * Math.min(7, nonNegative(inputs.habit.timesPerWeek)) / 7 : 0;
  const perDay = (regular ?? recorded ?? 0) + nonNegative(inputs.extraPerMonth) / 30 + habit;
  const reached = current >= target;
  const date = reached ? today : reachDate(today, target - current, perDay);
  const shiftDays = date && pace.date ? daysBetween(pace.date, date) : null;
  const required = inputs.targetDate ? requiredPace(current, target, today, inputs.targetDate) : null;
  const meetsTargetDate = inputs.targetDate ? reached || (date !== null && date <= inputs.targetDate) : null;
  return {basis, perDay, perMonth: perDay * 30, date, shiftDays, required, meetsTargetDate};
}

/** The pace in words. `format` writes a day the person's way. */
export function paceSentence(p: Pace30, format: (day: string) => string): string {
  switch (p.state) {
    case 'reached': return 'Target reached.';
    case 'not-enough': return `Not enough history yet: a 30-day pace needs records over at least ${MIN_PACE_SPAN_DAYS} days.`;
    case 'no-pace': return 'Not at this pace: your progress has not moved forward over the last 30 days.';
    case 'estimate': return `At your pace over the last 30 days you reach the target on ${format(p.date!)}.`;
  }
}
export function whatIfSentence(w: WhatIf, format: (day: string) => string): string {
  if (!w.date) return w.perDay > 0 ? 'Not at this pace: it would take more than 100 years.' : 'Not at this pace: nothing is added.';
  const shift = w.shiftDays === null || w.shiftDays === 0 ? '' : w.shiftDays < 0 ? ` (${-w.shiftDays} ${-w.shiftDays === 1 ? 'day' : 'days'} sooner)` : ` (${w.shiftDays} ${w.shiftDays === 1 ? 'day' : 'days'} later)`;
  return `With these changes you reach the target on ${format(w.date)}${shift}.`;
}
