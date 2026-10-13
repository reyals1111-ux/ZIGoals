/**
 * The names of Session AA-Local's device keys (ADR-022 B1), in a module with no imports so the shell, the welcome check
 * and Export everything can name them without shipping a schema (the pattern of lib/w-device-keys.ts). Every record is
 * device-only, versioned and loose: no field of this session enters a strict synced record, so builds #32–#37 read or
 * ignore them. The schemas and stores live beside each feature.
 */
export const HABIT_EXTRAS_KEY = 'zigoals:habit-extras:v1';
export const ROUTINE_RUN_KEY = 'zigoals:routine-run:v1';
export const GAME_KEY = 'zigoals:game:v1';
export const HEALTH_COACH_KEY = 'zigoals:health-coach:v1';
export const MICRO_TARGETS_KEY = 'zigoals:micro-targets:v1';
export const MACRO_MODE_KEY = 'zigoals:macro-mode:v1';
export const AISLES_KEY = 'zigoals:aisles:v1';
export const MEASUREMENTS_CUSTOM_KEY = 'zigoals:measurements-custom:v1';
export const PROGRESS_PHOTOS_KEY = 'zigoals:progress-photos:v1';
export const REMINDERS_PLAN_KEY = 'zigoals:reminders-plan:v1';
export const ONBOARDING_SETUP_KEY = 'zigoals:onboarding-setup:v1';
/** AA-Cloud's life areas (owner edit 1): read here through a tolerant mirror, never written by this lane. */
export const LIFE_AREAS_KEY = 'zigoals:goal-extras:v1'; // AA-Cloud's goal-extras record: its `areas` list holds the custom life areas (read-only here)
/** The person's own records: a device with any of them is not new. */
export const AA_PERSONAL_KEYS: readonly string[] = [HABIT_EXTRAS_KEY, ROUTINE_RUN_KEY, GAME_KEY, HEALTH_COACH_KEY, MICRO_TARGETS_KEY, AISLES_KEY, MEASUREMENTS_CUSTOM_KEY, PROGRESS_PHOTOS_KEY, REMINDERS_PLAN_KEY, ONBOARDING_SETUP_KEY];
/** Display preferences with nothing personal in them. */
export const AA_DISPLAY_KEYS: readonly string[] = [MACRO_MODE_KEY];
