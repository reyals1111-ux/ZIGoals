/**
 * Session AR (ADR-041): this session's device keys and their rows for the shared registries, as literals in a module with
 * no imports (the lib/ap-device-keys.ts pattern), so the welcome check, Export everything, the data catalog and the account
 * erase can name them without shipping a schema; lib/ar-device-keys.test.ts proves each literal equals its owner's
 * constant and that every registry carries it. Every record is device only, versioned, exported, restored, erased with the
 * account and never synced (TIER 3 stored format: additive keys only; older builds ignore them).
 * - `zigoals:today-orbits:v1` (a display choice; 6b, owner-approved): whether "Your orbits" shows on Today
 *   (lib/today-orbits/record.ts). Off by default; restored with the other "Today and Life" records.
 */
export const TODAY_ORBITS_KEY_LITERAL = 'zigoals:today-orbits:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). None so far. */
export const AR_PERSONAL_KEYS: readonly string[] = [];
/** Display/setting records (onboarding `NON_PERSONAL_KEYS`): a device holding only these is still new. */
export const AR_DISPLAY_KEYS: readonly string[] = [TODAY_ORBITS_KEY_LITERAL];
/** Export everything (`DEVICE_KEYS`): the names in everything.json. */
export const AR_EXPORT_KEYS = {todayOrbits: TODAY_ORBITS_KEY_LITERAL} as const;
/** The data catalog (`DEVICE_LABELS`): [label, area], home "device". */
export const AR_CATALOG_LABELS = {
  todayOrbits: ['Your orbits on Today (whether the card shows; the orbits themselves are worked out from your Health goals each time)', 'Today'],
} as const;
/** The account erase (`lib/aa-device-forget.ts`): every key above. */
export const AR_ERASE_KEYS: readonly string[] = [...AR_PERSONAL_KEYS, ...AR_DISPLAY_KEYS];
