import {describe, expect, test} from 'vitest';
import {leftThisMonth} from './left-this-month';
import {totals} from '../money-log/engine';
import type {MoneyEntry} from '../money-log/schema';
import type {BudgetsRecord} from './schema';
import type {BillsRecord} from '../bills/schema';

/**
 * Session AV lane 2, round 3 (money; PocketGuard's Leftover, LEDGER #291): Left this month is the month's income less what
 * was spent, what the budgets still hold, the bills still due that no budget covers, the Goal plans still to come and the
 * planned costs — each part listed, per currency — with spending and income summed by Wealth → Spending's own `totals`.
 */
const TODAY = '2026-11-22', at = `${TODAY}T10:00:00.000Z`;
const e = (over: Partial<MoneyEntry>): MoneyEntry => ({id: Math.random().toString(36).slice(2, 10), kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Other', date: '2026-11-05', createdAt: at, ...over});
const entries: MoneyEntry[] = [
  e({kind: 'income', amount: '2000.00', category: 'Salary', date: '2026-11-01'}),
  e({amount: '120.00', category: 'Groceries'}),
  e({amount: '50.00', category: 'Fun', excluded: true}), // left out of the figures
  e({amount: '90.00', category: 'Food & drink', share: '30.00'}), // my share 30.00
  e({kind: 'income', amount: '25.00', category: 'Refund', excluded: true}), // a Settle-up refund
  e({id: 't1', amount: '300.00', category: 'Transfer', transfer: 't2'}),
];
const budgets: BudgetsRecord = {version: 1, budgets: [{id: 'g', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false, since: '2026-11'}, {id: 'h', category: 'Home', currency: 'EUR', monthly: '100.00', rollover: false, since: '2026-11'}]};
const bills: BillsRecord = {version: 1, dismissed: [], bills: [
  {id: 'b1', title: 'Phone', amount: '20.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-11-28', origin: 'manual', createdAt: at},
  {id: 'b2', title: 'Rent top-up', amount: '40.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-11-27', origin: 'manual', category: 'Home', createdAt: at}, // in the Home budget
  {id: 'b3', title: 'Gym', amount: '30.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-02', origin: 'manual', createdAt: at}, // next month
]};
const contributions = [{goalName: 'Holiday', amount: '5000', asset: 'EUR', decimals: 2, cadence: 'monthly' as const, nextDate: '2026-11-25', active: true}];
const planned = [{name: 'Birthday present', amount: '60.00', currency: 'EUR', date: '2026-11-29'}, {name: 'Later', amount: '99.00', currency: 'EUR', date: '2026-12-10'}];

describe('Left this month', () => {
  const [r] = leftThisMonth({entries, budgets, bills, contributions, planned, today: TODAY});
  test('income and spending are Wealth → Spending’s own figures (left out, transfers, refunds, my share)', () => {
    const t = totals(entries, '2026-11-01', '2026-11-30')[0]!;
    expect(r).toMatchObject({currency: 'EUR', income: t.income, spent: t.expenses});
    expect([r!.income, r!.spent]).toEqual([200000, 15000]);
  });
  test('each part listed, and what is left', () => {
    expect(r!.budgets).toEqual({cents: 28000, items: [{name: 'Groceries', cents: 18000}, {name: 'Home', cents: 10000}]});
    expect(r!.bills).toEqual({cents: 2000, items: [{name: 'Phone', cents: 2000, date: '2026-11-28'}]});
    expect(r!.goals).toEqual({cents: 5000, items: [{name: 'Holiday', cents: 5000, date: '2026-11-25'}]});
    expect(r!.planned).toEqual({cents: 6000, items: [{name: 'Birthday present', cents: 6000, date: '2026-11-29'}]});
    expect(r!.left).toBe(200000 - 15000 - 28000 - 2000 - 5000 - 6000);
  });
  test('a budget spent past its amount holds nothing more (its spending counts once, in spent)', () => {
    const [over] = leftThisMonth({entries: [...entries, e({amount: '400.00', category: 'Groceries'})], budgets, today: TODAY});
    expect(over!.budgets.items.map(i => i.name)).toEqual(['Home']);
    expect(over!.left).toBe(200000 - 55000 - 10000);
  });
  test('a bill the log already shows is not counted again; a currency without income still shows its parts', () => {
    const paid = [...entries, e({amount: '20.00', note: 'Phone', category: 'Bills', date: '2026-11-24'})];
    expect(leftThisMonth({entries: paid, budgets, bills, today: TODAY})[0]!.bills.cents).toBe(0);
    const usd = leftThisMonth({entries: [], planned: [{name: 'Visa fee', amount: '30.00', currency: 'USD', date: '2026-11-30'}], today: TODAY});
    expect(usd).toEqual([expect.objectContaining({currency: 'USD', income: 0, left: -3000})]);
    expect(leftThisMonth({entries: [], today: TODAY})).toEqual([]);
  });
});
