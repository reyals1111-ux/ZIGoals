import {describe, expect, test} from 'vitest';
import {cardQueue, keyAction, progressWords, swipeAction} from './queue';
import {acceptReview, markForReview, toReview, type MoneyReview} from '../money-review/review';
import type {MoneyEntry} from '../money-log/schema';

const e = (id: string, date: string, at = '10:00'): MoneyEntry => ({id, kind: 'expense', amount: '5.00', currency: 'EUR', category: 'Other', note: `Payee ${id}`, date, createdAt: `${date}T${at}:00.000Z`});
const entries = [e('a', '2026-10-01'), e('b', '2026-10-03'), e('c', '2026-10-03', '12:00'), e('d', '2026-10-02')];

describe('BUILD list 2 #9: card mode for the review inbox', () => {
  test('the order is the inbox\'s own: newest first, the later one of a day first; skipped ones left out', () => {
    const review: MoneyReview = {version: 1, ids: ['a', 'b', 'c', 'd']};
    const pending = toReview(review, entries);
    expect(cardQueue(pending, new Set()).map(x => x.id)).toEqual(['c', 'b', 'd', 'a']);
    expect(cardQueue(pending, new Set(['b'])).map(x => x.id)).toEqual(['c', 'd', 'a']);
  });
  test('accept, then Undo, brings the same card back in its place', () => {
    let review: MoneyReview = {version: 1, ids: ['a', 'b', 'c', 'd']};
    const first = cardQueue(toReview(review, entries), new Set())[0]!;
    review = acceptReview(review, [first.id]);
    expect(cardQueue(toReview(review, entries), new Set()).map(x => x.id)).toEqual(['b', 'd', 'a']);
    review = markForReview(review, [first.id]);
    expect(cardQueue(toReview(review, entries), new Set())[0]!.id).toBe('c');
  });
  test('keyboard only: A, S, R and Z; never with Ctrl, Alt or Meta, never on a held key', () => {
    expect(['a', 'S', 'r', 'z', 'x'].map(key => keyAction({key}))).toEqual(['accept', 'skip', 'rule', 'undo', null]);
    expect(keyAction({key: 'a', ctrlKey: true})).toBeNull();
    expect(keyAction({key: 'r', metaKey: true})).toBeNull();
    expect(keyAction({key: 's', altKey: true})).toBeNull();
    expect(keyAction({key: 'a', repeat: true})).toBeNull();
  });
  test('a swipe needs a clear distance either way', () => {
    expect(swipeAction(150, 360)).toBe('accept');
    expect(swipeAction(-150, 360)).toBe('skip');
    expect(swipeAction(60, 360)).toBeNull();
    expect(swipeAction(50, 100)).toBe('accept'); // never less than 48 px
  });
  test('plain words at every step', () => {
    expect(progressWords(4, 0, 0)).toBe('4 to go');
    expect(progressWords(2, 1, 2)).toBe('2 to go · 2 reviewed');
    expect(progressWords(0, 2, 3)).toBe('You skipped 2; they stay in To review.');
    expect(progressWords(0, 0, 3)).toBe('All reviewed. Nothing left in To review.');
  });
});
