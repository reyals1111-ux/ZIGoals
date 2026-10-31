import {describe, expect, test} from 'vitest';
import {MAX_REVIEW, acceptReview, emptyMoneyReview, markForReview, moneyReviewSchema, pruneReview, toReview} from './review';
import {totals} from '../money-log/engine';
import type {MoneyEntry} from '../money-log/schema';

const e = (id: string, date: string): MoneyEntry => ({id, kind: 'expense', amount: '5.00', currency: 'EUR', category: 'Other', date, createdAt: `${date}T10:00:00.000Z`});
describe('the review inbox for imported money (Session AK lane M, item 10)', () => {
  test('mark once, newest first, only entries still in the log', () => {
    const r = markForReview(markForReview(emptyMoneyReview(), ['a', 'b']), ['b', 'c', 'c']);
    expect(r.ids).toEqual(['a', 'b', 'c']);
    expect(toReview(r, [e('a', '2026-10-01'), e('c', '2026-10-05'), e('z', '2026-10-09')]).map(x => x.id)).toEqual(['c', 'a']);
  });
  test('accept one or all; prune drops ids whose entries are gone', () => {
    const r = markForReview(emptyMoneyReview(), ['a', 'b', 'c']);
    expect(acceptReview(r, ['b']).ids).toEqual(['a', 'c']);
    expect(acceptReview(r, r.ids).ids).toEqual([]);
    expect(pruneReview(r, [e('c', '2026-10-01')]).ids).toEqual(['c']);
  });
  test('bounded: the newest 2,000 are kept and the record stays valid', () => {
    const r = markForReview(emptyMoneyReview(), Array.from({length: MAX_REVIEW + 5}, (_, i) => `id${i}`));
    expect(r.ids).toHaveLength(MAX_REVIEW);
    expect(r.ids[0]).toBe('id5');
    expect(moneyReviewSchema.safeParse(r).success).toBe(true);
    expect(moneyReviewSchema.parse({version: 1})).toEqual({version: 1, ids: []});
  });
  test('unreviewed entries still count in the totals', () => {
    const entries = [e('a', '2026-10-01'), e('b', '2026-10-02')];
    markForReview(emptyMoneyReview(), ['a']);
    expect(totals(entries, '2026-10-01', '2026-10-31')[0]).toMatchObject({expenses: 1000, count: 2});
  });
});
