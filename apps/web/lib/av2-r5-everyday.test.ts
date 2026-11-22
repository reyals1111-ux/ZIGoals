import {describe, expect, test} from 'vitest';
import {activityKcalEstimate, activityTypeOf, ACTIVITY_TYPES} from './health-activity-types';
import {EVERYDAY_MOVE_NAMES, EVERYDAY_MOVES} from './health-everyday-moves';
import {createEmptyHealth, saveActivity} from './health';

/**
 * Session AV lane 2, round 5 (gym; LEDGER #376, Gentler Streak's everyday activities): the everyday names, in English and
 * Dutch, are offered beside the twelve types, count their minutes, and never get an energy figure (no calorie-burn guess).
 */
describe('everyday movement', () => {
  test('the six the ledger names are there, each in English and Dutch, none a duplicate of a type', () => {
    for (const en of ['Gardening', 'Housework', 'Walking the dog', 'Wheelchair push', 'Carrying a child', 'Commuting by bike']) expect(EVERYDAY_MOVES.map(m => m.en)).toContain(en);
    expect(new Set(EVERYDAY_MOVE_NAMES).size).toBe(EVERYDAY_MOVES.length * 2);
    for (const name of EVERYDAY_MOVE_NAMES) expect(ACTIVITY_TYPES.map(t => t.toLowerCase())).not.toContain(name.toLowerCase());
  });
  test('no everyday name is read as one of the twelve types, so no energy figure is ever shown for it', () => {
    for (const name of EVERYDAY_MOVE_NAMES) {
      expect(activityTypeOf(name), name).toBeNull();
      expect(activityTypeOf(`${name} with Sam`), name).toBeNull();
      expect(activityKcalEstimate(name, 60, 80_000), name).toBeNull();
    }
  });
  test('their minutes are kept as active minutes, like any activity', () => {
    const h = saveActivity(createEmptyHealth(), {id: 'health_garden-0001', date: '2026-11-20', name: 'Tuinieren', steps: 0, minutes: 45}, '2026-11-20T18:00:00.000Z');
    expect(h.activity).toMatchObject([{name: 'Tuinieren', minutes: 45}]);
  });
});
