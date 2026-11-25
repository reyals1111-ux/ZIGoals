/**
 * Session AW (X5, Paprika; LEDGER #449–#455; TIER 3 stored formats: additive only): this group adds NO new device record.
 * Its stored changes are optional parts of two records that are registered already (export, restore, erase, the data
 * catalogue; device only, never synced), as literals in a module with no imports (the lib/av2-r5-gym-keys.ts pattern);
 * lib/aw-x5-keys.test.ts proves each literal equals its owner's constant.
 * - `zigoals:food-plus:v1` (lib/food-plus/schema.ts): `made` (days a recipe was made, by recipe id), `stars` (1–5 by
 *   recipe id) and `menus` (up to 12 weeks of meals kept by name).
 * - `zigoals:grocery:v1` (lib/grocery/schema.ts): `useBy` (a use-by day per pantry item, by its folded name).
 * #449's timers live in #440's own record (`zigoals:timers:v1`, group X1); until that is merged a cooking timer is an
 * in-page countdown held in memory only. #450, #451 and #453 store nothing new (#453 writes ordinary recipes, foods and
 * steps).
 */
export const FOOD_PLUS_KEY_LITERAL = 'zigoals:food-plus:v1';
export const GROCERY_KEY_LITERAL = 'zigoals:grocery:v1';
/** The records this group extends (each already in every registry): nothing new to wire. */
export const AW_X5_EXTENDED_KEYS: readonly string[] = [FOOD_PLUS_KEY_LITERAL, GROCERY_KEY_LITERAL];
/** New personal or display device records: none. */
export const AW_X5_PERSONAL_KEYS: readonly string[] = [];
export const AW_X5_DISPLAY_KEYS: readonly string[] = [];
export const AW_X5_ERASE_KEYS: readonly string[] = [];
/** The new optional parts, by record (for the frozen-fixture sample and the data catalogue's wording). */
export const AW_X5_NEW_PARTS = {[FOOD_PLUS_KEY_LITERAL]: ['made', 'stars', 'menus'], [GROCERY_KEY_LITERAL]: ['useBy']} as const;
