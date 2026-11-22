import {describe, expect, it} from 'vitest';
import {countShown} from './length-counter';

/** Session AV lane 2 (M-9, owner decision): the goal creator's name shows its count only from 60 characters. */
describe('countShown', () => {
  it('a field without data-count-from counts at once', () => {
    expect(countShown(0, undefined)).toBe(true);
  });
  it('the goal name (from 60) hides "0 / 80" and short names, and shows from 60 on', () => {
    expect([countShown(0, '60'), countShown(59, '60'), countShown(60, '60'), countShown(80, '60')]).toEqual([false, false, true, true]);
  });
  it('a value it cannot read counts at once', () => {
    expect(countShown(0, 'x')).toBe(true);
  });
});
