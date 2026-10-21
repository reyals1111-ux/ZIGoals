import type {LinkedWallet} from '../../linked-wallets';
import {readBitcoinBalance} from './bitcoin';
import {chainsFor, type TrackedChain} from './chains';
import {readCosmosHubBalance} from './cosmos-hub';
import {readEvmBalances, type ChainRead} from './evm';
import {BalanceReadError, type Fetcher} from './http';
import {readSolanaBalances} from './solana';
import {observationOf, withFailure, withObservation, writeWalletBalances, type WalletBalances} from './store';
import {readZigchainBalances} from './zigchain';

/**
 * Session AF (L2b, Part 3, ADR-028 H16): when and how a linked wallet's balances are read. A chain is read when its last
 * reading is older than 15 minutes (or on the person's "Refresh"), at most one read in flight per wallet × chain, and only
 * for a wallet the person linked (never a typed or page-supplied address, never a ZIGoals address, never in the Showcase,
 * whose record has no linked wallets). Each address goes only to its own chain's reader: an EVM address to the six EVM
 * hosts, a Solana address to Solana's, a Bitcoin address to mempool.space, a ZIGChain address to ZIGoals' relay and, as
 * its Cosmos Hub twin, to Cosmos Hub's (lib/wallets/balances/chains.ts `chainsFor`). The result is stored on this device
 * (lib/wallets/balances/store.ts); a failure keeps the last good amounts with the reason.
 */
export const BALANCE_FRESH_MS = 15 * 60 * 1000;
export type ReadDeps = {fetcher?: Fetcher; now?: () => Date; zigchain?: Parameters<typeof readZigchainBalances>[2]};
export function readChain(chain: TrackedChain, wallet: Pick<LinkedWallet, 'kind' | 'address'>, deps: ReadDeps = {}): Promise<ChainRead> {
  const {fetcher, now} = deps;
  switch (chain.kind) {
    case 'evm': return wallet.kind === 'evm' ? readEvmBalances(chain, wallet.address, fetcher, now) : Promise.reject(new BalanceReadError('Not an EVM wallet.'));
    case 'solana': return wallet.kind === 'solana' ? readSolanaBalances(chain, wallet.address, fetcher, now) : Promise.reject(new BalanceReadError('Not a Solana wallet.'));
    case 'bitcoin': return wallet.kind === 'btc' ? readBitcoinBalance(chain, wallet.address, fetcher, now) : Promise.reject(new BalanceReadError('Not a Bitcoin address.'));
    case 'cosmos-hub': return wallet.kind === 'cosmos' ? readCosmosHubBalance(chain, wallet.address, fetcher, now) : Promise.reject(new BalanceReadError('Not a ZIGChain wallet.'));
    case 'zigchain': return wallet.kind === 'cosmos' ? readZigchainBalances(chain, wallet.address, deps.zigchain, now) : Promise.reject(new BalanceReadError('Not a ZIGChain wallet.'));
  }
}
/** The wallet × chain pairs whose reading is missing or older than 15 minutes (all of them when forced). */
export function dueReads(wallets: readonly LinkedWallet[], record: WalletBalances, now: number, force = false): {wallet: LinkedWallet; chain: TrackedChain}[] {
  return wallets.flatMap(wallet => chainsFor(wallet).filter(chain => {
    if (force) return true;
    const o = observationOf(record, wallet.id, chain.id), last = Math.max(0, ...[o?.at, o?.errorAt].map(t => Date.parse(t ?? '')).filter(Number.isFinite));
    return !o || now - last >= BALANCE_FRESH_MS || last > now + 60_000;
  }).map(chain => ({wallet, chain})));
}
const inFlight = new Map<string, Promise<void>>();
/** Reads one wallet on one chain and stores what came back; a second call while the first runs joins it. */
export function refreshOne(storage: Pick<Storage, 'getItem' | 'setItem'>, wallet: LinkedWallet, chain: TrackedChain, deps: ReadDeps = {}): Promise<void> {
  const key = `${wallet.id}|${chain.id}`, running = inFlight.get(key);
  if (running) return running;
  const now = deps.now ?? (() => new Date());
  const job = (async () => {
    try {
      const read = await readChain(chain, wallet, deps);
      writeWalletBalances(storage, record => withObservation(record, {walletId: wallet.id, chainId: chain.id, at: read.at, assets: read.assets, missing: read.missing, ...(read.height ? {height: read.height} : {})}));
    } catch (error) {
      const reason = error instanceof BalanceReadError ? error.message : `${chain.name} could not be read just now.`;
      try { writeWalletBalances(storage, record => withFailure(record, wallet.id, chain.id, reason, now().toISOString())); } catch { /* an unreadable record stays as it is */ }
    } finally { inFlight.delete(key); }
  })();
  inFlight.set(key, job);
  return job;
}
