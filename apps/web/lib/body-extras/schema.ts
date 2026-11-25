import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AV lane 2 (body; LEDGER #205 Yazio's milestones and #210 its BMI calculator; TIER 3 (stored format), a NEW
 * device-only key): a height the person types (for a BMI figure, the number only: no judgement word, no ideal weight), and
 * opt-in weight milestones on the way to the Health weight goal — every 2 kg or every 10 % of the way from the weight it
 * started at — each remembered with the day it was first reached and celebrated once (one reached before they were turned
 * on is remembered quietly). Session AW (X6): days the person names (#456) and notes on weigh-ins (#457), both optional.
 * Loose and versioned; every field optional; bounded. Exported, restored with Health, erased
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
/**
 * Session AW (X6; LEDGER #456, Happy Scale's "what I'll weigh on a day"; TIER 3 (stored format), additive and optional):
 * up to five days the person names ("The wedding", 20 Dec), for the trend's estimate on that day. Only the name and the
 * day are kept; the estimate is worked out each time from the weigh-ins.
 */
export const NAMED_DAYS_MAX = 5, NAMED_DAY_NAME_MAX = 40;
export const namedDaySchema = z.looseObject({id: z.string().regex(/^nd-[a-z0-9-]{4,40}$/), name: z.string().trim().min(1).max(NAMED_DAY_NAME_MAX), on: day});
/**
 * Session AW (X6; LEDGER #457, Happy Scale's weigh-in notes; TIER 3 (stored format), additive and optional): a short note
 * on a weigh-in ("after the holiday", "new scale"), by the weight's id in Health's strict `weights` (which stay as they
 * are). A note whose weigh-in is gone is dropped at the next write.
 */
export const WEIGH_NOTES_MAX = 1000, WEIGH_NOTE_MAX = 80;
export const weighNoteSchema = z.looseObject({id: z.string().min(1).max(120), note: z.string().trim().min(1).max(WEIGH_NOTE_MAX)});
export const bodyExtrasSchema = z.looseObject({
  version: z.literal(1),
  heightCm: z.number().finite().min(50).max(272).optional().catch(undefined),
  milestones: milestonesSchema.optional().catch(undefined),
  namedDays: z.array(namedDaySchema).max(NAMED_DAYS_MAX).optional().catch(undefined),
  weighNotes: z.array(weighNoteSchema).max(WEIGH_NOTES_MAX).optional().catch(undefined),
});
export type BodyExtras = z.infer<typeof bodyExtrasSchema>;
export type Milestones = z.infer<typeof milestonesSchema>;
export type NamedDay = z.infer<typeof namedDaySchema>;
export type WeighNote = z.infer<typeof weighNoteSchema>;
export const emptyBodyExtras = (): BodyExtras => ({version: 1});
export const BODY_EXTRAS: DeviceRecordSpec<BodyExtras> = {key: BODY_EXTRAS_KEY, schema: bodyExtrasSchema, empty: emptyBodyExtras};
