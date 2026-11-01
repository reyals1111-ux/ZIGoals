import {describe, expect, test} from 'vitest';
import {showcaseMoneyReview} from './showcase';
import {moneyReviewSchema, toReview} from '../money-review/review';
import {showcaseMoneyLog} from '../money-log/showcase';

describe('BUILD list 2 #9: the Showcase example cards', () => {
  test('three labelled fictional expenses to review, valid for the stored format', () => {
    const log = showcaseMoneyLog('2026-11-01'), review = showcaseMoneyReview(log);
    expect(moneyReviewSchema.parse(review)).toEqual(review);
    expect(review.ids).toHaveLength(3);
    expect(toReview(review, log.entries).every(e => e.note?.includes('SHOWCASE DATA') && e.kind === 'expense')).toBe(true);
  });
});
