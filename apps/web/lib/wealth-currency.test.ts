import {describe, expect, it} from 'vitest';
import {defaultMoneyCurrency, heldTotals} from './wealth-currency';

describe('heldTotals (Session AL final pass, N-MO-03)', () => {
  it('an EUR-only person on a US-English device gets EUR for a new money field', () => {
    const held = heldTotals([{asset: 'EUR', quantity: '50000', decimals: 2}]);
    expect(held).toEqual([{currency: 'EUR', value: 500n}]);
    expect(defaultMoneyCurrency({held, device: 'USD'})).toBe('EUR');
  });
  it('counts a recorded value in its currency, skips archived and non-money holdings, and never converts', () => {
    const held = heldTotals([
      {asset: 'BTC', quantity: '1', decimals: 8, valuation: {value: '6000000', currency: 'USD', decimals: 2}},
      {asset: 'EUR', quantity: '10000000', decimals: 2, archivedAt: '2026-11-01T00:00:00.000Z'},
      {asset: 'EUR', quantity: '1000', decimals: 2},
      {asset: 'GOLD', quantity: '5', decimals: 0},
    ]);
    expect(held).toEqual([{currency: 'USD', value: 60000n}, {currency: 'EUR', value: 10n}]);
    expect(defaultMoneyCurrency({held, device: 'EUR'})).toBe('USD');
  });
  it('a stored choice still wins, and nothing tracked keeps the device default', () => {
    expect(defaultMoneyCurrency({stored: 'USD', held: heldTotals([{asset: 'EUR', quantity: '100', decimals: 2}]), device: 'EUR'})).toBe('USD');
    expect(defaultMoneyCurrency({held: heldTotals([]), device: 'EUR'})).toBe('EUR');
  });
});
