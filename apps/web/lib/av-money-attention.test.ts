import {describe, expect, it} from 'vitest';
import {attentionPieces, moneyAttention} from './money-attention';
import type {MoneyEntry} from './money-log/schema';

/** Session AV (owner follow-up 1, F-MONEY-ATTENTION): to review, budgets over, bills due in three days. */
const e = (id: string, date: string, amount: string, category = 'Groceries'): MoneyEntry => ({id, kind: 'expense', amount, currency: 'EUR', category, date, createdAt: `${date}T10:00:00.000Z`});
const TODAY = '2026-11-23';
describe('Session AV (F-MONEY-ATTENTION)', () => {
  it('names each thing that asks, and nothing when nothing does', () => {
    const entries = [e('a1', '2026-11-03', '250.00'), e('a2', '2026-11-20', '30.00', 'Fun')];
    const a = moneyAttention({entries, today: TODAY,
      review: {version: 1, ids: ['a2', 'gone']},
      budgets: {version: 1, budgets: [{id: 'b1', category: 'Groceries', currency: 'EUR', monthly: '200.00', rollover: false, since: '2026-11'}, {id: 'b2', category: 'Fun', currency: 'EUR', monthly: '100.00', rollover: false, since: '2026-11'}]},
      bills: {version: 1, bills: [{id: 'r1', title: 'Fictional rent', amount: '900.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-11-24', origin: 'manual', createdAt: '2026-10-01T10:00:00.000Z'}, {id: 'r2', title: 'Fictional gym', amount: '30.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-05', origin: 'manual', createdAt: '2026-10-01T10:00:00.000Z'}]} as never});
    expect(attentionPieces(a)).toEqual(['1 entry to review', 'Groceries over budget', 'Fictional rent due tomorrow']);
    expect(a.count).toBe(3);
    expect(moneyAttention({entries: [], today: TODAY}).count).toBe(0);
  });
  it('Session AV (F-BUDGET-PACE): a budget from 80 % spent is near its limit; under 80 % says nothing', () => {
    const budgets = {version: 1, budgets: [{id: 'b1', category: 'Groceries', currency: 'EUR', monthly: '200.00', rollover: false, since: '2026-11'}]} as never;
    expect(attentionPieces(moneyAttention({entries: [e('n1', '2026-11-10', '160.00')], budgets, today: TODAY}))).toEqual(['Groceries near its limit']);
    expect(moneyAttention({entries: [e('n2', '2026-11-10', '159.99')], budgets, today: TODAY}).count).toBe(0);
  });
});
