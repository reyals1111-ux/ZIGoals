import * as z from 'zod';
import {ONBOARDING_SETUP_KEY} from '../aa-device-keys';
import type {DeviceRecordSpec} from '../device-record';
import {DEFAULT_COUNTERS, exerciseSchema, type Exercise} from '../health-counters';

/**
 * Session AW (p5-fixes; FR-S-14, Health part): a person who chose what to work on in the welcome and left out "Move
 * more" still saw Push-ups, Pull-ups and Squats on Health's first screen. The three example counters now wait until they
 * are used (Health holds an `exercise` group, written by the first tap or by "Show quick counters") or chosen (the
 * welcome's "Move more"). A device with no welcome choices sees them as before.
 *
 * The welcome's choices are read, never written, through this loose read-only view of `zigoals:onboarding-setup:v1`
 * (its owner is lib/onboarding-setup.ts, kept out of Health's first scripts): only `focuses` and `undone` are read, and
 * anything unreadable counts as no choice.
 */
const setupFocusesSchema = z.looseObject({version: z.literal(1), focuses: z.array(z.string().max(40)).max(40).optional().catch(undefined), undone: z.boolean().optional().catch(undefined)});
export type SetupFocuses = z.infer<typeof setupFocusesSchema>;
export const SETUP_FOCUSES: DeviceRecordSpec<SetupFocuses> = {key: ONBOARDING_SETUP_KEY, schema: setupFocusesSchema, empty: () => ({version: 1})};

/** "Move more" in the welcome's own words (lib/onboarding-setup.ts FOCUS_IDS). */
export const MOVE_FOCUS = 'move';
/** Whether the welcome's choices leave movement out: choices were made, kept (not undone) and none of them is "Move more". */
export function movementLeftOut(setup: SetupFocuses | null | undefined): boolean {
  const focuses = setup?.focuses ?? [];
  return !setup?.undone && focuses.length > 0 && !focuses.includes(MOVE_FOCUS);
}
/** Whether the welcome's kept choices include "Move more" (Session AW integration: then the counters show from the start). */
export function movementChosen(setup: SetupFocuses | null | undefined): boolean {
  return !setup?.undone && (setup?.focuses ?? []).includes(MOVE_FOCUS);
}
/**
 * Health's quick exercise counters on its first screen: once used (an `exercise` group), once asked for on this visit, or
 * when the welcome chose "Move more". Session AW (integration with simplicity-a; owner brief Part 3): otherwise — no
 * choices too — they wait behind Health's one teaching line, never three example counters at 0.
 */
export function quickCountersShown(health: {exercise?: Exercise}, setup: SetupFocuses | null | undefined, asked = false): boolean {
  return health.exercise !== undefined || asked || movementChosen(setup);
}
/** "Show quick counters": the three example counters written as Health's own `exercise` group (no day counted). */
export function turnOnQuickCounters<T extends {exercise?: Exercise}>(health: T): T {
  if (health.exercise) return health;
  return {...health, exercise: exerciseSchema.parse({version: 1, counters: DEFAULT_COUNTERS.map(c => ({...c})), days: []})};
}
