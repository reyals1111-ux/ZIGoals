import {describe, expect, test} from 'vitest';
import {topPayees} from './cash-flow';
import {countedBetween} from '../money-log/counted';
import type {MoneyEntry} from '../money-log/schema';

/**
 * Review b4f follow-up: Top payees counts by the shared rule (lib/money-log/counted.ts `countedDayParts`) — the person's
 * share of a shared cost; an entry left out, a transfer and a Settle-up refund not at all; a cost spread over months by
 * its share in each month — so the payees add up to what the other month views and the budgets count.
 */
let n = 0;
const e = (note: string, over: Partial<MoneyEntry> = {}): MoneyEntry => ({id: `t${n++}`, kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Groceries', note, date: '2026-11-03', createdAt: '2026-11-03T10:00:00.000Z', ...over});
const TODAY = '2026-11-14';

describe('Top payees by the shared rule', () => {
  const entries = [e('Market', {amount: '90.00', share: '30.00'}), e('Market', {amount: '20.00', date: '2026-10-05'}), e('Card payment', {amount: '500.00', transfer: 'x'}), e('Pet shop', {amount: '40.00', excluded: true}),
    e('Insurer', {amount: '1200.00', category: 'Bills', date: '2026-09-10', spread: 12}), e('Bakery', {amount: '8.00'})];
  const view = topPayees(entries, 'EUR', TODAY);
  test('a shared cost by the share; left out and transfers not at all; a spread cost by its share this month and last', () => {
    expect(view.payees.map(p => [p.name, p.thisMonth, p.lastMonth])).toEqual([['Insurer', 10_000, 10_000], ['Market', 3_000, 2_000], ['Bakery', 800, 0]]);
    expect(view.payees.reduce((s, p) => s + p.thisMonth, 0)).toBe(countedBetween(entries, '2026-11-01', TODAY).get('EUR'));
  });
  test('a share placed after today is not yet counted; a month with only a left-out entry is not recorded', () => {
    expect(topPayees([e('Insurer', {amount: '1200.00', date: '2026-09-20', spread: 12})], 'EUR', TODAY).payees).toEqual([]);
    expect(topPayees([e('Bakery'), e('Pet shop', {date: '2026-10-05', excluded: true})], 'EUR', TODAY)).toMatchObject({previousRecorded: false, payees: [{name: 'Bakery', lastMonth: null}]});
  });
});
