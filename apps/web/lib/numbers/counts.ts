import {habitDay, type Habit} from '../habits';
import {automaticMarketRef} from '../wealth';
import type {Platform, Position} from '../positions';
import {isFinished} from '../goals/finished';
import {isOwnCountSource} from '../goals/goal-units';

/**
 * Session AH Part 4 (TR6/B5; BUG-031, BUG-041, BUG-062, M-085, D-238): one count per thing, so two pages never disagree.
 * - A live-priced asset follows a market price (Wealth's own rule); every other asset you track carries your own value.
 * - Active and finished Goals come from each Goal's derived status (its saved progress, never a stale stored flag), plus
 *   average goals.
 * - A habit check-in is a scheduled day completed: one per habit per day. Partly done days are "logged", not check-ins.
 * - Habits today: due is scheduled and not skipped (a rest day is not due); done is completed.
 */
export const isLivePriced = (p: Position) => automaticMarketRef(p) !== undefined;
/** Session AL sweep 3 (DV-147): a count goal's own tally is not an asset (lib/goals/goal-units.ts `isOwnCountSource`). */
export function assetCounts(platform: Pick<Platform, 'positions'> & Partial<Pick<Platform, 'goals'>>) {
  const owned = platform.positions.filter(p => !p.archivedAt && !isOwnCountSource(p, platform.goals ?? [])), live = owned.filter(isLivePriced).length;
  return {assets: owned.length, livePriced: live, manual: owned.length - live};
}
type WithStatus = {status: string; reached?: boolean};
/** Session AL (P-DV-22): finished uses the one rule (lib/goals/finished.ts), so a goal reached and then closed still counts. */
export function goalCounts(goals: readonly WithStatus[], averages: readonly WithStatus[] = []) {
  const all = [...goals, ...averages];
  return {active: all.filter(g => g.status === 'active').length, finished: all.filter(isFinished).length};
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
/**
 * Session AL (Part 13): the habits still open on a day, as ZIGi's habits_due and NOVA's "habits left" list them: due or
 * partly done. A quit or limit habit that failed today is not "left" (nothing more to do), so left ≤ due − done.
 */
export function habitsLeftOn(habits: readonly Habit[], date: string, today: string) {
  return habits.filter(h => { const s = habitDay(h, date, today).status; return s === 'due' || s === 'partial'; }).length;
}
/**
 * Session AL (Part 13): active goals as Today, Goals and the goals widget count them, from the goal summaries (derived
 * status, never the stored flag) and the average goals. NOVA's left panel and ZIGi's goals answer must read this too.
 */
export const activeGoalCount = (summaries: readonly WithStatus[], averages: readonly WithStatus[] = []) => goalCounts(summaries, averages).active;
