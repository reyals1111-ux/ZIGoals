import {describe, expect, test} from 'vitest';
import {planetDesigns} from './planet-pick';
import {PLANET_DESIGNS} from './planet-designs';

describe('the orbit planets\' designs (Session AG Polish, owner Part 4)', () => {
  test('by the first node\'s hue: cyan 05, blue 06, magenta 07, purple 09', () => {
    expect(planetDesigns(['cyan', 'blue', 'magenta', 'purple'], 'p')).toEqual(['05', '06', '07', '09']);
  });
  test('teal rotates through 04, 08 and 10: two teal orbits in a day never match', () => {
    for (const seed of ['a', 'b', 'c', 'checklist', 'x1']) {
      const out = planetDesigns(['teal', 'teal', 'teal'], seed);
      expect(new Set(out).size).toBe(3);
      for (const id of out) expect(['04', '08', '10']).toContain(id);
    }
  });
  test('pink takes 07, or 09 when 07 is already taken; an empty orbit has none', () => {
    expect(planetDesigns(['pink'], 's')).toEqual(['07']);
    expect(planetDesigns(['magenta', 'pink'], 's')).toEqual(['07', '09']);
    expect(planetDesigns([null, 'cyan'], 's')).toEqual([null, '05']);
  });
  test('deterministic, and every pick is a shipped design whose hue family matches', () => {
    const colours = ['teal', 'cyan', 'teal', 'purple'] as const;
    expect(planetDesigns(colours, 'day')).toEqual(planetDesigns([...colours], 'day'));
    const family: Record<string, string> = {teal: 'teal', cyan: 'cyan', purple: 'purple'};
    planetDesigns(colours, 'day').forEach((id, i) => expect(PLANET_DESIGNS[id!].hue).toBe(family[colours[i]!]));
  });
});
