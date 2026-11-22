/**
 * Session AV lane 2 (food; TIER 3 stored format: additive keys only): the food lane's device keys and their rows for the
 * shared registries, as literals in a module with no imports (the lib/av-device-keys.ts pattern), so the welcome check,
 * Export everything, the data catalog and the account erase can name them without shipping a schema. The lead spreads
 * these into the registries (lib/av-device-keys.ts lists, lib/export/everything.ts DEVICE_KEYS, lib/data-health/catalog.ts,
 * lib/restore/plan.ts with "Health", lib/aa-device-forget.ts); lib/av2-food-keys.test.ts proves each literal equals its
 * owner's constant. Every record is device only, versioned, exported, restored, erased with the account, never synced.
 * - `zigoals:food-plus:v1` (lib/food-plus/schema.ts): eaten-at times, extra meals, calories and macros per weekday, sugar alcohols per
 *   food, the check-in day and partly logged days, the logging challenge, meal notifications, which foods have a photo.
 */
export const FOOD_PLUS_KEY_LITERAL = 'zigoals:food-plus:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). */
export const AV2_FOOD_PERSONAL_KEYS: readonly string[] = [FOOD_PLUS_KEY_LITERAL];
/** Export everything (`DEVICE_KEYS`): the names in everything.json. */
export const AV2_FOOD_EXPORT_KEYS = {foodPlus: FOOD_PLUS_KEY_LITERAL} as const;
/** The data catalog (`DEVICE_LABELS`): [label, area], home "device". */
export const AV2_FOOD_CATALOG_LABELS = {
  foodPlus: ['Food diary extras: when each entry was eaten, macros per weekday, check-in day, logging challenge, extra meals and their entries, food photos (which foods)', 'Health'],
} as const;
/** Restore (`lib/restore/plan.ts` `dev(...)`): [name, label, area]. */
export const AV2_FOOD_RESTORE = {foodPlus: ['Food diary extras (times, weekday macros, check-in)', 'Health']} as const;
/**
 * LEDGER #103: the package photos' IndexedDB database (lib/food-plus/photos.ts FOOD_PHOTO_DB): erased with Erase
 * everything, its photos in Export everything as `food-photos/…` files (exportFoodPhotoEntries), the Showcase's scope
 * cleared with the other photo stores (lib/showcase-storage.ts clearShowcasePhotos).
 */
export const FOOD_PHOTO_DB_LITERAL = 'zigoals-food-photos-v1';
export const AV2_FOOD_DATABASES: readonly string[] = [FOOD_PHOTO_DB_LITERAL];
/** The account erase (`lib/aa-device-forget.ts`): every key above. */
export const AV2_FOOD_ERASE_KEYS: readonly string[] = [...AV2_FOOD_PERSONAL_KEYS];
