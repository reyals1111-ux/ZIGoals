import {describe, expect, test} from 'vitest';
import {monthWaterfall, waterfallPeriods} from './month-compare';
import {totals} from '../money-log/engine';
import type {MoneyEntry} from '../money-log/schema';

/**
 * Session AV lane 2, round 3 (money; Simplifi's waterfall, LEDGER #297): from last month's total to this month's, one
 * step per category, largest first, by Wealth → Spending's own figures; the first bar plus the steps is the last bar.
 */
const at = '2026-11-20T10:00:00.000Z';
const e = (date: string, amount: string, category: string, over: Partial<MoneyEntry> = {}): MoneyEntry => ({id: Math.random().toString(36).slice(2, 10), kind: 'expense', amount, currency: 'EUR', category, date, createdAt: at, ...over});
const entries = [
  e('2026-10-03', '100.00', 'Groceries'), e('2026-10-05', '60.00', 'Fun'), e('2026-10-25', '500.00', 'Home'),
  e('2026-11-03', '180.00', 'Groceries'), e('2026-11-04', '20.00', 'Fun'), e('2026-11-06', '90.00', 'Transport', {share: '45.00'}), e('2026-11-07', '70.00', 'Fun', {excluded: true}),
  e('2026-09-10', '40.00', 'Fun'),
];

describe('a month waterfall', () => {
  test('the periods: this month so far against last month to the same day; or the two whole months before', () => {
    expect(waterfallPeriods('2026-11-22', 'so-far')).toEqual({from: {start: '2026-10-01', end: '2026-10-22'}, to: {start: '2026-11-01', end: '2026-11-22'}});
    expect(waterfallPeriods('2026-03-31', 'so-far').from).toEqual({start: '2026-02-01', end: '2026-02-28'});
    expect(waterfallPeriods('2026-11-22', 'last-full')).toEqual({from: {start: '2026-09-01', end: '2026-09-30'}, to: {start: '2026-10-01', end: '2026-10-31'}});
  });
  test('steps largest first; the first total plus every step is the last; Wealth → Spending’s own figures', () => {
    const [w] = monthWaterfall(entries, '2026-11-22');
    expect(w).toMatchObject({currency: 'EUR', before: 16000, after: 24500, recorded: true});
    expect(w!.steps.map(s => [s.category, s.change])).toEqual([['Groceries', 8000], ['Transport', 4500], ['Fun', -4000]]);
    expect(w!.before + w!.steps.reduce((n, s) => n + s.change, 0)).toBe(w!.after);
    expect(w!.after).toBe(totals(entries, '2026-11-01', '2026-11-22')[0]!.expenses);
    const [whole] = monthWaterfall(entries, '2026-11-22', 'last-full');
    expect(whole).toMatchObject({before: 4000, after: 66000});
    expect(whole!.steps[0]).toEqual({category: 'Home', before: 0, after: 50000, change: 50000});
  });
  test('a currency whose earlier month has no record is unknown, not zero', () => {
    const [w] = monthWaterfall([e('2026-11-03', '10.00', 'Fun', {currency: 'USD'})], '2026-11-22');
    expect(w).toMatchObject({currency: 'USD', recorded: false});
    expect(monthWaterfall([], '2026-11-22')).toEqual([]);
  });
});
