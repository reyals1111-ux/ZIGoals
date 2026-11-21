/**
 * Session AU (ADR-044): this session's device keys and their rows for the shared registries, as literals in a module with
 * no imports (the lib/ap-device-keys.ts pattern), so the welcome check, Export everything, the data catalog and the account
 * erase can name them without shipping a schema; lib/au-device-keys.test.ts proves each literal equals its owner's
 * constant and that every registry carries it. Every record is device only, versioned, exported, restored, erased with the
 * account and never synced (TIER 3 stored format: additive keys only; older builds ignore them).
 * - `zigoals:meal-words:v1` (F-MEAL, a health-type record like `zigoals:mood-tags:v1`): meals logged in words alone, their
 *   calories unknown (lib/meal-words/schema.ts). Restored only with the Health choice; ZIGi and NOVA do not read it.
 */
export const MEAL_WORDS_KEY_LITERAL = 'zigoals:meal-words:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). */
export const AU_PERSONAL_KEYS: readonly string[] = [MEAL_WORDS_KEY_LITERAL];
/** Display/setting records (onboarding `NON_PERSONAL_KEYS`): none so far. */
export const AU_DISPLAY_KEYS: readonly string[] = [];
/** Export everything (`DEVICE_KEYS`): the names in everything.json. */
export const AU_EXPORT_KEYS = {mealWords: MEAL_WORDS_KEY_LITERAL} as const;
/** The data catalog (`DEVICE_LABELS`): [label, area], home "device". */
export const AU_CATALOG_LABELS = {
  mealWords: ['Meals in your own words (what you ate, the day and meal; calories unknown)', 'Health'],
} as const;
/** The account erase (`lib/aa-device-forget.ts`): every key above. */
export const AU_ERASE_KEYS: readonly string[] = [...AU_PERSONAL_KEYS, ...AU_DISPLAY_KEYS];
