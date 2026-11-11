/**
 * Session AM (ADR-038 D16, D17): this session's device keys and their rows for the shared registries, as literals in a
 * module with no imports (the lib/al-device-keys.ts pattern), so the welcome check, Export everything, the data catalog
 * and the account erase can name them without shipping a schema; lib/am-device-keys.test.ts proves each literal equals
 * its owner's constant and that every registry carries it. Every record is versioned and loose, exported, restored and
 * erased with the account (TIER 3 stored format: additive keys only). The stage record travels in the encrypted `nova`
 * extras section (D18, lib/vault/extras-sections.ts); the outside-data record stays on this device.
 * - `zigoals:nova-stage:v1` (personal; D16): what the person asked NOVA for — their requests in their own words, the
 *   widgets NOVA made, the widgets' small parameters and the dock (lib/nova/stage/record.ts NOVA_STAGE).
 */
export const NOVA_STAGE_KEY_LITERAL = 'zigoals:nova-stage:v1';
/** D17 (personal: it holds a place): the weather switch, the place the person chose and the last reading (lib/nova/world/record.ts NOVA_WORLD). Never synced. */
export const NOVA_WORLD_KEY_LITERAL = 'zigoals:nova-world:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). */
export const AM_PERSONAL_KEYS: readonly string[] = [NOVA_STAGE_KEY_LITERAL, NOVA_WORLD_KEY_LITERAL];
/** Display records (onboarding `NON_PERSONAL_KEYS`): none this session. */
export const AM_DISPLAY_KEYS: readonly string[] = [];
/** Export everything (`DEVICE_KEYS`): the names in everything.json. */
export const AM_EXPORT_KEYS = {novaStage: NOVA_STAGE_KEY_LITERAL, novaWorld: NOVA_WORLD_KEY_LITERAL} as const;
/** The data catalog (`DEVICE_LABELS`): [label, area], home "device". */
export const AM_CATALOG_LABELS = {
  novaStage: ['NOVA: your requests, the widgets it made and the dock', 'NOVA'],
  novaWorld: ['NOVA: weather on or off, your place and the last reading', 'NOVA'],
} as const;
/** The account erase (`lib/aa-device-forget.ts`): every key above. */
export const AM_ERASE_KEYS: readonly string[] = [...AM_PERSONAL_KEYS, ...AM_DISPLAY_KEYS];
