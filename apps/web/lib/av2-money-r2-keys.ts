/**
 * Session AV lane 2, round 2 (money; Wallet, Spendee, Emma; TIER 3 stored formats): the money pillar's new device records
 * of round 2, as literals in a module with no imports (the lib/au-device-keys.ts pattern), for the lead to wire into the
 * shared registries (onboarding DEVICE_RECORD_KEYS, Export everything DEVICE_KEYS, the data catalog, the restore plan and
 * the account erase). Every record is device only, versioned, loose and never synced.
 * - `zigoals:money-more:v1` (lib/money-more/schema.ts): saved entries, your own budgets (on a tag or chosen categories,
 *   each month or once between two days), what others owe you from shared costs, money lent and borrowed, and the money
 *   space chosen (personal or business).
 * - `zigoals:store-cards:v1` (lib/store-cards/schema.ts): store and club cards (a name and a number) shown as a barcode.
 * - `zigoals:money-log-business:v1` and `zigoals:budgets-business:v1`: the business space's own money log and budgets, in
 *   the same formats as `zigoals:money-log:v1` and `zigoals:budgets:v1`, so the personal records are never touched.
 */
export const MONEY_MORE_KEY_LITERAL = 'zigoals:money-more:v1';
export const STORE_CARDS_KEY_LITERAL = 'zigoals:store-cards:v1';
export const MONEY_LOG_BUSINESS_KEY_LITERAL = 'zigoals:money-log-business:v1';
export const BUDGETS_BUSINESS_KEY_LITERAL = 'zigoals:budgets-business:v1';
/** Personal device records: a device holding one is not new. */
export const AV2_MONEY_R2_PERSONAL_KEYS: readonly string[] = [MONEY_MORE_KEY_LITERAL, STORE_CARDS_KEY_LITERAL, MONEY_LOG_BUSINESS_KEY_LITERAL, BUDGETS_BUSINESS_KEY_LITERAL];
/** Export everything (`DEVICE_KEYS`): the names in everything.json. */
export const AV2_MONEY_R2_EXPORT_KEYS = {moneyMore: MONEY_MORE_KEY_LITERAL, storeCards: STORE_CARDS_KEY_LITERAL, moneyLogBusiness: MONEY_LOG_BUSINESS_KEY_LITERAL, budgetsBusiness: BUDGETS_BUSINESS_KEY_LITERAL} as const;
/** The data catalog (`DEVICE_LABELS`): [label, area], home "device". */
export const AV2_MONEY_R2_CATALOG_LABELS = {
  moneyMore: ['Money extras: saved entries, your own budgets, shared costs, money lent and borrowed, the space shown', 'Goals and Wealth'],
  storeCards: ['Store and club cards: names and card numbers', 'Goals and Wealth'],
  moneyLogBusiness: ['Your business space: its money log', 'Goals and Wealth'],
  budgetsBusiness: ['Your business space: its budgets', 'Goals and Wealth'],
} as const;
/** The account erase: every key above. */
export const AV2_MONEY_R2_ERASE_KEYS: readonly string[] = [...AV2_MONEY_R2_PERSONAL_KEYS];
