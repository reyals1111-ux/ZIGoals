import {describe, expect, test} from 'vitest';
import {dailyRangeWords} from './markdown';

/** Review b5i B5I-11 (Minor): the range counts only the daily notes its export holds, and says how many locked stay out. */
describe('the daily range says what it will export', () => {
  test('locked notes are not counted, and are named as staying out; only locked ones: nothing to export', () => {
    expect(dailyRangeWords([{}, {locked: true}, {}])).toEqual({count: 2, words: '2 daily notes in these days, with their photos. 1 locked daily note stays out (open one and use Save this note as… to take it out).'});
    expect(dailyRangeWords([{locked: true}, {locked: true}])).toEqual({count: 0, words: 'No daily note to export in these days. 2 locked daily notes stay out (open one and use Save this note as… to take it out).'});
    expect(dailyRangeWords([{}])).toEqual({count: 1, words: '1 daily note in these days, with its photos.'});
    expect(dailyRangeWords([]).count).toBe(0);
  });
});
