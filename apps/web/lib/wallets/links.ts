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
