import {describe, expect, test} from 'vitest';
import {AW_X6_DISPLAY_KEYS, AW_X6_ERASE_KEYS, AW_X6_NOT_RECORDS, BODY_EXTRAS_KEY_LITERAL, SLEEP_GOAL_PERIOD_KEY_LITERAL} from './aw-x6-keys';
import {SLEEP_GOAL_PERIOD_KEY} from './sleep/goal-period';
import {BODY_EXTRAS_KEY} from './body-extras/schema';
import {BODY_EXTRAS_KEY_LITERAL as AV2_BODY_EXTRAS} from './av2-device-keys';

/** Session AW (X6): each literal equals its owner's constant; the one new key is a display key with its reason. */
describe('X6 stored keys', () => {
  test('literals equal their owners’ constants', () => {
    expect(SLEEP_GOAL_PERIOD_KEY_LITERAL).toBe(SLEEP_GOAL_PERIOD_KEY);
    expect(BODY_EXTRAS_KEY_LITERAL).toBe(BODY_EXTRAS_KEY);
    expect(BODY_EXTRAS_KEY_LITERAL).toBe(AV2_BODY_EXTRAS);
    expect(AW_X6_DISPLAY_KEYS).toEqual([SLEEP_GOAL_PERIOD_KEY]);
    expect([...AW_X6_ERASE_KEYS]).toEqual([SLEEP_GOAL_PERIOD_KEY]);
    expect(Object.keys(AW_X6_NOT_RECORDS)).toEqual([SLEEP_GOAL_PERIOD_KEY]);
    expect(AW_X6_DISPLAY_KEYS.every(k => /^zigoals:[a-z-]+:v1$/.test(k))).toBe(true);
  });
});
