import {describe, expect, test} from 'vitest';
import {itemGlyph} from './glyphs';

describe('a planet\'s mark from its own words (L3b)', () => {
  test('the owner\'s items get their own marks', () => {
    const marks = ['Take vitamins and creatine', 'Do 100 push-ups', 'Take all supplements', 'Read 5 pages', 'Play piano 15 minutes', 'Meditate & breathwork 15 minutes']
      .map(label => itemGlyph({glyph: 'habits', label}));
    expect(marks).toEqual(['pill', 'dumbbell', 'pill', 'book', 'note', 'lotus']);
  });
  test('a specific mark from the page stays; unknown words keep the generic one', () => {
    expect(itemGlyph({glyph: 'drop', label: 'Read the water bill'})).toBe('drop');
    expect(itemGlyph({glyph: 'flag', label: 'Move €200 to savings'})).toBe('flag');
    expect(itemGlyph({glyph: 'sparkle', label: 'Call grandma'})).toBe('sparkle');
    expect(itemGlyph({glyph: 'focus', label: 'Deep work'})).toBe('focus');
  });
});
