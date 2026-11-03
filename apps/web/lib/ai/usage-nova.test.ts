import {expect, test} from 'vitest';
import {AI_USAGE_KEY} from './store/keys';
import {capNote, capState, costRows, dailyCapState, dayEstimate, dayKey, needsSpendConfirmation, readUsage, recordUsage} from './usage';
import {estimatePublished, publishedPriceFor, PUBLISHED_AS_OF, PUBLISHED_PRICES, PRICES} from './pricing';

// Session AK (owner follow-up 2, N2): NOVA's cost meter and the daily cap, on ZIGi's one usage record.
function memory(initial: Record<string, unknown> = {}) {
  const map = new Map(Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)]));
  return {getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, map};
}
const MORNING = new Date(2026, 10, 1, 9), EVENING = new Date(2026, 10, 1, 21), NEXT = new Date(2026, 10, 2, 9);

test('per-day counts start only once a daily cap is set; the last 14 days are kept; cached prompt tokens count as input', () => {
  const none = memory();
  recordUsage(none, 'openai', {input: 100, output: 10}, 1, MORNING);
  expect(readUsage(none).data.days).toBeUndefined();
  const s = memory({[AI_USAGE_KEY]: {version: 1, dailyCap: {amount: '1', currency: 'USD', mode: 'warn'}}});
  expect(dayKey(MORNING)).toBe('2026-11-01');
  recordUsage(s, 'anthropic', {input: 100, output: 20, cacheRead: 900}, 2, MORNING);
  recordUsage(s, 'anthropic', {input: 50, output: 5}, 1, EVENING);
  recordUsage(s, 'local', {input: null, output: null}, 1, EVENING);
  expect(readUsage(s).data.days).toEqual({'2026-11-01': {anthropic: {input: 1050, output: 25, requests: 3}, local: {input: 0, output: 0, requests: 1}}});
  for (let d = 2; d < 20; d++) recordUsage(s, 'openai', {input: 1, output: 1}, 1, new Date(2026, 10, d, 9));
  const days = Object.keys(readUsage(s).data.days ?? {});
  expect(days).toHaveLength(14); expect(days[0]).toBe('2026-11-06');
});
test('the daily cap: cloud routes only, from the person\'s prices in the cap\'s currency; 80 % and 100 % notes; "ask" asks first', () => {
  const at = (input: number, mode: 'warn' | 'ask' = 'warn') => {
    const s = memory({[AI_USAGE_KEY]: {version: 1, prices: {openai: {input: '1', output: '2', currency: 'USD'}, local: {input: '5', currency: 'USD'}, xai: {input: '1', currency: 'EUR'}}, dailyCap: {amount: '1', currency: 'USD', mode}}});
    recordUsage(s, 'openai', {input, output: 0}, 1, MORNING);
    recordUsage(s, 'local', {input: 5_000_000, output: 0}, 1, MORNING); // a local model is free here, whatever price was typed
    recordUsage(s, 'xai', {input: 9_000_000, output: 0}, 1, MORNING); // another currency is never added
    return readUsage(s).data;
  };
  expect(dayEstimate(at(500_000), '2026-11-01', 'USD')).toEqual({amount: 0.5, unpriced: ['xai']});
  expect(dailyCapState(at(500_000), '2026-11-01')).toMatchObject({level: 'under', period: 'day'});
  expect(capNote(capState(at(850_000), '2026-11', MORNING))).toBe('You are at 85 % of your daily cap: 0.85 USD of your 1.00 USD daily cap, estimated from your prices.');
  const reached = capState(at(1_200_000, 'ask'), '2026-11', MORNING);
  expect(capNote(reached)).toBe('You have reached your daily cap: 1.20 USD of your 1.00 USD daily cap, estimated from your prices.');
  expect(needsSpendConfirmation(reached)).toBe(true);
  expect(needsSpendConfirmation(capState(at(1_200_000, 'warn'), '2026-11', MORNING))).toBe(false);
  // The next day starts fresh.
  expect(capState(at(1_200_000, 'ask'), '2026-11', NEXT)).toBeNull();
});
test('with both caps, the stronger one shows (the monthly one on a tie); without a daily cap, exactly as before', () => {
  const s = memory({[AI_USAGE_KEY]: {version: 1, prices: {openai: {input: '1', currency: 'USD'}}, softCap: {amount: '10', currency: 'USD'}, dailyCap: {amount: '1', currency: 'USD', mode: 'warn'}}});
  recordUsage(s, 'openai', {input: 1_500_000, output: 0}, 1, MORNING);
  expect(capState(readUsage(s).data, '2026-11', MORNING)).toMatchObject({level: 'reached', period: 'day'});
  recordUsage(s, 'openai', {input: 9_000_000, output: 0}, 1, MORNING);
  expect(capState(readUsage(s).data, '2026-11', MORNING)!.period).toBeUndefined();
  const plain = memory({[AI_USAGE_KEY]: {version: 1, prices: {openai: {input: '1', currency: 'USD'}}, softCap: {amount: '10', currency: 'USD'}}});
  recordUsage(plain, 'openai', {input: 8_000_000, output: 0}, 1, MORNING);
  expect(capState(readUsage(plain).data, '2026-11', MORNING)).toEqual({amount: 8, cap: 10, currency: 'USD', level: 'near', askFirst: false});
  // An unreadable daily cap is dropped, never the record.
  const odd = memory({[AI_USAGE_KEY]: {version: 1, dailyCap: {amount: 'lots', currency: 'USD', mode: 'warn'}, days: 'nope'}});
  expect(readUsage(odd).unreadable).toBe(false); expect(readUsage(odd).data.dailyCap).toBeUndefined();
});
test('the cost meter rows: the person\'s prices first, else the dated published table, else none; local and on-device are free', () => {
  const s = memory({[AI_USAGE_KEY]: {version: 1, prices: {openai: {input: '2', output: '8', currency: 'EUR'}}, dailyCap: {amount: '5', currency: 'EUR', mode: 'warn'}}});
  recordUsage(s, 'openai', {input: 1_000_000, output: 250_000}, 2, MORNING);
  recordUsage(s, 'anthropic', {input: 200_000, output: 10_000, cacheRead: 1_000_000}, 1, MORNING);
  recordUsage(s, 'gemini', {input: 10, output: 10}, 1, MORNING);
  recordUsage(s, 'local', {input: 3000, output: 400}, 1, MORNING);
  const rows = costRows(readUsage(s).data, '2026-11', '2026-11-01', {anthropic: 'claude-haiku-5-5', gemini: 'gemini-x'});
  expect(rows.map(r => r.route)).toEqual(['anthropic', 'gemini', 'openai', 'local']);
  expect(rows.find(r => r.route === 'openai')!.estimate).toEqual({amount: 4, currency: 'EUR', basis: 'your-prices'});
  const published = estimatePublished('anthropic', 'claude-haiku-5-5', {input: 200_000, output: 10_000, cacheWrite: 0, cacheRead: 1_000_000}, '2026-11-01')!;
  expect(rows.find(r => r.route === 'anthropic')!.estimate).toEqual({amount: published, currency: 'USD', basis: 'published', asOf: PUBLISHED_AS_OF});
  expect(rows.find(r => r.route === 'gemini')!.estimate).toBeNull();
  expect(rows.find(r => r.route === 'local')).toMatchObject({free: true, estimate: null, today: {input: 3000, output: 400, requests: 1}});
  expect(costRows({version: 1}, '2026-11', '2026-11-01')).toEqual([]);
});

test('the published table for the meter: the three Claude rows unchanged, the others dated; unknown is null, never zero', () => {
  for (const row of PRICES) expect(publishedPriceFor('anthropic', row.id)!.usd).toEqual(row.usd);
  expect(publishedPriceFor('anthropic', 'claude-fable-5-1')!.usd).toEqual({input: 10, output: 50, cacheWrite: 12.5, cacheRead: 0.25});
  expect(publishedPriceFor('gemini', 'models/gemini-3.8-flash', '2026-12-31')!.usd.input).toBe(0.75);
  expect(publishedPriceFor('gemini', 'gemini-3.8-flash', '2027-01-01')!.usd.input).toBe(1.5);
  expect(publishedPriceFor('openrouter', 'anthropic/claude-opus-5-5')).toBeNull();
  expect(publishedPriceFor('openai', 'claude-opus-5-5')).toBeNull();
  expect(estimatePublished('xai', 'grok-unknown', {input: 10, output: 10})).toBeNull();
  // OpenAI's wire counts the cached part inside input: it moves to the cached rate, never counted twice.
  // gpt-6.1-sol: (1,000,000 − 400,000) × 2 + 400,000 × 0.1 + 100,000 × 10 = 1.2 + 0.04 + 1 = 2.24 USD
  expect(estimatePublished('openai', 'gpt-6.1-sol', {input: 1_000_000, output: 100_000, cacheRead: 400_000})).toBeCloseTo(2.24, 10);
  // xAI bills the whole request at the higher card from 200,000 prompt tokens.
  expect(estimatePublished('xai', 'grok-4.7', {input: 200_000, output: 0})).toBeCloseTo(0.8, 10);
  expect(estimatePublished('xai', 'grok-4.7', {input: 199_999, output: 0})).toBeCloseTo(0.399998, 10);
  expect(new Set(PUBLISHED_PRICES.map(r => r.provider))).toEqual(new Set(['anthropic', 'openai', 'gemini', 'xai']));
});
