import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AV lane 2 (body; LEDGER #205 Yazio's milestones and #210 its BMI calculator; TIER 3 (stored format), a NEW
 * device-only key): a height the person types (for a BMI figure, the number only: no judgement word, no ideal weight), and
 * opt-in weight milestones on the way to the Health weight goal — every 2 kg or every 10 % of the way from the weight it
 * started at — each remembered with the day it was first reached and celebrated once (one reached before they were turned
 * on is remembered quietly). Loose and versioned; every field optional; bounded. Exported, restored with Health, erased
 * with the account; never synced.
 */
export const BODY_EXTRAS_KEY = 'zigoals:body-extras:v1';
export const MILESTONE_STEPS = ['2kg', '10pct'] as const;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const milestoneReachedSchema = z.looseObject({index: z.number().int().min(1).max(100), on: day, quiet: z.boolean().optional().catch(undefined), shownAt: z.iso.datetime({offset: true}).optional().catch(undefined)});
export const milestonesSchema = z.looseObject({
  step: z.enum(MILESTONE_STEPS),
  /** The weight the way starts at (grams) and the goal it leads to (grams), as they were when turned on. */
  startGrams: z.number().int().min(20_000).max(400_000),
  goalGrams: z.number().int().min(20_000).max(400_000),
  startedOn: day,
  reached: z.array(milestoneReachedSchema).max(100).catch([]),
});
export const bodyExtrasSchema = z.looseObject({
  version: z.literal(1),
  heightCm: z.number().finite().min(50).max(272).optional().catch(undefined),
  milestones: milestonesSchema.optional().catch(undefined),
});
export type BodyExtras = z.infer<typeof bodyExtrasSchema>;
export type Milestones = z.infer<typeof milestonesSchema>;
export const emptyBodyExtras = (): BodyExtras => ({version: 1});
export const BODY_EXTRAS: DeviceRecordSpec<BodyExtras> = {key: BODY_EXTRAS_KEY, schema: bodyExtrasSchema, empty: emptyBodyExtras};
