/**
 * Session AL third pass (L4): plain sentences about what funds a Goal, derived from the stored records only (nothing new
 * is stored, except an existing goal-history line when the person says they reviewed a release).
 * - TK-144: the held units of the chosen asset can be counted toward a new count Goal (`heldUnitsOffer`).
 * - TK-194, G-009: each source says what is still free ("Available …") (`availableWords`).
 * - MO-145, MO-160, BN-156: a source valued in another currency says so, and that ZIGoals never converts (`valueReason`).
 * - TK-196: an archived asset that stopped counting toward a Goal leaves a note and a review flag on it (`releasedByArchive`).
 * - TK-181: a lower quantity that would make Goals count less is said before saving (`allocationCutWarning`).
 */
import {formatUnits} from '@zigoals/chain-config';
import {allocationBalance, assetMatches, type Platform, type Position, type PrivateGoal} from '../positions';
import {formatGoalAmount} from '../goal-summary';
import {formatDate, formatExactNumber, isMoneyCurrency} from '../visual-format';

const units = (value: string, decimals: number) => formatExactNumber(formatUnits(value, decimals));
/** "0.5 BTC", "$1,250.00" (money through the goal formatter). */
export function heldText(quantity: string, p: Pick<Position, 'asset' | 'decimals'>): string {
 return isMoneyCurrency(p.asset) ? formatGoalAmount(formatUnits(quantity, p.decimals), p.asset) : `${units(quantity, p.decimals)} ${p.asset}`;
}

/** "Available 4,000 EUR" / "Available 0 · all counted toward other goals"; null for a position this record cannot read. */
export function availableWords(s: Platform, p: Position): string | null {
 let b: ReturnType<typeof allocationBalance>;
 try { b = allocationBalance(s, p.id); } catch { return null; }
 if (BigInt(b.unallocated) > 0n) return `Available ${heldText(b.unallocated, p)}`;
 return BigInt(b.observed) === 0n ? 'Nothing held yet' : 'Available 0 · all counted toward other goals';
}

/**
 * TK-144: the tracked holdings a new count Goal of this asset could count right away (same asset, units still free).
 * Money (a Value Goal) is never offered here: which money counts is chosen on the next step.
 */
export function heldUnitsOffer(s: Platform, identity: Pick<PrivateGoal, 'type' | 'asset' | 'denom' | 'decimals' | 'network'>): {position: Position; free: string}[] {
 if (identity.type !== 'QUANTITY' || !identity.asset.trim()) return [];
 return s.positions.flatMap(p => {
  if (p.archivedAt || (p.network !== 'manual' && p.network !== identity.network) || !assetMatches(identity as PrivateGoal, p)) return [];
  let free = '0';
  try { free = allocationBalance(s, p.id).unallocated; } catch { return []; }
  return BigInt(free) > 0n ? [{position: p, free}] : [];
 });
}

export {valueReason, goalValueReason} from './value-reason';

export {releasedByArchive, reviewedReleaseLabel, archivedReleaseLabel, markReleaseReviewed, type ReleasedSource} from './released';
import type {ReleasedSource} from './released';
/** "Savings Two was archived on Nov 4, 2026; it had counted €3,000.00 toward this goal." (no amount when none was recorded) */
export function releasedWords(r: ReleasedSource): string {
 const day = formatDate(r.at.slice(0, 10));
 return r.counted === undefined ? `${r.name} was archived on ${day}; it had counted toward this goal, and no longer does.`
  : `${r.name} was archived on ${day}; it had counted ${formatGoalAmount(formatUnits(r.counted, r.decimals), r.asset)} toward this goal, and no longer does.`;
}
/**
 * TK-181: saving `newQuantity` (base units) for this asset would leave less than its Goals count: the sentence to ask
 * before saving, or null. Nothing is trimmed in the store; each Goal counts its proportional share and says "Review".
 */
export function allocationCutWarning(s: Platform, positionId: string, newQuantity: string): string | null {
 const p = s.positions.find(x => x.id === positionId);
 if (!p || !/^\d{1,80}$/.test(newQuantity)) return null;
 let allocated: bigint;
 try { allocated = BigInt(allocationBalance(s, positionId).allocated); } catch { return null; }
 if (allocated === 0n || BigInt(newQuantity) >= allocated) return null;
 const goals = [...new Set(s.allocations.filter(a => a.positionId === positionId).map(a => s.goals.find(g => g.id === a.goalId)?.name).filter((n): n is string => !!n))];
 const names = goals.length > 2 ? `${goals.slice(0, 2).join(', ')} and ${goals.length - 2} more` : goals.join(' and ');
 return `Your goals count ${heldText(allocated.toString(), p)} of this; ${heldText(newQuantity, p)} would leave ${names || 'them'} counting less and marked for review. Save again to keep it.`;
}

/** G-009: what an existing asset holds and how much of it is already counted ("Holding $25,000.00 · $5,000.00 counted toward goals · Available $20,000.00"). */
export function holdingWords(s: Platform, p: Position): string | null {
 let b: ReturnType<typeof allocationBalance>;
 try { b = allocationBalance(s, p.id); } catch { return null; }
 const counted = BigInt(b.allocated) > 0n ? `${heldText(b.allocated, p)} counted toward goals` : 'none of it counted toward a goal yet';
 return `Holding ${heldText(b.observed, p)} · ${counted}${BigInt(b.allocated) > 0n ? ` · ${availableWords(s, p)}` : ''}`;
}

/** P-DVR-88 (N-166): a Reward Goal counts the unclaimed rewards it is given, so new money is never "funded" into it. */
export const REWARD_FUND_NOTE = 'A rewards goal counts the unclaimed rewards you allocate to it from Staking, not new money. Allocate rewards under Wealth on this goal’s page; record claimed income here as history.';
