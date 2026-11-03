/**
 * Session AK (F4, ecosystem directory refresh): one honest status line per Ecosystem project, with the source and the
 * day it was read (docs/research/session-ak/ZIGCHAIN_ECOSYSTEM.md §3). "Live" means a person can use it on ZIGChain today
 * by the project's own pages and the chain; "Not live yet" means announced or documented, but nothing a person can use
 * was found; "Listed partner" means named on zigchain.com without an app or contract on ZIGChain that ZIGoals found.
 * Zignaly-dependent items keep the closure notice (components/earn/apps-sections.tsx). A status is information, never a
 * recommendation, and the live figure on a card stays Earn's own DefiLlama read.
 */
export type DirectoryStatusKind = 'live' | 'tool' | 'closing' | 'paused' | 'winding-down' | 'not-live' | 'partner' | 'private';
export type DirectoryStatus = {kind: DirectoryStatusKind; label: string; detail: string; source: string; readOn: string};
export const STATUS_LABELS: Readonly<Record<DirectoryStatusKind, string>> = Object.freeze({
  live: 'Live on ZIGChain', tool: 'Live tool', closing: 'Closing', paused: 'Paused', 'winding-down': 'Being wound down',
  'not-live': 'Not live yet', partner: 'Listed partner', private: 'Not open to the public',
});
const TODAY = '2026-10-31', AF = '2026-10-18';
const s = (kind: DirectoryStatusKind, detail: string, source: string, readOn = TODAY): DirectoryStatus => ({kind, label: STATUS_LABELS[kind], detail, source, readOn});
export const DIRECTORY_STATUS: Readonly<Record<string, DirectoryStatus>> = Object.freeze({
  valdora: s('live', 'stZIG liquid staking and USDC vaults are in use on ZIGChain mainnet.', 'Valdora’s docs, DefiLlama and the chain’s contracts'),
  oroswap: s('live', 'Swaps and liquidity pools are in use on ZIGChain mainnet.', 'DefiLlama and the chain’s pool contracts'),
  nawa: s('live', 'Live, but its USDC vault depends on Zignaly, which is closing (see Earn).', 'DefiLlama’s Nawa tracker and Zignaly’s notice', AF),
  permapod: s('paused', 'It halted its contracts after an exploit; DefiLlama still lists a residual balance.', 'Permapod’s X account and DefiLlama', AF),
  zignaly: s('closing', 'The last day to request a Private Credit withdrawal is 1 November 2026; the app closes on 1 December 2026 at 23:59 UTC.', 'Zignaly’s help centre (notice read 18 October 2026)', AF),
  'defa-invoicemate': s('private', 'Its site says “Private Mainnet is Live!” with no public app or sign-up; terms and audit “coming soon”.', 'imdefa.com', AF),
  'zig-markets': s('partner', 'Curates Valdora’s vaults; no app of its own on ZIGChain was found.', 'Valdora’s vault pages'),
  wme: s('not-live', 'ZIGChain’s documentation still lists the Wealth Management Engine’s implementation as coming.', 'docs.zigchain.com'),
  zamanat: s('partner', 'Named on zigchain.com; no app or contract on ZIGChain was found.', 'zigchain.com'),
  beehive: s('partner', 'Named on zigchain.com; no app or contract on ZIGChain was found.', 'zigchain.com'),
  ondo: s('partner', 'Named on zigchain.com; no Ondo product on ZIGChain was found.', 'zigchain.com'),
  taurus: s('partner', 'Institutional infrastructure named on zigchain.com; nothing a person uses directly.', 'zigchain.com'),
  'apex-group': s('partner', 'Fund administration named on zigchain.com; nothing a person uses directly.', 'zigchain.com'),
  noble: s('winding-down', 'Circle stopped minting USDC on Noble on 13 October 2026; USDC.n should move to USDC.inj (the Hub’s migration guide).', 'Circle and docs.zigchain.com', AF),
  axelar: s('live', 'Carries ZIG as an ERC-20 and Ethereum tokens to ZIGChain through the Hub bridge.', 'ZIGChain’s token registry and the Hub bridge guide'),
  range: s('tool', 'ZIGChain’s official explorer, mainnet and testnet.', 'docs.zigchain.com, block explorers'),
  zigscan: s('tool', 'An explorer listed by ZIGChain, mainnet and testnet.', 'docs.zigchain.com, block explorers'),
  'zigchain-hub': s('tool', 'Staking, proposals, the bridge and the transparency dashboard.', 'docs.zigchain.com'),
});
/** The status of a directory entry, or null for an id this table does not cover (no label is invented). */
export const directoryStatusOf = (id: string): DirectoryStatus | null => Object.hasOwn(DIRECTORY_STATUS, id) ? DIRECTORY_STATUS[id]! : null;
/** Things announced for ZIGChain that are not live on 31 October 2026, said plainly on the Ecosystem page. */
export const NOT_LIVE_YET: readonly {what: string; detail: string; source: string}[] = Object.freeze([
  {what: 'ZIGChain v6 on the main network', detail: 'On-chain proposal #45 is being voted on until 2 November 2026; if it passes, the upgrade is planned for about 3 November. The practice network runs v6 already.', source: 'ZIGChain’s proposal #45 and its networks repository'},
  {what: 'EVM apps and Ethereum-style addresses on the main network', detail: 'Come with v6. No main-network EVM endpoint is published yet, so ZIGoals reads no EVM balances.', source: 'ZIGChain’s v6 upgrade notes'},
  {what: 'The Wealth Management Engine', detail: 'Described by ZIGChain; its implementation is not published.', source: 'docs.zigchain.com'},
]);
