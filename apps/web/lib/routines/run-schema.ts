import * as z from 'zod';
import {ROUTINE_RUN_KEY} from '../aa-device-keys';
import type {DeviceRecordSpec} from '../device-record';

/**
 * H5: a routine being run (the step-by-step player), on this device only: the head habit of the stack, the step the
 * person is on, when the run and the step began, and what was done or skipped so far. A reload resumes it; finishing
 * or leaving removes it. Loose and versioned (ADR-022 B1); a run from another day is stale and reads as none.
 */
const stamp = z.iso.datetime();
export const routineRunSchema = z.looseObject({
  version: z.literal(1),
  headId: z.string().min(1).max(100),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  step: z.number().int().min(0).max(100),
  startedAt: stamp,
  stepStartedAt: stamp,
  done: z.array(z.string().min(1).max(100)).max(100),
  skipped: z.array(z.string().min(1).max(100)).max(100),
});
export type RoutineRun = z.infer<typeof routineRunSchema>;
export const routineRunStoreSchema = z.looseObject({version: z.literal(1), run: routineRunSchema.nullable()});
export type RoutineRunStore = z.infer<typeof routineRunStoreSchema>;
export const emptyRoutineRun = (): RoutineRunStore => ({version: 1, run: null});
export const ROUTINE_RUN: DeviceRecordSpec<RoutineRunStore> = {key: ROUTINE_RUN_KEY, schema: routineRunStoreSchema, empty: emptyRoutineRun};
