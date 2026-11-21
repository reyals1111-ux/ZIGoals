import {describe, expect, it} from 'vitest';
import {movePrice} from './engine';

/** Session AV (owner follow-up 1, F-MOVE-ALERT): a percent move from today's price, as an exact price. */
describe('Session AV (F-MOVE-ALERT)', () => {
  it('up and down from today, exact', () => {
    expect(movePrice('65000', 10, true)).toBe('71500');
    expect(movePrice('65000', 10, false)).toBe('58500');
    expect(movePrice('0.25', 20, true)).toBe('0.3');
    expect(movePrice('1.23456789', 5, false)).toBe('1.17283949');
  });
  it('refuses a fall of 100 % or more, and a move below 1 %', () => {
    expect(() => movePrice('65000', 100, false)).toThrow('Choose a fall of 1 to 90 %.');
    expect(() => movePrice('65000', 0, true)).toThrow();
  });
});

describe('Session AV (F-MOVE-ALERT): a portfolio worth above or below a value', () => {
  it('fires on a complete value only, once; an unknown value never fires; the record still reads', async () => {
    const {addPortfolioAlert, checkPortfolioAlerts, removePortfolioAlert} = await import('./engine');
    const {emptyPriceAlerts, priceAlertsSchema} = await import('./schema');
    const at = '2026-11-23T10:00:00.000Z';
    let r = addPortfolioAlert(emptyPriceAlerts(), {id: 'alert_portfolio-0001', portfolioId: 'p-real', portfolioName: 'Mine', currency: 'EUR', direction: 'above', value: '10000', createdAt: at, active: true});
    expect(checkPortfolioAlerts(r, () => null, at).fired).toEqual([]);
    expect(checkPortfolioAlerts(r, () => '9999.99', at).fired).toEqual([]);
    const hit = checkPortfolioAlerts(r, () => '10250.456', at);
    expect(hit.fired.map(f => f.text)).toEqual(['Mine is worth above 10000 EUR: 10250.45 EUR now.']);
    expect(hit.record.portfolio![0]).toMatchObject({active: false, firedAt: at});
    expect(checkPortfolioAlerts(hit.record, () => '20000', at).fired).toEqual([]);
    expect(priceAlertsSchema.parse(JSON.parse(JSON.stringify(hit.record)))).toEqual(hit.record);
    r = removePortfolioAlert(r, 'alert_portfolio-0001');
    expect(r).toEqual(emptyPriceAlerts());
    expect(priceAlertsSchema.parse({version: 1, portfolio: 'x'}).portfolio).toBeUndefined();
  });
});
