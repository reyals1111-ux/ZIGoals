import {assetMatches, type Position, type PrivateGoal} from './positions';

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
