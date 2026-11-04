/**
 * Session AL (L4; DV-021b, DV-026b, DV-041c, P-DV-09, P-DV-12, P-DVR-09; BUG-010, N-040, MO-129): deleting a Goal is a real
 * delete with an Undo. The Goal record goes together with what belongs only to it — its allocations (no asset moves),
 * its contribution records and its history rows — and Undo puts exactly those back into the LATEST store record.
 *
 * Whether a Goal with recorded history may go is the store's rule (lib/positions.ts assertGoalEditsUnlocked keeps
 * contribution and lifecycle history append-only). `goalRemovalBlock` asks that same rule instead of copying it, so the
 * page offers Delete exactly when the store would accept it, and says in words what history holds it back otherwise.
 */
import {assertGoalEditsUnlocked,type Platform,type PrivateGoal} from '../positions';
import {countText} from '../plural';

export type RemovedGoal = {
 goal: PrivateGoal;
 /** Where it stood in the list, so Undo puts it back in place. */
 index: number;
 allocations: Platform['allocations'];
 contributions: Platform['contributions'];
 goalHistory: Platform['goalHistory'];
};

/** What removing Goal `id` takes away, read before the removal (for Undo). */
export function goalRemovalSnapshot(s: Platform, id: string): RemovedGoal | null {
 const index = s.goals.findIndex(g => g.id === id);
 if (index < 0) return null;
 return {
  goal: s.goals[index]!, index,
  allocations: s.allocations.filter(a => a.goalId === id),
  contributions: s.contributions.filter(e => e.goalScope === 'private' && e.goalId === id),
  goalHistory: s.goalHistory.filter(h => h.goalId === id),
 };
}

/** The store without Goal `id` and what belonged only to it. Wealth (positions, snapshots) is untouched. */
export function removeGoal(s: Platform, id: string): Platform {
 if (s.goals.find(g => g.id === id)?.locked) throw Error('Unlock this Goal before deleting it.');
 return {
  ...s,
  goals: s.goals.filter(g => g.id !== id),
  allocations: s.allocations.filter(a => a.goalId !== id),
  contributions: s.contributions.filter(e => !(e.goalScope === 'private' && e.goalId === id)),
  goalHistory: s.goalHistory.filter(h => h.goalId !== id),
 };
}

/**
 * Undo: the removed Goal and its records back into the latest store. Anything with the same id that exists again (saved
 * since, in another tab) is kept as it is now; an allocation is put back only while its asset still exists.
 */
export function restoreRemovedGoal(latest: Platform, removed: RemovedGoal): Platform {
 if (latest.goals.some(g => g.id === removed.goal.id)) return latest;
 const goals = [...latest.goals];
 goals.splice(Math.min(removed.index, goals.length), 0, removed.goal);
 const has = <T extends {id: string}>(list: readonly T[], id: string) => list.some(x => x.id === id);
 return {
  ...latest,
  goals,
  allocations: [...latest.allocations, ...removed.allocations.filter(a => latest.positions.some(p => p.id === a.positionId) && !latest.allocations.some(x => x.goalId === a.goalId && x.positionId === a.positionId))],
  contributions: [...latest.contributions, ...removed.contributions.filter(e => !has(latest.contributions, e.id))],
  goalHistory: [...latest.goalHistory, ...removed.goalHistory.filter(h => !has(latest.goalHistory, h.id))],
 };
}

/** What history a Goal keeps, in words ("a contribution plan, 2 recorded contributions and a reached target"). */
export function goalHistoryWords(s: Platform, goal: PrivateGoal): string {
 const records = s.contributions.filter(e => e.goalScope === 'private' && e.goalId === goal.id).length;
 const parts = [
  ...(goal.planRevisions?.length ? ['a contribution plan'] : []),
  ...(records ? [countText(records, 'recorded contribution')] : []),
  ...(goal.lifecycle?.some(e => e.kind === 'completed') ? ['a reached target'] : []),
  ...(goal.lifecycle?.some(e => e.kind === 'closed' || e.kind === 'reopened') ? ['its close and reopen dates'] : []),
  ...(goal.lifecycle?.some(e => e.kind === 'target_changed') ? ['an earlier target'] : []),
 ];
 return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}

/** Null when Delete is possible now; otherwise the plain reason, said next to the Delete button. */
export function goalRemovalBlock(s: Platform, goal: PrivateGoal): string | null {
 if (goal.locked) return 'Unlock this goal to delete it.';
 try {
  assertGoalEditsUnlocked(s, removeGoal(s, goal.id));
  return null;
 } catch {
  const words = goalHistoryWords(s, goal);
  return `This goal keeps ${words || 'its saved history'} for good, so it can’t be deleted yet. Close it instead: it leaves your active goals, keeps its history, and you can reopen it later.`;
 }
}
