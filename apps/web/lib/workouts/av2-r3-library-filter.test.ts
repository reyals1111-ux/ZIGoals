import {describe, expect, test} from 'vitest';
import {GUIDES} from './routine-library';
import {anyFilter, filterGuides, fitsPlace, mainMuscles, musclesInUse, NO_FILTER} from './library-filter';
import {EQUIPMENT, PLACE_PRESETS} from './equipment';

/** Session AV lane 2 (health r3; LEDGER #288, Nike Training Club): the routine library by length, muscle, level and place. */
const ids = (f: Parameters<typeof filterGuides>[1]) => filterGuides(GUIDES, f).map(g => g.id);
describe('finding a ready-made routine (LEDGER #288)', () => {
  test('no filter shows every routine', () => {
    expect(ids(NO_FILTER)).toHaveLength(GUIDES.length);
    expect(anyFilter(NO_FILTER)).toBe(false);
  });
  test('by length: up to the minutes chosen', () => {
    for (const m of [30, 45, 60]) {
      const shown = filterGuides(GUIDES, {...NO_FILTER, maxMinutes: m});
      expect(shown.every(g => g.minutes <= m)).toBe(true);
      expect(shown.length).toBe(GUIDES.filter(g => g.minutes <= m).length);
    }
    expect(ids({...NO_FILTER, maxMinutes: 30}).length).toBeLessThan(GUIDES.length);
  });
  test('by main muscle group: a quarter of the sets or more', () => {
    const push = GUIDES.find(g => g.id === 'ppl-push')!;
    expect(mainMuscles(push)).toContain('Chest');
    expect(mainMuscles(push)).not.toContain('Legs');
    expect(filterGuides(GUIDES, {...NO_FILTER, muscle: 'Legs'}).every(g => mainMuscles(g).includes('Legs'))).toBe(true);
    expect(musclesInUse(GUIDES)).toEqual(expect.arrayContaining(['Chest', 'Back', 'Legs']));
  });
  test('by level, and all filters together', () => {
    expect(filterGuides(GUIDES, {...NO_FILTER, level: 'start'}).every(g => g.level === 'start')).toBe(true);
    const both = filterGuides(GUIDES, {maxMinutes: 45, muscle: 'Legs', level: 'start', equipment: null});
    expect(both.every(g => g.minutes <= 45 && g.level === 'start' && mainMuscles(g).includes('Legs'))).toBe(true);
  });
  test('by place: every exercise can be done with what it has', () => {
    const none = PLACE_PRESETS.find(p => p.equipment.length === 0) ?? {equipment: [] as string[]};
    const atHome = filterGuides(GUIDES, {...NO_FILTER, equipment: none.equipment});
    expect(atHome.length).toBeGreaterThan(0);
    expect(atHome.some(g => g.id === 'full-body-a')).toBe(false);
    expect(fitsPlace(GUIDES.find(g => g.id === 'full-body-a')!, EQUIPMENT)).toBe(true);
    expect(ids({...NO_FILTER, equipment: null})).toHaveLength(GUIDES.length);
  });
});
