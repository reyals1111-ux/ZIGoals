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

describe('a node\'s glyph on the orbit path (Session AG)', () => {
  test('words first, then the page\'s mark, then the kind\'s; a custom item without telling words is a star', async () => {
    const {orbitGlyph} = await import('./glyphs');
    expect(orbitGlyph({glyph: 'habits', label: 'Walk 8,000 steps'})).toBe('footsteps');
    expect(orbitGlyph({glyph: 'focus', label: 'Deep work block'})).toBe('target');
    expect(orbitGlyph({glyph: 'flag', label: 'Move €200 to savings'})).toBe('coin');
    expect(orbitGlyph({glyph: 'habits', label: 'Read 5 pages'})).toBe('book');
    expect(orbitGlyph({glyph: 'drop', label: 'Water'})).toBe('drop');
    expect(orbitGlyph({glyph: 'sparkle', label: 'Call grandma'})).toBe('star');
    expect(orbitGlyph({glyph: 'habits', label: 'Tidy the desk'})).toBe('orbit');
    expect(orbitGlyph({glyph: 'flag', label: 'Launch the website'})).toBe('target');
    expect(orbitGlyph({glyph: 'focus', label: 'Practise'})).toBe('clock');
  });
  test('every glyph it can give is drawn by the path\'s own glyph table (no icon library)', async () => {
    const {PATH_GLYPH_NAMES} = await import('../../components/path/glyph-paths');
    for (const name of ['star', 'target', 'footsteps', 'coin', 'apple', 'orbit', 'clock', 'heart', 'book', 'lotus', 'moon', 'hourglass', 'dumbbell', 'scale', 'meal', 'pill', 'pen', 'note', 'drop']) expect(PATH_GLYPH_NAMES, name).toContain(name);
  });
});
