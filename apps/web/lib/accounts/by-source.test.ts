import {expect, test} from 'vitest';
import {holdingsBySource} from './by-source';
import {moneyText} from './net-worth';

test('Session AI (CO6): holdings by source, per currency, never converted; an unvalued holding is left out', () => {
  const out = holdingsBySource([
    {currency: 'USD', value: 6500000n, valuationState: 'fresh', source: 'COINGECKO'},
    {currency: 'USD', value: 120000n, valuationState: 'manual', source: 'Manual value'},
    {currency: 'USD', value: 30000n, valuationState: 'fresh', source: 'Verified Position value'},
    {currency: 'EUR', value: 50000n, valuationState: 'manual', source: 'Manual value'},
    {currency: 'USD', value: undefined, valuationState: 'missing'},
  ]);
  expect(out.map(o => o.currency)).toEqual(['EUR', 'USD']);
  const usd = out[1]!;
  expect(moneyText(usd.parts.market!)).toBe('65000.00'); expect(moneyText(usd.parts.own!)).toBe('1200.00'); expect(moneyText(usd.parts.verified!)).toBe('300.00');
  expect(usd.count).toEqual({market: 1, own: 1, verified: 1});
});
