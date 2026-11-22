import {describe, expect, test} from 'vitest';
import {AV2_R4_HEALTH_CATALOG_LABELS, AV2_R4_HEALTH_ERASE_KEYS, AV2_R4_HEALTH_EXPORT_KEYS, AV2_R4_HEALTH_PERSONAL_KEYS, AV2_R4_HEALTH_RESTORE, PLANNED_WORKOUTS_KEY_LITERAL, RACES_KEY_LITERAL, WORKOUT_HR_KEY_LITERAL} from './av2-r4-health-keys';
import {PLANNED_KEY} from './workouts/planned';
import {RACES_KEY} from './workouts/races';
import {WORKOUT_HR_KEY} from './workouts/hr-zones';

/** Session AV lane 2, round 4 (health): each literal equals its owner's constant, and every list names every key. */
describe('round 4 health device keys', () => {
  test('literals equal their owners’ constants', () => {
    expect(PLANNED_WORKOUTS_KEY_LITERAL).toBe(PLANNED_KEY);
    expect(RACES_KEY_LITERAL).toBe(RACES_KEY);
    expect(WORKOUT_HR_KEY_LITERAL).toBe(WORKOUT_HR_KEY);
  });
  test('every key is in every list', () => {
    const all = Object.values(AV2_R4_HEALTH_EXPORT_KEYS);
    expect([...AV2_R4_HEALTH_PERSONAL_KEYS].sort()).toEqual([...all].sort());
    expect([...AV2_R4_HEALTH_ERASE_KEYS].sort()).toEqual([...all].sort());
    expect(Object.keys(AV2_R4_HEALTH_CATALOG_LABELS).sort()).toEqual(Object.keys(AV2_R4_HEALTH_EXPORT_KEYS).sort());
    expect(Object.keys(AV2_R4_HEALTH_RESTORE).sort()).toEqual(Object.keys(AV2_R4_HEALTH_EXPORT_KEYS).sort());
    for (const v of all) expect(v).toMatch(/^zigoals:[a-z-]+:v1$/);
  });
});
