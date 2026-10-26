import {habitDay, type Habit} from '../habits';
import {automaticMarketRef} from '../wealth';
import type {Platform, Position} from '../positions';

/**
 * Session AH Part 4 (TR6/B5; BUG-031, BUG-041, BUG-062, M-085, D-238): one count per thing, so two pages never disagree.
 * - A live-priced asset follows a market price (Wealth's own rule); every other asset you track carries your own value.
 * - Active and finished Goals come from each Goal's derived status (its saved progress, never a stale stored flag), plus
 *   average goals.
 * - A habit check-in is a scheduled day completed: one per habit per day. Partly done days are "logged", not check-ins.
 * - Habits today: due is scheduled and not skipped (a rest day is not due); done is completed.
 */
export const isLivePriced = (p: Position) => automaticMarketRef(p) !== undefined;
export function assetCounts(platform: Pick<Platform, 'positions'>) {
  const owned = platform.positions.filter(p => !p.archivedAt), live = owned.filter(isLivePriced).length;
  return {assets: owned.length, livePriced: live, manual: owned.length - live};
}
type WithStatus = {status: string};
export function goalCounts(goals: readonly WithStatus[], averages: readonly WithStatus[] = []) {
  const all = [...goals, ...averages];
  return {active: all.filter(g => g.status === 'active').length, finished: all.filter(g => g.status === 'completed').length};
}
/** Check-ins on one day: habits whose scheduled day is complete. */
export function checkInsOn(habits: readonly Habit[], date: string, today: string) {
  return habits.filter(h => { const d = habitDay(h, date, today); return d.scheduled && d.status === 'complete'; }).length;
}
/** Habits due and done on a day, as every "X of Y" shows them. */
export function habitsOnDay(habits: readonly Habit[], date: string, today: string) {
  let due = 0, done = 0;
  for (const h of habits) { const d = habitDay(h, date, today); if (!d.scheduled || d.status === 'skipped') continue; due++; if (d.status === 'complete') done++; }
  return {due, done};
}
