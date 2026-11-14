/**
 * Session AP (ADR-040): this session's device keys and their rows for the shared registries, as literals in a module with
 * no imports (the lib/ao-device-keys.ts pattern), so the welcome check, Export everything, the data catalog and the account
 * erase can name them without shipping a schema; lib/ap-device-keys.test.ts proves each literal equals its owner's
 * constant and that every registry carries it. Every record is device only, versioned, exported, erased with the account
 * and never synced (TIER 3 stored format: additive keys only; older builds ignore them).
 * - `zigoals:day-goal:v1` (a setting; owner decision 14 Nov, backlog #3): "A day counts as done at N", as dated changes
 *   (lib/checklist/day-goal.ts). Restored with the other "Today and Life" records.
 * Part 6 (owner-approved competitor features), each its own record keyed by existing record ids, never a field of a strict
 * record: `zigoals:task-when:v1` (This evening / Someday), `zigoals:countdowns:v1`, `zigoals:money-tags:v1`, and the three
 * health-type records `zigoals:mood-tags:v1`, `zigoals:symptoms:v1`, `zigoals:workout-splits:v1`, which restore only with
 * the Health choice and which ZIGi and NOVA cannot read (owner addition 1: the NOVA lane wires them behind the Health switches).
 */
export const DAY_GOAL_KEY_LITERAL = 'zigoals:day-goal:v1';
export const TASK_WHEN_KEY_LITERAL = 'zigoals:task-when:v1';
export const COUNTDOWNS_KEY_LITERAL = 'zigoals:countdowns:v1';
export const MONEY_TAGS_KEY_LITERAL = 'zigoals:money-tags:v1';
export const MOOD_TAGS_KEY_LITERAL = 'zigoals:mood-tags:v1';
export const SYMPTOMS_KEY_LITERAL = 'zigoals:symptoms:v1';
export const WORKOUT_SPLITS_KEY_LITERAL = 'zigoals:workout-splits:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). */
export const AP_PERSONAL_KEYS: readonly string[] = [COUNTDOWNS_KEY_LITERAL, MONEY_TAGS_KEY_LITERAL, MOOD_TAGS_KEY_LITERAL, SYMPTOMS_KEY_LITERAL, WORKOUT_SPLITS_KEY_LITERAL];
/** Display/setting records (onboarding `NON_PERSONAL_KEYS`): a device holding only these is still new. */
export const AP_DISPLAY_KEYS: readonly string[] = [DAY_GOAL_KEY_LITERAL, TASK_WHEN_KEY_LITERAL];
/** Export everything (`DEVICE_KEYS`): the names in everything.json. */
export const AP_EXPORT_KEYS = {dayGoal: DAY_GOAL_KEY_LITERAL, taskWhen: TASK_WHEN_KEY_LITERAL, countdowns: COUNTDOWNS_KEY_LITERAL, moneyTags: MONEY_TAGS_KEY_LITERAL, moodTags: MOOD_TAGS_KEY_LITERAL, symptoms: SYMPTOMS_KEY_LITERAL, workoutSplits: WORKOUT_SPLITS_KEY_LITERAL} as const;
/** The data catalog (`DEVICE_LABELS`): [label, area], home "device". */
export const AP_CATALOG_LABELS = {
  dayGoal: ['A day counts as done at (the Checklist’s rule for the flame and Journey’s orbit badges, with the day each change began)', 'Settings'],
  taskWhen: ['This evening and Someday (which open tasks are on tonight’s list or set aside)', 'Tasks'],
  countdowns: ['Days until (your countdowns: name, date, note)', 'Today'],
  moneyTags: ['Tags on your money entries (entry → up to five tags, for filters and totals per tag)', 'Wealth'],
  moodTags: ['Mood tags (what a day’s mood check-in went with)', 'Health'],
  symptoms: ['Symptoms and factors (your list and a level per day)', 'Health'],
  workoutSplits: ['Run pace and per-km splits (from GPX/TCX imports)', 'Health'],
} as const;
/** The account erase (`lib/aa-device-forget.ts`): every key above. */
export const AP_ERASE_KEYS: readonly string[] = [...AP_PERSONAL_KEYS, ...AP_DISPLAY_KEYS];
