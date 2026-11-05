import {isEvmAddress, isSolanaAddress, isZigAddress} from '../wallet-address';
import {EVM_CHAIN_IDS} from './eip6963';
import {fromPrefix} from './links';
import type {AddressKind} from '../wallet-address';
import {ACCOUNT_CHANGE} from '../account-session';

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
/** Session AK (AFL9): the ZIGChain testnet, for practice with Keplr Mobile where it offers the chain (optional only). */
export const WC_ZIGTEST = 'cosmos:zig-test-2';
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
/**
 * Session AK (AFL9, A7; `TIER 3 (wallet)`): the namespaces of a pairing that may also stake with Keplr Mobile. The two
 * Cosmos methods are handed in by lib/staking/execute.ts (WC_STAKING_METHODS: reading the account and signing one reviewed
 * document); this file still names no signing method. Only ZIGChain mainnet and testnet are asked, optionally; Ethereum-
 * family and Solana stay read-only. A wallet that does not offer ZIGChain simply leaves it out, and the session links the
 * rest read-only.
 */
export function stakingNamespaces(stakingMethods: readonly string[]): Record<'eip155' | 'solana' | 'cosmos', WcNamespace> {
  if (stakingMethods.length !== 2 || !stakingMethods.includes('cosmos_getAccounts') || !stakingMethods.every(m => /^cosmos_[A-Za-z]{4,30}$/.test(m))) throw Error('A staking pairing asks for exactly the account read and one signing method.');
  const base = readOnlyNamespaces();
  return {...base, cosmos: {chains: [WC_ZIGCHAIN, WC_ZIGTEST], methods: [...stakingMethods], events: []}};
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
  /** The client's own events; only the two that end a session are listened to (Z1C-I2). Optional for older fakes. */
  on?(event: 'session_delete' | 'session_expire', listener: (args: {topic?: unknown}) => void): unknown;
};
type Loader = () => Promise<{SignClient: {init(options: Record<string, unknown>): Promise<unknown>}}>;
/**
 * The live client and session of this tab. `staking` is set here, and only by a pairing started with `stakingMethods`
 * (security review L1): the wallet controls the session's namespaces, so the signer trusts what ZIGoals asked for, not
 * what the wallet says it approved.
 */
export type WalletConnectLive = {client: Client; session: Session | null; staking: boolean};
let live: WalletConnectLive | null = null;
/** For lane L2a's signer: the live client and approved session of this tab, or null. */
export const walletConnectSession = () => live;
/**
 * Session AL (Z1C-I3): the name the approved session's wallet gives itself (its peer metadata), for labels; null when it
 * gives none. Shown as plain text only, trimmed to 40 characters, control characters dropped.
 */
export function walletConnectPeerName(current: {session?: {peer?: {metadata?: {name?: unknown}}} | null} | null = live): string | null {
  const name = current?.session?.peer?.metadata?.name;
  if (typeof name !== 'string') return null;
  const clean = name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40);
  return clean || null;
}
/**
 * Session AK (AFL9 wiring; `TIER 3 (wallet)`): a window event (no detail) each time this tab's session is approved or ends,
 * so the Staking panel can offer Keplr Mobile, or drop a connection whose pairing ended. It carries nothing; listeners
 * read walletConnectSession().
 */
export const WALLETCONNECT_CHANGE = 'zigoals:walletconnect-change';
const changed = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event(WALLETCONNECT_CHANGE)); };
/**
 * Security review I2: a WalletConnect v2 pairing link exactly (topic, version 2, its parameters), checked before it is
 * shown, drawn or put in any wallet's link.
 */
export const WC_URI = /^wc:[0-9a-f]{64}@2\?[A-Za-z0-9=&_.:%,\[\]-]+$/;
export const isWalletConnectUri = (uri: unknown): uri is string => typeof uri === 'string' && uri.length <= 2000 && WC_URI.test(uri);
/** Security review I3: a session never outlives the account it was paired under (a lock, a switch or a sign-out). */
const endOnAccountChange = () => { void stopWalletConnect(); };
export class WalletConnectUnavailable extends Error {}
/**
 * Starts a pairing: loads the package (only now), creates the in-memory client and returns the `wc:` link for the wallet
 * app plus the approval, which resolves to the session's checked accounts. Refuses before loading anything when the project
 * ID is not set.
 */
export async function startWalletConnect({projectId, origin, cosmosMethods, stakingMethods, loader = () => import('@walletconnect/sign-client') as unknown as ReturnType<Loader>}: {projectId: string | null; origin: string; cosmosMethods?: readonly string[]; stakingMethods?: readonly string[]; loader?: Loader}): Promise<{uri: string; approval: Promise<{accounts: WcAccount[]; wallet: string}>}> {
  if (!projectId || !/^[0-9a-f]{32}$/.test(projectId)) throw new WalletConnectUnavailable('WalletConnect is not set up in this build yet.');
  const url = new URL(origin);
  if (url.protocol !== 'https:' && url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') throw new WalletConnectUnavailable('WalletConnect needs this app\'s own https address.');
  const namespaces = stakingMethods ? stakingNamespaces(stakingMethods) : readOnlyNamespaces(cosmosMethods);
  // Security review I3: one pairing at a time; an earlier one (and its client) is ended first, never left orphaned.
  await stopWalletConnect();
  const {SignClient} = await loader();
  // Security review L2: a staking pairing says what it asks of the wallet; a linking pairing stays read-only.
  const description = stakingMethods ? 'Goals, habits and wealth. Asks you to approve each staking action you review.' : 'Goals, habits and wealth. Wallets are linked read-only.';
  const client = await SignClient.init({projectId, telemetryEnabled: false, storage: memoryStorage(), metadata: {name: 'ZIGoals', description, url: url.origin, icons: [`${url.origin}/apple-touch-icon.png`]}}) as Client;
  const {uri, approval} = await client.connect({optionalNamespaces: namespaces});
  if (!isWalletConnectUri(uri)) throw new WalletConnectUnavailable('WalletConnect did not give a pairing link.');
  const staking = !!stakingMethods;
  live = {client, session: null, staking};
  // Session AL (Z1C-I2; `TIER 3 (wallet)`, bookkeeping only): the wallet may end or let the session expire on its side.
  // This tab's session is then dropped and the change announced, so the Staking panel stops saying it is paired.
  const ended = (args?: {topic?: unknown}) => {
    if (live?.client !== client || !live.session || live.session.topic !== args?.topic) return;
    live = null;
    if (typeof window !== 'undefined') window.removeEventListener(ACCOUNT_CHANGE, endOnAccountChange);
    changed();
  };
  client.on?.('session_delete', ended);
  client.on?.('session_expire', ended);
  if (typeof window !== 'undefined') window.addEventListener(ACCOUNT_CHANGE, endOnAccountChange);
  return {uri, approval: approval().then(async session => {
    // A pairing that was ended (a newer one, Remove, or an account change) before the wallet approved is closed at once.
    if (live?.client !== client) {
      try { await client.disconnect({topic: session.topic, reason: {code: 6000, message: 'User disconnected'}}); } catch { /* gone anyway */ }
      throw new WalletConnectUnavailable('This pairing was ended before the wallet approved it, so nothing was linked.');
    }
    live = {client, session, staking};
    changed();
    const name = session.peer?.metadata?.name;
    return {accounts: accountsOf(session.namespaces), wallet: typeof name === 'string' ? name.slice(0, 40) : 'WalletConnect'};
  })};
}
/** Ends this tab's session, best effort; nothing stays on the device either way. */
export async function stopWalletConnect(): Promise<void> {
  const current = live; live = null;
  if (typeof window !== 'undefined') window.removeEventListener(ACCOUNT_CHANGE, endOnAccountChange);
  if (current?.session) changed();
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
  if (!isWalletConnectUri(uri)) throw Error('Not a WalletConnect link.');
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
