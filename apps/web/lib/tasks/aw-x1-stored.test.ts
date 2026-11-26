import {describe, expect, test} from 'vitest';
import {reminderSchema, taskSchema} from './schema';
import {emptyNotifyPrefs, notifyPrefsSchema, taskAgainOf} from '../notify/prefs';
import {setSnoozes, setTaskAgain} from '../notify/task-again';

/**
 * Session AW (X1, LEDGER #438, #439; TIER 3 (stored format)): the new fields are optional and additive — a reminder's
 * `again`, the notification preferences' `taskAgain` and `snoozes`. A value this build cannot read is dropped on read and
 * never makes the record unreadable; a record without them reads as before.
 */
describe('remind again on a task reminder', () => {
  test('a repeat, or false, is kept; a value this build cannot read is dropped, the reminder kept', () => {
    expect(reminderSchema.parse({before: 15, again: {every: 10, times: 6}})).toEqual({before: 15, again: {every: 10, times: 6}});
    expect(reminderSchema.parse({before: 0, again: false})).toEqual({before: 0, again: false});
    expect(reminderSchema.parse({before: 5, again: {every: 7, times: 6}})).toEqual({before: 5});
    expect(reminderSchema.parse({before: 5, again: {every: 10, times: 11}})).toEqual({before: 5});
    expect(reminderSchema.parse({before: 5, again: 'often'})).toEqual({before: 5});
  });
  test('a task written by an older build reads the same; a newer field beside it is kept', () => {
    const t = {id: 'task_a', title: 'Call mum', priority: 'normal', due: '2026-11-25', time: '18:00', createdAt: '2026-11-20T10:00:00.000Z', reminders: [{before: 0}]};
    expect(taskSchema.parse(t).reminders).toEqual([{before: 0}]);
    expect(taskSchema.parse({...t, reminders: [{before: 0, again: {every: 5, times: 3, later: 1}}]}).reminders).toEqual([{before: 0, again: {every: 5, times: 3, later: 1}}]);
  });
});
describe('the default repeat and own snooze choices in the notification preferences', () => {
  test('optional: an empty record has neither, and reads as before', () => {
    const p = notifyPrefsSchema.parse({version: 1, types: {tasks: true}});
    expect(p.taskAgain).toBeUndefined(); expect(p.snoozes).toBeUndefined(); expect(taskAgainOf(p)).toBeNull();
  });
  test('set, read back and cleared; a value this build cannot read is dropped on read', () => {
    const p = setTaskAgain(emptyNotifyPrefs(), {every: 15, times: 4});
    expect(taskAgainOf(p)).toEqual({every: 15, times: 4});
    expect(taskAgainOf(setTaskAgain(p, null))).toBeNull();
    expect(() => setTaskAgain(p, {every: 7, times: 4})).toThrow(/5, 10, 15 or 30/);
    expect(notifyPrefsSchema.parse({version: 1, types: {}, taskAgain: {every: 3, times: 1}}).taskAgain).toBeUndefined();
    const s = setSnoozes(emptyNotifyPrefs(), [{for: 120}, {at: '19:00', day: 'next'}]);
    expect(s.snoozes).toEqual([{for: 120}, {at: '19:00', day: 'next'}]);
    expect(setSnoozes(s, null).snoozes).toBeUndefined();
    expect(notifyPrefsSchema.parse({version: 1, types: {}, snoozes: 'soon'}).snoozes).toBeUndefined();
  });
});
