import {expect, test} from 'vitest';
import {AI_USAGE_KEY} from './store/keys';
import {capNote, capState, estimate, money, monthKey, needsSpendConfirmation, readUsage, recordUsage} from './usage';

// Session V Part 6: the usage meter. Tokens as the provider reported them, per route and month, on this device; money
// only from the person's own prices and only as an estimate; one amount per currency, never converted.
function memory(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, removeItem: (k: string) => { map.delete(k); }, map};
}
const OCT = new Date(2026, 9, 6, 12), NOV = new Date(2026, 10, 2, 9);

test('tokens add up per route and month, every request of a tool loop counted; unknown counts stay unknown', () => {
  const s = memory();
  expect(monthKey(OCT)).toBe('2026-10');
  recordUsage(s, 'openai', {input: 820, output: 70}, 2, OCT);
  recordUsage(s, 'openai', {input: 100, output: null}, 1, OCT);
  recordUsage(s, 'local', {input: null, output: null}, 1, OCT);
  recordUsage(s, 'anthropic', {input: 30, output: 5}, 1, NOV);
  const usage = readUsage(s).data;
  expect(usage.months).toEqual({'2026-10': {openai: {input: 920, output: 70, requests: 3}, local: {input: 0, output: 0, requests: 1, unreported: 1}}, '2026-11': {anthropic: {input: 30, output: 5, requests: 1}}});
  // Thirteen months are kept, the oldest goes.
  for (let m = 0; m < 14; m++) recordUsage(s, 'gemini', {input: 1, output: 1}, 1, new Date(2027, m, 3));
  expect(Object.keys(readUsage(s).data.months ?? {})).toHaveLength(13);
  expect(Object.keys(readUsage(s).data.months ?? {})[0]).toBe('2027-02');
});
test('the estimate uses only the person\'s prices, per currency; a route without a price is named, not zeroed', () => {
  const s = memory({[AI_USAGE_KEY]: JSON.stringify({version: 1, prices: {openai: {input: '2.5', output: '10', currency: 'USD'}, anthropic: {input: '3', currency: 'EUR'}}})});
  recordUsage(s, 'openai', {input: 2_000_000, output: 100_000}, 3, OCT);
  recordUsage(s, 'anthropic', {input: 1_000_000, output: 50_000}, 2, OCT);
  recordUsage(s, 'gemini', {input: 10, output: 10}, 1, OCT);
  const result = estimate(readUsage(s).data, '2026-10');
  expect(result.amounts).toEqual([{currency: 'USD', amount: 6}, {currency: 'EUR', amount: 3}]);
  expect(result.unpriced).toEqual(['anthropic', 'gemini']); // anthropic's output has no price; gemini has none at all
  expect(money(6, 'USD')).toBe('6.00 USD'); expect(money(0.0012, 'USD')).toBe('under 0.01 USD'); expect(money(1234.5, 'EUR')).toBe('1,234.50 EUR');
});
test('the soft cap: notes at 80 % and 100 %, a question before sending only with "ask first", other currencies never counted', () => {
  const at = (spentInput: number, extra: Record<string, unknown> = {}) => {
    const s = memory({[AI_USAGE_KEY]: JSON.stringify({version: 1, prices: {openai: {input: '1', currency: 'USD'}, xai: {input: '1', currency: 'EUR'}}, softCap: {amount: '10', currency: 'USD'}, ...extra})});
    recordUsage(s, 'openai', {input: spentInput, output: 0}, 1, OCT); recordUsage(s, 'xai', {input: 50_000_000, output: 0}, 1, OCT);
    return capState(readUsage(s).data, '2026-10');
  };
  expect(at(5_000_000)).toMatchObject({level: 'under', amount: 5}); expect(capNote(at(5_000_000))).toBeNull();
  expect(capNote(at(8_000_000))).toBe('You are at 80 % of your monthly cap: 8.00 USD of your 10.00 USD monthly cap, estimated from your prices.');
  expect(capNote(at(12_000_000))).toBe('You have reached your monthly cap: 12.00 USD of your 10.00 USD monthly cap, estimated from your prices.');
  expect(needsSpendConfirmation(at(12_000_000))).toBe(false);
  expect(needsSpendConfirmation(at(12_000_000, {askFirst: true}))).toBe(true); expect(needsSpendConfirmation(at(9_000_000, {askFirst: true}))).toBe(false);
  expect(capState({version: 1}, '2026-10')).toBeNull();
  // A cap in a currency none of the prices use: no state rather than a converted guess.
  const s = memory({[AI_USAGE_KEY]: JSON.stringify({version: 1, prices: {openai: {input: '1', currency: 'USD'}}, softCap: {amount: '10', currency: 'CHF'}})});
  recordUsage(s, 'openai', {input: 20_000_000, output: 0}, 1, OCT);
  expect(capState(readUsage(s).data, '2026-10')).toBeNull();
});
test('nothing but counts and the person\'s own choices is kept; unreadable bytes are not rewritten by a read', () => {
  const s = memory();
  recordUsage(s, 'openrouter', {input: 12, output: 3}, 1, OCT);
  expect(JSON.parse(s.map.get(AI_USAGE_KEY)!)).toEqual({version: 1, months: {'2026-10': {openrouter: {input: 12, output: 3, requests: 1}}}});
  const broken = memory({[AI_USAGE_KEY]: '{not json'});
  expect(readUsage(broken)).toEqual({data: {version: 1}, unreadable: true});
  expect(broken.map.get(AI_USAGE_KEY)).toBe('{not json');
});
