/**
 * Session AW (X4, Strides; LEDGER #447; TIER 3 stored formats: additive only): this group's one new device record, for
 * the shared registries, as literals in a module with no imports (the lib/av-device-keys.ts pattern), so the welcome
 * check, Export everything, Restore, the data catalogue and the account erase can name it without shipping a schema.
 * lib/aw-x4-strides-keys.test.ts proves each literal equals its owner's constant. #446 (the year report) stores nothing.
 * - `zigoals:goal-repeat:v1` (lib/goals/repeat.ts): which goals start again each week, month or year, keyed by the goal's
 *   id, with a project's earlier results. Its own loose, versioned record — never a field of the strict goal record in
 *   `zigoals:platform:v1` — so older builds ignore it. Restored with "Goals and Wealth"; a sync home is the lead's choice
 *   (it only makes sense beside the finance record, under the account's consent).
 */
export const GOAL_REPEAT_KEY_LITERAL = 'zigoals:goal-repeat:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). */
export const AW_X4_PERSONAL_KEYS: readonly string[] = [GOAL_REPEAT_KEY_LITERAL];
/** Display/setting records (onboarding `NON_PERSONAL_KEYS`): none. */
export const AW_X4_DISPLAY_KEYS: readonly string[] = [];
/** Export everything (`DEVICE_KEYS`): the names in everything.json. */
export const AW_X4_EXPORT_KEYS = {goalRepeat: GOAL_REPEAT_KEY_LITERAL} as const;
/** The data catalogue (`DEVICE_LABELS`): [label, area], home "device". */
export const AW_X4_CATALOG_LABELS = {
  goalRepeat: ['Goals: which goals start again each week, month or year, and a project’s earlier results', 'Goals'],
} as const;
/** Restore (`lib/restore/plan.ts` `DEVICE_PARTS`): [part name, label, group]. */
export const AW_X4_RESTORE_PARTS = [['goalRepeat', 'Goals that start again', 'Goals and Wealth']] as const;
/** The account erase (`lib/aa-device-forget.ts`) and Erase everything: every key above. */
export const AW_X4_ERASE_KEYS: readonly string[] = [...AW_X4_PERSONAL_KEYS, ...AW_X4_DISPLAY_KEYS];
