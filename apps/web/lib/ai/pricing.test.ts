import {expect, test} from 'vitest';
import {BATCH_FACTOR, PRICES, PRICES_AS_OF, estimateCost, priceFor, publishedPrices, uncachedCost} from './pricing';

// Session Z-Local Part 3: the dated price table and the cost of one call from its own usage fields.
test('the table is dated and carries the three current models with the published ratios', () => {
  expect(PRICES_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(PRICES.map(p => p.id)).toEqual(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']);
  for (const p of PRICES) {
    expect(p.usd.cacheWrite).toBeCloseTo(p.usd.input * 1.25, 10);
    // The page's footnote 2: cache hits are 0.05× the base input price on Opus 5.5 and Sonnet 5.5; 0.1× on Haiku 5.5.
    expect(p.usd.cacheRead).toBeCloseTo(p.usd.input * (p.id === 'claude-haiku-5-5' ? 0.1 : 0.05), 10);
  }
  expect(priceFor('claude-opus-5-5')?.usd).toEqual({input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2});
  expect(priceFor('claude-sonnet-5-5')?.usd).toEqual({input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.1});
  expect(priceFor('claude-haiku-5-5')?.usd).toEqual({input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01});
  expect(priceFor('gpt-mock')).toBeNull();
});
test('a call costs its four counts at their rates; the batch halves it; a model off the table costs null', () => {
  const usage = {input: 1000, output: 200, cacheWrite: 4000, cacheRead: 8000};
  // Sonnet: 1000×2 + 200×10 + 4000×2.5 + 8000×0.1 = 2000 + 2000 + 10000 + 800 = 14800 per million → 0.0148
  expect(estimateCost('claude-sonnet-5-5', usage)).toBeCloseTo(0.0148, 10);
  expect(estimateCost('claude-sonnet-5-5', usage, {batch: true})).toBeCloseTo(0.0148 * BATCH_FACTOR, 10);
  // Opus: 4000 + 4000 + 20000 + 1600 = 29600 → 0.0296
  expect(estimateCost('claude-opus-5-5', usage)).toBeCloseTo(0.0296, 10);
  expect(estimateCost('mock', usage)).toBeNull();
  // Unknown counts cost nothing here; the ledger reports them as unreported.
  expect(estimateCost('claude-haiku-5-5', {input: null, output: null})).toBe(0);
});
test('the uncached cost prices every prompt token as input, so the saving is the difference', () => {
  const usage = {input: 1000, output: 200, cacheWrite: 0, cacheRead: 12000};
  // Uncached Sonnet: 13000×2 + 200×10 = 28000 → 0.028; cached: 2000 + 2000 + 1200 = 5200 → 0.0052
  expect(uncachedCost('claude-sonnet-5-5', usage)).toBeCloseTo(0.028, 10);
  expect(estimateCost('claude-sonnet-5-5', usage)).toBeCloseTo(0.0052, 10);
});
test('Haiku 5.5 switches to its long-prompt rate card above 100,000 prompt tokens', () => {
  expect(estimateCost('claude-haiku-5-5', {input: 100_000, output: 0})).toBeCloseTo(0.01, 10);
  expect(estimateCost('claude-haiku-5-5', {input: 100_001, output: 0})).toBeCloseTo(0.0500005, 10);
  expect(estimateCost('claude-haiku-5-5', {input: 50_000, output: 0, cacheRead: 60_000})).toBeCloseTo((50_000 * 0.5 + 60_000 * 0.05) / 1e6, 10);
});
test('the published prices come as the person\'s own price fields, in USD, never applied by themselves', () => {
  expect(publishedPrices('claude-sonnet-5-5')).toEqual({input: '2', output: '10', currency: 'USD'});
  expect(publishedPrices('unknown')).toBeNull();
});
