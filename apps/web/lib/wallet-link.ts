import {TESTNET, keplrChainInfo} from '@zigoals/chain-config';
import {isEvmAddress, isZigAddress} from './wallet-address';

/**
 * Session AE (Part 6, ADR-027; `TIER 3 (wallet)`): reading a public address from another wallet, for display only. The
 * app's own wallet stays Keplr (or the local demo); nothing here signs, sends, switches a network or asks for a permission
 * beyond the address, and nothing here makes a network request.
 * - Cosmos wallets (Keplr-compatible): the same reviewed chain details and calls as Keplr's connect
 *   (`experimentalSuggestChain(keplrChainInfo())`, `enable`, `getKey`), and only `bech32Address` is read from the answer.
 * - EVM wallets found through EIP-6963: `eth_requestAccounts`, the first account.
 * - Keplr's Disconnect: `disable(chainId)` when the extension offers it, best effort, never awaited, never throwing.
 * lib/wallet-guard.test.ts fails if any signing, sending or permission method appears in these files.
 */
export type CosmosLinkProvider = {
  experimentalSuggestChain(info: ReturnType<typeof keplrChainInfo>): Promise<unknown>;
  enable(chainId: string): Promise<unknown>;
  getKey(chainId: string): Promise<unknown>;
};
export type CosmosWalletId = 'leap' | 'cosmostation';
// Gate C security review: an injected object is page-supplied; a property that throws on reading (an abandoned extension, a
// Proxy) reads as "not installed" instead of taking the menu, and with it the page, down.
const asCosmosProvider = (value: unknown): CosmosLinkProvider | undefined => {
  try {
    const p = value as Partial<Record<keyof CosmosLinkProvider, unknown>> | null | undefined;
    return p && typeof p === 'object' && typeof p.experimentalSuggestChain === 'function' && typeof p.enable === 'function' && typeof p.getKey === 'function' ? p as CosmosLinkProvider : undefined;
  } catch { return undefined; }
};
/**
 * The Cosmos wallets that can reach ZIGChain besides Keplr. Both ended their wallets in 2026 (Leap on 28 May; Cosmostation
 * winding down from 1 September), so they are offered only when the extension is still installed, to read the address it
 * holds, and never with a link to install them (Leap's site no longer answers).
 */
export const COSMOS_WALLETS: readonly {id: CosmosWalletId; name: string; ended: string; find: () => CosmosLinkProvider | undefined}[] = [
  {id: 'leap', name: 'Leap', ended: 'Leap ended its wallet on 28 May 2026', find: () => asCosmosProvider(globalValue('leap'))},
  {id: 'cosmostation', name: 'Cosmostation', ended: 'Cosmostation has been winding down its wallet since 1 September 2026', find: () => {
    try {
      const station = globalValue('cosmostation') as {providers?: {keplr?: unknown}} | undefined;
      return asCosmosProvider(station && typeof station === 'object' ? station.providers?.keplr : undefined);
    } catch { return undefined; }
  }},
];
function globalValue(name: string): unknown { try { return typeof window === 'undefined' ? undefined : Reflect.get(window, name); } catch { return undefined; } }

export const COSMOS_LINK_ERROR = 'That wallet did not give a ZIGChain address, so nothing was linked.';
/** The ZIGChain address a Cosmos wallet holds: the reviewed chain details, permission for this chain, then the address alone. */
export async function readCosmosAddress(provider: CosmosLinkProvider): Promise<string> {
  await provider.experimentalSuggestChain(keplrChainInfo());
  await provider.enable(TESTNET.chainId);
  const key = await provider.getKey(TESTNET.chainId);
  const address: unknown = key && typeof key === 'object' ? (key as {bech32Address?: unknown}).bech32Address : undefined;
  if (typeof address !== 'string' || !isZigAddress(address) || !address.toLowerCase().startsWith(`${TESTNET.addressPrefix}1`)) throw Error(COSMOS_LINK_ERROR);
  return address;
}

export type Eip1193Provider = {request(args: {method: string}): Promise<unknown>};
export type EvmWallet = {uuid: string; rdns: string; name: string; icon: string | null; provider: Eip1193Provider};
export const MAX_WALLET_ICON = 64 * 1024;
const ICON_PATTERN = /^data:image\/(png|svg\+xml|webp|jpeg)[;,]/;
/** An announced icon is shown only as a data: image of these four types under 64 kB; anything else gets the generic glyph. */
export const safeWalletIcon = (icon: unknown): string | null => typeof icon === 'string' && icon.length < MAX_WALLET_ICON && ICON_PATTERN.test(icon) ? icon : null;
/** An announced name as plain text: control and format characters (e.g. a right-to-left override) removed, whitespace
 *  folded, at most 40 characters. */
export const walletName = (name: unknown): string => typeof name === 'string' ? name.replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40) : '';
/** One EIP-6963 announcement, checked; null when any part is missing or malformed. */
export function announcedWallet(detail: unknown): EvmWallet | null {
  const d = detail as {info?: {uuid?: unknown; rdns?: unknown; name?: unknown; icon?: unknown}; provider?: {request?: unknown}} | null | undefined;
  const info = d && typeof d === 'object' ? d.info : undefined, provider = d && typeof d === 'object' ? d.provider : undefined;
  if (!info || typeof info !== 'object' || !provider || typeof provider !== 'object' || typeof provider.request !== 'function') return null;
  const {uuid, rdns} = info, name = walletName(info.name);
  // The uuid becomes part of element ids: letters, digits and hyphens only (a space would let it name other elements).
  if (typeof uuid !== 'string' || !/^[A-Za-z0-9-]{1,64}$/.test(uuid) || typeof rdns !== 'string' || rdns.length > 100 || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(rdns) || !name) return null;
  return {uuid, rdns: rdns.toLowerCase(), name, icon: safeWalletIcon(info.icon), provider: provider as Eip1193Provider};
}
export const MAX_EVM_WALLETS = 8;
/**
 * Asks the page's EVM wallets to announce themselves (EIP-6963) and collects them, one per uuid and per rdns, at most 8.
 * Returns the function that stops listening.
 */
export function discoverEvmWallets(onChange: (wallets: EvmWallet[]) => void, target: Pick<Window, 'addEventListener' | 'removeEventListener' | 'dispatchEvent'> = window): () => void {
  const found: EvmWallet[] = [];
  const announce = (event: Event) => {
    const wallet = announcedWallet((event as CustomEvent).detail);
    if (!wallet || found.length >= MAX_EVM_WALLETS || found.some(w => w.uuid === wallet.uuid || w.rdns === wallet.rdns)) return;
    found.push(wallet); onChange([...found]);
  };
  target.addEventListener('eip6963:announceProvider', announce);
  target.dispatchEvent(new Event('eip6963:requestProvider'));
  return () => target.removeEventListener('eip6963:announceProvider', announce);
}
export const EVM_LINK_ERROR = 'That wallet did not give an account address, so nothing was linked.';
/** The first account an EVM wallet gives for `eth_requestAccounts`, checked as 0x and 40 hex digits. */
export async function readEvmAddress(wallet: Pick<EvmWallet, 'provider'>): Promise<string> {
  const accounts = await wallet.provider.request({method: 'eth_requestAccounts'});
  const first: unknown = Array.isArray(accounts) ? accounts[0] : undefined;
  if (typeof first !== 'string' || !isEvmAddress(first)) throw Error(EVM_LINK_ERROR);
  return first;
}

/** Disconnect's call to Keplr: forget this site's permission for ZIGChain Testnet if the extension can. Never throws or waits. */
export function forgetKeplrPermission(keplr: unknown = globalValue('keplr')): void {
  try {
    const disable = keplr && typeof keplr === 'object' ? (keplr as {disable?: unknown}).disable : undefined;
    if (typeof disable === 'function') void Promise.resolve(disable.call(keplr, TESTNET.chainId)).catch(() => undefined);
  } catch { /* best effort: the app's own state is already back to the local demo */ }
}
export const keplrInstalled = () => { const k = globalValue('keplr'); return !!k && typeof k === 'object'; };

/**
 * The official sites, for wallets that are not installed (checked 2026-10-17; Leap's and Cosmostation's are left out, see
 * COSMOS_WALLETS). They open in a new tab with no opener and no referrer.
 */
export const KEPLR_SITE = 'https://www.keplr.app/';
export const EVM_SUGGESTIONS: readonly {rdns: string; name: string; href: string}[] = [
  {rdns: 'io.metamask', name: 'MetaMask', href: 'https://metamask.io/'},
  {rdns: 'io.rabby', name: 'Rabby', href: 'https://rabby.io/'},
  {rdns: 'com.coinbase.wallet', name: 'Coinbase Wallet', href: 'https://www.coinbase.com/wallet'},
];
