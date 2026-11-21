import {describe, expect, it} from 'vitest';
import {vsLastMonth} from './month-compare';
import type {MoneyEntry} from '../money-log/schema';

/** Session AV (owner follow-up 1, F-VS-LAST): each category this month so far, last month by the same day, and all of it. */
let n = 0;
const e = (date: string, amount: string, category = 'Groceries', currency = 'EUR', kind: 'expense' | 'income' = 'expense'): MoneyEntry => ({id: `e${n++}`, kind, amount, currency, category, date, createdAt: `${date}T10:00:00.000Z`});
describe('Session AV (F-VS-LAST)', () => {
  it('by category: this month so far, last month by the same day, its difference and all of last month', () => {
    const v = vsLastMonth([e('2026-11-02', '40.00'), e('2026-11-10', '20.00', 'Dining'), e('2026-10-10', '30.00'), e('2026-10-20', '25.00'), e('2026-10-05', '15.00', 'Dining'), e('2026-10-12', '9.00', 'Taxi'), e('2026-11-03', '1000.00', 'Salary', 'EUR', 'income')], 'EUR', '2026-11-14');
    expect(v.rows).toEqual([
      {category: 'Groceries', thisMonth: 4000, lastBySameDay: 3000, lastMonth: 5500, difference: 1000},
      {category: 'Dining', thisMonth: 2000, lastBySameDay: 1500, lastMonth: 1500, difference: 500},
      {category: 'Taxi', thisMonth: 0, lastBySameDay: 900, lastMonth: 900, difference: -900},
    ]);
    expect(v.totals).toEqual({thisMonth: 6000, lastBySameDay: 5400, lastMonth: 7900});
  });
  it('the 31st compares with the last day of a shorter month; a month without records is unknown, never zero', () => {
    expect(vsLastMonth([e('2026-12-31', '5.00'), e('2026-11-30', '7.00')], 'EUR', '2026-12-31').cut).toBe(30);
    const none = vsLastMonth([e('2026-11-02', '40.00')], 'EUR', '2026-11-14');
    expect(none.previousRecorded).toBe(false);
    expect(none.rows[0]).toMatchObject({lastBySameDay: null, lastMonth: null, difference: null});
    expect(none.totals.lastMonth).toBeNull();
  });
  it('one currency at a time, never converted; future records left out', () => {
    expect(vsLastMonth([e('2026-11-02', '40.00', 'Groceries', 'USD'), e('2026-11-20', '9.00')], 'EUR', '2026-11-14').rows).toEqual([]);
  });
});
