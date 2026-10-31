import {isEvmAddress, isSolanaAddress, isZigAddress} from '../wallet-address';
import {EVM_CHAIN_IDS} from './eip6963';
import {fromPrefix} from './links';
import type {AddressKind} from '../wallet-address';

/**
 * Session AF (L2b, Part 3, ADR-028 D1, H6, H38; `TIER 3 (dependencies)`): WalletConnect for phones, through
 * `@walletconnect/sign-client` 2.26.0 (owner-approved; WalletConnect Community License, docs/dependencies/WALLETCONNECT.md).
 * - **Dormant until the owner's project ID is set** (apps/web/config/public-integrations.json `reownProjectId`): with a
 *   null ID nothing here loads the package (it is imported dynamically, only inside `startWalletConnect`, only when the
 *   person taps "Connect by WalletConnect") and no request is made; the CSP gains the relay and Verify hosts only in the
 *   commit that sets the ID (lib/wallets/walletconnect.test.ts asserts presence iff set).
 * - **Read-only linking**: the session asks for accounts only (EVM and Solana with no method at all; Cosmos with
 *   `cosmos_getAccounts`), and the addresses are read from the approved session's namespaces; nothing is requested of the
 *   wallet, nothing is signed or sent.
 * - **Keplr Mobile signing later** (lane L2a): the caller may add Cosmos methods for its own signer (`cosmosMethods`), and
 *   `walletConnectSession()` exposes the live client and session to it; this file never names a signing method.
 * - **Nothing stored**: the client keeps its pairing and session in memory for this tab (a Map), never in the device's
 *   storage; telemetry is off (no pulse host).
 */
export const WALLETCONNECT_VERSION = '2.26.0';
/** The hosts the 2.26.0 dapp client reaches with telemetry off (read from its installed dist, 2026-10-18): the relay's
 *  socket and the Verify API, plus Verify's attestation frame. Added to the CSP only with the project ID. */
export const WALLETCONNECT_CSP = Object.freeze({
  connect: Object.freeze(['wss://relay.walletconnect.org', 'https://verify.walletconnect.org', 'https://verify.walletconnect.com']),
  // Session AK: written as pages (a trailing "/" matches every path on the host, as the bare origin did), the form the
  // deploy smoke's frame-src rule accepts (scripts/lib/alpha-smoke.mjs: exact https pages only).
  frame: Object.freeze(['https://verify.walletconnect.org/', 'https://verify.walletconnect.com/']),
});
/** Solana mainnet's CAIP-2 id in WalletConnect (its genesis hash prefix). */
export const WC_SOLANA_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
export const WC_ZIGCHAIN = 'cosmos:zigchain-1';
export type WcNamespace = {chains: string[]; methods: string[]; events: string[]};
export function readOnlyNamespaces(cosmosMethods: readonly string[] = ['cosmos_getAccounts']): Record<'eip155' | 'solana' | 'cosmos', WcNamespace> {
  // Gate C security review S9 (ADR-028 H133): read-only means exactly that — the one Cosmos method that reads accounts.
  // Signing over WalletConnect (Keplr Mobile's two Cosmos signing methods) is not built; adding it needs its own
  // review and its own change here, never a caller's argument.
  if (cosmosMethods.some(m => m !== 'cosmos_getAccounts')) throw Error('Only the read-only Cosmos method cosmos_getAccounts may be asked for.');
  return {
    eip155: {chains: [...EVM_CHAIN_IDS], methods: [], events: []},
    solana: {chains: [WC_SOLANA_MAINNET], methods: [], events: []},
    cosmos: {chains: [WC_ZIGCHAIN], methods: [...new Set(cosmosMethods)], events: []},
  };
}
export type WcAccount = {kind: AddressKind; address: string; chainId: string};
/** The addresses an approved session's namespaces hold (CAIP-10), checked; anything else is left out. */
export function accountsOf(namespaces: unknown): WcAccount[] {
  const out: WcAccount[] = [], seen = new Set<string>();
  const all = namespaces && typeof namespaces === 'object' ? Object.values(namespaces as Record<string, {accounts?: unknown}>) : [];
  for (const ns of all) for (const account of Array.isArray(ns?.accounts) ? ns.accounts : []) {
    if (typeof account !== 'string' || account.length > 200) continue;
    const [space, reference, address] = account.split(':');
    if (!space || !reference || !address) continue;
    const chainId = `${space}:${reference}`;
    const kind: AddressKind | null = space === 'eip155' && (EVM_CHAIN_IDS as readonly string[]).includes(chainId) && isEvmAddress(address) ? 'evm'
      : chainId === WC_SOLANA_MAINNET && isSolanaAddress(address) ? 'solana'
      : chainId === WC_ZIGCHAIN && isZigAddress(address) && address.startsWith('zig1') ? 'cosmos' : null;
    const key = `${kind}:${kind === 'evm' ? address.toLowerCase() : address}`;
    if (kind && !seen.has(key)) { seen.add(key); out.push({kind, address, chainId}); }
  }
  return out;
}
/** A key-value store in memory for this tab only (the client's IKeyValueStorage shape). */
export function memoryStorage() {
  const m = new Map<string, unknown>();
  return {
    getKeys: async () => [...m.keys()], getEntries: async <T = unknown>() => [...m.entries()] as [string, T][],
    getItem: async <T = unknown>(key: string) => m.get(key) as T | undefined, setItem: async <T = unknown>(key: string, value: T) => { m.set(key, value); },
    removeItem: async (key: string) => { m.delete(key); },
  };
}
type Session = {topic: string; namespaces: unknown; peer?: {metadata?: {name?: unknown}}};
type Client = {
  connect(params: {optionalNamespaces: Record<string, WcNamespace>}): Promise<{uri?: string; approval: () => Promise<Session>}>;
  disconnect(params: {topic: string; reason: {code: number; message: string}}): Promise<void>;
};
type Loader = () => Promise<{SignClient: {init(options: Record<string, unknown>): Promise<unknown>}}>;
let live: {client: Client; session: Session | null} | null = null;
/** For lane L2a's signer: the live client and approved session of this tab, or null. */
export const walletConnectSession = () => live;
export class WalletConnectUnavailable extends Error {}
/**
 * Starts a pairing: loads the package (only now), creates the in-memory client and returns the `wc:` link for the wallet
 * app plus the approval, which resolves to the session's checked accounts. Refuses before loading anything when the project
 * ID is not set.
 */
export async function startWalletConnect({projectId, origin, cosmosMethods, loader = () => import('@walletconnect/sign-client') as unknown as ReturnType<Loader>}: {projectId: string | null; origin: string; cosmosMethods?: readonly string[]; loader?: Loader}): Promise<{uri: string; approval: Promise<{accounts: WcAccount[]; wallet: string}>}> {
  if (!projectId || !/^[0-9a-f]{32}$/.test(projectId)) throw new WalletConnectUnavailable('WalletConnect is not set up in this build yet.');
  const url = new URL(origin);
  if (url.protocol !== 'https:' && url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') throw new WalletConnectUnavailable('WalletConnect needs this app\'s own https address.');
  const {SignClient} = await loader();
  const client = await SignClient.init({projectId, telemetryEnabled: false, storage: memoryStorage(), metadata: {name: 'ZIGoals', description: 'Goals, habits and wealth. Wallets are linked read-only.', url: url.origin, icons: [`${url.origin}/apple-touch-icon.png`]}}) as Client;
  const {uri, approval} = await client.connect({optionalNamespaces: readOnlyNamespaces(cosmosMethods)});
  if (typeof uri !== 'string' || !uri.startsWith('wc:')) throw new WalletConnectUnavailable('WalletConnect did not give a pairing link.');
  live = {client, session: null};
  return {uri, approval: approval().then(session => {
    live = {client, session};
    const name = session.peer?.metadata?.name;
    return {accounts: accountsOf(session.namespaces), wallet: typeof name === 'string' ? name.slice(0, 40) : 'WalletConnect'};
  })};
}
/** Ends this tab's session, best effort; nothing stays on the device either way. */
export async function stopWalletConnect(): Promise<void> {
  const current = live; live = null;
  try { if (current?.session) await current.client.disconnect({topic: current.session.topic, reason: {code: 6000, message: 'User disconnected'}}); } catch { /* the in-memory session is gone anyway */ }
}
/** Trust Wallet's documented WalletConnect link for a `wc:` pairing link (lib/wallets/links.ts `trust-wc`). */
export const trustWalletConnectLink = (uri: string) => {
  if (!uri.startsWith('wc:') || uri.length > 2000) throw Error('Not a WalletConnect link.');
  return fromPrefix('trust-wc', `https://link.trustwallet.com/wc?uri=${encodeURIComponent(uri)}`);
};

/**
 * Session AK (Part 1a, A7; docs/research/session-ak/WALLETS.md (c)–(d)): the pairing link handed to each wallet app, by
 * each wallet's own documented or registry link form, with what that wallet links in plain words (A7: no wallet is listed
 * for more than it does). MetaMask, Trust, OKX and Ledger Wallet link Ethereum-family and Solana addresses; Keplr Mobile
 * its ZIGChain address (where it offers the chain). Keplr appends the link raw; the others take it encoded.
 */
export type WcWalletLink = {key: string; label: string; detail: string; href: string};
export function walletConnectLinks(uri: string, android: boolean): WcWalletLink[] {
  if (!uri.startsWith('wc:') || uri.length > 2000 || /[\s<>"]/.test(uri)) throw Error('Not a WalletConnect link.');
  const encoded = encodeURIComponent(uri);
  return [
    {key: 'wc-keplr', label: 'Open in Keplr Mobile', detail: 'Your ZIGChain address, where Keplr Mobile offers ZIGChain', href: android ? `intent://wcV2?${uri}#Intent;package=com.chainapsis.keplr;scheme=keplrwallet;end;` : `keplrwallet://wcV2?${uri}`},
    {key: 'wc-trust', label: 'Open in Trust Wallet', detail: 'Ethereum-family and Solana addresses', href: trustWalletConnectLink(uri)},
    {key: 'wc-metamask', label: 'Open in MetaMask', detail: 'Ethereum-family addresses', href: `metamask://wc?uri=${encoded}`},
    {key: 'wc-ledger', label: 'Open in Ledger Wallet', detail: 'Ethereum-family addresses', href: `ledgerlive://wc?uri=${encoded}`},
  ];
}
/** A9: what to say when WalletConnect refuses to start (the owner's allowed domains may not include this site yet). */
export const PHONE_WALLETS_SWITCHING_ON = 'Phone wallets are being switched on. Open ZIGoals in your wallet’s own browser meanwhile (the links above).';
