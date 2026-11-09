import {describe, expect, it} from 'vitest';
import {buildShowcase} from './showcase-data';
import {platformSchema, type Platform} from './positions';
import {marketPricesLine, wealthOverview} from './wealth';

/** Release review A10 (A10-3): a "Market prices as of" time comes only from market quotes, never from manual values. */
const DAY = '2026-11-09', now = Date.parse(`${DAY}T08:30:00Z`);
const showcase = (): Platform => platformSchema.parse(JSON.parse(buildShowcase(DAY, 'Europe/Brussels').records['zigoals:platform:v1']!));

describe('A10-3: the market-prices line under a wealth total', () => {
  it('with prices offline and every counted value the person\'s own, no market time is shown', () => {
    const overview = wealthOverview(showcase(), now, []);
    // The review's screen: linked holdings, each counted at a manual value with its own time.
    expect(overview.rows.some(r => r.position.marketRef && r.valuationState === 'manual' && r.valuedAt)).toBe(true);
    expect(overview.rows.every(r => !r.pricedFromMarket)).toBe(true);
    expect(marketPricesLine(overview.rows)).toEqual({kind: 'own'});
  });
  it('a quote-valued holding gives the quote\'s own time, never a newer manual value\'s', () => {
    const p = showcase(), btc = p.positions.find(x => x.id === 'showcase-btc')!;
    const quote = {base: {network: 'coingecko-coin', denom: 'bitcoin', decimals: 0}, marketRef: btc.marketRef, currency: 'USD', price: '6500000', priceDecimals: 2, source: 'CoinGecko', providerAssetId: 'bitcoin', verification: 'VERIFIED', observedAt: `${DAY}T07:15:00.000Z`} as never;
    const overview = wealthOverview(p, now, [quote]);
    const row = overview.rows.find(r => r.position.id === 'showcase-btc')!;
    expect(row).toMatchObject({pricedFromMarket: true, valuedAt: `${DAY}T07:15:00.000Z`});
    // The manual values keep their own times; none of them is read as a market price's time.
    expect(overview.rows.filter(r => r.valuationState === 'manual').every(r => !r.pricedFromMarket)).toBe(true);
    expect(marketPricesLine(overview.rows)).toEqual({kind: 'market', at: `${DAY}T07:15:00.000Z`});
  });
  it('rows: only market-priced, live holdings count; a recorded (non-manual) value says no price is current; nothing linked says nothing', () => {
    const linked = {marketRef: {kind: 'coin', id: 'bitcoin'}} as never;
    expect(marketPricesLine([
      {position: linked, pricedFromMarket: false, valuationState: 'manual', valuedAt: '2026-11-09T23:00:00.000Z', value: 1n},
      {position: linked, pricedFromMarket: true, valuationState: 'fresh', valuedAt: '2026-11-09T08:00:00.000Z', value: 1n},
      {position: linked, pricedFromMarket: true, valuationState: 'stale', valuedAt: '2026-11-09T06:00:00.000Z', value: 1n},
      {position: {...(linked as object), archivedAt: '2026-11-01T00:00:00.000Z'} as never, pricedFromMarket: true, valuedAt: '2026-11-09T22:00:00.000Z', value: 1n},
    ])).toEqual({kind: 'market', at: '2026-11-09T08:00:00.000Z'});
    expect(marketPricesLine([{position: linked, pricedFromMarket: false, valuationState: 'fresh', valuedAt: '2026-11-09T08:00:00.000Z', value: 1n}, {position: linked, valuationState: 'manual', value: 2n}])).toEqual({kind: 'none'});
    expect(marketPricesLine([{position: linked, valuationState: 'missing'}])).toBeUndefined();
    expect(marketPricesLine([{position: {} as never, valuationState: 'manual', valuedAt: '2026-11-09T08:00:00.000Z', value: 1n}])).toBeUndefined();
  });
});
