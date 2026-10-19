import {isSolanaAddress} from '../wallet-address';
import {safeWalletIcon, walletName} from '../wallet-link';

/**
 * Session AF (L2b, Part 3, ADR-028 H40; `TIER 3 (wallet)`): reading a Solana address for display, through the Wallet
 * Standard's two-event handshake written out here (no dependency):
 * - the app listens for `wallet-standard:register-wallet` (a wallet that loads later announces itself with a callback the
 *   app calls with `{register}`), then dispatches `wallet-standard:app-ready` with the same `{register}` (a wallet that
 *   loaded first registers through it);
 * - only wallets whose `chains` include `solana:mainnet` and that offer `standard:connect` are kept, at most 8, one per name;
 * - linking calls `standard:connect` alone and takes the first account's address, checked as 32 bytes of base58;
 * - Remove may call the wallet's own `standard:disconnect`, best effort, never awaited, never throwing.
 * Nothing here signs, sends or makes a request: lib/wallet-guard.test.ts allows exactly these two features by name.
 */
export const SOLANA_MAINNET = 'solana:mainnet';
export type SolanaWallet = {key: string; name: string; icon: string | null; connect: () => Promise<unknown>; disconnect: (() => Promise<unknown>) | null};
export const MAX_SOLANA_WALLETS = 8;
type Feature = Record<string, unknown> | undefined;
const feature = (wallet: Record<string, unknown>, name: string): Feature => {
  try {
    const features = wallet.features as Record<string, unknown> | undefined;
    const value = features && typeof features === 'object' ? features[name] : undefined;
    return value && typeof value === 'object' ? value as Record<string, unknown> : undefined;
  } catch { return undefined; }
};
/** One registered Wallet Standard wallet, checked; null when it does not hold Solana mainnet or cannot connect. */
export function standardWallet(value: unknown): SolanaWallet | null {
  try {
    if (!value || typeof value !== 'object') return null;
    const wallet = value as Record<string, unknown>, name = walletName(wallet.name);
    const chains = Array.isArray(wallet.chains) ? wallet.chains : [];
    const connecting = feature(wallet, 'standard:connect'), disconnecting = feature(wallet, 'standard:disconnect');
    const connect = connecting?.connect, disconnect = disconnecting?.disconnect;
    if (!name || !chains.includes(SOLANA_MAINNET) || typeof connect !== 'function') return null;
    return {
      key: `solana:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'wallet'}`,
      name, icon: safeWalletIcon(wallet.icon),
      connect: () => Promise.resolve((connect as (this: unknown) => unknown).call(connecting)),
      disconnect: typeof disconnect === 'function' ? () => Promise.resolve((disconnect as (this: unknown) => unknown).call(disconnecting)) : null,
    };
  } catch { return null; }
}
/**
 * Collects the page's Solana wallets through the handshake above and reports each change. Returns the function that stops
 * listening (a wallet that registers later is then ignored).
 */
export function discoverSolanaWallets(onChange: (wallets: SolanaWallet[]) => void, target: Pick<Window, 'addEventListener' | 'removeEventListener' | 'dispatchEvent'> = window): () => void {
  const found: SolanaWallet[] = [];
  let listening = true;
  const register = (...wallets: unknown[]) => {
    if (listening) for (const value of wallets) {
      const wallet = standardWallet(value);
      if (!wallet || found.length >= MAX_SOLANA_WALLETS || found.some(w => w.key === wallet.key)) continue;
      found.push(wallet); onChange([...found]);
    }
    return () => undefined;
  };
  const api = Object.freeze({register});
  const onRegister = (event: Event) => {
    const callback = (event as CustomEvent).detail;
    if (typeof callback === 'function') try { callback(api); } catch { /* a wallet that throws is left out */ }
  };
  target.addEventListener('wallet-standard:register-wallet', onRegister);
  target.dispatchEvent(new CustomEvent('wallet-standard:app-ready', {detail: api}));
  return () => { listening = false; target.removeEventListener('wallet-standard:register-wallet', onRegister); };
}
export const SOLANA_LINK_ERROR = 'That wallet did not give a Solana address, so nothing was linked.';
/** The first account `standard:connect` gives, checked as a Solana address. */
export async function readSolanaAddress(wallet: Pick<SolanaWallet, 'connect'>): Promise<string> {
  const answer = await wallet.connect();
  const accounts: unknown = answer && typeof answer === 'object' ? (answer as {accounts?: unknown}).accounts : undefined;
  const first: unknown = Array.isArray(accounts) ? accounts[0] : undefined;
  const address: unknown = first && typeof first === 'object' ? (first as {address?: unknown}).address : undefined;
  if (typeof address !== 'string' || !isSolanaAddress(address)) throw Error(SOLANA_LINK_ERROR);
  return address;
}
/** Remove's call to the wallet: forget this site's connection if the wallet offers it. Never throws or waits. */
export function forgetSolanaConnection(wallet: Pick<SolanaWallet, 'disconnect'> | undefined): void {
  try { if (wallet?.disconnect) void wallet.disconnect().catch(() => undefined); } catch { /* best effort */ }
}
