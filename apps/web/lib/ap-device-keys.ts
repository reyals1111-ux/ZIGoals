/**
 * Session AP (ADR-040): this session's device keys and their rows for the shared registries, as literals in a module with
 * no imports (the lib/ao-device-keys.ts pattern), so the welcome check, Export everything, the data catalog and the account
 * erase can name them without shipping a schema; lib/ap-device-keys.test.ts proves each literal equals its owner's
 * constant and that every registry carries it. Every record is device only, versioned, exported, erased with the account
 * and never synced (TIER 3 stored format: additive keys only; older builds ignore them).
 * - `zigoals:day-goal:v1` (a setting; owner decision 14 Nov, backlog #3): "A day counts as done at N", as dated changes
 *   (lib/checklist/day-goal.ts). Restored with the other "Today and Life" records.
 */
export const DAY_GOAL_KEY_LITERAL = 'zigoals:day-goal:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). */
export const AP_PERSONAL_KEYS: readonly string[] = [];
/** Display/setting records (onboarding `NON_PERSONAL_KEYS`): a device holding only these is still new. */
export const AP_DISPLAY_KEYS: readonly string[] = [DAY_GOAL_KEY_LITERAL];
/** Export everything (`DEVICE_KEYS`): the names in everything.json. */
export const AP_EXPORT_KEYS = {dayGoal: DAY_GOAL_KEY_LITERAL} as const;
/** The data catalog (`DEVICE_LABELS`): [label, area], home "device". */
export const AP_CATALOG_LABELS = {
  dayGoal: ['A day counts as done at (the Checklist’s rule for the flame and Journey’s orbit badges, with the day each change began)', 'Settings'],
} as const;
/** The account erase (`lib/aa-device-forget.ts`): every key above. */
export const AP_ERASE_KEYS: readonly string[] = [...AP_PERSONAL_KEYS, ...AP_DISPLAY_KEYS];
