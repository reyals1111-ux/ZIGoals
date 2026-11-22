import {describe, expect, it} from 'vitest';
import {BUDGET_PERIODS, applyFill, emptyBudgetPeriods, fillTotals, incomeToFill, payMonth, periodAmount, periodRows, saveFill, setPeriods, weekRange} from './periods';
import {emptyBudgets, type BudgetsRecord} from './schema';
import {readDeviceRecord} from '../device-record';
import type {MoneyEntry} from '../money-log/schema';
import type {Account} from '../accounts/schema';

/** Session AV lane 2 (Money N11, LEDGER #212, #213, #216; Goodbudget): pay periods, a paycheck fill, debts paid from a budget. */
const budgets: BudgetsRecord = {...emptyBudgets(), budgets: [
  {id: 'food', category: 'Groceries', currency: 'EUR', monthly: '520.00', rollover: false, since: '2026-01'},
  {id: 'fun', category: 'Fun', currency: 'EUR', monthly: '100.00', rollover: false, since: '2026-01'},
]};
const entry = (id: string, kind: 'expense' | 'income', amount: string, category: string, date: string): MoneyEntry => ({id, kind, amount, currency: 'EUR', category, date, createdAt: `${date}T10:00:00.000Z`});
const entries = [entry('e1', 'expense', '40.00', 'Groceries', '2026-11-24'), entry('e2', 'expense', '60.00', 'Groceries', '2026-11-20'), entry('e3', 'expense', '30.00', 'Fun', '2026-11-26'), entry('i1', 'income', '2500.00', 'Salary', '2026-11-25')];
const today = '2026-11-26';
describe('pay periods (LEDGER #212)', () => {
  it('a budget month that starts on payday, weeks and two weeks', () => {
    expect(payMonth(today, 25)).toEqual({start: '2026-11-25', end: '2026-12-24'});
    expect(payMonth('2026-11-10', 25)).toEqual({start: '2026-10-25', end: '2026-11-24'});
    expect(payMonth(today)).toEqual({start: '2026-11-01', end: '2026-11-30'});
    expect(payMonth('2026-01-05', 25)).toEqual({start: '2025-12-25', end: '2026-01-24'});
    expect(weekRange(today, 'week')).toEqual({start: '2026-11-23', end: '2026-11-29'});
    expect(weekRange(today, 'fortnight').end).toBe(addDays(weekRange(today, 'fortnight').start, 13));
    expect(periodAmount(52_000, 'week')).toBe(12_000);
  });
  it('each budget in its own period, debt payments counted against a linked budget', () => {
    let plan = setPeriods(setPeriods(emptyBudgetPeriods(), {payday: 25}), {every: {budgetId: 'food', every: 'week'}});
    const debt = {id: '00000000-0000-4000-8000-000000000001', kind: 'credit-card', name: 'Fictional card', currency: 'EUR', snapshots: [], payments: [{id: '00000000-0000-4000-8000-000000000002', date: '2026-11-25', value: '2500', decimals: 2}], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'} as Account;
    plan = setPeriods(plan, {debt: {accountId: debt.id, budgetId: 'fun'}});
    const rows = periodRows(entries, budgets, plan, today, {accounts: [debt]});
    expect(rows.map(r => [r.budget.id, r.every, r.start, r.amount, r.spent, r.debtPaid, r.left])).toEqual([
      ['food', 'week', '2026-11-23', 12_000, 4_000, 0, 8_000],
      ['fun', 'month', '2026-11-25', 10_000, 3_000, 2_500, 4_500],
    ]);
  });
});
describe('a paycheck fill (LEDGER #213)', () => {
  it('is offered once per income entry and sets the budgets, with both records to undo', () => {
    let plan = saveFill(emptyBudgetPeriods(), [{budgetId: 'food', amount: '600'}, {budgetId: 'fun', amount: ''}]);
    expect(fillTotals(budgets, plan)).toEqual([{currency: 'EUR', cents: 60_000}]);
    const income = incomeToFill(entries, budgets, plan, today);
    expect(income?.id).toBe('i1');
    const out = applyFill(budgets, plan, income!.id);
    expect([out.changed, out.budgets.budgets.find(b => b.id === 'food')!.monthly]).toEqual([1, '600.00']);
    plan = out.plan;
    expect(incomeToFill(entries, out.budgets, plan, today)).toBeNull();
    expect(() => saveFill(plan, [{budgetId: 'food', amount: '6,00'}])).toThrow();
  });
});
describe('export, erase and restore keep the record (TIER 3 stored formats)', () => {
  it('reads back what it wrote; a value it cannot read is dropped, never failing the record', () => {
    const plan = saveFill(setPeriods(emptyBudgetPeriods(), {payday: 25, every: {budgetId: 'food', every: 'fortnight'}}), [{budgetId: 'food', amount: '300'}]);
    const m = new Map([[BUDGET_PERIODS.key, JSON.stringify(plan)]]), storage = {getItem: (k: string) => m.get(k) ?? null};
    expect(readDeviceRecord(storage, BUDGET_PERIODS).data).toEqual(plan);
    m.set(BUDGET_PERIODS.key, JSON.stringify({...plan, payday: 31, every: {food: 'daily', fun: 'week'}}));
    expect(readDeviceRecord(storage, BUDGET_PERIODS).data).toMatchObject({every: {fun: 'week'}});
    expect(readDeviceRecord(storage, BUDGET_PERIODS).data.payday).toBeUndefined();
  });
});
function addDays(day: string, n: number) { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
