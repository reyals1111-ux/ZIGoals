/**
 * Session AF (L2b, ADR-028 H10, H16 §11.4, H73; `TIER 3 (storage)`): the wallet lane's device records, named in a module
 * with no imports (the pattern of lib/linked-wallets-key.ts and lib/af-earn-keys.ts) so the welcome check, Export
 * everything, the data catalog and the erase can name them without shipping a schema. Formats and readers:
 * lib/wallets/balances/store.ts (balances) and lib/goal-vaults/store.ts (Goal Vaults). Both are personal, device-only:
 * never synced, never restored from a backup, in Export everything, removed by the account's erase. Older builds
 * (#37–#44) never read them. `zigoals:linked-wallets:v1` keeps its own key module (AE) and gains only additive fields.
 *
 * This module is append-only for the wallet lane; the lead wires the rows below into the shared registries
 * (docs/handoff/af-lanes/L2b.md lists each one).
 */
/** The last balances read for each linked wallet × chain (amounts, when, the reason a read failed). Personal. */
export const WALLET_BALANCES_KEY = 'zigoals:wallet-balances:v1';
/** For lib/onboarding.ts DEVICE_RECORD_KEYS (personal device records). */
export const WALLET_PERSONAL_KEYS: readonly string[] = Object.freeze([WALLET_BALANCES_KEY]);
/** For lib/export/everything.ts DEVICE_KEYS. */
export const WALLET_EXPORT_KEYS = Object.freeze({walletBalances: WALLET_BALANCES_KEY} as const);
/** For lib/data-health/catalog.ts DEVICE_LABELS, keyed like WALLET_EXPORT_KEYS: [what it holds, area]. */
export const WALLET_CATALOG_LABELS = Object.freeze({
  walletBalances: ['Balances last read for your linked wallets', 'Wallets'],
} as const);
/** For lib/restore/plan.ts NEVER_RESTORED (words shown to the person). */
export const WALLET_NEVER_RESTORED: readonly string[] = Object.freeze(['linked wallet balances']);
/** For lib/aa-device-forget.ts: every wallet-lane key leaves with the account's erase. */
export const WALLET_ERASE_KEYS: readonly string[] = Object.freeze([...WALLET_PERSONAL_KEYS]);
