/**
 * Session AW (X1, Due; LEDGER #438–#440; TIER 3 stored formats: additive only): this group's one new device record, for the
 * shared registries, as literals in a module with no imports (the lib/av2-r5-gym-keys.ts pattern). The integrator wires
 * them; lib/aw-x1-keys.test.ts proves each literal equals its owner's constant.
 * - `zigoals:timers:v1` (lib/timers/store.ts): the named timers — running, paused, ended and kept to start again (up to
 *   20) — and whether the bell rings. Loose and versioned; device only, never synced; exported, restored with "Today and
 *   Life", erased with Erase everything and with the account. A personal record (its names are the person's).
 * No other new key: #438's `again` is an optional field of the tasks record's reminders (`zigoals:tasks:v1`), and #438's
 * `taskAgain` and #439's `snoozes` are optional fields of the notification preferences (`zigoals:notify:v1`), both
 * registered already.
 */
export const TIMERS_KEY_LITERAL = 'zigoals:timers:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). */
export const AW_X1_PERSONAL_KEYS: readonly string[] = [TIMERS_KEY_LITERAL];
/** Display/setting records (onboarding `NON_PERSONAL_KEYS`): none. */
export const AW_X1_DISPLAY_KEYS: readonly string[] = [];
/** Export everything (`DEVICE_KEYS`): the name in everything.json. */
export const AW_X1_EXPORT_KEYS = {timers: TIMERS_KEY_LITERAL} as const;
/** The data catalogue (`DEVICE_LABELS`): [label, area], home "device". */
export const AW_X1_CATALOG_LABELS = {timers: ['Timers: your named timers, kept to start again, and the bell (in this browser only)', 'Today']} as const;
/** Restore (`lib/restore/plan.ts` DEVICE_PARTS): [name, label, group]. */
export const AW_X1_RESTORE_PARTS = [['timers', 'Timers: your named timers', 'Today and Life']] as const;
/** The account erase (`lib/aa-device-forget.ts`) and Erase everything: every key above. */
export const AW_X1_ERASE_KEYS: readonly string[] = [...AW_X1_PERSONAL_KEYS, ...AW_X1_DISPLAY_KEYS];
