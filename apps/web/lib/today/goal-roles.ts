import type {GoalSummary} from '../goal-summary';
import type {PrivateGoal} from '../positions';

/**
 * Session AF (L5a, Part 10.10): Today's three goal places each say something different (the owner saw "Next step",
 * "What matters today" and the first goal card all name the same goal). One selector gives each its role:
 *   - focus — Today's focus tile "Next step": the top goal (the first active goal in the Goals page's order) and its next
 *     concrete step (review its sources, an overdue contribution, the next open milestone, the next contribution, a
 *     target date close by, or setting a plan);
 *   - attention — "What matters today": the most urgent *other* goal that can show a funding pulse (overdue, needing a
 *     review, behind plan, a contribution or the target date close, no plan yet; ties in page order). (A pinned goal is
 *     the top of every goal list, so it is the focus goal already.) With only one such goal it is that goal: the panel
 *     then shows its funding facts, a different fact from the step and the card;
 *   - cards — the goal cards, unchanged: each its own progress.
 * Pure: reads the goals' summaries and records, writes nothing.
 */
export type Amount = {value: string; decimals: number; asset: string};
export type GoalStep =
  | {kind: 'review'}
  | {kind: 'overdue'; date: string; amount?: Amount}
  | {kind: 'milestone'; title: string}
  | {kind: 'contribution'; date: string; amount?: Amount}
  | {kind: 'target'; date: string; days: number}
  | {kind: 'plan'}
  | {kind: 'open'};
export type AttentionWhy = 'overdue' | 'review' | 'behind' | 'due-soon' | 'target-near' | 'no-plan' | 'next' | 'only';
export type GoalRoles = {focus: {goal: GoalSummary; step: GoalStep} | null; attention: {id: string; why: AttentionWhy} | null; cards: readonly GoalSummary[]};
type Goals = readonly Pick<PrivateGoal, 'id' | 'name' | 'type' | 'status' | 'pinned' | 'plan' | 'milestones' | 'targetDate'>[];

const DAY = 86_400_000;
/** Whole days from `today` to `date` (both YYYY-MM-DD; negative when past). */
export const daysUntil = (date: string, today: string) => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY);
const privateId = (key: string) => key.startsWith('private:') ? key.slice('private:'.length) : null;
const status = (g: GoalSummary) => g.fundingHealth.toUpperCase().replaceAll('_', ' ');

/** The next concrete step of one goal, in order of what needs doing first. */
export function nextStep(goal: GoalSummary, record: Goals[number] | undefined, today: string): GoalStep {
  const plan = record?.plan?.active ? record.plan : undefined, amount = plan ? {value: plan.amount, decimals: plan.decimals, asset: plan.asset} : undefined;
  if (goal.requiresReview || status(goal) === 'REVIEW' || status(goal) === 'NEEDS REVIEW') return {kind: 'review'};
  if (goal.nextContributionDate && goal.nextContributionDate < today) return {kind: 'overdue', date: goal.nextContributionDate, ...(amount ? {amount} : {})};
  const milestone = record?.milestones.find(m => !m.done);
  if (milestone) return {kind: 'milestone', title: milestone.title};
  if (goal.nextContributionDate) return {kind: 'contribution', date: goal.nextContributionDate, ...(amount ? {amount} : {})};
  if (goal.targetDate && daysUntil(goal.targetDate, today) >= 0 && daysUntil(goal.targetDate, today) <= 30) return {kind: 'target', date: goal.targetDate, days: daysUntil(goal.targetDate, today)};
  if (record && record.type !== 'PROJECT' && !plan) return {kind: 'plan'};
  return {kind: 'open'};
}

/** How urgent a goal is today, and why (the highest reason; the score adds every reason that applies). */
export function urgency(goal: GoalSummary | undefined, record: Goals[number], today: string): {score: number; why: AttentionWhy} {
  const reasons: [number, AttentionWhy][] = [];
  const next = goal?.nextContributionDate ?? (record.plan?.active ? record.plan.nextDate : null);
  if (next && next < today) reasons.push([5, 'overdue']);
  if (goal && (goal.requiresReview || ['REVIEW', 'NEEDS REVIEW'].includes(status(goal)))) reasons.push([4, 'review']);
  if (goal && status(goal) === 'BEHIND') reasons.push([3, 'behind']);
  if (next && next >= today && daysUntil(next, today) <= 3) reasons.push([2, 'due-soon']);
  if (record.targetDate && daysUntil(record.targetDate, today) >= 0 && daysUntil(record.targetDate, today) <= 14) reasons.push([2, 'target-near']);
  if (!record.plan?.active) reasons.push([1, 'no-plan']);
  reasons.sort((a, b) => b[0] - a[0]);
  return {score: reasons.reduce((sum, [n]) => sum + n, 0), why: reasons[0]?.[1] ?? 'next'};
}

/**
 * The three roles. `active` are the active goals in the Goals page's order (the cards' order); `goals` the private goal
 * records (the funding pulse's own list: "What matters today" shows only a goal that is not closed and not a project).
 */
export function todayGoalRoles(active: readonly GoalSummary[], goals: Goals, today: string): GoalRoles {
  const byId = new Map(goals.map(g => [g.id, g])), summaryOf = new Map(active.flatMap(g => { const id = privateId(g.key); return id ? [[id, g] as const] : []; }));
  const top = active[0];
  const focus = top ? {goal: top, step: nextStep(top, byId.get(privateId(top.key) ?? ''), today)} : null;
  const candidates = goals.filter(g => g.status !== 'closed' && g.type !== 'PROJECT' && (g.status !== 'completed' || summaryOf.has(g.id)));
  const focusId = top ? privateId(top.key) : null, order = (id: string) => { const i = active.findIndex(g => privateId(g.key) === id); return i < 0 ? Number.MAX_SAFE_INTEGER : i; };
  const others = candidates.filter(g => g.id !== focusId && g.status === 'active').map(g => ({g, ...urgency(summaryOf.get(g.id), g, today)})).sort((a, b) => b.score - a.score || order(a.g.id) - order(b.g.id));
  if (others[0]) return {focus, attention: {id: others[0].g.id, why: others[0].why}, cards: active};
  const only = candidates.find(g => g.id === focusId);
  return {focus, attention: only ? {id: only.id, why: 'only'} : null, cards: active};
}

/** The goal records as "What matters today" reads them (components/platform/today-intelligence.tsx shows the first goal,
 *  pinned ones first): the chosen goal first and the only one marked first. A view for that panel only: nothing is
 *  written, and every other place reads the records as they are. */
export const attentionFirst = <G extends {id: string; pinned?: boolean}>(goals: readonly G[], roles: GoalRoles): G[] => { const id = roles.attention?.id; const first = id ? goals.find(g => g.id === id) : undefined; if (!first) return [...goals]; return [{...first, pinned: true}, ...goals.filter(g => g !== first).map(g => g.pinned ? {...g, pinned: false} : g)]; };
