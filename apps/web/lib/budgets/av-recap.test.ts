import {describe, expect, it} from 'vitest';
import {carriedInto, carriesInto, monthView, startFresh} from './engine';
import {monthRecap} from './recap';
import type {BudgetsRecord} from './schema';
import type {MoneyEntry} from '../money-log/schema';

/** Session AV (owner follow-up 1, F-MONTH-RECAP and F-FRESH-MONTH; Copilot, YNAB): a month in short, and a fresh start. */
const e = (id: string, date: string, amount: string, category = 'Groceries', kind: 'expense' | 'income' = 'expense', note?: string): MoneyEntry => ({id, kind, amount, currency: 'EUR', category, date, createdAt: `${date}T10:00:00.000Z`, ...(note ? {note} : {})});
const record: BudgetsRecord = {version: 1, budgets: [{id: 'b1', category: 'Groceries', currency: 'EUR', monthly: '200.00', rollover: true, since: '2026-09'}, {id: 'b2', category: 'Fun', currency: 'EUR', monthly: '50.00', rollover: false, since: '2026-09'}]};
const entries = [e('a', '2026-10-03', '120.00'), e('b', '2026-10-12', '90.00', 'Fun', 'expense', 'Fictional concert · tickets'), e('c', '2026-10-25', '2500.00', 'Salary', 'income'), e('d', '2026-09-10', '150.00'), e('f', '2026-10-20', '30.00', 'Dining')];
describe('Session AV (F-MONTH-RECAP)', () => {
  it('says the month in short, per currency', () => {
    expect(monthRecap(entries, record, '2026-10', '2026-11-21')).toEqual([{currency: 'EUR', spent: 24000, income: 250000, previousSpent: 15000,
      top: [{category: 'Groceries', cents: 12000}, {category: 'Fun', cents: 9000}, {category: 'Dining', cents: 3000}], largest: {note: 'Groceries', cents: 12000, date: '2026-10-03'}, budgets: {kept: 1, of: 2}}]);
  });
});
describe('Session AV (F-FRESH-MONTH)', () => {
  it('stops earlier months carrying into the month, and Undo is the record as it was', () => {
    const b = record.budgets[0]!;
    expect(carriedInto(b, entries, '2026-11')).toBe(5000 + 8000); // September left 50, October 80 + 50
    expect(carriesInto(record, entries, '2026-11')).toBe(true);
    const fresh = startFresh(record, '2026-11');
    expect(fresh.budgets.map(x => x.freshFrom ?? null)).toEqual(['2026-11', null]);
    expect(carriedInto(fresh.budgets[0]!, entries, '2026-11')).toBe(0);
    expect(monthView(entries, fresh, '2026-11', '2026-11-21').rows.find(r => r.id === 'b1')!.available).toBe(20000);
    expect(carriedInto(fresh.budgets[0]!, entries, '2026-12')).toBe(20000); // November's own unspent carries on as before
    expect(carriesInto(fresh, entries, '2026-11')).toBe(false);
  });
});
