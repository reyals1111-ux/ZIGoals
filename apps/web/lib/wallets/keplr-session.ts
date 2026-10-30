import {STAKING_NETWORKS, keplrChainInfoFor, NETWORK_CHANGED, type StakingNetwork} from '@zigoals/chain-config/networks';
import {requireReviewedVersion} from '@zigoals/chain-config/reviewed-versions';
import {WALLET_SESSION_KEY} from '../af-signing-keys';
import {isZigAccount} from '../staking/address';

/**
 * Session AF (ADR-028 H61, H87; `TIER 3 (wallet/signing)`): the staking page's own Keplr connection, for the network the
 * person chose. The app's existing "Connect Keplr" button and its extension flow (components/goal-provider.tsx) are not
 * touched: this is a separate, tab-only session used by the staking actions alone.
 * - Order (H61): the network's identity is read from the RPC the browser later signs through (`/status` network and
 *   `/abci_info` version, plain GETs); then `enable(chainId)` (both chains are in Keplr's registry), and only when Keplr
 *   answers that it has no chain info, `experimentalSuggestChain(keplrChainInfoFor(network))` and `enable` again; then
 *   `getKey` for the address and whether it is a Ledger. Nothing here signs or sends; no other wallet method is called.
 * - Kept in sessionStorage (`zigoals:wallet-session:v1`, this tab only, never exported) and dropped when Keplr says the
 *   key changed (`keplr_keystorechange`).
 */
export type KeplrConnect = {
  enable(chainId: string): Promise<unknown>;
  experimentalSuggestChain(info: ReturnType<typeof keplrChainInfoFor>): Promise<unknown>;
  getKey(chainId: string): Promise<unknown>;
};
export type StakingSession = {version: 1; network: StakingNetwork; chainId: string; address: string; isLedger: boolean; connectedAt: string};
export const NO_KEPLR = 'Keplr is not installed in this browser. On a phone, open ZIGoals inside the Keplr app.';
export const WRONG_ADDRESS = 'Keplr did not give a ZIGChain address for this network, so nothing was connected.';
const NO_CHAIN_INFO = /no chain info|there is no chain|chain info.*not found|unknown chain/i;

/** The RPC's own identity: its network id and a reviewed application version (fails closed). */
export async function verifyRpcIdentity(network: StakingNetwork, fetcher: typeof fetch = fetch): Promise<string> {
  const config = STAKING_NETWORKS[network];
  if (!config) throw Error(NETWORK_CHANGED);
  const read = async (path: string) => {
    const response = await fetcher(config.rpcUrl + path, {method: 'GET', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(12000)});
    if (!response.ok) throw Error('The network did not answer just now. Try again in a minute.');
    const text = await response.text();
    if (text.length > 200_000) throw Error(NETWORK_CHANGED);
    return JSON.parse(text) as {result?: Record<string, unknown>};
  };
  const [status, info] = await Promise.all([read('/status'), read('/abci_info')]);
  const chainId = (status.result?.node_info as {network?: unknown} | undefined)?.network;
  const version = (info.result?.response as {version?: unknown} | undefined)?.version;
  if (chainId !== config.chainId || typeof version !== 'string') throw Error(NETWORK_CHANGED);
  // Session AJ (ADR-035 D1, P5): any patch of a reviewed minor line; a newer line fails closed in D1's words.
  return requireReviewedVersion(config.chainId, version, NETWORK_CHANGED).version;
}
export async function connectStaking(network: StakingNetwork, keplr: KeplrConnect | undefined, verify: (network: StakingNetwork) => Promise<unknown> = verifyRpcIdentity): Promise<StakingSession> {
  if (!keplr) throw Error(NO_KEPLR);
  const config = STAKING_NETWORKS[network];
  if (!config) throw Error(NETWORK_CHANGED);
  await verify(network);
  try { await keplr.enable(config.chainId); }
  catch (error) {
    if (!NO_CHAIN_INFO.test(error instanceof Error ? error.message : String(error))) throw error;
    await keplr.experimentalSuggestChain(keplrChainInfoFor(network));
    await keplr.enable(config.chainId);
  }
  const key = await keplr.getKey(config.chainId) as {bech32Address?: unknown; isNanoLedger?: unknown} | null;
  const address = key?.bech32Address;
  if (!isZigAccount(address)) throw Error(WRONG_ADDRESS);
  return {version: 1, network, chainId: config.chainId, address, isLedger: key?.isNanoLedger === true, connectedAt: new Date().toISOString()};
}
type Session = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
/** The tab's staking session when it is well formed and for the network asked; anything else reads as none. */
export function readStakingSession(storage: Session | null, network: StakingNetwork): StakingSession | null {
  try {
    const value = JSON.parse(storage?.getItem(WALLET_SESSION_KEY) ?? 'null') as Partial<StakingSession> | null;
    return value && value.version === 1 && value.network === network && value.chainId === STAKING_NETWORKS[network]?.chainId && isZigAccount(value.address) && typeof value.isLedger === 'boolean' && typeof value.connectedAt === 'string' ? value as StakingSession : null;
  } catch { return null; }
}
export function saveStakingSession(storage: Session | null, session: StakingSession): void { try { storage?.setItem(WALLET_SESSION_KEY, JSON.stringify(session)); } catch { /* the session lives in memory for this page */ } }
export function dropStakingSession(storage: Session | null): void { try { storage?.removeItem(WALLET_SESSION_KEY); } catch { /* nothing kept */ } }
/** Calls back when Keplr says the key changed; returns the unsubscribe. */
export function onKeystoreChange(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener('keplr_keystorechange', callback);
  return () => window.removeEventListener('keplr_keystorechange', callback);
}
/**
 * Keplr Mobile's in-app browser (H87): `keplrwallet://web-browser?url=…` (iOS and the default) and Android's intent form
 * with Keplr's package, the two forms Keplr documents. The page opened is this app's own staking page, or (Session AF
 * chunk 3) another of the app's own signing pages: Governance, or the app's start page.
 */
export const KEPLR_OPEN_PATHS = Object.freeze(['/app/staking', '/app/governance', '/app'] as const);
export function keplrMobileLink(origin: string, android: boolean, path: typeof KEPLR_OPEN_PATHS[number] = '/app/staking'): string {
  if (!(KEPLR_OPEN_PATHS as readonly string[]).includes(path)) throw Error('Only this app\'s own pages can be opened in Keplr.');
  const url = new URL(path, origin);
  if (url.protocol !== 'https:' && url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') throw Error('Only this app\'s own address can be opened in Keplr.');
  const target = encodeURIComponent(url.toString());
  return android ? `intent://web-browser?url=${target}#Intent;package=com.chainapsis.keplr;scheme=keplrwallet;end;` : `keplrwallet://web-browser?url=${target}`;
}
