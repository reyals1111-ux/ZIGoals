import {z} from 'zod';
import {hasVisibleText} from '../visible-text';

/**
 * Goals that track a Health measure (Session P, PR 3, G3; docs/product/features/G3-health-goals.md). One device key,
 * per account, never synced and in no backup until "Export everything": {version: 1, goals: HealthGoal[]}.
 * A goal's fields are byte-for-byte those of its future synced home, `healthGoals[]` in finance v4
 * (docs/product/SYNC_HOMES.md), so the later move is a plain copy. Progress is never stored: it is computed from the
 * Health records every time.
 */
export const HEALTH_GOALS_KEY = 'zigoals:health-goals:v1';
export const MAX_HEALTH_GOALS = 200;
export const HEALTH_GOAL_MEASURES = ['weight', 'steps', 'water', 'exercise', 'activeMinutes'] as const;
export type HealthGoalMeasure = typeof HEALTH_GOAL_MEASURES[number];
const units = z.string().regex(/^(0|[1-9]\d*)$/).max(78), decimals = z.number().int().min(0).max(18), day = z.iso.date(), instant = z.iso.datetime();
export const healthGoalFields = z.strictObject({
  version: z.literal(1), id: z.uuid(), name: z.string().trim().min(1).max(100),
  measure: z.enum(HEALTH_GOAL_MEASURES), direction: z.enum(['down', 'up', 'at-least']),
  target: z.strictObject({value: units, decimals}), unit: z.string().min(1).max(24),
  window: z.union([z.strictObject({kind: z.literal('by'), date: day}), z.strictObject({kind: z.literal('rolling'), weeks: z.number().int().min(1).max(104)})]),
  exerciseId: z.string().max(100).optional(), status: z.enum(['active', 'done', 'closed']), notes: z.string().max(2000).optional(),
  createdAt: instant, updatedAt: instant,
});
export type HealthGoal = z.infer<typeof healthGoalFields>;
/** The target as a number in the goal's own unit. */
export const targetNumber = (goal: Pick<HealthGoal, 'target'>) => Number(goal.target.value) / 10 ** goal.target.decimals;
/** What a goal must say to be counted: a visible name, a weight goal goes down or up, every other measure is "at least", a target above zero, a counter for the exercise measure. */
export function healthGoalIssue(goal: HealthGoal): string | null {
  if (!hasVisibleText(goal.name)) return 'Give the goal a name.';
  if (goal.measure === 'weight' ? goal.direction === 'at-least' : goal.direction !== 'at-least') return 'A weight goal goes towards a lower or a higher weight; every other goal is "at least".';
  if (!(targetNumber(goal) > 0)) return 'Enter a target above zero.';
  if (goal.measure === 'exercise' && !goal.exerciseId) return 'Choose an exercise counter.';
  return null;
}
export const healthGoalSchema = healthGoalFields.superRefine((goal, ctx) => { const issue = healthGoalIssue(goal); if (issue) ctx.addIssue({code: 'custom', message: issue}); });
export const healthGoalsSchema = z.strictObject({version: z.literal(1), goals: z.array(healthGoalSchema).max(MAX_HEALTH_GOALS)})
  .refine(data => new Set(data.goals.map(g => g.id)).size === data.goals.length, 'Duplicate health goal identifier.');
export type HealthGoals = z.infer<typeof healthGoalsSchema>;
export const emptyHealthGoals = (): HealthGoals => ({version: 1, goals: []});
