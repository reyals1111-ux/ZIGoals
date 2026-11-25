/**
 * Session AW, round 7 group X7 (money; Cashew, Money Manager; TIER 3 stored formats: additive only): this group's one new
 * device key and its rows for the shared registries, as literals in a module with no imports (the lib/av-device-keys.ts
 * pattern). The integrator spreads these into the registries; lib/aw-x7-money-keys.test.ts proves each literal equals its
 * owner's constant.
 * - `zigoals:money-removed:v1` (lib/money-log/removed.ts, LEDGER #461): "Removed recently" — an entry removed in
 *   Wealth → Spending, kept on this device for 30 days with what it was linked to (its transfer twin and the refunds
 *   that named it), so "Put back" restores it in its own space (personal or business); "Empty now" clears it. Loose and
 *   versioned. Device only and never synced. Deliberately NOT in Export everything and never restored from a backup:
 *   the person removed these entries, and an export or a restore must not bring back what they took out (ledger #461:
 *   "left out of every figure, the search and Export everything, and erased with the money"). Erased by Erase
 *   everything (prefix), by the account erase and with the money (Wealth) area's erase. In the data catalogue, so the
 *   person can see it is kept.
 * Round 7's other stored change is an optional field on a record that is registered already: a bill's `ends`
 * (`zigoals:bills:v1`, LEDGER #462). #463 (copy an entry) and #464 (a card's next payment) store nothing new.
 */
export const MONEY_REMOVED_KEY_LITERAL = 'zigoals:money-removed:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). */
export const AW_X7_PERSONAL_KEYS: readonly string[] = [MONEY_REMOVED_KEY_LITERAL];
/** Display records (onboarding `NON_PERSONAL_KEYS`): none. */
export const AW_X7_DISPLAY_KEYS: readonly string[] = [];
/** Export everything (`DEVICE_KEYS`): none, on purpose (see above). */
export const AW_X7_EXPORT_KEYS = {} as const;
/** lib/erase-coverage.test.ts `NOT_RECORDS`: why it is not in Export everything. */
export const AW_X7_NOT_RECORDS: Readonly<Record<string, string>> = {[MONEY_REMOVED_KEY_LITERAL]: 'Removed recently: money entries the person removed, kept 30 days on this device so they can be put back; never exported or restored, so an export or a backup never brings back what they removed (Wealth → Spending → Removed recently; erased with the money)'};
/** The data catalogue (`DEVICE_LABELS`): [label, area], home "device". */
export const AW_X7_CATALOG_LABELS = {
  moneyRemoved: ['Removed recently: money entries you removed, kept 30 days so you can put them back (not in Export everything)', 'Goals and Wealth'],
} as const;
/** The restore plan (`NEVER_RESTORED`): never restored from a backup. */
export const AW_X7_NEVER_RESTORED: readonly string[] = [MONEY_REMOVED_KEY_LITERAL];
/** The account erase (`lib/aa-device-forget.ts`) and the money area's erase (`lib/erase-areas.ts`, Wealth): every key above. */
export const AW_X7_ERASE_KEYS: readonly string[] = [...AW_X7_PERSONAL_KEYS];
