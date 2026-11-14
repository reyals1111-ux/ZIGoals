import {describe, expect, test} from 'vitest';
import type {MoneyEntry} from '../money-log/schema';
import {showcaseMoneyLog} from '../money-log/showcase';
import {cashFlow, categoryTrend, currenciesOf, monthsBetween, recordMonths, topPayees} from './cash-flow';
import {AGE_RULE, ageOfMoney} from './age-of-money';
import {ordinal, spendingPace} from './spending-pace';

let n = 0;
const e = (date: string, amount: string, category = 'Groceries', kind: 'expense' | 'income' = 'expense', note?: string, currency = 'EUR', extra: Partial<MoneyEntry> = {}): MoneyEntry =>
  ({id: `m${n++}`, kind, amount, currency, category, date, createdAt: `${date}T10:00:00.000Z`, ...(note ? {note} : {}), ...extra});
const TODAY = '2026-11-14';

describe('cash flow month by month (Session AP, feature 1)', () => {
  test('income, spending and net per month with a record, oldest first; a month without records is a gap, never a zero', () => {
    const entries = [e('2026-07-01', '2000.00', 'Salary', 'income'), e('2026-07-03', '100.25'), e('2026-08-15', '50.00'), e('2026-11-02', '2100.00', 'Salary', 'income'), e('2026-11-10', '0.10'), e('2026-11-20', '999.00')];
    const flow = cashFlow(entries, 'EUR', TODAY);
    expect(flow.rows).toEqual([
      {kind: 'month', month: '2026-07', income: 200000, spending: 10025, net: 189975, count: 2},
      {kind: 'month', month: '2026-08', income: 0, spending: 5000, net: -5000, count: 1},
      {kind: 'gap', from: '2026-09', to: '2026-10', months: 2},
      // An entry dated after today is not counted.
      {kind: 'month', month: '2026-11', income: 210000, spending: 10, net: 209990, count: 2},
    ]);
    expect(flow.months.map(m => m.month)).toEqual(['2026-07', '2026-08', '2026-11']);
  });
  test('currencies are never added together', () => {
    const entries = [e('2026-11-01', '10.00'), e('2026-11-01', '5.00', 'Fun', 'expense', undefined, 'USD'), e('2026-10-01', '7.00', 'Fun', 'expense', undefined, 'USD')];
    expect(currenciesOf(entries, TODAY)).toEqual(['EUR', 'USD']);
    expect(cashFlow(entries, 'EUR', TODAY).months).toEqual([{kind: 'month', month: '2026-11', income: 0, spending: 1000, net: -1000, count: 1}]);
    expect(cashFlow(entries, 'USD', TODAY).months.map(m => [m.month, m.spending])).toEqual([['2026-10', 700], ['2026-11', 500]]);
  });
  test('at most the last 12 months with a record, across years', () => {
    const entries = Array.from({length: 15}, (_, i) => e(`${2025 + Math.floor((i + 8) / 12)}-${String(((i + 8) % 12) + 1).padStart(2, '0')}-05`, '1.00'));
    expect(recordMonths(entries, 'EUR', TODAY)).toHaveLength(15);
    const flow = cashFlow(entries, 'EUR', TODAY);
    expect(flow.months).toHaveLength(12);
    expect(flow.months[0]!.month).toBe('2025-12');
    expect(flow.rows.every(r => r.kind === 'month')).toBe(true);
    expect(monthsBetween('2025-12', '2026-02')).toBe(2);
  });
  test('no records: nothing to show', () => { expect(cashFlow([], 'EUR', TODAY)).toEqual({currency: 'EUR', rows: [], months: []}); });
});

describe('a 12-month trend per category (feature 1)', () => {
  test('twelve months to this one; a month with no record is null, a month with records but none in the category is 0', () => {
    const entries = [e('2026-11-01', '30.00'), e('2026-11-02', '10.00', 'Fun'), e('2026-09-03', '20.00'), e('2025-12-01', '5.00', 'Fun'), e('2025-11-30', '99.00')];
    const view = categoryTrend(entries, 'EUR', TODAY);
    expect(view.months[0]).toBe('2025-12');
    expect(view.months.at(-1)).toBe('2026-11');
    const groceries = view.categories.find(c => c.category === 'Groceries')!, fun = view.categories.find(c => c.category === 'Fun')!;
    expect(groceries.values).toEqual([0, null, null, null, null, null, null, null, null, 2000, null, 3000]);
    expect(fun.values).toEqual([500, null, null, null, null, null, null, null, null, 0, null, 1000]);
    expect(view.categories.map(c => c.category)).toEqual(['Groceries', 'Fun']);
  });
  test('a split entry counts in each part\'s category', () => {
    const split = e('2026-11-03', '50.00', 'Groceries', 'expense', undefined, 'EUR', {parts: [{amount: '30.00'}, {amount: '20.00', category: 'Home'}]});
    const view = categoryTrend([split], 'EUR', TODAY);
    expect(view.categories.map(c => [c.category, c.total])).toEqual([['Groceries', 3000], ['Home', 2000]]);
  });
});

describe('top payees this month vs last (feature 1)', () => {
  test('grouped as Upcoming bills reads a payee; last month beside it; no note counts under its category', () => {
    const entries = [e('2026-11-02', '40.00', 'Groceries', 'expense', 'Market'), e('2026-11-09', '20.00', 'Groceries', 'expense', 'market · SHOWCASE DATA'), e('2026-10-05', '25.00', 'Groceries', 'expense', 'Market'),
      e('2026-11-03', '12.99', 'Subscriptions', 'expense', 'NETFLIX.COM 4471*AB'), e('2026-11-04', '8.00', 'Transport'), e('2026-11-05', '100.00', 'Salary', 'income', 'Employer')];
    const view = topPayees(entries, 'EUR', TODAY);
    expect(view.previousRecorded).toBe(true);
    expect(view.payees.map(p => [p.name, p.thisMonth, p.lastMonth, p.count])).toEqual([['market', 6000, 2500, 2], ['NETFLIX.COM 4471*AB', 1299, 0, 1], ['Transport, no payee noted', 800, 0, 1]]);
  });
  test('last month with no record at all is a gap (null), not a zero', () => {
    const view = topPayees([e('2026-11-02', '40.00', 'Groceries', 'expense', 'Market')], 'EUR', TODAY);
    expect(view.previousRecorded).toBe(false);
    expect(view.payees[0]!.lastMonth).toBeNull();
  });
});

describe('age of money, first in first out (feature 4)', () => {
  test('fewer than 30 days of records, or no income in the last 90 days: not enough records yet', () => {
    expect(ageOfMoney([e('2026-10-20', '5.00'), e('2026-11-01', '100.00', 'Salary', 'income')], 'EUR', TODAY)).toMatchObject({status: 'not-enough', reason: 'history', historyDays: 26});
    expect(ageOfMoney([e('2026-01-01', '100.00', 'Salary', 'income'), e('2026-11-01', '5.00')], 'EUR', TODAY)).toMatchObject({status: 'not-enough', reason: 'no-income'});
    expect(ageOfMoney([], 'EUR', TODAY)).toMatchObject({status: 'not-enough', reason: 'history', historyDays: 0});
    expect(ageOfMoney([e('2026-09-01', '100.00', 'Salary', 'income')], 'EUR', TODAY)).toMatchObject({status: 'not-enough', reason: 'no-spending'});
  });
  test('each amount spent takes the oldest unspent income; the age is weighted by the amount', () => {
    // 100 in on 1 Oct, 100 in on 1 Nov; 150 spent on 11 Nov: 100 from 1 Oct (41 days), 50 from 1 Nov (10 days).
    const entries = [e('2026-10-01', '100.00', 'Salary', 'income'), e('2026-11-01', '100.00', 'Salary', 'income'), e('2026-11-11', '150.00')];
    expect(ageOfMoney(entries, 'EUR', TODAY)).toEqual({currency: 'EUR', status: 'ok', days: 30.7, matched: 15000, unmatched: 0, spent: 15000});
  });
  test('spending no logged income covers is left out and said; same-day income first; other currencies apart; outside 90 days ignored', () => {
    const entries = [e('2026-07-01', '500.00', 'Salary', 'income'), e('2026-09-01', '10.00'), e('2026-09-02', '20.00', 'Salary', 'income'), e('2026-09-02', '30.00'), e('2026-09-03', '1.00', 'Fun', 'expense', undefined, 'USD')];
    // 1 Sep's 10.00 comes before any income in the window (the 1 July income is older than 90 days): unmatched.
    // 2 Sep: 20.00 in, then 30.00 out: 20.00 at 0 days, 10.00 unmatched.
    expect(ageOfMoney(entries, 'EUR', TODAY)).toEqual({currency: 'EUR', status: 'ok', days: 0, matched: 2000, unmatched: 2000, spent: 4000});
    expect(ageOfMoney(entries, 'USD', TODAY)).toMatchObject({status: 'not-enough'});
    expect(AGE_RULE).toMatch(/first in, first out/);
  });
  test('ten thousand large entries keep exact cents (BigInt)', () => {
    const many = [e('2026-09-01', '1000000000.00', 'Salary', 'income'), ...Array.from({length: 5000}, () => e('2026-11-01', '1000000000.00', 'Salary', 'income')), ...Array.from({length: 5000}, () => e('2026-11-10', '1000000000.00'))];
    const out = ageOfMoney(many, 'EUR', TODAY);
    expect(out).toMatchObject({status: 'ok', matched: 5000 * 100_000_000_000, unmatched: 0});
    // One lot of 70 days, 4,999 of 9 days: (70 + 4999 × 9) ÷ 5000 = 9.012 → 9.0.
    expect(out.status === 'ok' && out.days).toBe(9);
  });
});

describe('spending pace vs your usual month (feature 5)', () => {
  test('needs three earlier months with spending records', () => {
    const entries = [e('2026-10-03', '10.00'), e('2026-09-03', '10.00'), e('2026-08-03', '1000.00', 'Salary', 'income'), e('2026-11-02', '5.00')];
    expect(spendingPace(entries, 'EUR', TODAY)).toEqual({currency: 'EUR', status: 'not-enough', day: 14, months: 2});
  });
  test('the middle of what earlier months show spent by the same day; this month so far; never a forecast', () => {
    const entries = [
      e('2026-10-03', '100.00'), e('2026-10-14', '50.00'), e('2026-10-15', '999.00'), // by the 14th: 150
      e('2026-09-01', '80.00'), // 80
      e('2026-08-10', '300.00'), e('2026-08-20', '1.00'), // 300
      e('2025-10-01', '9999.00'), // more than 12 months back: not counted
      e('2026-11-01', '120.00'), e('2026-11-14', '0.50'), e('2026-11-15', '50.00'),
    ];
    expect(spendingPace(entries, 'EUR', TODAY)).toEqual({currency: 'EUR', status: 'ok', day: 14, usual: 15000, thisMonth: 12050, months: 3, difference: -2950});
  });
  test('on the 31st a shorter month counts to its last day', () => {
    const entries = [e('2026-11-30', '10.00'), e('2026-09-30', '20.00'), e('2026-06-30', '30.00')];
    expect(spendingPace(entries, 'EUR', '2026-12-31')).toMatchObject({status: 'ok', usual: 2000, thisMonth: 0, day: 31});
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '31st']);
  });
});

describe('the Showcase log', () => {
  test('gives honest answers: one or two months of cash flow, and not enough months for the pace', () => {
    const log = showcaseMoneyLog(TODAY);
    expect(cashFlow(log.entries, 'EUR', TODAY).months.length).toBeGreaterThanOrEqual(1);
    expect(spendingPace(log.entries, 'EUR', TODAY).status).toBe('not-enough');
    expect(ageOfMoney(log.entries, 'EUR', TODAY).status).toBe('ok');
  });
});
