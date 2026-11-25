import {describe, expect, test} from 'vitest';
import {againAt, againChoiceOf, againFor, againPatch, repeatInstants} from './remind-again';
import {dueReminders, nextRing, snoozeReminder} from './reminders';
import {instantAt} from '../zone-time';
import {tasksSchema, type Tasks} from './schema';

/**
 * Session AW (X1, LEDGER #438; Due's "remind again until done"): a reminder that went off comes back every few minutes,
 * a set number of times; quiet hours hold it; Done or Snooze stops it; a dismissed ring comes back at the next repeat.
 */
const ZONE = 'Europe/Amsterdam', QUIET = {from: '22:00', to: '07:00'};
const at = (date: string, clock: string) => instantAt(date, clock, ZONE);
const min = 60_000;
const record = (reminder: Record<string, unknown>, extra: Record<string, unknown> = {}): Tasks => tasksSchema.parse({version: 1, tasks: [{id: 'task_a', title: 'Call mum', priority: 'normal', due: '2026-11-25', time: '18:00', createdAt: '2026-11-20T10:00:00.000Z', reminders: [reminder], ...extra}]});

describe('the repeats', () => {
  test('every N minutes, M times, never the first ring itself', () => {
    expect(repeatInstants(at('2026-11-25', '18:00'), {every: 10, times: 3}, QUIET, ZONE)).toEqual([at('2026-11-25', '18:10'), at('2026-11-25', '18:20'), at('2026-11-25', '18:30')]);
  });
  test('quiet hours hold them: a repeat inside waits until they end, the rest follow from there', () => {
    expect(repeatInstants(at('2026-11-25', '21:40'), {every: 15, times: 4}, QUIET, ZONE)).toEqual([at('2026-11-25', '21:55'), at('2026-11-26', '07:00'), at('2026-11-26', '07:15'), at('2026-11-26', '07:30')]);
    // Quiet hours inside one day (13:00–14:00) wait until 14:00 the same day.
    expect(repeatInstants(at('2026-11-25', '12:55'), {every: 5, times: 2}, {from: '13:00', to: '14:00'}, ZONE)).toEqual([at('2026-11-25', '14:00'), at('2026-11-25', '14:05')]);
  });
  test('where a ring stands: its latest ring, the round, and the next one ahead', () => {
    const start = at('2026-11-25', '18:00'), a = {every: 10, times: 6} as const;
    expect(againAt(start, a, QUIET, ZONE, start - min)).toBeNull();
    expect(againAt(start, a, QUIET, ZONE, start + 5 * min)).toEqual({at: start, round: 0, times: 6, next: start + 10 * min});
    expect(againAt(start, a, QUIET, ZONE, start + 25 * min)).toEqual({at: start + 20 * min, round: 2, times: 6, next: start + 30 * min});
    expect(againAt(start, a, QUIET, ZONE, start + 3 * 3_600_000)).toEqual({at: start + 60 * min, round: 6, times: 6, next: null});
    expect(againAt(start, null, QUIET, ZONE, start + 5 * min)).toEqual({at: start, round: 0, times: 0, next: null});
  });
  test('the reminder’s own repeat wins; false is none; otherwise the default', () => {
    expect(againFor({again: {every: 5, times: 3}}, {every: 10, times: 6})).toEqual({every: 5, times: 3});
    expect(againFor({again: false}, {every: 10, times: 6})).toBeNull();
    expect(againFor({}, {every: 10, times: 6})).toEqual({every: 10, times: 6});
    expect(againFor({}, null)).toBeNull();
  });
  test('the editor’s choice reads from the task and writes nothing for the default', () => {
    expect(againChoiceOf({reminders: [{before: 0}]})).toEqual({kind: 'default'});
    expect(againChoiceOf({reminders: [{before: 0, again: false}]})).toEqual({kind: 'off'});
    expect(againChoiceOf({reminders: [{before: 0, again: {every: 15, times: 4}}]})).toEqual({kind: 'own', again: {every: 15, times: 4}});
    expect(againPatch({kind: 'default'})).toEqual({});
    expect(againPatch({kind: 'off'})).toEqual({again: false});
    expect(againPatch({kind: 'own', again: {every: 30, times: 2}})).toEqual({again: {every: 30, times: 2}});
  });
});
describe('in the app (push off): the reminder rows', () => {
  const start = at('2026-11-25', '18:00'), opts = (dismissed = new Set<string>()) => ({dismissed, again: {fallback: {every: 10, times: 6} as const, quiet: QUIET}});
  test('without again, exactly as before', () => {
    const r = record({before: 0});
    expect(dueReminders(r, start + 25 * min, ZONE)).toEqual([{task: r.tasks[0], at: start, key: `task_a@${start}`, of: start, before: 0}]);
  });
  test('a dismissed ring comes back at the next repeat, with its round', () => {
    const r = record({before: 0});
    const first = dueReminders(r, start + 5 * min, ZONE, opts());
    expect(first.map(x => [x.key, x.round])).toEqual([[`task_a@${start}`, 0]]);
    expect(dueReminders(r, start + 8 * min, ZONE, opts(new Set([first[0]!.key])))).toEqual([]);
    const again = dueReminders(r, start + 12 * min, ZONE, opts(new Set([first[0]!.key])));
    expect(again.map(x => [x.at, x.round, x.times, x.next])).toEqual([[start + 10 * min, 1, 6, start + 20 * min]]);
  });
  test('a reminder of its own that says false rings once, whatever the default', () => {
    const r = record({before: 0, again: false});
    expect(dueReminders(r, start + 25 * min, ZONE, opts()).map(x => x.round)).toEqual([undefined]);
  });
  test('the rows wake at the next ring, a first ring or a repeat (quiet hours hold it)', () => {
    const r = record({before: 0}), a = opts().again;
    expect(nextRing(r, start - 5 * min, ZONE, a)).toBe(start);
    expect(nextRing(r, start + 5 * min, ZONE, a)).toBe(start + 10 * min);
    expect(nextRing(r, start + 61 * min, ZONE, a)).toBeNull();
    expect(nextRing(r, start + 5 * min, ZONE, {fallback: null, quiet: QUIET})).toBeNull();
    const late = record({before: 0}, {time: '21:55'});
    expect(nextRing(late, at('2026-11-25', '21:56'), ZONE, a)).toBe(at('2026-11-26', '07:00'));
  });
  test('Done stops it; Snooze stops it until the snooze ends, then it reminds again from there', () => {
    expect(dueReminders(record({before: 0}, {doneAt: '2026-11-25T17:05:00.000Z'}), start + 25 * min, ZONE, opts())).toEqual([]);
    const snoozed = snoozeReminder(record({before: 0}), 'task_a', start, start + 60 * min, 0);
    expect(dueReminders(snoozed, start + 25 * min, ZONE, opts())).toEqual([]);
    expect(dueReminders(snoozed, start + 75 * min, ZONE, opts()).map(x => [x.at, x.round])).toEqual([[start + 70 * min, 1]]);
  });
});
