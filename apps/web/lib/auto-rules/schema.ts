import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK (5.6): auto-complete rules. "When steps ≥ 8,000 → Walk is done", "When I log a workout → Gym is done",
 * "When I add to Holiday fund → Save is done". One device key, never synced (like AH's `zigoals:habit-health-links:v1`,
 * whose Health sources it reuses): the values a rule reads (Health, workouts, contributions) are this device's own, so a
 * rule applied on another device could tick a day from data that device does not hold. The ticks themselves are
 * ordinary habit entries and sync as they always do.
 *
 * Loose and versioned (ADR-022 B1): a field a later build adds survives a write of this one. `applied` holds one marker
 * per habit and day made by a rule, with the value before the tick (`before`), so Undo puts the day back exactly and a
 * day undone is never ticked again by any rule.
 */
export const AUTO_RULES_KEY = 'zigoals:auto-rules:v1';
export const MAX_AUTO_RULES = 100, MAX_AUTO_APPLIED = 3000;
export const AUTO_SOURCES = ['steps', 'sleep', 'workout', 'water', 'contribution', 'active-minutes'] as const;
export type AutoSource = typeof AUTO_SOURCES[number];
export const AUTO_COMPARATORS = ['at-least', 'recorded'] as const;
export type AutoComparator = typeof AUTO_COMPARATORS[number];
/** The unit a rule's threshold is written in; fixed per source so a stored rule can never mean two things. */
export const SOURCE_UNIT = {steps: 'steps', sleep: 'hours', workout: 'minutes', water: 'mL', contribution: 'goal-unit', 'active-minutes': 'minutes'} as const satisfies Record<AutoSource, string>;
export type AutoUnit = typeof SOURCE_UNIT[AutoSource];

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const habitId = z.string().min(1).max(100);
const stamp = z.iso.datetime();
export const autoRuleSchema = z.looseObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  source: z.enum(AUTO_SOURCES),
  comparator: z.enum(AUTO_COMPARATORS),
  /** In the source's own unit (SOURCE_UNIT): steps, hours asleep, workout minutes, mL, active minutes, or the goal's unit. */
  threshold: z.number().finite().min(0).max(1_000_000_000).optional(),
  unit: z.enum(['steps', 'hours', 'minutes', 'mL', 'goal-unit']),
  habitId,
  /** The goal a contribution rule watches (a private goal's id). */
  goalId: z.string().regex(/^\d{1,80}$/).optional(),
  /** A workout rule may count only one kind of workout. */
  workoutType: z.enum(['strength', 'cardio', 'mobility', 'sport', 'other']).optional(),
  /** Off keeps the rule without applying it. */
  paused: z.literal(true).optional(),
  createdAt: stamp,
});
export type AutoRule = z.infer<typeof autoRuleSchema>;
/** What a rule must say to be applied; null when it can be saved. */
export function autoRuleIssue(rule: Pick<AutoRule, 'source' | 'comparator' | 'threshold' | 'unit' | 'goalId'>): string | null {
  if (rule.unit !== SOURCE_UNIT[rule.source]) return 'This rule names the wrong unit for its source.';
  if (rule.source === 'contribution' && !rule.goalId) return 'Choose the goal to watch.';
  if (rule.source !== 'contribution' && rule.goalId) return 'Only a contribution rule names a goal.';
  if (rule.comparator === 'at-least' && !(rule.threshold !== undefined && rule.threshold > 0)) return 'Enter a number above zero.';
  if (rule.source === 'sleep' && rule.threshold !== undefined && rule.threshold > 24) return 'Enter at most 24 hours of sleep.';
  if ((rule.source === 'workout' || rule.source === 'active-minutes') && rule.threshold !== undefined && rule.threshold > 1440) return 'Enter at most 1,440 minutes (a day).';
  if (rule.source === 'steps' && rule.threshold !== undefined && !Number.isInteger(rule.threshold)) return 'Steps are whole numbers.';
  return null;
}
export const validAutoRuleSchema = autoRuleSchema.superRefine((rule, ctx) => { const issue = autoRuleIssue(rule); if (issue) ctx.addIssue({code: 'custom', message: issue}); });
export const autoAppliedSchema = z.looseObject({
  ruleId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  habitId,
  /** The habit's day that was ticked. */
  date: day,
  source: z.enum(AUTO_SOURCES),
  /** The value that met the rule, in the source's unit (hours asleep are kept as minutes, like AH's sleep links). */
  value: z.number().finite().min(0).max(1_000_000_000),
  /** The day's logged value before the tick (0 when nothing was logged), for Undo. */
  before: z.number().finite().min(0).max(1_000_000_000),
  /** The value the tick wrote: Undo only restores `before` while the day still holds exactly this. */
  wrote: z.number().finite().min(0).max(1_000_000_000),
  appliedAt: stamp,
  undone: z.literal(true).optional(),
});
export type AutoApplied = z.infer<typeof autoAppliedSchema>;
export const autoRulesSchema = z.looseObject({
  version: z.literal(1),
  rules: z.array(validAutoRuleSchema).max(MAX_AUTO_RULES),
  applied: z.array(autoAppliedSchema).max(MAX_AUTO_APPLIED),
}).refine(r => new Set(r.rules.map(x => x.id)).size === r.rules.length, 'Each rule has its own id.')
  .refine(r => new Set(r.applied.map(a => `${a.habitId}:${a.date}`)).size === r.applied.length, 'One automatic tick per habit and day.');
export type AutoRules = z.infer<typeof autoRulesSchema>;
export const emptyAutoRules = (): AutoRules => ({version: 1, rules: [], applied: []});
export const AUTO_RULES: DeviceRecordSpec<AutoRules> = {key: AUTO_RULES_KEY, schema: autoRulesSchema, empty: emptyAutoRules};
