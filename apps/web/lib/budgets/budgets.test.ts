import {describe, expect, test} from 'vitest';
import type {MoneyEntry} from '../money-log/schema';
import {budgetIssue, carriedInto, monthView, removeBudget, setBudget, shiftMonth} from './engine';
import {BUDGETS_KEY, budgetsSchema, emptyBudgets} from './schema';

let n = 0;
const e = (date: string, amount: string, category = 'Groceries', currency = 'EUR', kind: 'expense' | 'income' = 'expense'): MoneyEntry => ({id: `m${n++}`, kind, amount, currency, category, date, createdAt: `${date}T10:00:00.000Z`});

describe('category budgets (Session AK 7.7, zigoals:budgets:v1)', () => {
  test('the key and a loose, versioned record; one budget per category and currency', () => {
    expect(BUDGETS_KEY).toBe('zigoals:budgets:v1');
    expect(budgetsSchema.safeParse({...emptyBudgets(), later: 1}).success).toBe(true);
    const b = {id: 'a', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false, since: '2026-10'};
    expect(budgetsSchema.safeParse({version: 1, budgets: [b, {...b, id: 'b', category: 'groceries'}]}).success).toBe(false);
    expect(budgetsSchema.safeParse({version: 1, budgets: [b, {...b, id: 'b', currency: 'USD'}]}).success).toBe(true);
  });
  test('months step across the year', () => { expect(shiftMonth('2026-01', -1)).toBe('2025-12'); expect(shiftMonth('2026-11', 3)).toBe('2027-02'); });
  test('the month view: available, spent, left; unbudgeted spending apart; currencies apart', () => {
    let r = setBudget(emptyBudgets(), {category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false}, 'g', '2026-10');
    r = setBudget(r, {category: 'Fun', currency: 'EUR', monthly: '50.00', rollover: false}, 'f', '2026-10');
    const entries = [e('2026-10-02', '120.00'), e('2026-10-20', '80.50'), e('2026-10-21', '60.00', 'Fun'), e('2026-10-22', '10.00', 'Transport'), e('2026-10-23', '9.00', 'Groceries', 'USD'), e('2026-09-30', '999.00'), e('2026-10-05', '2000.00', 'Salary', 'EUR', 'income')];
    const view = monthView(entries, r, '2026-10', '2026-10-31');
    expect(view.rows.map(x => [x.category, x.available, x.spent, x.left, x.over])).toEqual([['Groceries', 30000, 20050, 9950, false], ['Fun', 5000, 6000, -1000, true]]);
    expect(view.unbudgeted).toEqual([{category: 'Transport', currency: 'EUR', spent: 1000}, {category: 'Groceries', currency: 'USD', spent: 900}]);
    expect(view.totals).toEqual([{currency: 'EUR', available: 35000, spent: 26050, left: 8950}]);
    expect(view.daysLeft).toBe(1);
    expect(monthView(entries, r, '2026-09', '2026-10-31').rows).toEqual([]);
  });
  test('rollover carries what was left unspent, never an overspend, from the first month on', () => {
    let r = setBudget(emptyBudgets(), {category: 'Groceries', currency: 'EUR', monthly: '100.00', rollover: true}, 'g', '2026-07');
    const entries = [e('2026-07-10', '60.00'), e('2026-08-10', '150.00'), e('2026-09-10', '70.00'), e('2026-06-10', '1.00')];
    // July leaves 40; August spends 150 of 140 (no carry); September leaves 30.
    expect(carriedInto(r.budgets[0]!, entries, '2026-07')).toBe(0);
    expect(carriedInto(r.budgets[0]!, entries, '2026-08')).toBe(4000);
    expect(carriedInto(r.budgets[0]!, entries, '2026-09')).toBe(0);
    expect(monthView(entries, r, '2026-10', '2026-10-15').rows[0]).toMatchObject({budgeted: 10000, carried: 3000, available: 13000, rollover: true});
    r = setBudget(r, {category: 'groceries', currency: 'EUR', monthly: '100.00', rollover: false}, 'other', '2026-10');
    expect(r.budgets).toHaveLength(1);
    expect(monthView(entries, r, '2026-10', '2026-10-15').rows[0]!.carried).toBe(0);
    expect(removeBudget(r, 'g').budgets).toEqual([]);
  });
  test('a budget is checked before it is saved', () => {
    expect(budgetIssue({category: '', currency: 'EUR', monthly: '1', rollover: false})).toMatch(/category/);
    expect(budgetIssue({category: 'Fun', currency: 'EU', monthly: '1', rollover: false})).toMatch(/currency/);
    expect(budgetIssue({category: 'Fun', currency: 'EUR', monthly: '0', rollover: false})).toMatch(/amount/);
    expect(() => setBudget(emptyBudgets(), {category: 'Fun', currency: 'EUR', monthly: 'x', rollover: false}, 'a', '2026-10')).toThrow();
  });
});
