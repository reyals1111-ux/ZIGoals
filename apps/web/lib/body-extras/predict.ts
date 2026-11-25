import {weightTrend, weeklyRateOf} from '../health-aa/trend';
import type {HealthData} from '../health';
import {bodyExtrasSchema, NAMED_DAY_NAME_MAX, NAMED_DAYS_MAX, type BodyExtras, type NamedDay} from './schema';

/**
 * Session AW (X6; LEDGER #456, Happy Scale's "what I'll weigh on a day"): the weight the trend reaches on a day the person
 * names, IF the last four weeks' pace continued — the trend today plus the weekly rate (the least-squares slope of the
 * weigh-ins in the last 28 days, `weeklyRateOf`, the one rate every weight view uses) times the weeks to that day. Always
 * shown with its sum ("82.1 kg now, −0.4 kg a week, 4 weeks") and called an estimate; never a promise, never a calorie
 * figure, never advice. Up to five days are kept by name (`namedDays` in zigoals:body-extras:v1); the estimate itself is
 * worked out each time and never stored.
 */
export const PROJECTION_MAX_DAYS = 365;
export type Projection =
  | {kind: 'estimate'; nowGrams: number; weeklyGrams: number; days: number; weeks: number; grams: number}
  /** No weekly rate yet: readings at least seven days apart in the last 28 days are needed. */
  | {kind: 'no-rate'}
  /** The day is today or has passed. */
  | {kind: 'passed'}
  /** Further than a year ahead: a four-week pace says nothing that far out. */
  | {kind: 'too-far'}
  /** The straight line leaves the range a body weight can be (it would read as a fact it is not). */
  | {kind: 'out-of-range'};
const dayNumber = (d: string) => Math.round(Date.parse(`${d}T00:00:00Z`) / 86_400_000);
export const daysBetween = (from: string, to: string) => dayNumber(to) - dayNumber(from);
export function projectOn(data: Pick<HealthData, 'weights' | 'targets'>, today: string, on: string): Projection {
  const days = daysBetween(today, on);
  if (days <= 0) return {kind: 'passed'};
  if (days > PROJECTION_MAX_DAYS) return {kind: 'too-far'};
  const trend = weightTrend(data, today, 42) /* the trend card's own window, so "now" is the card's figure */, rate = weeklyRateOf(data.weights, today);
  if (trend.latestTrend === null || rate === null) return {kind: 'no-rate'};
  const grams = Math.round(trend.latestTrend + rate * days / 7);
  if (grams < 20_000 || grams > 400_000) return {kind: 'out-of-range'};
  return {kind: 'estimate', nowGrams: trend.latestTrend, weeklyGrams: rate, days, weeks: Math.round(days / 7 * 10) / 10, grams};
}
/** The days kept, nearest first; the passed ones last (kept until removed, so nothing disappears by itself). */
export function namedDaysOf(r: BodyExtras, today: string): NamedDay[] {
  const all = r.namedDays ?? [];
  return [...all.filter(d => d.on > today).sort((a, b) => a.on.localeCompare(b.on)), ...all.filter(d => d.on <= today).sort((a, b) => b.on.localeCompare(a.on))];
}
export const newNamedDayId = () => `nd-${crypto.randomUUID().slice(0, 18)}`;
export function addNamedDay(r: BodyExtras, input: {name: string; on: string}, today: string, id = newNamedDayId()): BodyExtras {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (!name) throw Error('Give the day a name, such as “The wedding”.');
  if (name.length > NAMED_DAY_NAME_MAX) throw Error(`Keep the name to ${NAMED_DAY_NAME_MAX} characters.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.on) || Number.isNaN(Date.parse(`${input.on}T00:00:00Z`))) throw Error('Choose the day.');
  if (input.on <= today) throw Error('Choose a day after today.');
  if (daysBetween(today, input.on) > PROJECTION_MAX_DAYS) throw Error('Choose a day within a year: a four-week pace says nothing further out.');
  const all = r.namedDays ?? [];
  if (all.length >= NAMED_DAYS_MAX) throw Error(`Up to ${NAMED_DAYS_MAX} days can be kept. Remove one first.`);
  return bodyExtrasSchema.parse({...r, namedDays: [...all, {id, name, on: input.on}]});
}
export function removeNamedDay(r: BodyExtras, id: string): BodyExtras {
  const rest = (r.namedDays ?? []).filter(d => d.id !== id);
  const {namedDays: _old, ...base} = r; void _old;
  return bodyExtrasSchema.parse(rest.length ? {...base, namedDays: rest} : base);
}
/** Undo of a removal: the day back where it was, unless five are kept again or it is back already. */
export function restoreNamedDay(r: BodyExtras, day: NamedDay): BodyExtras {
  const all = r.namedDays ?? [];
  if (all.some(d => d.id === day.id) || all.length >= NAMED_DAYS_MAX) return r;
  return bodyExtrasSchema.parse({...r, namedDays: [...all, day]});
}
