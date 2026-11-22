import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AV lane 2 (body; LEDGER #83, Calm Sleep's evening plan; TIER 3 (stored format), a NEW device-only key): the
 * evening plan made from a few plain questions — the time to be asleep, what gets in the way, how long to wind down —
 * as one to eight steps, each a number of minutes before bedtime (an own habit can be one), and which steps were ticked
 * on each evening (the last 120 evenings are kept). Loose and versioned, so a later field never makes a build refuse it.
 * Nothing medical; no device link. Exported, restored with Health, erased with the account; never synced.
 */
export const EVENING_PLAN_KEY = 'zigoals:evening-plan:v1';
export const EVENING_HINDRANCES = ['screens', 'busy-head', 'late-caffeine', 'no-fixed-time', 'light-noise', 'late-meal'] as const;
export type EveningHindrance = typeof EVENING_HINDRANCES[number];
export const MAX_EVENING_STEPS = 8, MAX_EVENING_DAYS = 120;
const clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const stepId = z.string().regex(/^[a-z0-9-]{1,40}$/);
export const eveningStepSchema = z.looseObject({
  id: stepId,
  label: z.string().trim().min(1).max(60),
  /** Minutes before bedtime: 0 is at bedtime itself. */
  minutesBefore: z.number().int().min(0).max(240),
  /** An own habit used as this step: ticking the step does not tick the habit (it is named, never changed). */
  habitId: z.string().min(1).max(80).optional().catch(undefined),
});
export const eveningPlanSchema = z.looseObject({
  bedtime: clock,
  windDown: z.number().int().min(10).max(180),
  hindrances: z.array(z.enum(EVENING_HINDRANCES)).max(EVENING_HINDRANCES.length).catch([]),
  steps: z.array(eveningStepSchema).min(1).max(MAX_EVENING_STEPS),
  updatedAt: z.iso.datetime({offset: true}),
});
export const eveningRecordSchema = z.looseObject({
  version: z.literal(1),
  plan: eveningPlanSchema.optional().catch(undefined),
  /** Each evening (the date the evening began) with the ids of the steps ticked. */
  days: z.record(day, z.array(stepId).max(MAX_EVENING_STEPS)).refine(r => Object.keys(r).length <= MAX_EVENING_DAYS, `Up to ${MAX_EVENING_DAYS} evenings.`).catch({}),
});
export type EveningStep = z.infer<typeof eveningStepSchema>;
export type EveningPlan = z.infer<typeof eveningPlanSchema>;
export type EveningRecord = z.infer<typeof eveningRecordSchema>;
export const emptyEvening = (): EveningRecord => ({version: 1, days: {}});
export const EVENING_PLAN: DeviceRecordSpec<EveningRecord> = {key: EVENING_PLAN_KEY, schema: eveningRecordSchema, empty: emptyEvening};
