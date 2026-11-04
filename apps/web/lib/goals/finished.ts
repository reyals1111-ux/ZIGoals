/**
 * Session AL (L4; DV-042, DV-045a, DV-057a, DV-058a; P-DV-22, P-DVR-10; D-238, B-009, B-098, BUG-062): one rule for "finished".
 * A Goal that reached its target and was closed afterwards is still a finished Goal ("Completed · closed"): closing
 * releases its allocations and moves it out of the active list, but it never erases the win. Goals, the Completed filter,
 * the Hall of achievements, Today and Journey all read this, so they never disagree.
 */
import type {PrivateGoal} from '../positions';

type Lifecycle = Pick<PrivateGoal, 'status' | 'lifecycle'> & Partial<Pick<PrivateGoal, 'type' | 'milestones'>>;

/** True when a closed Goal had reached its target in the cycle it was closed in (a Project: every milestone done). */
export function closedAfterReaching(goal: Lifecycle): boolean {
 if (goal.status !== 'closed') return false;
 if (goal.type === 'PROJECT' && goal.milestones?.length) return goal.milestones.every(m => m.done);
 const events = goal.lifecycle ?? [];
 const closed = [...events].reverse().find(e => e.kind === 'closed');
 if (!closed) return false;
 return events.some(e => e.kind === 'completed' && e.cycle === closed.cycle && e.at <= closed.at);
}

/** A stored Goal is finished: completed now, or closed after it reached its target. */
export function goalReached(goal: Lifecycle): boolean {
 return goal.status === 'completed' || closedAfterReaching(goal);
}

/** A summary or count row: `reached` (GoalSummary) wins; otherwise its status. Average goals have no `reached`. */
export function isFinished(row: {status: string; reached?: boolean}): boolean {
 return row.reached === true || row.status === 'completed';
}

/** Active and finished, as every page counts them. A closed-after-reaching Goal is finished, never active. */
export function finishedCounts(rows: readonly {status: string; reached?: boolean}[]): {active: number; finished: number} {
 return {active: rows.filter(r => r.status === 'active').length, finished: rows.filter(isFinished).length};
}

/**
 * Session AL (DV-025b, P-DV-31): a Goal that reads as reached only because its target was lowered to what was already
 * counted. Its current cycle starts with "Target changed" and holds no "Target reached" (lib/plan-revisions.ts records none
 * for an edit), so the page says so calmly instead of celebrating. A Goal without lifecycle rows (older records) is not this.
 */
export function reachedByTargetEdit(goal: Pick<PrivateGoal, 'status' | 'lifecycle'>): boolean {
 if (goal.status !== 'completed') return false;
 const events = goal.lifecycle ?? [], cycle = events.at(-1)?.cycle;
 if (cycle === undefined) return false;
 const current = events.filter(e => e.cycle === cycle);
 return current.some(e => e.kind === 'target_changed') && !current.some(e => e.kind === 'completed');
}
