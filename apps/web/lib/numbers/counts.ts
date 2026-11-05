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
// CI13 (weights): the habit counts live in ./habit-counts.ts (no Wealth or Goals code), re-exported here unchanged.
export {checkInsOn, habitsLeftOn, habitsOnDay} from './habit-counts';
/**
 * Session AL (Part 13): active goals as Today, Goals and the goals widget count them, from the goal summaries (derived
 * status, never the stored flag) and the average goals. NOVA's left panel and ZIGi's goals answer must read this too.
 */
export const activeGoalCount = (summaries: readonly WithStatus[], averages: readonly WithStatus[] = []) => goalCounts(summaries, averages).active;
