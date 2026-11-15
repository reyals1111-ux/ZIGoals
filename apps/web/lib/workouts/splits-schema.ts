import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AP (owner-approved feature 5; TIER 3 (stored format), additive): a run's pace and per-kilometre splits, worked
 * out once at import from the GPX or TCX file's track points and kept in this NEW device-only key, by workout id. The
 * workout log (zigoals:workouts:v1) and its `imported` summary are unchanged, so older builds read the log as before.
 * Workouts imported earlier keep their summary only: nothing is back-filled (the points were never kept). Never the route.
 * Exported, restored with Health, erased with the account; never synced.
 */
export const WORKOUT_SPLITS_KEY = 'zigoals:workout-splits:v1';
export const MAX_SPLIT_WORKOUTS = 3000;
/** Up to 300 km of splits; a longer workout keeps its pace only. */
export const MAX_SPLITS = 300;
const workoutId = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/).refine(k => k !== '__proto__' && k !== 'constructor' && k !== 'prototype', 'Not a workout id.');
export const splitSchema = z.strictObject({
  /** The kilometre's number, 1 for the first. */
  km: z.number().int().min(1).max(MAX_SPLITS),
  /** 1000 for a whole kilometre; the last split may be shorter. */
  meters: z.number().int().min(1).max(1000),
  seconds: z.number().int().min(1).max(172_800),
});
export const workoutSplitsSchema = z.strictObject({
  source: z.enum(['gpx', 'tcx']),
  /** The whole workout's moving distance over its length, seconds per kilometre. */
  paceSecondsPerKm: z.number().int().min(60).max(7200),
  splits: z.array(splitSchema).max(MAX_SPLITS),
});
export const splitsRecordSchema = z.strictObject({version: z.literal(1), workouts: z.record(workoutId, workoutSplitsSchema)})
  .refine(r => Object.keys(r.workouts).length <= MAX_SPLIT_WORKOUTS, `Up to ${MAX_SPLIT_WORKOUTS} workouts with splits.`);
export type Split = z.infer<typeof splitSchema>;
export type WorkoutSplits = z.infer<typeof workoutSplitsSchema>;
export type SplitsRecord = z.infer<typeof splitsRecordSchema>;
export const emptySplits = (): SplitsRecord => ({version: 1, workouts: {}});
export const WORKOUT_SPLITS: DeviceRecordSpec<SplitsRecord> = {key: WORKOUT_SPLITS_KEY, schema: splitsRecordSchema, empty: emptySplits};
