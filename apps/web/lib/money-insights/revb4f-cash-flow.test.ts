import {describe, expect, test} from 'vitest';
import {cashFlow} from './cash-flow';
import {totals} from '../money-log/engine';
import type {MoneyEntry} from '../money-log/schema';

/**
 * Review b4f #3 (Major): "Month by month" counts by Wealth → Spending's rule — a shared cost by the person's share,
 * an entry left out of the figures, both sides of a transfer and a Settle-up refund not at all — so its November is the
 * same figure as Spending's This month line and the table under it.
 */
let n = 0;
const e = (over: Partial<MoneyEntry>): MoneyEntry => ({id: `b${n++}`, kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Groceries', date: '2026-11-03', createdAt: '2026-11-03T10:00:00.000Z', ...over});
const TODAY = '2026-11-14';

describe('review b4f #3: Month by month by Wealth → Spending’s rule', () => {
  test('a shared cost by the person’s share; left out, transfers and refunds not counted', () => {
    const entries = [e({amount: '100.00', share: '40.00'}), e({amount: '50.00', excluded: true}), e({amount: '200.00', transfer: 'x'}), e({kind: 'income', amount: '200.00', category: 'Other income', transfer: 'y'}),
      e({kind: 'income', amount: '25.00', category: 'Refund', excluded: true}), e({kind: 'income', amount: '1000.00', category: 'Salary'})];
    const nov = cashFlow(entries, 'EUR', TODAY).months.find(m => m.month === '2026-11')!;
    const spending = totals(entries, '2026-11-01', TODAY)[0]!;
    expect(nov).toMatchObject({spending: 4_000, income: 100_000, net: 96_000, count: 2});
    expect([nov.spending, nov.income]).toEqual([spending.expenses, spending.income]);
  });
});
