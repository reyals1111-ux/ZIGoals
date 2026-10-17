import {describe, expect, test} from 'vitest';
import {BITCOIN_MARKET_REF, displayRequests, displayValue, freshQuote} from './wallet-display';
import {nativeZigMarketRef} from './market-assets';
import type {MarketQuote} from './market-quotes';

// Session AE (Part 6, ADR-027): the wallet card's display currency. Fictional prices.
const NOW = Date.parse('2026-10-17T12:00:00.000Z'), at = new Date(NOW - 60_000).toISOString(), old = new Date(NOW - 16 * 60_000).toISOString();
const ZIG_BASE = {network: 'zigchain-1', denom: 'azig', decimals: 18};
const quote = (id: string, currency: 'USD' | 'EUR', price: string, priceDecimals: number, observedAt = at, withRef = true): MarketQuote => ({base: id === 'bitcoin' ? {network: 'manual', denom: 'btc', decimals: 0} : ZIG_BASE, ...(withRef ? {marketRef: {provider: 'coingecko' as const, kind: 'coin' as const, id}} : {}), currency, price, priceDecimals, source: 'CoinGecko', providerAssetId: id, observedAt, verification: 'VERIFIED'});
const THOUSAND = (1000n * 10n ** 18n).toString();

describe('display currency', () => {
  test('ZIG asks for nothing; USD and EUR ask for ZIG in that currency; BTC asks for ZIG and Bitcoin in USD', () => {
    expect(displayRequests('ZIG')).toEqual([]);
    expect(displayRequests('USD')).toEqual([{marketRef: nativeZigMarketRef, currency: 'USD'}]);
    expect(displayRequests('EUR')).toEqual([{marketRef: nativeZigMarketRef, currency: 'EUR'}]);
    expect(displayRequests('BTC')).toEqual([{marketRef: nativeZigMarketRef, currency: 'USD'}, {marketRef: BITCOIN_MARKET_REF, currency: 'USD'}]);
    expect(nativeZigMarketRef.id).toBe('zignaly');
  });
  test('ZIG is the balance exactly; USD and EUR at ZIG\'s price; BTC is the USD value over Bitcoin\'s USD price, cut to 8 places', () => {
    const quotes = [quote('zignaly', 'USD', '1234', 5), quote('zignaly', 'EUR', '1100', 5), quote('bitcoin', 'USD', '6000000', 2)];
    expect(displayValue(THOUSAND, 18, 'ZIG', [], NOW)).toEqual({state: 'value', amount: '1000', unit: 'ZIG'});
    expect(displayValue('1500000000000000001', 18, 'ZIG', [], NOW)).toEqual({state: 'value', amount: '1.500000000000000001', unit: 'ZIG'});
    expect(displayValue(THOUSAND, 18, 'USD', quotes, NOW)).toEqual({state: 'value', amount: '12.34', unit: 'USD'});
    expect(displayValue(THOUSAND, 18, 'EUR', quotes, NOW)).toEqual({state: 'value', amount: '11', unit: 'EUR'});
    // 12.34 USD / 60,000 USD = 0.000205666… BTC, cut (never rounded up) to 0.00020566.
    expect(displayValue(THOUSAND, 18, 'BTC', quotes, NOW)).toEqual({state: 'value', amount: '0.00020566', unit: 'BTC'});
    // A known zero balance at a known price is 0, which is true; only an unknown price is unavailable.
    expect(displayValue('0', 18, 'USD', quotes, NOW)).toEqual({state: 'value', amount: '0', unit: 'USD'});
  });
  test('a missing, old or other-currency price is unavailable, never 0; a malformed balance too', () => {
    expect(displayValue(THOUSAND, 18, 'USD', [], NOW)).toEqual({state: 'unavailable'});
    expect(displayValue(THOUSAND, 18, 'USD', [quote('zignaly', 'USD', '1234', 5, old)], NOW)).toEqual({state: 'unavailable'});
    expect(displayValue(THOUSAND, 18, 'EUR', [quote('zignaly', 'USD', '1234', 5)], NOW)).toEqual({state: 'unavailable'});
    expect(displayValue(THOUSAND, 18, 'BTC', [quote('zignaly', 'USD', '1234', 5)], NOW)).toEqual({state: 'unavailable'});
    expect(displayValue(THOUSAND, 18, 'BTC', [quote('bitcoin', 'USD', '6000000', 2)], NOW)).toEqual({state: 'unavailable'});
    expect(displayValue(THOUSAND, 18, 'BTC', [quote('zignaly', 'USD', '1234', 5), quote('bitcoin', 'EUR', '6000000', 2)], NOW)).toEqual({state: 'unavailable'});
    for (const bad of ['', '-1', '1.5', 'x']) expect(displayValue(bad, 18, 'ZIG', [], NOW)).toEqual({state: 'unavailable'});
  });
  test('an older quote without a market reference is matched by its provider id', () => {
    expect(freshQuote([quote('zignaly', 'USD', '1', 2, at, false)], 'zignaly', 'USD', NOW)?.price).toBe('1');
    expect(freshQuote([quote('ethereum', 'USD', '1', 2)], 'zignaly', 'USD', NOW)).toBeNull();
  });
});
