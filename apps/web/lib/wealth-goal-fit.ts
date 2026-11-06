import {allocationBalance, assetMatches, type Platform, type Position, type PrivateGoal} from './positions';

/**
 * Session AL (DV-105, DV-147): whether a holding can be allocated to a Goal — the same rules `allocate` (lib/positions.ts)
 * enforces, asked before a page offers the link, so "Allocate to Read 20 books" is never offered for US dollar cash.
 * A money (VALUE) Goal takes any open holding on its network; a count or coin Goal only the same asset; a Project none.
 */
export function canAllocate(goal: PrivateGoal, p: Position): boolean {
  if (goal.status === 'closed' || p.archivedAt || goal.type === 'PROJECT') return false;
  if (p.network !== 'manual' && p.network !== goal.network) return false;
  if (goal.type === 'REWARD') return p.sourceType === 'NATIVE_REWARDS' && assetMatches(goal, p);
  if (goal.type === 'QUANTITY') return assetMatches(goal, p);
  return true;
}
/** The holdings a Goal's asset step may offer (the wizard's "Existing assets", a Goal's allocate list). */
export const positionsFor = (goal: PrivateGoal, positions: readonly Position[]) => positions.filter(p => canAllocate(goal, p));

/**
 * Session AL (P-MO-96; MO-158, N-MO-17): what a new quantity would leave over-allocated. A holding edited below what its
 * Goals have allocated saved with no word at the time; the editor now asks first and says the shortfall in units.
 * Returns null when the new quantity still covers every active allocation (or the holding is unknown).
 */
export function quantityShortfall(s: Platform, positionId: string, quantity: string): {allocated: string; deficit: string} | null {
  const p = s.positions.find(x => x.id === positionId);
  if (!p) return null;
  const b = allocationBalance({...s, positions: s.positions.map(x => x.id === positionId ? {...x, quantity} : x)}, positionId);
  return b.deficit === '0' ? null : {allocated: b.allocated, deficit: b.deficit};
}
/**
 * Session AL (P-DVR-88 G-009; P-TK-51 TK-194): what a holding still has free for a Goal. A source card showed the whole
 * "25,000 USD" while 5,000 of it was already allocated; it now says "20,000 available of 25,000". Null when nothing is
 * allocated (the card stays as it was) or the holding is not in this record (a draft).
 */
export function availableUnits(s: Platform, positionId: string): {available: string; allocated: string; deficit: string} | null {
  if (!s.positions.some(x => x.id === positionId)) return null;
  const b = allocationBalance(s, positionId);
  return b.allocated === '0' ? null : {available: b.unallocated, allocated: b.allocated, deficit: b.deficit};
}
