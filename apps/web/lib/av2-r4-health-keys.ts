/**
 * Session AV lane 2, round 4 (health; TIER 3 stored formats: additive keys only): this round's new device keys and their
 * rows for the shared registries, as literals in a module with no imports (the lib/av-device-keys.ts pattern), so the
 * welcome check, Export everything, the data catalog and the account erase can name them without shipping a schema. The
 * lead spreads these into the registries (lib/av2-device-keys.ts lists, lib/export/everything.ts DEVICE_KEYS,
 * lib/data-health/catalog.ts, lib/restore/plan.ts with "Health", lib/aa-device-forget.ts); lib/av2-r4-health-keys.test.ts
 * proves each literal equals its owner's constant. Every record is device only, versioned, exported, restored, erased with
 * the account, never synced.
 * - `zigoals:planned-workouts:v1` (lib/workouts/planned.ts): workouts planned on a day, and the days set aside while away.
 * - `zigoals:races:v1` (lib/workouts/races.ts): races ahead, each with its distance, goal time and main or B mark.
 * - `zigoals:workout-hr:v1` (lib/workouts/hr-zones.ts): the maximum heart rate typed, and each imported run's seconds at each heart rate.
 */
export const PLANNED_WORKOUTS_KEY_LITERAL = 'zigoals:planned-workouts:v1';
export const RACES_KEY_LITERAL = 'zigoals:races:v1';
export const WORKOUT_HR_KEY_LITERAL = 'zigoals:workout-hr:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). */
export const AV2_R4_HEALTH_PERSONAL_KEYS: readonly string[] = [PLANNED_WORKOUTS_KEY_LITERAL, RACES_KEY_LITERAL, WORKOUT_HR_KEY_LITERAL];
/** Export everything (`DEVICE_KEYS`): the names in everything.json. */
export const AV2_R4_HEALTH_EXPORT_KEYS = {plannedWorkouts: PLANNED_WORKOUTS_KEY_LITERAL, races: RACES_KEY_LITERAL, workoutHr: WORKOUT_HR_KEY_LITERAL} as const;
/** The data catalog (`DEVICE_LABELS`): [label, area], home "device". */
export const AV2_R4_HEALTH_CATALOG_LABELS = {
  plannedWorkouts: ['Workouts: your planned workouts and the days you are away', 'Health'],
  races: ['Workouts: your races, their distances and goal times', 'Health'],
  workoutHr: ['Workouts: your maximum heart rate and each imported run’s time at each heart rate', 'Health'],
} as const;
/** Restore (`lib/restore/plan.ts` `dev(...)`): [name, label, area]. */
export const AV2_R4_HEALTH_RESTORE = {plannedWorkouts: ['Planned workouts', 'Health'], races: ['Races', 'Health'], workoutHr: ['Heart-rate zones of runs', 'Health']} as const;
/** The account erase (`lib/aa-device-forget.ts`): every key above. */
export const AV2_R4_HEALTH_ERASE_KEYS: readonly string[] = [...AV2_R4_HEALTH_PERSONAL_KEYS];
