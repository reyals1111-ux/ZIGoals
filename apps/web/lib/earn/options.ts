/**
 * Session AF (L1, ADR-028 H17, H84, H88): the Earn hub's sections in their fixed order. The order is how the network is
 * built (the chain's own staking, then the apps built on it), never a ranking: ZIGoals does not order options by rate.
 * Static facts that no live source publishes carry the page they were read from and the date (`readOn`); every number
 * comes from the live routes instead.
 */
export const EARN_SECTIONS = Object.freeze([
  {id: 'summary', label: 'Your summary', when: 'wallet'},
  {id: 'native-staking', label: 'Native staking'},
  {id: 'valdora', label: 'Valdora stZIG'},
  {id: 'oroswap', label: 'OroSwap'},
  {id: 'validators', label: 'Validators'},
  {id: 'calculator', label: 'Calculator'},
  {id: 'safety', label: 'Safety'},
] as const);
export type EarnSectionId = (typeof EARN_SECTIONS)[number]['id'];
/** The day the provider pages below were read (each once, with curl, by Session AF's L1 lane). */
export const READ_ON = '2026-10-18';
/** Provider statements ZIGoals shows as theirs, with the page they come from (verified link kinds). */
export const PROVIDER_CLAIMS = Object.freeze({
  valdoraRedemption: {text: 'Unstaking follows ZIGChain’s 21-day unbonding period, plus 2 more days for Valdora’s distribution, and cannot be cancelled.', provider: 'valdora', kind: 'faq'},
  valdoraUnstakeFee: {text: 'Valdora’s FAQ says unstaking may include a fee that varies with the amount; its economics page says there is no fee on deposit, redemption or holding stZIG.', provider: 'valdora', kind: 'fees'},
  valdoraMultisig: {text: 'Valdora’s security page says contract upgrades, fund withdrawals and changes require multi-signature authorization.', provider: 'valdora', kind: 'security'},
  oroswapDocsFee: {text: 'OroSwap’s swap guide mentions a 1 % default fee; the fees below are the ones the chain itself holds for these pools.', provider: 'oroswap', kind: 'docs-swap'},
} as const);
/** The decoy token's full denom: named "ZIG" with 6 decimals; never counted as ZIG anywhere in ZIGoals. */
export const DECOY_ZIG_DENOM = 'coin.zig153u6vhv4ds6x95chdnqmsduwxzpt0teh43alsk.zig';
