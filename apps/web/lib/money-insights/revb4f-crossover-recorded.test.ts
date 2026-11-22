import {describe, expect, test} from 'vitest';
import {crossover} from './crossover';
import {categoryTrend} from './cash-flow';
import type {MoneyEntry} from '../money-log/schema';

/**
 * Review b4f #6 (Minor; fixed with b4f #2's `countedIn`, 46b0ddba): in investment income beside spending, a month that
 * holds only a left-out entry or a transfer is "No records", as everywhere else in Your money over time.
 */
const e = (over: Partial<MoneyEntry>): MoneyEntry => ({id: Math.random().toString(36).slice(2, 10), kind: 'expense', amount: '20.00', currency: 'EUR', category: 'Fun', date: '2026-11-03', createdAt: '2026-11-03T10:00:00.000Z', ...over});

describe('review b4f #6: a month with nothing counted is a gap', () => {
  test('a card payment or a left-out entry alone does not make a month recorded', () => {
    const entries = [e({date: '2026-09-03', transfer: 'x'}), e({date: '2026-10-03', excluded: true}), e({kind: 'income', amount: '3.00', category: 'Interest', date: '2026-11-01'}), e({})];
    const r = crossover(entries, ['Interest'], 'EUR', '2026-11-14');
    expect(r.months.filter(m => m.month >= '2026-09').map(m => [m.month, m.recorded])).toEqual([['2026-09', false], ['2026-10', false], ['2026-11', true]]);
    expect(r.recordedMonths).toBe(1);
    expect(categoryTrend(entries, 'EUR', '2026-11-14').recorded.slice(-3)).toEqual([false, false, true]);
  });
});
