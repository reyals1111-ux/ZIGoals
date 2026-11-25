import {describe, expect, test} from 'vitest';
import {AW_X4_CATALOG_LABELS, AW_X4_DISPLAY_KEYS, AW_X4_ERASE_KEYS, AW_X4_EXPORT_KEYS, AW_X4_PERSONAL_KEYS, GOAL_REPEAT_KEY_LITERAL} from './aw-x4-strides-keys';
import {GOAL_REPEAT, GOAL_REPEAT_KEY} from './goals/repeat';

/** Session AW (X4, Strides): each literal equals its owner's constant, and every list names the one record. */
describe('X4 device records', () => {
  test('literals equal their owners’ constants', () => {
    expect(GOAL_REPEAT_KEY_LITERAL).toBe(GOAL_REPEAT_KEY);
    expect(GOAL_REPEAT.key).toBe(GOAL_REPEAT_KEY);
    expect(AW_X4_PERSONAL_KEYS).toEqual([GOAL_REPEAT_KEY]);
    expect(AW_X4_DISPLAY_KEYS).toEqual([]);
    expect(Object.values(AW_X4_EXPORT_KEYS)).toEqual([GOAL_REPEAT_KEY]);
    expect(Object.keys(AW_X4_CATALOG_LABELS)).toEqual(Object.keys(AW_X4_EXPORT_KEYS));
    expect(AW_X4_ERASE_KEYS).toEqual([GOAL_REPEAT_KEY]);
  });
  test('the empty record reads back through its own schema', () => {
    expect(GOAL_REPEAT.schema.parse(GOAL_REPEAT.empty())).toEqual({version: 1, goals: {}});
  });
});
