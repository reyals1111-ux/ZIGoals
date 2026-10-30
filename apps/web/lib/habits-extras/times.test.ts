import {expect, test} from 'vitest';
import {emptyHabitExtras, habitExtrasSchema} from './schema';
import {habitTime, setHabitTime} from './store';

// Session AJ (item 35): a habit's everyday clock time in the synced habit extras; optional, pruned with the habit.
test('set, read, clear and prune a habit\'s everyday time; a bad clock is refused; unknown fields survive', () => {
  let r = setHabitTime(emptyHabitExtras(), 'h1', '07:15');
  expect(habitTime(r, 'h1')).toBe('07:15');
  r = setHabitTime(r, 'h2', '21:00', new Set(['h2']));
  expect(r.times).toEqual({h2: '21:00'}); // h1 is gone from the journal: pruned
  expect(setHabitTime(r, 'h2', null).times).toBeUndefined();
  expect(() => setHabitTime(r, 'h2', '25:00')).toThrow();
  expect(habitExtrasSchema.parse({version: 1, times: {h: '06:00'}, later: 1})).toMatchObject({times: {h: '06:00'}, later: 1});
});
