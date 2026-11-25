import {describe, expect, test} from 'vitest';
import {AW_X1_ERASE_KEYS, AW_X1_EXPORT_KEYS, AW_X1_PERSONAL_KEYS, TIMERS_KEY_LITERAL} from './aw-x1-keys';
import {TIMERS, TIMERS_KEY} from './timers/store';
import {TIMERS_KEY_LITERAL as GATE_KEY} from './timers/open';

/** Session AW (X1): each literal equals its owner's constant (the shell's gate reads the same key). */
describe('Session AW X1 device keys', () => {
  test('literals equal their owners’ constants', () => {
    expect(TIMERS_KEY_LITERAL).toBe(TIMERS_KEY);
    expect(TIMERS.key).toBe(TIMERS_KEY);
    expect(GATE_KEY).toBe(TIMERS_KEY);
    expect(AW_X1_PERSONAL_KEYS).toEqual([TIMERS_KEY]);
    expect(AW_X1_EXPORT_KEYS).toEqual({timers: TIMERS_KEY});
    expect(AW_X1_ERASE_KEYS).toEqual([TIMERS_KEY]);
  });
});
