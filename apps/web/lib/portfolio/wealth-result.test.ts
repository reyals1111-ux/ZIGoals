import {describe, expect, it} from 'vitest';
import {portfolioResultsFor} from './wealth-result';
import type {Portfolio, PortfolioData} from './schema';

// Session AL Part 15 (AL-COMPETITOR-GAP-025, C-TK-11): a coin's gain or loss on Wealth, from Portfolio's own records. Fictional.
const AT = '2026-10-01T09:00:00.000Z', BTC = {provider: 'coingecko', kind: 'coin', id: 'bitcoin'} as const, KEY = 'coingecko:coin:bitcoin';
const coin = {ref: BTC, name: 'Bitcoin', symbol: 'BTC'};
const tx = (id: string, kind: 'buy' | 'sell' | 'transfer-in', quantity: string, price?: string) => ({id, coin: KEY, kind, quantity, ...(price ? {price} : {}), date: '2026-09-01', note: '', createdAt: AT});
const portfolio = (id: string, over: Partial<Portfolio>): Portfolio => ({id, name: `Fictional ${id}`, kind: 'real', currency: 'USD', createdAt: AT, coins: [coin], transactions: [], ...over});
const data = (...portfolios: Portfolio[]): PortfolioData => ({version: 1, portfolios});

describe('portfolioResultsFor', () => {
  it('each real portfolio holding the coin, in its own currency: cost, value and the gain or loss', () => {
    const rows = portfolioResultsFor(data(
      portfolio('a', {transactions: [tx('1', 'buy', '0.5', '60000'), tx('2', 'buy', '0.5', '40000'), tx('3', 'sell', '0.25', '70000')]}),
      portfolio('b', {currency: 'EUR', transactions: [tx('4', 'buy', '1', '50000')]}),
    ), BTC, c => c === 'USD' ? '64000' : '55000');
    expect(rows).toEqual([
      {portfolioId: 'a', name: 'Fictional a', currency: 'USD', quantity: '0.75', cost: '37500', averageCost: '50000', value: '48000', unrealized: '10500', unrealizedPct: '28'},
      {portfolioId: 'b', name: 'Fictional b', currency: 'EUR', quantity: '1', cost: '50000', averageCost: '50000', value: '55000', unrealized: '5000', unrealizedPct: '10'},
    ]);
  });
  it('unknown stays unknown: no price gives no value; a transfer without a price gives no cost and no result', () => {
    const [noPrice] = portfolioResultsFor(data(portfolio('a', {transactions: [tx('1', 'buy', '1', '100')]})), BTC, () => undefined);
    expect(noPrice).toEqual({portfolioId: 'a', name: 'Fictional a', currency: 'USD', quantity: '1', cost: '100', averageCost: '100'});
    const [noCost] = portfolioResultsFor(data(portfolio('a', {transactions: [tx('1', 'transfer-in', '1')]})), BTC, () => '100');
    expect(noCost).toEqual({portfolioId: 'a', name: 'Fictional a', currency: 'USD', quantity: '1', value: '100'});
  });
  it('leaves out hypothetical portfolios, other coins, a coin sold to zero and a history below zero', () => {
    const other = {ref: {provider: 'coingecko', kind: 'coin', id: 'ethereum'} as const, name: 'Ether', symbol: 'ETH'};
    expect(portfolioResultsFor(data(
      portfolio('h', {kind: 'hypothetical', transactions: [tx('1', 'buy', '1', '100')]}),
      portfolio('o', {coins: [other], transactions: [{...tx('2', 'buy', '1', '100'), coin: 'coingecko:coin:ethereum'}]}),
      portfolio('z', {transactions: [tx('3', 'buy', '1', '100'), tx('4', 'sell', '1', '120')]}),
      portfolio('n', {transactions: [tx('5', 'sell', '1', '120')]}),
    ), BTC, () => '100')).toEqual([]);
  });
});
