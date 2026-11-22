import {describe, expect, test} from 'vitest';
import {questionChart, questionEntries} from './saved-searches';
import type {MoneyEntry} from './schema';

/** Review b4f #5 (Minor): "(N entries counted)" counts only the counted entries of the kind the chart shows. */
const e = (over: Partial<MoneyEntry>): MoneyEntry => ({id: Math.random().toString(36).slice(2, 10), kind: 'expense', amount: '20.00', currency: 'EUR', category: 'Fun', note: 'Cinema', date: '2026-11-03', createdAt: '2026-11-03T10:00:00.000Z', ...over});

describe('review b4f #5: the count matches the figure', () => {
  const entries = [e({}), e({kind: 'income', amount: '5.00', category: 'Refund', note: 'Cinema refund'}), e({amount: '9.00', excluded: true})];
  test('spent: one entry counted, not the refund or the entry left out', () => {
    const q = {id: 'q', name: 'Cinema', text: 'cinema'};
    expect(questionChart(questionEntries(entries, q), q, '2026-11-14')[0]).toMatchObject({figure: 'spent', total: 2_000, count: 1});
  });
  test('received: the refund alone', () => {
    const q = {id: 'q', name: 'Cinema refunds', text: 'cinema', kind: 'income' as const};
    expect(questionChart(questionEntries(entries, q), q, '2026-11-14')[0]).toMatchObject({figure: 'received', total: 500, count: 1});
  });
});
