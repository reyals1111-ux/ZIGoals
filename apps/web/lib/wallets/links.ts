import {VERIFIED_LINKS, type VerifiedLinkRecord} from '@zigoals/ecosystem-registry/verified-links';

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
// Session AF (moved by the lead): the rows now live in the verified link registry as the link-only record
// `wallets-and-money` (providers.json + verified-links.ts, one registry, ADR-028 H25); this module reads them from there and
// keeps only which ones are prefixes (a link the app completes with public parameters).
const PREFIX_IDS = ['metamask-dapp', 'trust-dapp', 'trust-wc', 'ramp-hosted'] as const;
const IDS = ['metamask-site', 'rabby-site', 'coinbase-wallet-site', 'trust-site', 'okx-wallet-site', 'phantom-site', 'metamask-dapp', 'trust-dapp', 'trust-wc',
  'ramp-site', 'banxa-site', 'ramp-hosted', 'circle-usdc', 'tether-site', 'uniswap-app', 'jupiter-app', 'skip-go'] as const;
const fromRegistry = (id: typeof IDS[number]): L2bLink => {
  // Skip Go's page is the zig-finance record's own (the Earn lane added it first); everything else is wallets-and-money's.
  const record = (id === 'skip-go' ? VERIFIED_LINKS['zig-finance'] : VERIFIED_LINKS['wallets-and-money']).find(link => link.kind === id);
  if (!record) throw Error(`The verified link registry has no ${id}.`);
  return (PREFIX_IDS as readonly string[]).includes(id) ? {...record, prefix: true} : record;
};
const rows = Object.fromEntries(IDS.map(id => [id, fromRegistry(id)])) as {readonly [K in typeof IDS[number]]: L2bLink};
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
