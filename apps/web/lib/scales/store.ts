import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK (BUILD list 2 #12, lane G1a): "Your own scales" — up to five personal 1–5 sliders (stress, pain, focus…),
 * each with the person's own words for its two ends, rated in the check-in and readable in Compare as a factor and an
 * outcome. A new device-only key, loose and versioned; written only on the person's taps. A removed scale moves to
 * `retired` (its name and end words) so its history stays readable; its ratings are never deleted by removing it.
 */
export const SCALES_KEY = 'zigoals:scales:v1';
export const MAX_SCALES = 5, MAX_RETIRED = 20, MAX_SCALE_DAYS = 730;
export const SCALE_NAME_MAX = 30, SCALE_END_MAX = 24;
export const SCALE_ID = /^[a-z0-9-]{1,24}$/;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const scaleSchema = z.looseObject({
  id: z.string().regex(SCALE_ID),
  name: z.string().trim().min(1).max(SCALE_NAME_MAX),
  /** The person's word for 1 and for 5 ("calm" … "very tense"). */
  low: z.string().trim().min(1).max(SCALE_END_MAX),
  high: z.string().trim().min(1).max(SCALE_END_MAX),
});
export const scalesSchema = z.looseObject({
  version: z.literal(1),
  scales: z.array(scaleSchema).max(MAX_SCALES).default([]),
  /** Ratings by calendar day, then by scale id, 1 to 5. A day with nothing rated is not kept. */
  days: z.record(day, z.record(z.string().regex(SCALE_ID), z.number().int().min(1).max(5))).default({})
    .refine(d => Object.keys(d).length <= MAX_SCALE_DAYS, `Up to ${MAX_SCALE_DAYS} days of ratings.`),
  /** Removed scales, so their ratings still read with their names (newest last). */
  retired: z.array(scaleSchema).max(MAX_RETIRED).optional(),
});
export type Scale = z.infer<typeof scaleSchema>;
export type Scales = z.infer<typeof scalesSchema>;
export const emptyScales = (): Scales => ({version: 1, scales: [], days: {}});
export const SCALES: DeviceRecordSpec<Scales> = {key: SCALES_KEY, schema: scalesSchema, empty: emptyScales};
