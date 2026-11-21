import {describe, expect, it} from 'vitest';
import {budgetsSchema, emptyBudgets} from './schema';
import {watchRows, withWatch, withoutWatch} from './watch';
import type {MoneyEntry} from '../money-log/schema';

/** Session AV (owner follow-up 1, F-WATCH): a category watched without a budget, this month against last. */
let n = 0;
const e = (date: string, amount: string, category: string): MoneyEntry => ({id: `w${n++}`, kind: 'expense', amount, currency: 'EUR', category, date, createdAt: `${date}T10:00:00.000Z`});
describe('Session AV (F-WATCH)', () => {
  it('watched rows: this month so far, last month by the same day, the difference', () => {
    let r = withWatch(emptyBudgets(), 'Dining', 'EUR');
    r = withWatch(r, 'dining', 'EUR');
    expect(r.watch).toEqual([{category: 'Dining', currency: 'EUR'}]);
    const rows = watchRows(r, [e('2026-11-05', '40.00', 'Dining'), e('2026-11-12', '25.00', 'Dining'), e('2026-10-10', '30.00', 'Dining'), e('2026-10-28', '50.00', 'Dining')], '2026-11-14');
    expect(rows).toEqual([{category: 'Dining', currency: 'EUR', thisMonth: 6500, lastBySameDay: 3000, difference: 3500}]);
    expect(withoutWatch(r, 'DINING', 'EUR')).toEqual(emptyBudgets());
  });
  it('additive: the record still reads, an unreadable list is dropped', () => {
    const r = withWatch(emptyBudgets(), 'Fun', 'USD');
    expect(budgetsSchema.parse(JSON.parse(JSON.stringify(r)))).toEqual(r);
    expect(budgetsSchema.parse({version: 1, budgets: [], watch: 'all'}).watch).toBeUndefined();
  });
});
