import {describe, expect, test} from 'vitest';
import {findMatches, nextAfter, replaceOne} from './find';

/**
 * Session AV lane 2 (review b4g B4G-8; LEDGER #312): after Replace, the current match is the first one after the words
 * just put in, so a replacement that holds the found words ("cat" → "cats") never replaces itself again.
 */
describe('Replace moves on', () => {
  test('cat → cats twice changes two cats, never "catss"', () => {
    let text = 'a cat, a cat', at = 0;
    for (let k = 0; k < 2; k++) {
      const hits = findMatches(text, 'cat'), hit = hits[at]!;
      text = replaceOne(text, hit, 3, 'cats');
      at = nextAfter(findMatches(text, 'cat'), hit + 4);
    }
    expect(text).toBe('a cats, a cats');
  });
  test('past the last match it starts again at the first', () => {
    expect(nextAfter([2, 9], 10)).toBe(0); expect(nextAfter([2, 9], 3)).toBe(1); expect(nextAfter([], 0)).toBe(0);
  });
});
