/**
 * Session AW (fr-journal, FR-AW-1; TIER 3 stored formats: additive only): this group's one new device key and its rows for
 * the shared registries, as literals in a module with no imports (the lib/av-device-keys.ts pattern). The integrator
 * spreads these into the registries; lib/aw-fr-journal-keys.test.ts proves each literal equals its owner's constant.
 * - `zigoals:journal-draft:v1` (lib/journal/draft.ts): the Journal page's unsaved entry (its words, its tags as typed and
 *   the template it started from), kept on this device while it is typed and brought back when the Journal opens again;
 *   Save entry, "Discard draft" and emptying the box remove it. Loose and versioned. Device only, never synced, never read
 *   by ZIGi or NOVA, never sent. Deliberately NOT in Export everything and never restored from a backup: it is unfinished
 *   writing, and a restore must not put words back in the box that were saved or thrown away since (the saved entry is
 *   what Export everything carries). Erased by Erase everything (prefix) and by the account erase. In the data catalogue,
 *   so the person can see it is kept.
 */
export const JOURNAL_DRAFT_KEY_LITERAL = 'zigoals:journal-draft:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). */
export const AW_FR_JOURNAL_PERSONAL_KEYS: readonly string[] = [JOURNAL_DRAFT_KEY_LITERAL];
/** Display records (onboarding `NON_PERSONAL_KEYS`): none. */
export const AW_FR_JOURNAL_DISPLAY_KEYS: readonly string[] = [];
/** Export everything (`DEVICE_KEYS`): none, on purpose (see above). */
export const AW_FR_JOURNAL_EXPORT_KEYS = {} as const;
/** lib/erase-coverage.test.ts `NOT_RECORDS`: why it is not in Export everything. */
export const AW_FR_JOURNAL_NOT_RECORDS: Readonly<Record<string, string>> = {[JOURNAL_DRAFT_KEY_LITERAL]: 'the Journal\'s unsaved entry, kept on this device while it is typed so leaving the page never loses it (Journal → Write); unfinished writing, so never exported or restored (the saved entry is exported); removed on Save entry or Discard draft, erased with the journal'};
/** The data catalogue (`DEVICE_LABELS`; `KEPT_NOT_EXPORTED`): [label, area], home "device". */
export const AW_FR_JOURNAL_CATALOG_LABELS = {
  journalDraft: ['Journal: your unsaved entry, until you save or discard it (not in Export everything)', 'Today'],
} as const;
/** The restore plan (`NEVER_RESTORED`): never restored from a backup; the words for its sentence. */
export const AW_FR_JOURNAL_NEVER_RESTORED: readonly string[] = [JOURNAL_DRAFT_KEY_LITERAL];
export const AW_FR_JOURNAL_NEVER_RESTORED_WORDS = 'the Journal’s unsaved draft';
/** The account erase (`lib/aa-device-forget.ts`, through AW_PERSONAL_KEYS): every key above. */
export const AW_FR_JOURNAL_ERASE_KEYS: readonly string[] = [...AW_FR_JOURNAL_PERSONAL_KEYS];
