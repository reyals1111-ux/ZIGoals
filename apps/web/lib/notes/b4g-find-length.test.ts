import {describe, expect, test} from 'vitest';
import {findMatches, replaceAll} from './find';

/**
 * Session AV lane 2 (review b4g B4G-7; LEDGER #312): when lower case changes the length of the words found, each place
 * is compared as written, so a replace never leaves part of a letter behind.
 */
describe('find with letters whose lower case is longer', () => {
  test('a precomposed İ never replaces half of a decomposed i̇', () => {
    const text = 'i̇stanbul';
    const out = replaceAll(text, 'İ', 'X');
    expect(out === text || out === 'Xstanbul').toBe(true);
    expect(out).not.toMatch(/Ẋ/);
    for (const at of findMatches(text, 'İ')) expect(text.slice(at, at + 1).toLocaleLowerCase('en-US')).toBe('İ'.toLocaleLowerCase('en-US'));
  });
  test('plain text is found as before', () => {
    expect(findMatches('İstanbul and İzmir', 'İ')).toEqual([0, 13]);
    expect(replaceAll('Cat cat', 'cat', 'dog')).toBe('dog dog');
  });
});
