import {describe, expect, it} from 'vitest';
import {focusOf, withFocus} from './habit-focus';
import {habitExtrasSchema} from './habits-extras/schema';

/** Session AV (owner follow-up 1, F-FOCUS-HABIT): one habit as today's focus, in the loose habit extras record. */
describe('Session AV (F-FOCUS-HABIT)', () => {
  it('holds on its day only; another field kept; cleared with null', () => {
    const extras = habitExtrasSchema.parse({version: 1, bells: {h1: true}});
    const set = withFocus(extras, 'h2', '2026-11-23');
    expect(focusOf(set, '2026-11-23')).toBe('h2');
    expect(focusOf(set, '2026-11-24')).toBeNull();
    expect(set).toMatchObject({version: 1, bells: {h1: true}});
    expect(habitExtrasSchema.parse(JSON.parse(JSON.stringify(set)))).toEqual(set); // the loose record keeps it
    expect(withFocus(set, null, '2026-11-23')).toEqual(extras);
  });
  it('an unreadable focus is no focus', () => {
    for (const focus of [null, 'h1', {date: 'today', habitId: 'h1'}, {date: '2026-11-23', habitId: ''}, {date: '2026-11-23', habitId: 7}]) expect(focusOf({version: 1, focus}, '2026-11-23')).toBeNull();
  });
});
