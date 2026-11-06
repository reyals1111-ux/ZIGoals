/**
 * Session AL (DV-099, P-DV-34): closing a Goal frees what it counted (lib/positions.ts closeGoal); reopening it used to say
 * nothing, so the Goal came back at 0 % with no word why. Two ways back, both from the person's own records:
 * - right after Close, the toast's Undo puts the Goal and exactly what it counted back (`undoClose`);
 * - later, Reopen offers the amounts its last counted snapshot held before it closed (`countedBeforeClose`), each capped to
 *   what that asset still has free. Nothing moves; these are allocations, as before.
 */
import {allocate, allocationBalance, type Platform} from '../positions';
import {reopenGoal} from '../plan-revisions';

export type Allocation = Platform['allocations'][number];

/** What the Goal counted in its last value snapshot before it closed, still free to count again. */
export function countedBeforeClose(s: Platform, goalId: string): Allocation[] {
 const goal = s.goals.find(g => g.id === goalId);
 if (!goal) return [];
 const closed = [...(goal.lifecycle ?? [])].reverse().find(e => e.kind === 'closed');
 const until = closed ? Date.parse(closed.at) : Infinity;
 const snapshot = [...s.goalHistory].reverse().find(h => h.goalId === goalId && h.kind === 'valuation' && Date.parse(h.capturedAt) <= until && h.evidence.length > 0);
 if (!snapshot || snapshot.kind !== 'valuation') return [];
 const out: Allocation[] = [];
 for (const e of snapshot.evidence) {
  const p = s.positions.find(x => x.id === e.positionId);
  if (!p || p.archivedAt || BigInt(e.quantity) <= 0n) continue;
  let free: bigint;
  try { free = BigInt(allocationBalance(s, p.id).unallocated); } catch { continue; }
  const quantity = BigInt(e.quantity) < free ? BigInt(e.quantity) : free;
  if (quantity > 0n) out.push({goalId, positionId: p.id, quantity: quantity.toString()});
 }
 return out;
}

/** Count these amounts toward the (open) Goal again. */
export function countAgain(s: Platform, goalId: string, allocations: readonly Allocation[]): Platform {
 return allocations.reduce((next, a) => allocate(next, goalId, a.positionId, a.quantity), s);
}

/** Undo of Close: reopen (the history keeps both rows) and count again what it counted, where still free. */
export function undoClose(latest: Platform, goalId: string, released: readonly Allocation[]): Platform {
 const goal = latest.goals.find(g => g.id === goalId);
 if (!goal || goal.status !== 'closed') return latest;
 const open = reopenGoal(latest, goalId);
 const back = released.flatMap(a => {
  if (!open.positions.some(p => p.id === a.positionId && !p.archivedAt)) return [];
  const free = BigInt(allocationBalance(open, a.positionId).unallocated), q = BigInt(a.quantity) < free ? BigInt(a.quantity) : free;
  return q > 0n ? [{...a, quantity: q.toString()}] : [];
 });
 return countAgain(open, goalId, back);
}
