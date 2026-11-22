import {describe, expect, test} from 'vitest';
import {insertTick} from './marks';

/** Session AV lane 2 (review B3C-11): the Tick box button marks the caret's own line, also at the very start. */
describe('Tick box at the start of the text', () => {
  test('caret 0 on an empty first line of a text that starts with a newline: the first line gets the box', () => {
    expect(insertTick('\nsecond line', 0)).toEqual({text: '- [ ] \nsecond line', start: 6, end: 6});
  });
  test('caret 0 on a first line with words', () => {
    expect(insertTick('first\nsecond', 0).text).toBe('- [ ] first\nsecond');
  });
  test('caret right after the leading newline: the second line', () => {
    expect(insertTick('\nsecond line', 1).text).toBe('\n- [ ] second line');
  });
  test('two leading newlines, caret on the middle empty line', () => {
    expect(insertTick('\n\nthird', 1).text).toBe('\n- [ ] \nthird');
  });
});
