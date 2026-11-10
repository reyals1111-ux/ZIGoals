/**
 * Session AL fifth pass (C-BN-07): each way to earn's "At a glance" labels (its state, who holds the funds, its main
 * caution), in one place, so the option's own section and the side-by-side table on Earn show the same words. The words
 * are the sections' own (Session AF, ADR-028 H84); only where they live moved. Nothing here ranks or recommends.
 */
export type GlanceTone = 'live' | 'beta' | 'paused' | 'keys' | 'contract' | 'third';
export type GlanceTag = {tone: GlanceTone; text: string};

export const NATIVE_TAGS: readonly GlanceTag[] = [{tone: 'live', text: 'Live on mainnet'}, {tone: 'keys', text: 'You keep the keys'}];
/** Valdora stZIG: its contract's own state, read live. */
export const valdoraTags = (state: {paused?: boolean; emergencyMode?: boolean} | null): GlanceTag[] => [
  state?.paused || state?.emergencyMode ? {tone: 'paused', text: state.emergencyMode ? 'Emergency mode on' : 'Paused right now'} : {tone: 'live', text: 'Live on mainnet'},
  {tone: 'contract', text: 'A contract holds the ZIG'},
];
/** Valdora's USDC vaults: `paused` when a vault read says so. */
export const vaultsTags = (paused: boolean): GlanceTag[] => [paused ? {tone: 'paused', text: 'A vault is paused'} : {tone: 'live', text: 'Live on mainnet'}, {tone: 'third', text: 'A curator holds the money'}, {tone: 'beta', text: 'Holds USDC on Noble'}];
export const OROSWAP_TAGS: readonly GlanceTag[] = [{tone: 'live', text: 'Live on mainnet'}, {tone: 'contract', text: 'Pools hold the tokens'}];
export const NAWA_TAGS: readonly GlanceTag[] = [{tone: 'live', text: 'Live on ZIGChain'}, {tone: 'paused', text: 'USDC vault depends on Zignaly'}, {tone: 'third', text: 'Off-chain custody'}];
export const DEFA_TAGS: readonly GlanceTag[] = [{tone: 'paused', text: 'Private: no public sign-up'}, {tone: 'third', text: 'Information only'}];
export const PERMAPOD_TAGS: readonly GlanceTag[] = [{tone: 'paused', text: 'Paused after an exploit'}, {tone: 'third', text: 'Not an option today'}];
export const ZIGNALY_TAGS: readonly GlanceTag[] = [{tone: 'paused', text: 'Closing'}, {tone: 'third', text: 'Zignaly holds the funds'}];

/**
 * The table's rows: the ways to earn Earn lists, in the page's own order (the network's, never by rate), each with what
 * it is (its section's title), where its section's figures and risks are read from (the sources its risks name), and
 * the section to read in full. `tags` is filled by the page from the live reads above.
 */
export const COMPARE_ROWS = Object.freeze([
  {id: 'native-staking', name: 'Native staking', what: 'Stake ZIG with a validator', sources: 'ZIGChain’s own rules and validator list, read live; ZIGChain docs; ZIG’s price in OroSwap’s pools'},
  {id: 'valdora', name: 'Valdora stZIG', what: 'Stake and keep a token: stZIG', sources: 'Valdora’s contract and OroSwap’s stZIG pool on ZIGChain, read live; Valdora’s FAQ, contracts, economics and security pages; DefiLlama'},
  {id: 'valdora-vaults', name: 'USDC vaults', what: 'Lend USDC through a vault', sources: 'each vault’s own record on ZIGChain, read live; Valdora’s vault and security pages; Circle’s notice'},
  {id: 'oroswap', name: 'OroSwap', what: 'Swap, or earn swap fees in a pool', sources: 'the pools and OroSwap’s factory contract on ZIGChain, read live; OroSwap on liquidity; DefiLlama'},
  {id: 'nawa', name: 'Nawa', what: 'Shariah-compliant vaults', sources: 'DefiLlama’s Nawa tracker; the vault contracts on ZIGChain; Nawa’s site; Circle’s notice'},
  {id: 'defa', name: 'DeFa', what: 'Invoice finance pools', sources: 'DeFa’s site; Valdora’s Private Credit vault page; DeFa’s counter contract on ZIGChain; DefiLlama'},
  {id: 'permapod', name: 'Permapod', what: 'Borrow and lend', sources: 'DefiLlama’s tracker note; Permapod’s safety page and site; its contracts’ admin account on ZIGChain'},
  {id: 'zignaly', name: 'Zignaly', what: 'Closing: how to withdraw', sources: 'Zignaly’s notice and closure articles'},
] as const);
export type CompareId = (typeof COMPARE_ROWS)[number]['id'];
