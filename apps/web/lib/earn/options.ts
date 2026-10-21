/**
 * Session AF (L1, ADR-028 H17, H84, H88): the Earn hub's sections in their fixed order. The order is how the network is
 * built (the chain's own staking, then the apps built on it), never a ranking: ZIGoals does not order options by rate.
 * Static facts that no live source publishes carry the page they were read from and the date (`readOn`); every number
 * comes from the live routes instead.
 *
 * Session AF chunk 2 (amendment 3, H43, H84): every way to earn, each its own section — the USDC vaults, Nawa, DeFa,
 * Permapod (paused after an exploit), Zignaly (closing: how to withdraw), governance, Goal Vaults and "Earn with
 * stablecoins" — after the Start-here path, with the Academy before the calculator.
 */
export const EARN_SECTIONS = Object.freeze([
  {id: 'summary', label: 'Your summary', when: 'wallet'},
  {id: 'start-here', label: 'Start here'},
  {id: 'native-staking', label: 'Native staking'},
  {id: 'valdora', label: 'Valdora stZIG'},
  {id: 'valdora-vaults', label: 'USDC vaults'},
  {id: 'oroswap', label: 'OroSwap'},
  {id: 'nawa', label: 'Nawa'},
  {id: 'defa', label: 'DeFa'},
  {id: 'permapod', label: 'Permapod'},
  {id: 'zignaly', label: 'Zignaly'},
  {id: 'governance', label: 'Governance'},
  {id: 'goal-vaults', label: 'Goal Vaults'},
  {id: 'stablecoins', label: 'Stablecoins'},
  {id: 'validators', label: 'Validators'},
  {id: 'academy', label: 'Academy'},
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

// ---- Session AF chunk 2: dated facts no live source publishes (amendment 10: neutral words, the source and the date) ----
/** Circle's notice about USDC on Noble (USDC.n), read 2026-10-18 at 22:32 UTC (docs/earn/af/RECHECK_2026-10-19.md, A). */
export const NOBLE_USDC = Object.freeze({
  readOn: '2026-10-18', source: 'Circle',
  mintingStopped: '2026-10-13', burnLimitsFrom: '2026-10-31', fullyPaused: '2027-01-12', manualRedemptionFrom: '2027-01-13',
  text: 'Circle stopped new minting of USDC on Noble on 13 October 2026; its CCTP V1 burn limits fall to zero from 31 October 2026, and on 12 January 2027 the Noble USDC contract and its CCTP routes are fully paused, with manual redemption from 13 January 2027.',
} as const);
/** Zignaly's closure notice (its help centre), read 2026-10-18 (R2 LB12, re-read 22:19 UTC). Dates as the notice states them. */
export const ZIGNALY_CLOSURE = Object.freeze({
  readOn: '2026-10-18', source: 'Zignaly’s help centre',
  dates: [
    {date: '2026-10-15', text: 'New sign-ups and new investments stopped.'},
    {date: '2026-10-16', text: 'Trading services and Z-Indexes closed at 10:00 UTC, except Private Credit; funds moved to each person’s Zignaly balance.'},
    {date: '2026-11-01', text: 'The last day to request a Private Credit withdrawal (about a month to settle).'},
    {date: '2026-12-01', text: 'The last day to withdraw, until 23:59 UTC. The app closes after that.'},
  ],
  withdraw: 'Withdrawals are paid in USDT on BNB Smart Chain (BEP20) only; 10,000 USDT or more needs an identity check, and changing a password or two-factor setting pauses withdrawals for 24 hours.',
} as const);
/** DefiLlama's dated incident for Permapod comes live from /api/earn/defillama; these are the words read beside it. */
export const PERMAPOD_STATUS = Object.freeze({
  readOn: '2026-10-18', source: 'Permapod’s X account and DefiLlama’s tracker',
  text: 'Permapod’s X account said it had identified and contained an exploit and halted its contracts; DefiLlama’s tracker notes that the main market moved to a “residual sweeper” afterwards. No post-mortem was found.',
} as const);
/** Valdora's vault pages (the Private Credit page, titled “Opportunistic Credit Vault”), read 2026-10-18 at 22:42 UTC. */
export const VALDORA_VAULT_PAGE = Object.freeze({
  readOn: '2026-10-18', source: 'Valdora’s vault page',
  fees: 'The vault page shows a performance fee of 0.00 %; Valdora’s docs say vault fees vary by strategy.',
  redemption: 'Withdrawals are requests, with a redemption period of up to 60 days.',
  atRisk: 'The page says: “Capital is at risk.”',
  curated: 'Curated by ZIG Markets; the Private Credit vault is deployed with DeFa by InvoiceMate, which lends to small businesses in the UAE, Saudi Arabia and Oman and finances payments.',
} as const);
/** DeFa by InvoiceMate's own site, read 2026-10-18 (R2 §5.4). Claims as the site makes them. */
export const DEFA_SITE = Object.freeze({
  readOn: '2026-10-18', source: 'imdefa.com',
  text: 'The site says “Private Mainnet is Live!”, offers no app or sign-up for the public, and lists its terms, docs and audit as “coming soon”. Its footer names a DIFC Innovation License and says “FSCA Regulated”.',
} as const);
/** DefiLlama's description of how it counts Nawa's value, read 2026-10-19 at 00:05 UTC (api.llama.fi/protocol/nawa-protocol). */
export const NAWA_METHOD = Object.freeze({
  readOn: '2026-10-19', source: 'DefiLlama’s Nawa tracker',
  text: 'DefiLlama counts Nawa’s USDC vault as capital “deployed off-chain via Zignaly into a cross-chain private credit position”, reported by an oracle.',
} as const);
/** The routes onto ZIGChain, as Skip Go quoted them on 2026-10-18 between 22:25 and 22:33 UTC (docs/earn/af/ROUTES_ONTO_ZIGCHAIN.md). */
export const ZIG_ROUTES = Object.freeze({
  readOn: '2026-10-18', source: 'Skip Go’s route quotes and ZIGChain’s pools',
  routes: [
    {id: 'atom', from: 'ATOM on the Cosmos Hub', how: 'Send it over IBC to your ZIGChain address (Keplr’s own send, Skip Go or the ZIGChain Hub bridge), then swap ATOM for ZIG on OroSwap.', signatures: 1, time: 'about 30 seconds, then the swap', pool: 'zig-atom', note: 'One approval in Keplr on the Cosmos Hub.'},
    {id: 'usdc', from: 'USDC on Base, Arbitrum or Ethereum', how: 'Skip Go moves it through Circle to Injective and on to ZIGChain, where it arrives as USDC.inj; then swap it for ZIG on OroSwap.', signatures: 2, time: 'about 18 minutes, then the swap', pool: 'zig-usdc-inj', note: 'Two approvals: one in your Ethereum wallet, one in Keplr on Injective (which needs a little INJ for its fee).'},
    {id: 'erc20-zig', from: 'ZIG as an ERC-20 token on Ethereum', how: 'The ZIGChain Hub bridge (or Skip Go) sends it through Axelar; ZIGChain’s token wrapper hands out native ZIG.', signatures: 1, time: 'about 16 minutes', pool: null, note: 'This route delivers ZIG without a swap, so your first network fee is covered.'},
  ],
  fees: 'ZIGChain takes its network fees in ZIG only: if you arrive with only ATOM or USDC, the swap into ZIG needs a little ZIG for its fee. The ERC-20 ZIG route, or a withdrawal from an exchange on the ZIGChain network, delivers ZIG directly.',
  thin: 'USDT and ETH can reach ZIGChain, but their pools there are tiny: swapping them for ZIG loses a large share to the price. Keeping them where they are is the honest default.',
  noble: 'USDC on Noble (USDC.n) still reaches ZIGChain, but Circle is winding it down (see the USDC vaults): new money is better as USDC.inj.',
} as const);
