import {expect, test} from 'vitest';
import {yourDays} from './your-days';
import {emptyLifeReview, lifeReviewSchema, rateValue, setValues} from './store';

/** Session AI (feature 9, G13, GO14): the week across the newer records, and the values check. */
test('the week: money per currency (never converted), journal entries, energy and mood averages with their days', () => {
  const days = yourDays({start: '2026-10-22', end: '2026-10-28',
    money: {entries: [{kind: 'expense', amount: '12.50', currency: 'EUR', date: '2026-10-27'}, {kind: 'expense', amount: '7.50', currency: 'EUR', date: '2026-10-28'}, {kind: 'income', amount: '100.00', currency: 'USD', date: '2026-10-23'}, {kind: 'expense', amount: '99.00', currency: 'EUR', date: '2026-10-01'}]},
    journal: {entries: [{date: '2026-10-27'}, {date: '2026-10-20'}]},
    energy: {days: {'2026-10-27': {energy: 4}, '2026-10-28': {energy: 3}, '2026-10-01': {energy: 1}}},
    moods: {days: {}},
  });
  expect(days).toEqual({money: [{currency: 'EUR', spent: 20, received: 0, entries: 2}, {currency: 'USD', spent: 0, received: 100, entries: 1}], journal: 1, energy: {average: 3.5, days: 2}, mood: null});
});
test('values: up to three in the person\'s words, rated per week 1–5; additive and loose', () => {
  let r = setValues(emptyLifeReview(), ['Health', ' family ', 'health']);
  expect(r.values).toEqual(['Health', 'family']);
  expect(() => setValues(r, ['A', 'B', 'C', 'D'])).toThrow(/up to 3/);
  r = rateValue(r, 'week:2026-10-22', 'Health', 4, '2026-10-28T20:00:00.000Z');
  expect(r.valueChecks?.['week:2026-10-22']?.ratings).toEqual({Health: 4});
  expect(() => rateValue(r, 'week:2026-10-22', 'Money', 2, '2026-10-28T20:00:00.000Z')).toThrow(/not one of yours/);
  expect(setValues(r, []).values).toBeUndefined();
  // An older record without the fields still reads; a later field is kept.
  expect(lifeReviewSchema.parse({version: 1, focus: {}, later: 1})).toMatchObject({later: 1});
});
