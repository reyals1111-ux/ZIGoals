import {describe, expect, it} from 'vitest';
import {AREAS, DEFAULT_AREA_IDS, LIFE_AREAS_KEY, habitAreasFrom, readLifeAreas} from './areas';

const store = (values: Record<string, string>) => ({getItem: (k: string) => values[k] ?? null});
describe('life areas for Session AA-Local (read-only)', () => {
  it('names the seven built-in areas and reads custom ones from the goal-extras record', () => {
    expect(DEFAULT_AREA_IDS).toEqual(['health', 'mind', 'wealth', 'relationships', 'career', 'learning', 'fun']);
    expect(AREAS.mind).toBe('Habits & Mind');
    expect(LIFE_AREAS_KEY).toBe('zigoals:goal-extras:v1');
    const areas = readLifeAreas(store({[LIFE_AREAS_KEY]: JSON.stringify({version: 1, goals: {}, areas: [{id: 'custom-garden', label: 'Garden', color: '#55cc88'}]})}));
    expect(areas.at(-1)).toEqual({id: 'custom-garden', label: 'Garden', color: '#55cc88', custom: true});
    expect(readLifeAreas(store({[LIFE_AREAS_KEY]: 'nonsense'}))).toHaveLength(7);
  });
  it('a habit’s area: AA-Local’s record first, then the goal-extras record, odd values ignored', () => {
    const got = habitAreasFrom(store({
      'zigoals:habit-extras:v1': JSON.stringify({areas: {h1: 'health', h2: 'BAD AREA', 'bad id!': 'fun'}}),
      [LIFE_AREAS_KEY]: JSON.stringify({version: 1, goals: {}, areas: [], habitAreas: {h1: 'learning', h3: 'mind'}}),
    }));
    expect(got).toEqual({h1: 'health', h3: 'mind'});
    expect(habitAreasFrom(store({'zigoals:habit-extras:v1': '{'}))).toEqual({});
  });
});
