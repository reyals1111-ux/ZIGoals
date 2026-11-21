import {describe, expect, it} from 'vitest';
import {budgetsSchema, emptyBudgets} from './schema';
import {watchedAbove, watchRows, withWatch, withoutWatch} from './watch';
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
    expect(rows).toEqual([{category: 'Dining', currency: 'EUR', thisMonth: 6500, lastBySameDay: 3000, difference: 3500, lastMonth: 8000}]);
    expect(withoutWatch(r, 'DINING', 'EUR')).toEqual(emptyBudgets());
  });
  it('additive: the record still reads, an unreadable list is dropped', () => {
    const r = withWatch(emptyBudgets(), 'Fun', 'USD');
    expect(budgetsSchema.parse(JSON.parse(JSON.stringify(r)))).toEqual(r);
    expect(budgetsSchema.parse({version: 1, budgets: [], watch: 'all'}).watch).toBeUndefined();
  });
  // Session AV (fresh-agent check q2, rank 31): a budgeted category is not watched twice; one well above last month by the
  // same day is named for Today; the Showcase watches one category.
  it('refuses a budgeted category, and finds a watched one well above last month', () => {
    const budgeted = {...emptyBudgets(), budgets: [{id: 'b', category: 'Groceries', currency: 'EUR', monthly: '200.00', rollover: false, since: '2026-11'}]};
    expect(() => withWatch(budgeted, 'groceries', 'EUR')).toThrow('Groceries already has a budget in EUR: its row above shows this month.');
    expect(withWatch(budgeted, 'Groceries', 'USD').watch).toEqual([{category: 'Groceries', currency: 'USD'}]);
    const r = withWatch(emptyBudgets(), 'Dining', 'EUR'), entries = [e('2026-11-05', '40.00', 'Dining'), e('2026-11-12', '25.00', 'Dining'), e('2026-10-10', '30.00', 'Dining')];
    expect(watchedAbove(r, entries, '2026-11-14').map(w => w.category)).toEqual(['Dining']);
    expect(watchedAbove(r, [...entries, e('2026-10-11', '30.00', 'Dining')], '2026-11-14')).toEqual([]); // €65 against €60: not well above
    expect(watchedAbove(r, entries.slice(0, 2), '2026-11-14')).toEqual([]); // nothing last month to compare with
  });
  it('the Showcase watches one category without a budget', async () => {
    const {showcaseBudgets} = await import('../bills/showcase');
    const record = showcaseBudgets('2026-11-21');
    expect(record.watch).toEqual([{category: 'Transport', currency: 'EUR'}]);
    expect(record.budgets.some(b => b.category === 'Transport')).toBe(false);
  });
});
