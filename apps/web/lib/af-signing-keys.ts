/**
 * Session AF lane L2a (ADR-028 H73; `TIER 3 (storage)`): the names of the native-staking device records and tab hand-offs,
 * in a module with no imports, so the welcome check, Export everything, the data catalog, the erase and the frozen-reader
 * fixture can name them without shipping a schema (the pattern of lib/linked-wallets-key.ts). The lead wires them into the
 * shared registries (docs/handoff/af-lanes/L2a.md lists each row); nothing here is synced.
 */
/** Staking choices: the network last chosen (practice or real), when the first real-network confirm was given, the last
 *  validator per chain. Non-personal (no address), device-only, in Export, never synced. */
export const STAKING_PREFS_KEY = 'zigoals:staking-prefs:v1';
/** The staking and vote transactions this device signed (address, validator, amount, state, hash). Personal, device-only,
 *  in Export, erased with the account, never synced, never restored. */
export const STAKING_JOURNAL_KEY = 'zigoals:staking-journal:v1';
/** sessionStorage, tab-only, never exported: the connected staking wallet {version, network, address, isLedger}. */
export const WALLET_SESSION_KEY = 'zigoals:wallet-session:v1';
/** sessionStorage, tab-only, never exported: ZIGi's staking pre-fill {version, at, network, action, validator?, amount?},
 *  read once and deleted by the staking form (≤ 10 minutes old). ZIGi's lane writes it. */
export const STAKING_PREFILL_KEY = 'zigoals:ai:staking-prefill:v1';
/** Session AF chunk 3: the validator-health baselines (each delegated validator's commission when this device first saw
 *  it, so a later change is noticed) and the alerts switch. Personal (it shows which validators the person stakes with),
 *  device-only, in Export, erased with the account, never synced, never restored. */
export const VALIDATOR_ALERTS_KEY = 'zigoals:validator-alerts:v1';
/** The registry rows for the lead (docs/handoff/af-lanes/L2a.md "Chunk 3"), in one place: personal keys (a device holding
 *  one is not new; erased with the account), the Export everything names and the data catalog labels. */
export const SIGNING_CHUNK3_ROWS = Object.freeze({
  personal: Object.freeze([VALIDATOR_ALERTS_KEY]),
  exportNames: Object.freeze({validatorAlerts: VALIDATOR_ALERTS_KEY}),
  catalogLabels: Object.freeze({validatorAlerts: Object.freeze(['Validator health alerts: what this device last saw', 'Wallet'])}),
});
