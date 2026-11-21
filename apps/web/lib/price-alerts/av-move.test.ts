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

// Session AV (fresh-agent check q2, rank 35; CoinStats): a portfolio-value alert counted on Today and marked seen; its
// value from the prices read, null while a held coin has no price.
import {alertsForToday, anyActive, markSeen as avMarkSeen} from './engine';
import {portfolioValueNow} from './portfolio-value';
describe('Session AV (q2 rank 35): portfolio-value alerts on Today', () => {
  const base = {version: 1 as const, alerts: [], fired: [{alertId: 'alert_value-0001', at: '2026-11-20T10:00:00.000Z', text: 'Fictional coins is worth above 30000 USD: 35000 USD now.'}],
    portfolio: [{id: 'alert_value-0001', portfolioId: 'p', portfolioName: 'Fictional coins', currency: 'USD' as const, direction: 'above' as const, value: '30000', createdAt: '2026-11-01T10:00:00.000Z', active: false, firedAt: '2026-11-20T10:00:00.000Z'},
      {id: 'alert_value-0002', portfolioId: 'p', portfolioName: 'Fictional coins', currency: 'USD' as const, direction: 'below' as const, value: '20000', createdAt: '2026-11-01T10:00:00.000Z', active: true}]};
  it('lists a reached value alert as fresh and a waiting one as waiting, until seen', () => {
    const t = alertsForToday(base);
    expect(t.fresh).toEqual([{id: 'alert_value-0001', line: 'Fictional coins is worth above 30000 USD: 35000 USD now.', firedAt: '2026-11-20T10:00:00.000Z'}]);
    expect(t.waiting).toEqual([{id: 'alert_value-0002', line: 'Fictional coins worth below 20000 USD'}]);
    expect(anyActive(base)).toBe(true);
    expect(alertsForToday(avMarkSeen(base, '2026-11-21T10:00:00.000Z')).fresh).toEqual([]);
    expect(anyActive({...base, portfolio: [base.portfolio[0]!]})).toBe(false);
  });
  it('a portfolio is valued from the prices read, and unknown while a held coin has none', () => {
    const now = Date.parse('2026-11-21T10:00:00.000Z'), at = new Date(now).toISOString();
    const portfolio = {id: 'p', name: 'Fictional coins', kind: 'real' as const, currency: 'USD' as const, createdAt: '2026-01-01T00:00:00.000Z', coins: [{ref: {provider: 'coingecko', kind: 'coin', id: 'bitcoin'}, name: 'Bitcoin', symbol: 'BTC'}],
      transactions: [{id: 't1', coin: 'coingecko:coin:bitcoin', kind: 'buy' as const, quantity: '0.5', price: '60000', date: '2026-09-01', note: '', createdAt: '2026-09-01T12:00:00.000Z'}]} as never;
    const quote = {base: {network: 'coingecko-coin', denom: 'bitcoin', decimals: 0}, marketRef: {provider: 'coingecko', kind: 'coin', id: 'bitcoin'}, currency: 'USD', price: '70000', priceDecimals: 0, source: 'CoinGecko', providerAssetId: 'bitcoin', observedAt: at, fetchedAt: at, verification: 'VERIFIED'} as never;
    expect(portfolioValueNow(portfolio, [quote], now)).toBe('35000');
    expect(portfolioValueNow(portfolio, [], now)).toBeNull();
  });
});
