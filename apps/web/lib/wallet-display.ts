import {nativeZigMarketRef, type MarketAssetRef, type MarketQuoteRequest} from './market-assets';
import {quoteIsStale, type MarketQuote} from './market-quotes';
import type {DisplayCurrency} from './linked-wallets';

/**
 * Session AE (Part 6, ADR-027): what Today's wallet card shows in the chosen display currency, from prices the app already
 * reads (the market service's CoinGecko pairs): ZIG through `zignaly` in USD or EUR, and BTC as the USD value divided by
 * Bitcoin's USD price. Exact integer arithmetic on base units; a price older than the app's 15-minute freshness, or one
 * that is missing, makes the value unavailable (never 0, never estimated).
 */
export const BITCOIN_MARKET_REF: MarketAssetRef = {provider: 'coingecko', kind: 'coin', id: 'bitcoin'};
/** The pairs a display currency needs; ZIG needs none, so the card asks for nothing until another currency is chosen. */
export function displayRequests(display: DisplayCurrency): MarketQuoteRequest[] {
  return display === 'USD' || display === 'EUR' ? [{marketRef: nativeZigMarketRef, currency: display}]
    : display === 'BTC' ? [{marketRef: nativeZigMarketRef, currency: 'USD'}, {marketRef: BITCOIN_MARKET_REF, currency: 'USD'}] : [];
}
/** A fresh verified quote for a CoinGecko coin in a currency, or null. */
export function freshQuote(quotes: readonly MarketQuote[], id: string, currency: 'USD' | 'EUR', now: number): MarketQuote | null {
  return quotes.find(q => (q.marketRef ? q.marketRef.provider === 'coingecko' && q.marketRef.kind === 'coin' && q.marketRef.id === id : q.providerAssetId === id) && q.currency === currency && !quoteIsStale(q, now)) ?? null;
}
const point = (n: bigint, digits: number) => { const s = n.toString().padStart(digits + 1, '0'), fraction = s.slice(-digits).replace(/0+$/, ''); return fraction ? `${s.slice(0, -digits)}.${fraction}` : s.slice(0, -digits); };
export type DisplayValue = {state: 'value'; amount: string; unit: DisplayCurrency} | {state: 'unavailable'};
/**
 * A ZIG balance (base units, `decimals` places) in the display currency: a plain decimal text (ZIG exact; the others cut,
 * never rounded up, to 8 places), or unavailable.
 */
export function displayValue(balance: string, decimals: number, display: DisplayCurrency, quotes: readonly MarketQuote[], now: number): DisplayValue {
  if (!/^\d{1,78}$/.test(balance) || !Number.isInteger(decimals) || decimals < 0 || decimals > 18) return {state: 'unavailable'};
  const units = BigInt(balance), scale = 10n ** BigInt(decimals), out = 10n ** 8n;
  // ZIG itself: exact, as the card has always shown it.
  if (display === 'ZIG') return {state: 'value', amount: decimals ? point(units, decimals) : units.toString(), unit: 'ZIG'};
  if (display === 'USD' || display === 'EUR') {
    const zig = freshQuote(quotes, nativeZigMarketRef.id, display, now);
    return zig ? {state: 'value', amount: point(units * BigInt(zig.price) * out / (scale * 10n ** BigInt(zig.priceDecimals)), 8), unit: display} : {state: 'unavailable'};
  }
  const zig = freshQuote(quotes, nativeZigMarketRef.id, 'USD', now), btc = freshQuote(quotes, BITCOIN_MARKET_REF.id, 'USD', now);
  if (!zig || !btc) return {state: 'unavailable'};
  return {state: 'value', amount: point(units * BigInt(zig.price) * 10n ** BigInt(btc.priceDecimals) * out / (scale * 10n ** BigInt(zig.priceDecimals) * BigInt(btc.price)), 8), unit: 'BTC'};
}
