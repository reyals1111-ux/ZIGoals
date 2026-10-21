import {addressShapeOk} from '../../wallet-address';
import type {TrackedChain} from './chains';
import {BalanceReadError, readJson, type Fetcher} from './http';
import type {ChainRead} from './evm';

/**
 * Session AF (L2b, Part 3, ADR-028 H16 (c)): a watched Bitcoin address's confirmed balance, browser-direct from
 * mempool.space with one plain GET (`/api/address/<address>`, no header, so no preflight): `chain_stats.funded_txo_sum −
 * spent_txo_sum` in satoshis. Unconfirmed amounts (`mempool_stats`) are not counted; the page says "confirmed".
 */
const sats = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? BigInt(v) : null;
export async function readBitcoinBalance(chain: TrackedChain, address: string, fetcher?: Fetcher, now = () => new Date()): Promise<ChainRead> {
  if (chain.kind !== 'bitcoin' || !chain.origin || !addressShapeOk('btc', address)) throw new BalanceReadError('Not a Bitcoin address.');
  const answer = await readJson(`${chain.origin}/api/address/${encodeURIComponent(address)}`, {method: 'GET'}, fetcher);
  const stats = (answer as {address?: unknown; chain_stats?: {funded_txo_sum?: unknown; spent_txo_sum?: unknown}} | null);
  const funded = sats(stats?.chain_stats?.funded_txo_sum), spent = sats(stats?.chain_stats?.spent_txo_sum);
  if (stats?.address !== address || funded === null || spent === null || spent > funded) throw new BalanceReadError('mempool.space sent a balance ZIGoals could not check.');
  return {at: now().toISOString(), assets: [{id: 'native', symbol: 'BTC', decimals: 8, amount: (funded - spent).toString()}], missing: []};
}
