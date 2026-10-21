/**
 * Session AF (L3, ADR-028 H10, H73): the Checklist's device keys and its rows for the shared registries, in a module with
 * no imports so the welcome check, Export everything, the data catalog and the account erase can name them without
 * shipping a schema (the pattern of lib/linked-wallets-key.ts). The lead lane wires these rows into the registries.
 *
 * Both records are personal (they say what the person does every day, and the day history names Health entries): device
 * only, versioned and loose, exported, erased with the account, never synced or restored in Session AF. They are shaped as
 * an extras-sync section (`checklist`, H10) so a later session can carry them without a format change; `healthItems` and
 * the day's tick receipts are the parts that must stay inside the Health consent (device fields) when that happens.
 */
export const CHECKLIST_KEY = 'zigoals:checklist:v1';
export const CHECKLIST_DAYS_KEY = 'zigoals:checklist-days:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`); erased with the account. */
export const AF_CHECKLIST_PERSONAL_KEYS: readonly string[] = [CHECKLIST_KEY, CHECKLIST_DAYS_KEY];
/** Export everything (`DEVICE_KEYS`): the two names in everything.json. */
export const AF_CHECKLIST_EXPORT_KEYS = {checklist: CHECKLIST_KEY, checklistDays: CHECKLIST_DAYS_KEY} as const;
/** The data catalog (`DEVICE_LABELS`): [label, area], home "device". */
export const AF_CHECKLIST_CATALOG_LABELS = {checklist: ['Checklist favourites and custom items', 'Checklist'], checklistDays: ['Checklist day history', 'Checklist']} as const;
/** What the restore never brings back, in the restore plan's words. */
export const AF_CHECKLIST_NEVER_RESTORED = 'Checklist favourites and day history';
/** The page, its layout item on Today and the extras-sync section name reserved for later (H10, H29). */
export const CHECKLIST_ROUTE = '/app/checklist';
export const TODAY_CHECKLIST_LAYOUT_ID = 'today:checklist';
export const CHECKLIST_SYNC_SECTION = 'checklist';
