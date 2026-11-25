/**
 * Session AW (x3, notes and journal; TIER 3 stored formats: additive keys only): this group's one new device key and its
 * rows for the shared registries, as literals in a module with no imports (the lib/av-device-keys.ts pattern), so the
 * welcome check, Export everything, the data catalog, the restore plan and the account erase can name it without
 * shipping a schema. The lead spreads these into the registries; lib/aw-x3-notes-journal-keys.test.ts proves each literal
 * equals its owner's constant. Device only, versioned, exported, restored, erased with the account, never synced (as the
 * notes themselves).
 * - `zigoals:note-searches:v1` (lib/notes/saved-searches.ts, LEDGER #441): Notes searches kept by name, at most 12.
 * The group's other stored changes are optional fields on records already registered: `zigoals:journal:v1` (`dayPages`,
 * `morningReminder`, and an entry's `parts` and `dayPhoto`) and `zigoals:journal-display:v1` (`voiceSpeed`).
 */
export const NOTE_SEARCHES_KEY_LITERAL = 'zigoals:note-searches:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). */
export const AW_X3_PERSONAL_KEYS: readonly string[] = [NOTE_SEARCHES_KEY_LITERAL];
/** Display/setting records (onboarding `NON_PERSONAL_KEYS`): none. */
export const AW_X3_DISPLAY_KEYS: readonly string[] = [];
/** Export everything (`DEVICE_KEYS`): the name in everything.json. */
export const AW_X3_EXPORT_KEYS = {noteSearches: NOTE_SEARCHES_KEY_LITERAL} as const;
/** The data catalog (`DEVICE_LABELS`): [label, area], home "device". */
export const AW_X3_CATALOG_LABELS = {noteSearches: ['Notes: your searches kept by name', 'Today'] as const} as const;
/** Restore (`lib/restore/plan.ts` `dev(...)`): [name, group]. */
export const AW_X3_RESTORE = {noteSearches: ['Saved searches of notes', 'Today and Life'] as const} as const;
/** The account erase (`lib/aa-device-forget.ts`): every key above. */
export const AW_X3_ERASE_KEYS: readonly string[] = [...AW_X3_PERSONAL_KEYS, ...AW_X3_DISPLAY_KEYS];
/**
 * Sync (`lib/vault/extras-sections.ts` `JOURNAL_DEVICE_FIELDS`): the journal fields that stay on each device when the
 * journal section syncs — the morning page's reminder rings where it was set, as `reminder` does.
 */
export const AW_X3_JOURNAL_DEVICE_FIELDS: readonly string[] = ['morningReminder'];
