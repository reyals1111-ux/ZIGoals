import {MARKET_REQUEST_CHUNK, type MarketQuoteRequest} from '../../market-assets';
import type {MarketQuote} from '../../market-quotes';
import {freshQuote} from '../../wallet-display';
import {chainById, type TrackedAsset} from './chains';
import type {ObservedAsset, Observation} from './store';

/**
 * Session AF (L2b, Part 3, ADR-028 H16, H64; P3.6, P3.9): linked-wallet balances priced only through ZIGoals' existing market
 * service (`useMarketQuotes` → `POST /api/market-quotes`, CoinGecko ids, no Worker change): one deduplicated request list
 * of at most ten coins in the person's currency, inside one 32-pair chunk. Values are exact integer arithmetic on base
 * units, cut (never rounded up) to cents. A missing or older-than-15-minutes price, or an asset with no price of its own
 * (Binance-Peg USDC), is "unavailable" with the reason, never 0 and never estimated. Practice (testnet) money is never
 * read here at all: linked wallets are real-network addresses, and the app's own practice wallet keeps AE's rule.
 */
export type Currency = 'USD' | 'EUR';
export const PRICE_IDS = ['ethereum', 'binancecoin', 'polygon-ecosystem-token', 'solana', 'bitcoin', 'cosmos', 'usd-coin', 'tether', 'zignaly', 'staked-zig'] as const;
/** The tracked asset an observed one is, by chain and id. */
export function trackedAsset(chainId: string, asset: Pick<ObservedAsset, 'id'>): TrackedAsset | undefined {
  const chain = chainById(chainId);
  if (!chain) return undefined;
  const base = asset.id.startsWith('azig:') ? 'azig' : asset.id;
  return [chain.native, ...chain.tokens].find(a => a.id === base);
}
/** The market pairs the observations need: each priced coin once, in one currency; never more than one chunk. */
export function priceRequests(observations: readonly Observation[], currency: Currency): MarketQuoteRequest[] {
  const ids = new Set<string>();
  for (const o of observations) for (const a of o.assets ?? []) { const t = trackedAsset(o.chainId, a); if (t?.coingecko && a.amount !== '0') ids.add(t.coingecko); }
  const requests = PRICE_IDS.filter(id => ids.has(id)).map(id => ({marketRef: {provider: 'coingecko' as const, kind: 'coin' as const, id}, currency}));
  if (requests.length > MARKET_REQUEST_CHUNK) throw Error('More coins than one market chunk.');
  return requests;
}
export type Valued = {state: 'value'; cents: bigint; currency: Currency; quote?: MarketQuote} | {state: 'unavailable'; reason: string};
/** One observed amount in the person's currency, or unavailable with the reason. */
export function valueOf(chainId: string, asset: ObservedAsset, quotes: readonly MarketQuote[], currency: Currency, now: number): Valued {
  const tracked = trackedAsset(chainId, asset);
  if (!tracked) return {state: 'unavailable', reason: 'Not an asset ZIGoals tracks.'};
  if (!tracked.coingecko) return {state: 'unavailable', reason: tracked.note ?? 'ZIGoals has no price for this asset.'};
  if (!/^\d{1,78}$/.test(asset.amount)) return {state: 'unavailable', reason: 'The amount could not be read.'};
  if (asset.amount === '0') return {state: 'value', cents: 0n, currency};
  const quote = freshQuote(quotes, tracked.coingecko, currency, now);
  if (!quote) return {state: 'unavailable', reason: 'No current price (prices count as current for 15 minutes).'};
  const cents = BigInt(asset.amount) * BigInt(quote.price) * 100n / (10n ** BigInt(asset.decimals) * 10n ** BigInt(quote.priceDecimals));
  return {state: 'value', cents, currency, quote};
}
/** The sum of the values that are known, and how many were not. */
export function totalOf(values: readonly Valued[]): {cents: bigint; known: number; unavailable: number} {
  let cents = 0n, known = 0, unavailable = 0;
  for (const v of values) if (v.state === 'value') { cents += v.cents; known++; } else unavailable++;
  return {cents, known, unavailable};
}
