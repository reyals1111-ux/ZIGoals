import {describe, expect, test} from 'vitest';
import {MARKET_REQUEST_CHUNK} from '../../market-assets';
import type {MarketQuote} from '../../market-quotes';
import {PRICE_IDS, priceRequests, totalOf, valueOf} from './pricing';
import {TRACKED_CHAINS} from './chains';
import {unitsText} from './units';
import type {Observation} from './store';

// Session AF (L2b, Part 3; P3.6, P3.9): pricing through the market service only; unknown never 0.
const NOW = Date.parse('2026-10-19T08:00:00.000Z');
const quote = (id: string, price: string, priceDecimals: number, currency = 'EUR', at = '2026-10-19T07:58:00.000Z'): MarketQuote => ({base: {network: 'coingecko-coin', denom: id, decimals: 0}, currency, price, priceDecimals, source: 'CoinGecko', providerAssetId: id, fetchedAt: at, observedAt: at, marketRef: {provider: 'coingecko', kind: 'coin', id}, verification: 'VERIFIED'});
const obs = (chainId: string, assets: {id: string; symbol: string; decimals: number; amount: string}[]): Observation => ({walletId: 'w1', chainId, at: '2026-10-19T07:59:00.000Z', assets});

describe('the price list', () => {
  test('only the market service\'s CoinGecko ids, each once, in one chunk; zero amounts and Binance-Peg USDC ask for nothing', () => {
    expect(PRICE_IDS).toEqual(['ethereum', 'binancecoin', 'polygon-ecosystem-token', 'solana', 'bitcoin', 'cosmos', 'usd-coin', 'tether', 'zignaly', 'staked-zig']);
    const every = TRACKED_CHAINS.flatMap(c => [c.native, ...c.tokens]).map(a => a.coingecko).filter(Boolean);
    expect([...new Set(every)].sort()).toEqual([...PRICE_IDS].sort());
    const requests = priceRequests([
      obs('eip155:1', [{id: 'native', symbol: 'ETH', decimals: 18, amount: '1'}, {id: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6, amount: '5'}]),
      obs('eip155:8453', [{id: 'native', symbol: 'ETH', decimals: 18, amount: '2'}, {id: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6, amount: '0'}]),
      obs('eip155:56', [{id: 'native', symbol: 'BNB', decimals: 18, amount: '0'}, {id: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', decimals: 18, amount: '9'}]),
      obs('zigchain-1', [{id: 'azig:staked', symbol: 'ZIG', decimals: 18, amount: '7'}]),
    ], 'EUR');
    expect(requests).toEqual(['ethereum', 'usd-coin', 'zignaly'].map(id => ({marketRef: {provider: 'coingecko', kind: 'coin', id}, currency: 'EUR'})));
    expect(requests.length).toBeLessThanOrEqual(MARKET_REQUEST_CHUNK);
  });
});

describe('values: exact, cut to cents, or unavailable with the reason', () => {
  test('ETH, USDC and staked ZIG in EUR; a stale or missing price is unavailable; Binance-Peg USDC is never priced as Circle\'s', () => {
    const quotes = [quote('ethereum', '345678', 2), quote('usd-coin', '86', 2), quote('zignaly', '512', 4), quote('cosmos', '300', 2, 'EUR', '2026-10-19T07:00:00.000Z')];
    expect(valueOf('eip155:1', {id: 'native', symbol: 'ETH', decimals: 18, amount: '1500000000000000000'}, quotes, 'EUR', NOW)).toMatchObject({state: 'value', cents: 518517n});
    expect(valueOf('eip155:1', {id: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6, amount: '1000000'}, quotes, 'EUR', NOW)).toMatchObject({state: 'value', cents: 86n});
    expect(valueOf('zigchain-1', {id: 'azig:staked', symbol: 'ZIG', decimals: 18, amount: '1000000000000000000000'}, quotes, 'EUR', NOW)).toMatchObject({state: 'value', cents: 5120n});
    expect(valueOf('cosmoshub-4', {id: 'uatom', symbol: 'ATOM', decimals: 6, amount: '1000000'}, quotes, 'EUR', NOW)).toEqual({state: 'unavailable', reason: 'No current price (prices count as current for 15 minutes).'});
    expect(valueOf('eip155:1', {id: 'native', symbol: 'ETH', decimals: 18, amount: '1'}, quotes, 'USD', NOW)).toMatchObject({state: 'unavailable'});
    expect(valueOf('eip155:56', {id: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', decimals: 18, amount: '1000000000000000000'}, quotes, 'EUR', NOW)).toEqual({state: 'unavailable', reason: 'Binance-Peg USDC is Binance’s own token, not Circle’s USDC, so ZIGoals shows no price for it.'});
    expect(valueOf('eip155:1', {id: '0xdead', symbol: 'X', decimals: 18, amount: '1'}, quotes, 'EUR', NOW)).toMatchObject({state: 'unavailable'});
    const t = totalOf([{state: 'value', cents: 100n, currency: 'EUR'}, {state: 'unavailable', reason: 'x'}, {state: 'value', cents: 23n, currency: 'EUR'}]);
    expect(t).toEqual({cents: 123n, known: 2, unavailable: 1});
  });
  test('amounts as read: cut, never rounded up; a dust amount is never shown as 0', () => {
    expect(unitsText('1500000000000000000', 18)).toBe('1.5');
    expect(unitsText('1999999999999999999', 18)).toBe('1.999999');
    expect(unitsText('1', 18)).toBe('< 0.000001');
    expect(unitsText('0', 18)).toBe('0');
    expect(unitsText('12345', 0)).toBe('12345');
    expect(unitsText('x', 6)).toBe('unavailable');
  });
});
