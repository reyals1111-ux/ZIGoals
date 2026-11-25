/**
 * Session AW (X2, LEDGER #432–#437, #448; Amazing Marvin; TIER 3 stored formats: additive only): this group's stored data,
 * for the shared registries, as literals in a module with no imports (the lib/av2-r5-gym-keys.ts pattern). No new key and
 * no new record: every stored change is an optional field on a record that is registered already (Export everything,
 * restore, erase, the data catalogue), so no registry needs a new line. lib/aw-x2-keys.test.ts proves each literal equals
 * its owner's constant.
 * - `zigoals:tasks:v1` (lib/tasks/schema.ts): a task's optional `dread` (1–3, #432) and `moved` (a count, #433);
 * - `zigoals:task-plan:v1` (lib/tasks/plan-record.ts): the optional `timeTargets` list (#437);
 * - `zigoals:focus-sessions:v1` is read only (a target is met from the focus blocks' `taskId`), never written here.
 * Derived and never stored: Moved most, Open a long time (#434), Pick one for me (#435), today's progress (#436) and the
 * stuck guide (#448, written content in lib/tasks/stuck-guide.ts). Hardest first and the pick's choices last one visit.
 */
export const AW_X2_TASKS_KEY_LITERAL = 'zigoals:tasks:v1';
export const AW_X2_TASK_PLAN_KEY_LITERAL = 'zigoals:task-plan:v1';
export const AW_X2_FOCUS_SESSIONS_KEY_LITERAL = 'zigoals:focus-sessions:v1';
/** The records this group adds optional fields to (each registered already), and the one it only reads. */
export const AW_X2_RECORDS_WITH_NEW_FIELDS: readonly string[] = [AW_X2_TASKS_KEY_LITERAL, AW_X2_TASK_PLAN_KEY_LITERAL];
export const AW_X2_RECORDS_READ: readonly string[] = [AW_X2_FOCUS_SESSIONS_KEY_LITERAL];
/** The new optional fields, by record (for the frozen-reader fixture: one sample of each). */
export const AW_X2_NEW_FIELDS = {[AW_X2_TASKS_KEY_LITERAL]: ['dread', 'moved'], [AW_X2_TASK_PLAN_KEY_LITERAL]: ['timeTargets']} as const;
/** New device keys for Export, Erase, Restore, the catalogue and onboarding: none. */
export const AW_X2_PERSONAL_KEYS: readonly string[] = [];
export const AW_X2_DISPLAY_KEYS: readonly string[] = [];
