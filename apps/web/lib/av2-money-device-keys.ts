/**
 * Session AV lane 2 (money; Kubera's net-worth sheet; TIER 3 stored format): the money pillar's new device record and
 * database, as literals in a module with no imports (the lib/au-device-keys.ts pattern), for the lead to wire into the
 * shared registries (onboarding DEVICE_RECORD_KEYS, Export everything DEVICE_KEYS, the data catalog, the restore plan,
 * the account erase, and KNOWN_DATABASES for the documents). Both device only, versioned, never synced.
 * - `zigoals:wealth-sheet:v1` (lib/wealth-sheet/schema.ts): per account id — the mortgage → property link, the person's
 *   share, their own group, how often they update it, its money in and out; the exchange rates they type for one total.
 * - IndexedDB `zigoals-wealth-docs-v1` (lib/wealth-sheet/docs.ts): a photo or PDF kept with an account, on this device.
 */
export const WEALTH_SHEET_KEY_LITERAL = 'zigoals:wealth-sheet:v1';
export const WEALTH_DOCS_DB_LITERAL = 'zigoals-wealth-docs-v1';
/** Personal device records: a device holding one is not new. */
export const AV2_MONEY_PERSONAL_KEYS: readonly string[] = [WEALTH_SHEET_KEY_LITERAL];
/** Export everything (`DEVICE_KEYS`): the name in everything.json. */
export const AV2_MONEY_EXPORT_KEYS = {wealthSheet: WEALTH_SHEET_KEY_LITERAL} as const;
/** The data catalog (`DEVICE_LABELS`): [label, area], home "device". */
export const AV2_MONEY_CATALOG_LABELS = {
  wealthSheet: ['Your net-worth sheet: groups, shares, mortgage links, update reminders, money in and out, your own exchange rates', 'Goals and Wealth'],
} as const;
/** The account erase: every key above. */
export const AV2_MONEY_ERASE_KEYS: readonly string[] = [...AV2_MONEY_PERSONAL_KEYS];
/** The databases Erase everything deletes and Export everything reads. */
export const AV2_MONEY_DATABASES: readonly string[] = [WEALTH_DOCS_DB_LITERAL];
