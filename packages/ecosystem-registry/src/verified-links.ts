/**
 * Session AF (ADR-028 H25, H94; `TIER 3 (public-safety labels)`): the verified link registry without the provider
 * schemas, for pages that only link out (the Earn hub, its guide mode, the Staking preview). The same records live in
 * providers.json as each provider's `officialLinks`, validated by `officialLinkSchema` (index.ts); verified-links.test.ts
 * keeps the two equal, so a link is added in both places together. Every outgoing link of the Earn pages comes from here
 * (apps/web/lib/earn/links.test.ts), drawn by apps/web/components/links/verified-link.tsx with its "verified link · <date>"
 * mark.
 *
 * `check` is what one plain GET answered on `checkedAt`: `ok`, or `unreadable-by-automation` for a site behind a bot wall
 * (its URL then still comes from the official `source`). No module import, no zod.
 */
export type VerifiedLinkCheck = "ok" | "unreadable-by-automation";
export type VerifiedLinkRecord = {
  readonly kind: string;
  readonly url: string;
  readonly checkedAt: string;
  readonly check: VerifiedLinkCheck;
  readonly httpStatus: number;
  readonly source: string;
  readonly allowQuery?: true;
};
const registry = {
  "zig-finance": [
    {kind: "site", url: "https://zig.finance/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://zig.finance/what-is-zig-finance"},
    {kind: "about", url: "https://zig.finance/what-is-zig-finance", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://zig.finance/"},
    {kind: "docs", url: "https://docs.zigchain.com/", checkedAt: "2026-10-18", check: "unreadable-by-automation", httpStatus: 403, source: "https://github.com/ZIGChain/docs"},
    {kind: "hub", url: "https://hub.zigchain.com/", checkedAt: "2026-10-18", check: "unreadable-by-automation", httpStatus: 403, source: "https://github.com/ZIGChain/docs/blob/main/docs/users/hub/index.md"},
    {kind: "hub-staking", url: "https://hub.zigchain.com/staking", checkedAt: "2026-10-18", check: "unreadable-by-automation", httpStatus: 403, source: "https://github.com/ZIGChain/docs/blob/main/docs/users/hub/index.md"},
    {kind: "hub-proposals", url: "https://hub.zigchain.com/proposals/", checkedAt: "2026-10-18", check: "unreadable-by-automation", httpStatus: 403, source: "https://zig.finance/coin"},
    {kind: "hub-bridge", url: "https://hub.zigchain.com/bridge/", checkedAt: "2026-10-18", check: "unreadable-by-automation", httpStatus: 403, source: "https://github.com/ZIGChain/docs/blob/main/docs/users/hub/index.md"},
    {kind: "faucet", url: "https://faucet.zigchain.com/", checkedAt: "2026-10-18", check: "unreadable-by-automation", httpStatus: 403, source: "https://github.com/ZIGChain/docs"},
    {kind: "keplr", url: "https://www.keplr.app/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://github.com/chainapsis/keplr-chain-registry/blob/main/cosmos/zigchain.json"},
    {kind: "keplr-staking", url: "https://wallet.keplr.app/chains/zigchain?modal=staking&chain=zigchain-1&step_id=2", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://github.com/chainapsis/keplr-chain-registry/blob/main/cosmos/zigchain.json", allowQuery: true},
    {kind: "explorer", url: "https://zigscan.org/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://github.com/ZIGChain/docs/blob/main/docs/users/tools/block-explorers.md"},
    {kind: "explorer-validators", url: "https://zigscan.org/validators", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://github.com/ZIGChain/docs/blob/main/docs/users/tools/block-explorers.md"},
    // Session AF chunk 2 (L1): read once each with a plain GET on 2026-10-18 at 23:58 UTC.
    {kind: "keplr-get", url: "https://www.keplr.app/get", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://www.keplr.app/"},
    {kind: "skip-go", url: "https://go.skip.build/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://docs.skip.build/"},
    {kind: "circle-noble", url: "https://www.circle.com/blog/circle-is-discontinuing-support-for-usdc-and-cctp-v1-on-noble", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://www.circle.com/blog"},
  ],
  "wallets-and-money": [
    {kind: "metamask-site", url: "https://metamask.io/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://metamask.io/"},
    {kind: "rabby-site", url: "https://rabby.io/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://rabby.io/"},
    {kind: "coinbase-wallet-site", url: "https://www.coinbase.com/wallet", checkedAt: "2026-10-18", check: "unreadable-by-automation", httpStatus: 403, source: "https://www.coinbase.com/"},
    {kind: "trust-site", url: "https://trustwallet.com/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://trustwallet.com/"},
    {kind: "okx-wallet-site", url: "https://web3.okx.com/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://www.okx.com/web3"},
    {kind: "phantom-site", url: "https://phantom.com/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://phantom.com/"},
    {kind: "metamask-dapp", url: "https://link.metamask.io/dapp/", checkedAt: "2026-10-19", check: "ok", httpStatus: 200, source: "https://docs.metamask.io/metamask-connect/"},
    {kind: "trust-dapp", url: "https://link.trustwallet.com/open_url", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://developer.trustwallet.com/developer/develop-for-trust/deeplinking"},
    {kind: "trust-wc", url: "https://link.trustwallet.com/wc", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://developer.trustwallet.com/developer/develop-for-trust/deeplinking"},
    {kind: "ramp-site", url: "https://rampnetwork.com/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://docs.rampnetwork.com/"},
    {kind: "banxa-site", url: "https://banxa.com/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://docs.banxa.com/"},
    {kind: "ramp-hosted", url: "https://app.rampnetwork.com/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://docs.rampnetwork.com/"},
    {kind: "circle-usdc", url: "https://www.circle.com/usdc", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://www.circle.com/"},
    {kind: "tether-site", url: "https://tether.to/en/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://tether.to/en/supported-protocols/"},
    {kind: "uniswap-app", url: "https://app.uniswap.org/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://uniswap.org/"},
    {kind: "jupiter-app", url: "https://jup.ag/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://jup.ag/"},
  ],
  valdora: [
    {kind: "stake", url: "https://valdora.finance/stake", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://valdora.finance/"},
    {kind: "unstake", url: "https://valdora.finance/unstake", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://valdora.finance/"},
    {kind: "vaults", url: "https://valdora.finance/vaults", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://valdora.finance/"},
    {kind: "docs", url: "https://docs.valdora.finance/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://valdora.finance/"},
    {kind: "security", url: "https://docs.valdora.finance/security", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://docs.valdora.finance/"},
    {kind: "faq", url: "https://docs.valdora.finance/faqs", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://docs.valdora.finance/"},
    {kind: "contracts", url: "https://docs.valdora.finance/smart-contracts", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://docs.valdora.finance/"},
    {kind: "fees", url: "https://docs.valdora.finance/economics-and-incentives", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://docs.valdora.finance/"},
    {kind: "unstaking", url: "https://docs.valdora.finance/liquid-staking/unstaking-and-redemption", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://docs.valdora.finance/"},
    {kind: "defillama", url: "https://defillama.com/protocol/valdora-finance", checkedAt: "2026-10-18", check: "unreadable-by-automation", httpStatus: 403, source: "https://api.llama.fi/protocol/valdora-finance"},
    // Session AF chunk 2 (L1): the three USDC vault pages on Valdora's site, read once each on 2026-10-18 at 23:58 UTC.
    {kind: "vault-stablecoin-yield", url: "https://valdora.finance/vault/stablecoin-yield", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://valdora.finance/vaults"},
    {kind: "vault-private-credit", url: "https://valdora.finance/vault/private-credit", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://valdora.finance/vaults"},
    {kind: "vault-core-income", url: "https://valdora.finance/vault/core-income", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://valdora.finance/vaults"},
  ],
  oroswap: [
    {kind: "swap", url: "https://app.oroswap.org/swap", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://www.oroswap.org/"},
    {kind: "pools", url: "https://app.oroswap.org/pools", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://www.oroswap.org/"},
    {kind: "docs", url: "https://docs.oroswap.org/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://www.oroswap.org/"},
    {kind: "docs-swap", url: "https://docs.oroswap.org/docs/getting-started/swap/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://docs.oroswap.org/"},
    {kind: "docs-liquidity", url: "https://docs.oroswap.org/docs/standard-pool/add_remove_liquidity/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://docs.oroswap.org/"},
    {kind: "docs-farms", url: "https://docs.oroswap.org/docs/incentive/incentives/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://docs.oroswap.org/"},
    {kind: "defillama", url: "https://defillama.com/protocol/oroswap", checkedAt: "2026-10-18", check: "unreadable-by-automation", httpStatus: 403, source: "https://api.llama.fi/protocol/oroswap"},
  ],
  nawa: [
    {kind: "site", url: "https://www.nawa.finance/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://www.nawa.finance/"},
    {kind: "defillama", url: "https://defillama.com/protocol/nawa-protocol", checkedAt: "2026-10-18", check: "unreadable-by-automation", httpStatus: 403, source: "https://api.llama.fi/protocol/nawa-protocol"},
  ],
  permapod: [
    {kind: "site", url: "https://www.permapod.xyz/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://permapod.xyz/"},
    {kind: "safety", url: "https://docs.permapod.xyz/safety", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://www.permapod.xyz/"},
    {kind: "defillama", url: "https://defillama.com/protocol/permapod", checkedAt: "2026-10-18", check: "unreadable-by-automation", httpStatus: 403, source: "https://api.llama.fi/protocol/permapod"},
    {kind: "tracker-note", url: "https://github.com/DefiLlama/DefiLlama-Adapters/blob/main/projects/perma-pod/index.js", checkedAt: "2026-10-18", check: "unreadable-by-automation", httpStatus: 429, source: "https://api.llama.fi/protocol/permapod"},
  ],
  "defa-invoicemate": [
    {kind: "site", url: "https://imdefa.com/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://imdefa.com/"},
    {kind: "defillama", url: "https://defillama.com/protocol/defa-by-invoicemate", checkedAt: "2026-10-18", check: "unreadable-by-automation", httpStatus: 403, source: "https://api.llama.fi/protocol/defa-by-invoicemate"},
  ],
  zignaly: [
    {kind: "closure-notice", url: "https://intercom.help/zignaly/en/articles/17613629-zignaly-is-closing-how-to-withdraw-your-funds", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://intercom.help/zignaly/en/collections/19783703-zignaly-platform-closure"},
    {kind: "closure-collection", url: "https://intercom.help/zignaly/en/collections/19783703-zignaly-platform-closure", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://zignaly.com/"},
  ],
} as const satisfies Record<string, readonly VerifiedLinkRecord[]>;
export const VERIFIED_LINKS: {readonly [P in keyof typeof registry]: readonly VerifiedLinkRecord[]} = registry;
export type VerifiedProvider = keyof typeof registry;
export type VerifiedKind<P extends VerifiedProvider> = (typeof registry)[P][number]["kind"];
/** The provider's verified link of this kind. Both are checked at compile time; an unknown pair throws. */
export function verifiedLink<P extends VerifiedProvider>(provider: P, kind: VerifiedKind<P>): VerifiedLinkRecord {
  const link = VERIFIED_LINKS[provider]?.find((entry) => entry.kind === kind);
  if (!link) throw new Error(`No verified link ${provider}:${String(kind)}`);
  return link;
}
/** Every verified URL, exactly as written in the registry. */
export const VERIFIED_URLS: ReadonlySet<string> = new Set(Object.values(VERIFIED_LINKS).flatMap((links) => links.map((link) => link.url)));
/** True only for a URL that is, character for character, one of the registry's. */
export function isVerifiedUrl(url: string): boolean {
  return VERIFIED_URLS.has(url);
}
