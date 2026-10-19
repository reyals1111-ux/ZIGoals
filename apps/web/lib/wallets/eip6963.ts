import {l2bLink, type L2bLinkId} from './links';
export {announcedWallet, discoverEvmWallets, readEvmAddress, EVM_LINK_ERROR, type EvmWallet} from '../wallet-link';

/**
 * Session AF (L2b, Part 3, ADR-028 H40, H41; `TIER 3 (wallet)`): the EVM wallets ZIGoals names on computers. Discovery is
 * AE's raw EIP-6963 (lib/wallet-link.ts: any wallet that announces itself is listed, one per uuid and per rdns), and
 * linking stays one `eth_requestAccounts` for the address; nothing here signs, sends, switches a network or makes a
 * request. These six are the ones R4 checked (rdns as each wallet announces it, read from RainbowKit's connectors
 * 2026-10-18); a wallet that is not installed gets its official site only (lib/wallets/links.ts). OKX, Trust and Phantom
 * are read-only EVM here, like every EVM wallet (H41). Linking a Solana address is lib/wallets/solana-link.ts.
 */
export type KnownEvmWallet = {rdns: string; name: string; link: L2bLinkId};
export const KNOWN_EVM_WALLETS: readonly KnownEvmWallet[] = Object.freeze([
  {rdns: 'io.metamask', name: 'MetaMask', link: 'metamask-site'},
  {rdns: 'io.rabby', name: 'Rabby', link: 'rabby-site'},
  {rdns: 'com.coinbase.wallet', name: 'Coinbase Wallet', link: 'coinbase-wallet-site'},
  {rdns: 'com.trustwallet.app', name: 'Trust Wallet', link: 'trust-site'},
  {rdns: 'com.okex.wallet', name: 'OKX Wallet', link: 'okx-wallet-site'},
  {rdns: 'app.phantom', name: 'Phantom', link: 'phantom-site'},
]);
/** The "Get …" rows: the known wallets that did not announce themselves, each with its official site. */
export function evmSuggestions(announced: readonly {rdns: string}[]): {rdns: string; name: string; href: string}[] {
  return KNOWN_EVM_WALLETS.filter(w => !announced.some(a => a.rdns === w.rdns)).map(w => ({rdns: w.rdns, name: w.name, href: l2bLink(w.link).url}));
}
/** The chains an EVM address is tracked on (Part 3), by default all six (lib/wallets/balances/chains.ts). */
export const EVM_CHAIN_IDS = Object.freeze(['eip155:1', 'eip155:42161', 'eip155:8453', 'eip155:10', 'eip155:137', 'eip155:56'] as const);
export type EvmChainId = typeof EVM_CHAIN_IDS[number];
