import {describe, expect, it} from 'vitest';
import {defaultMoneyCurrency, usedCurrencies} from './wealth-currency';

/**
 * Session AW (fr-money, FR-AW-2; persona Tom): a new account or debt starts in the currency the person's own records are
 * kept in (spending, accounts, debts), before the device's default; a stored choice and what is held still come first.
 */
describe('a new money record starts in the currency already used (FR-AW-2)', () => {
  it('Tom: spending all in euros on an en-GB (USD) device gives EUR, never a silent USD', () => {
    const used = usedCurrencies({entries: [{currency: 'EUR'}, {currency: 'EUR'}, {currency: 'EUR'}]});
    expect(defaultMoneyCurrency({used, device: 'USD'})).toBe('EUR');
  });
  it('a debt kept in euros counts, an archived one does not; the log\'s last choice counts once', () => {
    expect(defaultMoneyCurrency({used: usedCurrencies({accounts: [{currency: 'EUR'}]}), device: 'USD'})).toBe('EUR');
    expect(defaultMoneyCurrency({used: usedCurrencies({accounts: [{currency: 'EUR', archivedAt: '2026-11-01T00:00:00.000Z'}]}), device: 'USD'})).toBe('USD');
    expect(usedCurrencies({entries: [{currency: 'USD'}], logCurrency: 'EUR'})).toEqual(['USD', 'EUR']);
  });
  it('the most used wins; a tie or nothing keeps the device\'s; a stored choice and the held total still lead', () => {
    expect(defaultMoneyCurrency({used: ['USD', 'EUR', 'USD'], device: 'EUR'})).toBe('USD');
    expect(defaultMoneyCurrency({used: ['USD', 'EUR'], device: 'EUR'})).toBe('EUR');
    expect(defaultMoneyCurrency({used: ['GBP', 'GBP'], device: 'USD'})).toBe('USD');
    expect(defaultMoneyCurrency({stored: 'USD', used: ['EUR'], device: 'EUR'})).toBe('USD');
    expect(defaultMoneyCurrency({held: [{currency: 'USD', value: 900n}], used: ['EUR', 'EUR'], device: 'EUR'})).toBe('USD');
  });
});
