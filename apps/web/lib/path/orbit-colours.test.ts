import {describe, expect, test} from 'vitest';
import {HABIT_TONE_COLOURS, ORBIT_PALETTE, orbitColours, stableHash} from './orbit-colours';

describe('the orbit path\'s node colours (Session AG, ADR-029 I3)', () => {
  test('no two neighbours share a colour, whatever comes in (all cyan, all one tone, mixed)', () => {
    const cases = [
      Array.from({length: 12}, (_, i) => ({id: `h${i}`, colour: 'cyan' as const})),
      Array.from({length: 9}, (_, i) => ({id: `t${i}`, tone: 1})),
      Array.from({length: 30}, (_, i) => ({id: `x-${i * 7919}`})),
      [{id: 'a', colour: 'purple' as const}, {id: 'b', colour: 'purple' as const}, {id: 'c', colour: 'purple' as const}, {id: 'd', colour: 'purple' as const}],
    ];
    for (const items of cases) {
      const out = orbitColours(items);
      expect(out).toHaveLength(items.length);
      for (let i = 1; i < out.length; i++) expect(out[i], `${items[i]!.id} after ${items[i - 1]!.id}`).not.toBe(out[i - 1]);
      for (const c of out) expect(ORBIT_PALETTE).toContain(c);
    }
  });
  test('an item keeps its own colour (or its habit card\'s tone) where its neighbours allow', () => {
    expect(orbitColours([{id: 'w', colour: 'blue'}, {id: 'h', tone: 2}, {id: 'g', colour: 'gold'}])).toEqual(['blue', HABIT_TONE_COLOURS[2], 'gold']);
  });
  test('stable: the same ids in the same order give the same colours, every time', () => {
    const items = Array.from({length: 15}, (_, i) => ({id: `ck_${i}`, colour: i % 3 ? 'cyan' as const : null}));
    expect(orbitColours(items)).toEqual(orbitColours(items.map(x => ({...x}))));
    expect(stableHash('ck_1')).toBe(stableHash('ck_1'));
    expect(stableHash('ck_1')).not.toBe(stableHash('ck_2'));
  });
});
