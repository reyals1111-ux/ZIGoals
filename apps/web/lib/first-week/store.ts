import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK (BUILD list 2 #5, lane B2a): "Your first week", an optional Today card kept on this device. A new
 * device-only key, loose and versioned, every field optional; written only on the person's own taps (Start, Done, Hide).
 * `startedOn` is the day the person started (the journal zone's calendar day), `done` maps a step id to the day it was
 * marked done, `hidden` ends the card early. Never synced; nothing is sent.
 */
export const FIRST_WEEK_KEY = 'zigoals:first-week:v1';
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const firstWeekSchema = z.looseObject({
  version: z.literal(1),
  startedOn: day.optional(),
  hidden: z.boolean().optional(),
  /** step id → the day it was marked done (at most 16 ids; ids this build does not know are kept and ignored). */
  done: z.record(z.string().regex(/^[a-z][a-z0-9-]{0,23}$/), day).refine(d => Object.keys(d).length <= 16, 'Too many steps.').optional(),
});
export type FirstWeek = z.infer<typeof firstWeekSchema>;
export const emptyFirstWeek = (): FirstWeek => ({version: 1});
export const FIRST_WEEK: DeviceRecordSpec<FirstWeek> = {key: FIRST_WEEK_KEY, schema: firstWeekSchema, empty: emptyFirstWeek};
