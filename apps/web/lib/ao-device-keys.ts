/**
 * Session AO (ADR-039): this session's device keys and their rows for the shared registries, as literals in a module with
 * no imports (the lib/al-device-keys.ts pattern), so the welcome check, Export everything, the data catalog and the account
 * erase can name them without shipping a schema; lib/ao-device-keys.test.ts proves each literal equals its owner's
 * constant and that every registry carries it. Every record is device only, versioned, exported, erased with the account
 * and never synced (TIER 3 stored format: additive keys only; older builds ignore them).
 * - `zigoals:day-ends:v1` (a setting; C-DVG-22): "My day ends at" and its latest change (lib/day-boundary.ts). Restored
 *   with the other "Today and Life" records.
 */
export const DAY_ENDS_KEY_LITERAL = 'zigoals:day-ends:v1';
/** Backlog #11 (personal; ADR-039 owner rule 2): one net-worth snapshot per day opened, by source and currency (lib/networth-history.ts).
 * Restored with the other "Goals and Wealth" records and in the protected copy; never synced (an extras section would need a Worker change). */
export const NETWORTH_HISTORY_KEY_LITERAL = 'zigoals:networth-history:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). */
export const AO_PERSONAL_KEYS: readonly string[] = [NETWORTH_HISTORY_KEY_LITERAL];
/** Display/setting records (onboarding `NON_PERSONAL_KEYS`): a device holding only these is still new. */
export const AO_DISPLAY_KEYS: readonly string[] = [DAY_ENDS_KEY_LITERAL];
/** Export everything (`DEVICE_KEYS`): the names in everything.json. */
export const AO_EXPORT_KEYS = {dayEnds: DAY_ENDS_KEY_LITERAL, networthHistory: NETWORTH_HISTORY_KEY_LITERAL} as const;
/** The data catalog (`DEVICE_LABELS`): [label, area], home "device". */
export const AO_CATALOG_LABELS = {
  dayEnds: ['My day ends at (when habits, the Checklist and streaks start a new day)', 'Settings'],
  networthHistory: ['Net worth by source: one snapshot per day you opened Wealth', 'Wealth'],
} as const;
/** The account erase (`lib/aa-device-forget.ts`): every key above. */
export const AO_ERASE_KEYS: readonly string[] = [...AO_PERSONAL_KEYS, ...AO_DISPLAY_KEYS];
