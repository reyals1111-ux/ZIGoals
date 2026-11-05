// @vitest-environment jsdom
// Session AL (lane L1, fourth pass): the rows the Grok #53 replay (GROK53_REPLAY_L1_1.md) still found open.
import {act, createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {formatHistoryUnits} from './market-history';
import {PriceChart} from '../components/platform/price-chart';
import {plausibilityWarning} from './wealth-plausibility';
import {cellRefusal, planHoldingsImport, applyHoldingsImport} from './import/holdings';
import {MANUAL_ETF_TAG, isEtf, tagManualEtf, wealthClassOf} from './wealth';
import {manualSourcePosition} from './manual-source';
import {emptyPlatform, platformSchema, type Platform} from './positions';
import {archiveAsset, saveAsset} from './asset-management';
import {deleteArchivedAsset, deleteBlocker, reinsertDeletedAsset} from './wealth-delete';
import {referenceValueCents} from './wealth-reference';
import {orbLetters} from '../components/platform/financial-ui';
import {elsewhereHint} from '../components/platform/asset-search';
import {shortWorth} from '../components/platform/wealth-total';
import {holdSaveInPlace} from '../components/portfolio/transaction-form';
import type {MarketCatalogAsset} from './market-assets';

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => {vi.unstubAllGlobals(); vi.useRealTimers();});

describe('TK-026 / C-TK-19: the Portfolio coin chart with its cost line', () => {
  it('formats a computed level without a time (no ZodError)', () => {
    expect(formatHistoryUnits(6000000n, 2, 'USD')).toMatch(/^(US)?\$60,000\.00$/);
    expect(formatHistoryUnits(412n, 4, 'USD')).toMatch(/^(US)?\$0\.0412$/);
    expect(formatHistoryUnits(42n, 0, 'EUR')).toBe('€42.00');
  });

  it('renders the dashed cost key once live history has loaded', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-05T01:30:00Z'));
    const ref = {provider: 'coingecko', kind: 'coin', id: 'tk026-coin'} as const;
    const points = Array.from({length: 12}, (_, i) => ({at: new Date(Date.now() - (11 - i) * 86400000).toISOString(), value: String(5800000000 + i * 3100000), decimals: 5}));
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({history: {marketRef: ref, currency: 'USD', range: '90d', source: 'CoinGecko', fetchedAt: new Date().toISOString(), points}, error: null, stale: false, nextAttemptAt: Date.now() + 60000})));
    const element = document.createElement('div'), root = createRoot(element);
    await act(async () => root.render(createElement(PriceChart, {marketRef: ref, currency: 'USD', costLine: {value: '60000', label: 'your average cost in this portfolio'}})));
    expect(element.querySelector('.price-chart-cost-key')?.textContent).toMatch(/^Dashed line: your average cost in this portfolio, (US)?\$60,000\.00\.$/);
    await act(async () => root.unmount());
  });
});

it('TK-041 / W7: an amount past the trillion cap gets no rounded "check this?" figure (the field refuses it instead)', () => {
  expect(plausibilityWarning(1e18, 'USD', 'value')).toBeNull();
  expect(plausibilityWarning(1e12 + 1, 'USD', 'value')).toBeNull();
  expect(plausibilityWarning(5e9, 'USD', 'value')).toMatch(/is more than a billion/);
  expect(plausibilityWarning(1e12, 'EUR', 'debt')).toMatch(/is more than a billion/);
});

describe('TK-009: an import row says why a number was refused', () => {
  it('names a negative and exponent notation', () => {
    expect(cellRefusal('quantity', new Error('is negative'))).toBe('the quantity is negative; enter what you hold, above zero.');
    expect(cellRefusal('value', new Error('is negative'))).toBe('the value is negative; enter 0 or more.');
    expect(cellRefusal('quantity', new Error('uses exponent notation'))).toBe('the quantity uses exponent notation; write the number in full.');
    expect(cellRefusal('quantity', new Error('is not a number'))).toBe('the quantity is not a number.');
  });
  it('row 10 with quantity −5 reads "negative", not "not a number"', () => {
    const plan = planHoldingsImport({rows: [['Gold coin', 'XAU', '−5', 'Precious metals', '100', 'EUR']], mapping: {name: 0, asset: 1, quantity: 2, class: 3, value: 4, currency: 5}, numberStyle: 'point'});
    expect(plan.refused.map(r => r.reason)).toEqual(['Row 1: the quantity is negative; enter what you hold, above zero.']);
  });
});

describe('TK-010: an ETF is shown under ETFs, from Add asset and from an import', () => {
  const at = '2026-11-05T01:00:00.000Z';
  it('tags a hand-added Stocks position, additively', () => {
    const p = tagManualEtf(manualSourcePosition({category: 'Stocks', name: 'Vanguard S&P 500 ETF', symbol: 'VOO', quantity: '4', currency: 'USD', value: '2100'}, 'voo', at));
    expect(p.provenance.startsWith(MANUAL_ETF_TAG)).toBe(true);
    expect(p.assetClass).toBe('Stocks');
    expect(wealthClassOf(p)).toBe('ETFs');
    const stock = manualSourcePosition({category: 'Stocks', name: 'Apple', symbol: 'AAPL', quantity: '1', currency: 'USD', value: '200'}, 'aapl', at);
    expect(wealthClassOf(stock)).toBe('Stocks');
    expect(tagManualEtf(tagManualEtf(stock)).provenance).toBe(tagManualEtf(stock).provenance);
    expect(isEtf({marketRef: {provider: 'coingecko', kind: 'rwa', id: 'apple', assetType: 'stock'}, provenance: MANUAL_ETF_TAG})).toBe(false);
    expect(() => platformSchema.parse({...emptyPlatform(), positions: [p]})).not.toThrow();
  });
  it('an import row of class ETF lands in ETFs', () => {
    const plan = planHoldingsImport({rows: [['Vanguard S&P 500 ETF', 'VOO', '4', 'ETF', '2100', 'USD']], mapping: {name: 0, asset: 1, quantity: 2, class: 3, value: 4, currency: 5}, numberStyle: 'point'});
    expect(plan.ready[0]?.input.notes).toBe('Class in your file: ETF (shown under ETFs).');
    const s = applyHoldingsImport(emptyPlatform(), plan.ready, {importId: 'i1', at});
    expect(wealthClassOf(s.positions[0]!)).toBe('ETFs');
  });
});

describe('PR-053: an archived asset can be deleted for good, with Undo', () => {
  const at = '2026-11-05T01:00:00.000Z';
  const make = (): Platform => {
    let s = saveAsset(emptyPlatform(), manualSourcePosition({category: 'Custom asset', name: 'Old camera', quantity: '1', currency: 'EUR', value: '300'}, 'cam', at));
    s = saveAsset(s, manualSourcePosition({category: 'Cash', name: 'EUR Cash', quantity: '50', currency: 'EUR'}, 'cash', at));
    return archiveAsset(s, 'cam', false, Date.parse(at) + 1000);
  };
  it('refuses an asset still in use, then deletes and restores', () => {
    const s = make();
    expect(deleteBlocker(s, 'cash')).toBe('Archive the asset first.');
    expect(deleteBlocker(s, 'cam')).toBeNull();
    const {next, removed} = deleteArchivedAsset(s, 'cam');
    expect(next.positions.map(p => p.id)).toEqual(['cash']);
    expect(next.assetEvents.some(e => e.positionId === 'cam')).toBe(false);
    expect(next.snapshots.some(e => e.positionId === 'cam')).toBe(false);
    const back = reinsertDeletedAsset(removed)(next);
    expect(back).toEqual(s);
    expect(reinsertDeletedAsset(removed)(back)).toBe(back);
  });
  it('keeps an asset a Goal’s funding history names', () => {
    const s = make();
    const funded = {...s, contributions: [{id: 'c1', goalId: 'g1', goalScope: 'private' as const, positionId: 'cam', direction: 'IN' as const, quantity: '1', asset: 'CUSTOM', decimals: 0, occurredAt: at, provenance: 'MANUAL_ATTRIBUTION' as const}]} as Platform;
    expect(deleteBlocker(funded, 'cam')).toMatch(/funding history/);
    expect(() => deleteArchivedAsset(funded, 'cam')).toThrow(/funding history/);
  });
});

it('PR-007: 30 shares at a US$350.39 reference come to US$10,511.70 (cut to the cent)', () => {
  expect(referenceValueCents('30', 0, '35039', 2)).toBe(1051170n);
  expect(referenceValueCents('1500000', 6, '123456789', 8)).toBe(185n);
  expect(referenceValueCents('-1', 0, '1', 0)).toBeNull();
});

it('PR-084: a coin without a logo shows its whole symbol or one letter, never a cut word', () => {
  expect(orbLetters('DOGE')).toBe('DOGE');
  expect(orbLetters('@DOGE')).toBe('DOGE');
  expect(orbLetters('dogecoin')).toBe('D');
  expect(orbLetters('SOL')).toBe('SOL');
  expect(orbLetters('$')).toBe('?');
});

it('N-TK-16: a match in the chosen tab is the answer; no "listed under Crypto" beside it', () => {
  const coin = {ref: {provider: 'coingecko', kind: 'coin', id: 'backpack-aapl'}, name: 'Apple (Backpack Securities)', symbol: 'aapl'} as unknown as MarketCatalogAsset;
  const stock = {ref: {provider: 'coingecko', kind: 'rwa', id: 'apple', assetType: 'stock'}, name: 'Apple', symbol: 'AAPL'} as unknown as MarketCatalogAsset;
  const tokenised = {ref: {provider: 'coingecko', kind: 'rwa', id: 'apple-x', assetType: 'stock'}, name: 'Apple xStock', symbol: 'AAPLX'} as unknown as MarketCatalogAsset;
  expect(elsewhereHint('AAPL', [coin, stock], 'Stocks')).toBeNull();
  expect(elsewhereHint('AAPL', [coin, tokenised], 'Stocks', [tokenised])).toBeNull();
  expect(elsewhereHint('AAPL', [coin], 'Stocks')).toMatch(/is listed under Crypto/);
});

it('TK-127: a billion or more reads short in the net-worth line; below that it stays exact', () => {
  expect(shortWorth({value: -100000001049824n, decimals: 2}, 'EUR')).toMatch(/^−€1(T|tn)$/);
  expect(shortWorth({value: 250000000000n, decimals: 2}, 'USD')).toMatch(/^(US)?\$2\.5(B|bn)$/);
  expect(shortWorth({value: 99999999999n, decimals: 2}, 'USD')).toBeNull();
});

it('TK-024 / P8: after a refused save the page scrolls by the shift, so Save stays under the pointer', () => {
  const scrolled: number[] = [];
  const win = {innerHeight: 800, scrollBy: (o: ScrollToOptions) => { scrolled.push(o.top ?? 0); }} as unknown as Window;
  const save = {getBoundingClientRect: () => ({top: 610})} as HTMLElement;
  let focused = false, intoView = 0;
  const field = {getBoundingClientRect: () => ({top: 300, bottom: 344}), focus: () => { focused = true; }, scrollIntoView: () => { intoView++; }} as unknown as HTMLElement;
  holdSaveInPlace(save, 523, field, win);
  expect(scrolled).toEqual([87]);
  expect(focused).toBe(true);
  expect(intoView).toBe(0);
  const off = {...field, getBoundingClientRect: () => ({top: -60, bottom: -16})} as unknown as HTMLElement;
  holdSaveInPlace(save, 610, off, win);
  expect(scrolled).toEqual([87]);
  expect(intoView).toBe(1);
});
