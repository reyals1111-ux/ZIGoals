import {describe, expect, test} from 'vitest';
import {NOTIFY_KEY, emptyNotifyPrefs} from './prefs';
import {setSnoozes} from './task-again';
import {SNOOZES_HINT, SNOOZES_HINT_KEY, mayHaveOwnSnoozes} from './snoozes-hint';

describe('Session AW Part 2 (speed): the reminder rows\' own-snooze hint', () => {
  test('reads the notification preferences\' own key', () => {
    expect(SNOOZES_HINT_KEY).toBe(NOTIFY_KEY);
    expect(SNOOZES_HINT.key).toBe(NOTIFY_KEY);
  });
  test('says yes only when own snooze choices are kept', () => {
    const parse = (v: unknown) => SNOOZES_HINT.schema.parse(v);
    expect(mayHaveOwnSnoozes(parse(emptyNotifyPrefs()))).toBe(false);
    expect(mayHaveOwnSnoozes(parse(setSnoozes(emptyNotifyPrefs(), [{for: 120}])))).toBe(true);
    expect(mayHaveOwnSnoozes(parse(setSnoozes(emptyNotifyPrefs(), null)))).toBe(false);
    expect(mayHaveOwnSnoozes(parse({version: 1, types: {}, snoozes: 'x'}))).toBe(false);
    expect(mayHaveOwnSnoozes(SNOOZES_HINT.empty())).toBe(false);
  });
});
