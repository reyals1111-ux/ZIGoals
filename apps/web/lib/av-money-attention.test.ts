import {describe, expect, it} from 'vitest';
import {attentionLinks, attentionPieces, moneyAttention} from './money-attention';
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
  // Session AV (fresh-agent check q2, ranks 20 and 31): faster than the month, a watched category well above last month,
  // and each piece's own place in Wealth.
  it('names a budget faster than the month and a watched category well above last month, each with its place', () => {
    const budgets = {version: 1, budgets: [{id: 'b1', category: 'Fun', currency: 'EUR', monthly: '100.00', rollover: false, since: '2026-11'}, {id: 'b2', category: 'Groceries', currency: 'EUR', monthly: '100.00', rollover: false, since: '2026-11'}], watch: [{category: 'Dining', currency: 'EUR'}]} as never;
    const entries = [e('f1', '2026-11-08', '70.00', 'Fun'), e('g1', '2026-11-03', '90.00'), e('d1', '2026-11-05', '60.00', 'Dining'), e('d0', '2026-10-05', '20.00', 'Dining')];
    const a = moneyAttention({entries, budgets, today: '2026-11-14'});
    expect(a.near).toEqual([{category: 'Groceries', currency: 'EUR'}]);
    expect(a.fast).toEqual([{category: 'Fun', currency: 'EUR'}]); // 70 % spent with 47 % of the month gone
    expect(a.watched).toEqual([{category: 'Dining', currency: 'EUR'}]);
    expect(attentionLinks(a)).toEqual([{text: 'Groceries near its limit', href: '/app/wealth?view=budgets'}, {text: 'Fun faster than the month', href: '/app/wealth?view=budgets'}, {text: 'Dining well above last month', href: '/app/wealth?view=budgets'}]);
    expect(a.count).toBe(3);
    const r = moneyAttention({entries: [e('a2', '2026-11-20', '30.00', 'Fun')], review: {version: 1, ids: ['a2']}, today: TODAY});
    expect(attentionLinks(r)).toEqual([{text: '1 entry to review', href: '/app/wealth#spending'}]);
  });
});
