/**
 * Session AV lane 2, round 6 (r6-body; TIER 3 stored formats: additive keys only): this round's new device keys and their
 * rows for the shared registries, as literals in a module with no imports (the lib/av-device-keys.ts pattern), so the
 * welcome check, Export everything, the data catalog, the restore plan and the account erase can name them without
 * shipping a schema. The lead spreads these into the registries as lib/av2-r4-health-keys.ts is spread;
 * lib/av2-r6-body-keys.test.ts proves each literal equals its owner's constant. Both records are device only, versioned,
 * exported, restored, erased with the account, never synced, and never sent to ZIGi's AI.
 * - `zigoals:low-day:v1` (lib/calm/low-day.ts): "On a low day", the person's own page of small things that help.
 * - `zigoals:bring-up:v1` (lib/clinician-report/bring-up.ts): "To bring up", the lines for the next visit.
 */
export const LOW_DAY_KEY_LITERAL = 'zigoals:low-day:v1';
export const BRING_UP_KEY_LITERAL = 'zigoals:bring-up:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). */
export const AV2_R6_BODY_PERSONAL_KEYS: readonly string[] = [LOW_DAY_KEY_LITERAL, BRING_UP_KEY_LITERAL];
/** Export everything (`DEVICE_KEYS`): the names in everything.json. */
export const AV2_R6_BODY_EXPORT_KEYS = {lowDay: LOW_DAY_KEY_LITERAL, bringUp: BRING_UP_KEY_LITERAL} as const;
/** The data catalog (`DEVICE_LABELS`): [label, area], home "device". */
export const AV2_R6_BODY_CATALOG_LABELS = {
  lowDay: ['Calm: your “On a low day” page (things that help, people to message, things that can wait)', 'Health'],
  bringUp: ['Report for a visit: the lines you want to bring up at your next appointment', 'Health'],
} as const;
/** Restore (`lib/restore/plan.ts` `dev(...)`): [name, area]. */
export const AV2_R6_BODY_RESTORE = {lowDay: ['On a low day', 'Health'], bringUp: ['To bring up at a visit', 'Health']} as const;
/** The account erase (`lib/aa-device-forget.ts`): every key above. */
export const AV2_R6_BODY_ERASE_KEYS: readonly string[] = [...AV2_R6_BODY_PERSONAL_KEYS];
