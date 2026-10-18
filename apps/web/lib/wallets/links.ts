import type {VerifiedLinkRecord} from '@zigoals/ecosystem-registry/verified-links';

/**
 * Session AF (L2b, ADR-028 H25, H34, H94): the outgoing links of the wallet menu, the phones' in-app-browser paths and Add
 * money, in the verified link registry's own record shape. The registry (`packages/ecosystem-registry`) belongs to lane L1
 * this round, so these rows wait here until the lead moves them into `providers.json` + `verified-links.ts` (listed in
 * docs/handoff/af-lanes/L2b.md); every outgoing link of the L2b files comes from this list or from the registry itself
 * (lib/wallets/links.test.ts). Each URL was read once with curl on `checkedAt` (one GET, a browser user agent):
 * `httpStatus` is that answer. A `prefix` row is a link the app completes with public parameters only (this app's own
 * address, a provider's public asset code, the person's linked address), never with free text; its builder checks the
 * result still starts with the row's URL.
 */
export type L2bLink = VerifiedLinkRecord & {readonly prefix?: true};
const rows = {
  // Wallets' official sites (the "Get …" rows when a wallet is not installed).
  'metamask-site': {kind: 'site', url: 'https://metamask.io/', checkedAt: '2026-10-18', check: 'ok', httpStatus: 200, source: 'https://metamask.io/'},
  'rabby-site': {kind: 'site', url: 'https://rabby.io/', checkedAt: '2026-10-18', check: 'ok', httpStatus: 200, source: 'https://rabby.io/'},
  'coinbase-wallet-site': {kind: 'site', url: 'https://www.coinbase.com/wallet', checkedAt: '2026-10-18', check: 'unreadable-by-automation', httpStatus: 403, source: 'https://www.coinbase.com/'},
  'trust-site': {kind: 'site', url: 'https://trustwallet.com/', checkedAt: '2026-10-18', check: 'ok', httpStatus: 200, source: 'https://trustwallet.com/'},
  // www.okx.com/web3 answers 301 to this address, which answers 200.
  'okx-wallet-site': {kind: 'site', url: 'https://web3.okx.com/', checkedAt: '2026-10-18', check: 'ok', httpStatus: 200, source: 'https://www.okx.com/web3'},
  'phantom-site': {kind: 'site', url: 'https://phantom.com/', checkedAt: '2026-10-18', check: 'ok', httpStatus: 200, source: 'https://phantom.com/'},
  // Phones: open this app inside the wallet's own browser (H38, H87). MetaMask's link answers 307 to its download page
  // outside a phone (the read had no MetaMask app); Trust's documented `open_url` form answers 200.
  'metamask-dapp': {kind: 'in-app-browser', url: 'https://link.metamask.io/dapp/', checkedAt: '2026-10-18', check: 'ok', httpStatus: 307, source: 'https://docs.metamask.io/metamask-connect/', prefix: true},
  'trust-dapp': {kind: 'in-app-browser', url: 'https://link.trustwallet.com/open_url', checkedAt: '2026-10-18', check: 'ok', httpStatus: 200, source: 'https://developer.trustwallet.com/developer/develop-for-trust/deeplinking', prefix: true},
  // Add money (Part 4, H18, H32, H34): the two providers' own sites (the plain consumer pages used while their public IDs
  // are empty), Ramp's hosted-mode host (production; the demo host appears only in tests, never opened) and Banxa's partner
  // pages (`<partnerRef>.banxa.com`, checked by its builder, not a fixed address). Read 2026-10-18 23:12 UTC.
  'ramp-site': {kind: 'site', url: 'https://rampnetwork.com/', checkedAt: '2026-10-18', check: 'ok', httpStatus: 200, source: 'https://docs.rampnetwork.com/'},
  'banxa-site': {kind: 'site', url: 'https://banxa.com/', checkedAt: '2026-10-18', check: 'ok', httpStatus: 200, source: 'https://docs.banxa.com/'},
  'ramp-hosted': {kind: 'hosted', url: 'https://app.rampnetwork.com/', checkedAt: '2026-10-18', check: 'ok', httpStatus: 200, source: 'https://docs.rampnetwork.com/', prefix: true},
  // "What can I do with it now?": the stablecoins' issuers, a well-known exchange per network family, and Skip Go (it lists
  // zigchain-1, R3 §9). ZIGChain's own (Hub bridge, OroSwap) come from the registry.
  'circle-usdc': {kind: 'issuer', url: 'https://www.circle.com/usdc', checkedAt: '2026-10-18', check: 'ok', httpStatus: 200, source: 'https://www.circle.com/'},
  'tether-site': {kind: 'issuer', url: 'https://tether.to/en/', checkedAt: '2026-10-18', check: 'ok', httpStatus: 200, source: 'https://tether.to/en/supported-protocols/'},
  'uniswap-app': {kind: 'swap', url: 'https://app.uniswap.org/', checkedAt: '2026-10-18', check: 'ok', httpStatus: 200, source: 'https://uniswap.org/'},
  'jupiter-app': {kind: 'swap', url: 'https://jup.ag/', checkedAt: '2026-10-18', check: 'ok', httpStatus: 200, source: 'https://jup.ag/'},
  'skip-go': {kind: 'bridge', url: 'https://go.skip.build/', checkedAt: '2026-10-18', check: 'ok', httpStatus: 200, source: 'https://docs.skip.build/'},
} as const satisfies Record<string, L2bLink>;
export type L2bLinkId = keyof typeof rows;
export const L2B_LINKS: {readonly [K in L2bLinkId]: L2bLink} = rows;
export const l2bLink = (id: L2bLinkId): L2bLink => L2B_LINKS[id];
/** Every URL of this list, exactly as written. */
export const L2B_URLS: ReadonlySet<string> = new Set(Object.values(L2B_LINKS).map(link => link.url));
/** A built link is allowed only when it starts with a prefix row's URL (and is https). */
export function fromPrefix(id: L2bLinkId, built: string): string {
  const row = L2B_LINKS[id];
  if (!('prefix' in row) || !built.startsWith(row.url) || !built.startsWith('https://')) throw Error(`Not a link of ${id}.`);
  return built;
}
