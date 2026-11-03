import type {PrivateGoal} from '../positions';

/**
 * Session AK (6.4, wiring): the suggested milestones a goal can still take, in its record's own shape. A title it already
 * has (any case) is left out, a value only for a value goal and only above zero and at most its target (the goal form's
 * own rule), and never more than the record's 100 milestones.
 */
export const MAX_MILESTONES = 100;
export function suggestedMilestones(goal: Pick<PrivateGoal, 'type' | 'target' | 'milestones'>, steps: readonly {title: string; target?: string}[]): {title: string; target?: string}[] {
  const taken = new Set(goal.milestones.map(m => m.title.trim().toLowerCase()));
  let cap: bigint | null = null;
  try { cap = goal.type === 'PROJECT' ? null : BigInt(goal.target); } catch { cap = null; }
  const out: {title: string; target?: string}[] = [];
  for (const step of steps) {
    const title = step.title.trim().slice(0, 100), folded = title.toLowerCase();
    if (!title || taken.has(folded) || goal.milestones.length + out.length >= MAX_MILESTONES) continue;
    taken.add(folded);
    let target: string | undefined;
    if (cap !== null && step.target && /^\d+$/.test(step.target)) { const units = BigInt(step.target); if (units > 0n && units <= cap) target = step.target; }
    out.push(target ? {title, target} : {title});
  }
  return out;
}
