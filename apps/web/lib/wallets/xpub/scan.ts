import {BalanceReadError, readJson, type Fetcher} from '../balances/http';
import {addressAt, type Watched} from './derive';
import {chainById} from '../balances/chains';

/**
 * Session AJ (item 36; amendment A5): the balance of a watched extended public key, read from mempool.space only.
 * - Addresses are read in small batches (3 at a time, a short pause between batches), and each address's answer is kept
 *   in memory for this visit, so a second read in the same visit asks only for what it has not seen.
 * - A 429 ("too many requests") waits for Retry-After (at most 30 s) or 2, 4, 8 s, three tries in all, then stops with
 *   a plain sentence; nothing loops.
 * - Each chain (receive, change) stops at the gap limit: 20 unused addresses in a row (BIP-44), and never past 1,000.
 * - Refreshes happen when the page opens or by hand, at most once every 5 minutes (MIN_REFRESH_MS, enforced by the caller
 *   with `refreshAllowed`).
 * The derived addresses are sent to mempool.space one per request (`/api/address/<address>`) and nowhere else.
 */
export const GAP_LIMIT = 20, BATCH = 3, MAX_PER_CHAIN = 1000, MIN_REFRESH_MS = 5 * 60_000, MAX_RETRY_WAIT_S = 30;
/** mempool.space, from the one list of balance hosts (lib/wallets/balances/chains.ts). */
export const MEMPOOL = chainById('bitcoin')!.origin!;
export type AddressFacts = {used: boolean; sats: bigint};
export type ScanResult = {sats: bigint; used: number; scanned: number};
export type Sleep = (ms: number) => Promise<void>;
const sleepFor: Sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const count = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? BigInt(v) : null;

export async function readAddress(address: string, fetcher?: Fetcher, sleep: Sleep = sleepFor): Promise<AddressFacts> {
  for (let attempt = 0; ; attempt++) {
    try {
      const answer = await readJson(`${MEMPOOL}/api/address/${encodeURIComponent(address)}`, {method: 'GET'}, fetcher) as {address?: unknown; chain_stats?: Record<string, unknown>; mempool_stats?: Record<string, unknown>} | null;
      const c = answer?.chain_stats, m = answer?.mempool_stats, funded = count(c?.funded_txo_sum), spent = count(c?.spent_txo_sum), txs = count(c?.tx_count), pending = count(m?.tx_count);
      if (answer?.address !== address || funded === null || spent === null || txs === null || spent > funded) throw new BalanceReadError('mempool.space sent a balance ZIGoals could not check.');
      return {used: txs > 0n || (pending ?? 0n) > 0n, sats: funded - spent};
    } catch (error) {
      if (!(error instanceof BalanceReadError) || error.status !== 429) throw error;
      if (attempt >= 2) throw new BalanceReadError('mempool.space asked ZIGoals to slow down. Try again in a few minutes.', 429);
      await sleep(Math.min(error.retryAfterSeconds ?? 2 ** (attempt + 1), MAX_RETRY_WAIT_S) * 1000);
    }
  }
}

export type Scanner = {scan: (watched: Watched) => Promise<ScanResult>};
/** One scanner per visit: it keeps each address's answer in memory (`seen`), so a refresh re-reads only what is new. */
export function createScanner(fetcher?: Fetcher, sleep: Sleep = sleepFor, seen = new Map<string, AddressFacts>()): Scanner {
  return {async scan(watched) {
    let sats = 0n, used = 0, scanned = 0;
    for (const chain of [0, 1] as const) {
      const branch = watched.key.deriveChild(chain);
      let gap = 0;
      for (let start = 0; gap < GAP_LIMIT && start < MAX_PER_CHAIN; start += BATCH) {
        const addresses = await Promise.all(Array.from({length: Math.min(BATCH, MAX_PER_CHAIN - start)}, (_, i) => addressAt(watched, chain, start + i, branch)));
        const fresh = addresses.filter(a => !seen.has(a));
        const facts = await Promise.all(fresh.map(a => readAddress(a, fetcher, sleep)));
        fresh.forEach((a, i) => seen.set(a, facts[i]!));
        for (const a of addresses) {
          const f = seen.get(a)!; scanned++;
          if (f.used) { used++; gap = 0; sats += f.sats; } else gap++;
          if (gap >= GAP_LIMIT) break;
        }
        if (fresh.length && gap < GAP_LIMIT) await sleep(250);
      }
    }
    return {sats, used, scanned};
  }};
}

/** A refresh is allowed once every 5 minutes (amendment A5). */
export const refreshAllowed = (lastAt: string | undefined, now: number) => !lastAt || now - Date.parse(lastAt) >= MIN_REFRESH_MS || Date.parse(lastAt) > now;
