// Session AV Part 7 (F-YEAR): the yearly total of the confirmed bills, per currency, from each one's own cadence.
import {describe, expect, it} from 'vitest';
import {yearlyEstimate as avYearly} from './store';
describe('Session AV (F-YEAR): a year of these bills', () => {
  it('adds each bill at its own cadence and keeps currencies apart', () => {
    const record = {version: 1, bills: [
      {cadence: 'monthly', amount: '9.99', currency: 'EUR'}, {cadence: 'yearly', amount: '49.00', currency: 'EUR'},
      {cadence: 'weekly', amount: '2.00', currency: 'EUR'}, {cadence: 'quarterly', amount: '30.00', currency: 'USD'},
    ]} as unknown as Parameters<typeof avYearly>[0];
    expect(avYearly(record)).toEqual([{currency: 'EUR', cents: 999 * 12 + 4900 + 200 * 52}, {currency: 'USD', cents: 3000 * 4}]);
    expect(avYearly({version: 1, bills: []} as unknown as Parameters<typeof avYearly>[0])).toEqual([]);
  });
});
