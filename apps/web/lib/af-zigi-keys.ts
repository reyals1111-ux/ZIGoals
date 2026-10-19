/**
 * Session AF lane L4 (ADR-028 H10, H30, H73; `TIER 3 (storage)`): the names of ZIGi's new device record and its rows for
 * the shared registries, in a module with no imports, so the welcome check, Export everything, the data catalog, the
 * erase and the frozen-reader fixture can name it without shipping a schema (the pattern of lib/linked-wallets-key.ts).
 * The format and its reader live in lib/ai/store/plans.ts. This module is append-only for the ZIGi lane; the lead wires
 * the rows below into the shared registries (docs/handoff/af-lanes/L4.md lists each one).
 *
 * `zigoals:zigi-plans:v1` holds the plans ZIGi proposed as one bundle ("set me up for a 10k") and what the person did
 * with each step: titles and step labels only, never an amount, a Health value or an identifier of another record.
 * Personal (it says what the person plans), device only, never synced, in Export everything, erased with the account,
 * never restored. Older builds (#37–#44) never read it (the frozen reader reports ABSENT).
 *
 * Two existing records gain fields (no new key): `zigoals:zigi:v1` gains `brief` (the morning brief and evening recap
 * choices) and `zigoals:ai-memory:v1` gains `consent` (when the person first agreed that ZIGi keeps notes). Both are loose
 * records, so older builds keep the fields on their own writes and ignore them.
 */
export const ZIGI_PLANS_KEY = 'zigoals:zigi-plans:v1';
/** For lib/onboarding.ts DEVICE_RECORD_KEYS (personal: a device holding it is not new). */
export const AF_ZIGI_PERSONAL_KEYS: readonly string[] = Object.freeze([ZIGI_PLANS_KEY]);
/** For lib/onboarding.ts NON_PERSONAL_KEYS: none (the brief choices live in the existing `zigoals:zigi:v1`). */
export const AF_ZIGI_DISPLAY_KEYS: readonly string[] = Object.freeze([]);
/** For lib/export/everything.ts DEVICE_KEYS. */
export const AF_ZIGI_EXPORT_KEYS = Object.freeze({zigiPlans: ZIGI_PLANS_KEY} as const);
/** For lib/data-health/catalog.ts DEVICE_LABELS, keyed like AF_ZIGI_EXPORT_KEYS: [what it holds, area]. */
export const AF_ZIGI_CATALOG_LABELS = Object.freeze({zigiPlans: ['ZIGi\'s plans', 'ZIGi']} as const);
/** For lib/aa-device-forget.ts: the plans leave with the account's erase. */
export const AF_ZIGI_ERASE_KEYS: readonly string[] = Object.freeze([ZIGI_PLANS_KEY]);
/** What the restore never brings back, in the restore plan's words (lib/restore/plan.ts NEVER_RESTORED). */
export const AF_ZIGI_NEVER_RESTORED = 'ZIGi\'s plans';
