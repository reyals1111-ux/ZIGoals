/**
 * Session AV lane 2, round 5 (notes; TIER 3 stored formats: additive keys only): this round's new device key and its rows
 * for the shared registries, as literals in a module with no imports (the lib/av-device-keys.ts pattern), so the welcome
 * check, Export everything, the data catalog, the restore plan and the account erase can name it without shipping a
 * schema. The lead spreads these into the registries; lib/av2-r5-notes-keys.test.ts proves the literal equals its
 * owner's constant. Device only, versioned, exported, restored, erased with the account, never synced.
 * - `zigoals:note-cards:v1` (lib/notes/cards.ts): the review days of the cards written in your notes (LEDGER #365).
 */
export const NOTE_CARDS_KEY_LITERAL = 'zigoals:note-cards:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). */
export const AV2_R5_NOTES_PERSONAL_KEYS: readonly string[] = [NOTE_CARDS_KEY_LITERAL];
/** Export everything (`DEVICE_KEYS`): the name in everything.json. */
export const AV2_R5_NOTES_EXPORT_KEYS = {noteCards: NOTE_CARDS_KEY_LITERAL} as const;
/** The data catalog (`DEVICE_LABELS`): [label, area], home "device". */
export const AV2_R5_NOTES_CATALOG_LABELS = {noteCards: ['Notes: when each card from your notes is next shown', 'Today'] as const} as const;
/** Restore (`lib/restore/plan.ts` `dev(...)`): [name, area]. */
export const AV2_R5_NOTES_RESTORE = {noteCards: ['Review days of note cards', 'Today and Life'] as const} as const;
/** The account erase (`lib/aa-device-forget.ts`): every key above. */
export const AV2_R5_NOTES_ERASE_KEYS: readonly string[] = [...AV2_R5_NOTES_PERSONAL_KEYS];
