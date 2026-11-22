import {describe, expect, it} from 'vitest';
import {addTask, editTask, finishTask} from './engine';
import {dueReminders, reminderInstants, snoozeReminder, snoozeUntil, SNOOZE_CHOICES} from './reminders';
import {emptyTasks, tasksSchema} from './schema';
import {instantAt} from '../zone-time';

/**
 * Session AV (1c, q1 #1, fresh-agent review; Todoist and TickTick): a reminder that has gone off can be snoozed for 15
 * minutes, an hour or until tomorrow morning; the snooze is kept on the task (it holds across a reload and reaches the
 * notification plan), counts only while that reminder is still the task's, and a task can have several reminders.
 */
const ZONE = 'Europe/Amsterdam', TODAY = '2026-11-23', at = new Date('2026-11-23T07:00:00Z');
const base = () => addTask(emptyTasks(), {title: 'Fictional call', due: TODAY, time: '10:00', reminders: [{before: 0}, {before: 60}]}, {id: 'a', at, today: TODAY});
const ten = instantAt(TODAY, '10:00', ZONE), nine = instantAt(TODAY, '09:00', ZONE);

describe('Session AV (1c): snooze choices and several reminders', () => {
  it('offers 15 min, 1 h and tomorrow; tomorrow is 09:00 the next day in the zone', () => {
    expect(SNOOZE_CHOICES.map(c => c.label)).toEqual(['15 min', '1 h', 'Tomorrow']);
    expect(snoozeUntil('15m', ten, ZONE)).toBe(ten + 15 * 60_000);
    expect(snoozeUntil('1h', ten, ZONE)).toBe(ten + 3_600_000);
    expect(snoozeUntil('tomorrow', ten, ZONE)).toBe(instantAt('2026-11-24', '09:00', ZONE));
  });
  it('several reminders each go off; a snoozed one comes back at its end, once, and stays across a re-read', () => {
    let r = base();
    expect(reminderInstants(r, ZONE).map(x => x.at)).toEqual([nine, ten]);
    expect(dueReminders(r, ten + 60_000, ZONE).map(x => x.at)).toEqual([nine, ten]);
    r = snoozeReminder(r, 'a', ten, ten + 15 * 60_000, 0);
    r = tasksSchema.parse(JSON.parse(JSON.stringify(r))); // kept on the task, as stored
    expect(dueReminders(r, ten + 60_000, ZONE).map(x => x.at)).toEqual([nine]);
    const back = dueReminders(r, ten + 16 * 60_000, ZONE);
    expect(back.map(x => [x.at, x.of])).toEqual([[nine, nine], [ten + 15 * 60_000, ten]]);
    // Snoozed again from the snoozed row: the reminder's own instant stays the key.
    r = snoozeReminder(r, 'a', back[1]!.of, ten + 75 * 60_000, back[1]!.before);
    expect(reminderInstants(r, ZONE).map(x => x.at)).toEqual([nine, ten + 75 * 60_000]);
  });
  it('a snooze counts only while its reminder is still the task’s: moved or done, it is gone', () => {
    let r = snoozeReminder(base(), 'a', ten, ten + 3_600_000, 0);
    const moved = editTask(r, 'a', {time: '11:00'}, TODAY);
    expect(reminderInstants(moved, ZONE).map(x => x.at)).toEqual([instantAt(TODAY, '10:00', ZONE), instantAt(TODAY, '11:00', ZONE)]);
    r = finishTask(r, 'a', new Date(ten + 60_000), {today: TODAY, doneDay: TODAY});
    expect(reminderInstants(r, ZONE)).toEqual([]);
    expect(() => snoozeReminder(r, 'gone', ten, ten + 1)).toThrow();
    // A snooze this build cannot read is dropped on read; the task stays.
    expect(tasksSchema.parse({version: 1, tasks: [{...base().tasks[0], snooze: {of: 'x'}}]}).tasks[0]!.snooze).toBeUndefined();
  });
});
