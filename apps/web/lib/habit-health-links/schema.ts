import {z} from 'zod';

/**
 * Habits that tick themselves off from Health (Session P, PR 3, H7; docs/product/features/H7-auto-checkins.md).
 * One device key, per account, never synced and in no backup until "Export everything":
 *   {version: 1, links: {[habitId]: HabitHealthLink}, applied: AppliedCheckIn[]}.
 * A link's fields are byte-for-byte those of its future synced home, `habits[].healthLink` in habits v3
 * (docs/product/SYNC_HOMES.md), so the later move is a plain copy. The markers in `applied` say which check-ins were
 * made automatically; the check-ins themselves are ordinary habit entries.
 */
export const HABIT_HEALTH_LINKS_KEY = 'zigoals:habit-health-links:v1';
export const MAX_HEALTH_LINKS = 200;
export const MAX_APPLIED_CHECK_INS = 5000;
export const HEALTH_MEASURES = ['water', 'steps', 'activeMinutes', 'weight', 'exercise'] as const;
export type HealthMeasure = typeof HEALTH_MEASURES[number];
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const instant = z.iso.datetime();
/** The link as the synced home will carry it: measure, rule, an optional target in the measure's own unit, a counter id. */
export const habitHealthLinkFields = z.strictObject({
  version: z.literal(1),
  measure: z.enum(HEALTH_MEASURES),
  rule: z.enum(['at-least', 'recorded']),
  target: z.number().min(0).max(1_000_000_000).optional(),
  exerciseId: z.string().max(100).optional(),
  updatedAt: instant,
});
export type HabitHealthLink = z.infer<typeof habitHealthLinkFields>;
/** What a link must say to be applied: a weight link is "recorded", "at least" needs a target above zero, an exercise link names its counter. */
export function healthLinkIssue(link: HabitHealthLink): string | null {
  if (link.measure === 'weight' && link.rule !== 'recorded') return 'A weight link completes when a reading is recorded.';
  if (link.rule === 'at-least' && !(link.target !== undefined && link.target > 0)) return 'Enter a target above zero.';
  if (link.measure === 'exercise' && !link.exerciseId) return 'Choose an exercise counter.';
  return null;
}
export const habitHealthLinkSchema = habitHealthLinkFields.superRefine((link, ctx) => { const issue = healthLinkIssue(link); if (issue) ctx.addIssue({code: 'custom', message: issue}); });
export const appliedCheckInSchema = z.strictObject({
  habitId: z.uuid(), date: day, healthDate: day, measure: z.enum(HEALTH_MEASURES),
  value: z.number().min(0).max(1_000_000_000), appliedAt: instant, undone: z.literal(true).optional(),
});
export type AppliedCheckIn = z.infer<typeof appliedCheckInSchema>;
export const habitHealthLinksSchema = z.strictObject({
  version: z.literal(1),
  links: z.record(z.uuid(), habitHealthLinkSchema).refine(links => Object.keys(links).length <= MAX_HEALTH_LINKS, `Up to ${MAX_HEALTH_LINKS} habits can have a Health link.`),
  applied: z.array(appliedCheckInSchema).max(MAX_APPLIED_CHECK_INS),
}).refine(data => new Set(data.applied.map(a => `${a.habitId}:${a.date}`)).size === data.applied.length, 'One automatic check-in per habit and day.');
export type HabitHealthLinks = z.infer<typeof habitHealthLinksSchema>;
export const emptyHabitHealthLinks = (): HabitHealthLinks => ({version: 1, links: {}, applied: []});
