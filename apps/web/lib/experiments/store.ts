import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK (BUILD list 2 #8, lane B2a): Experiments ("Try it for 14 days") on top of Compare. A new device-only key,
 * loose and versioned; written only when the person starts, ends, notes or removes an experiment. The result is worked
 * out on the device from the person's own records each time (lib/experiments/engine.ts) and never stored.
 */
export const EXPERIMENTS_KEY = 'zigoals:experiments:v1';
export const MAX_EXPERIMENTS = 20;
export const EXPERIMENT_LENGTHS = [14, 21, 28] as const;
export const DEFAULT_LENGTH = 14;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const experimentSchema = z.looseObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  /** The person's own name for it ("Walk after lunch"). */
  title: z.string().trim().min(1).max(80),
  /** A Compare factor id: `habit:<id>`, `sleep-tag:<tag>`, `journal-tag:<tag>`, `workout` or `fasting`. */
  factor: z.string().min(1).max(120),
  /** A Compare outcome id (lib/compare/engine.ts OUTCOMES); one this build does not know reads as "not available". */
  outcome: z.string().min(1).max(40),
  lag: z.enum(['same', 'next']).optional(),
  /** The first day of the experiment (a calendar day); the baseline is the same number of days just before it. */
  start: day,
  days: z.number().int().min(7).max(28),
  /** The calendar day the person ended it early; the experiment's last day is then this day. */
  endedAt: day.optional(),
  note: z.string().trim().max(500).optional(),
});
export const experimentsSchema = z.looseObject({
  version: z.literal(1),
  items: z.array(experimentSchema).max(MAX_EXPERIMENTS).default([]),
});
export type Experiment = z.infer<typeof experimentSchema>;
export type Experiments = z.infer<typeof experimentsSchema>;
export const emptyExperiments = (): Experiments => ({version: 1, items: []});
export const EXPERIMENTS: DeviceRecordSpec<Experiments> = {key: EXPERIMENTS_KEY, schema: experimentsSchema, empty: emptyExperiments};
