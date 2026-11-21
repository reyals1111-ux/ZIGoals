import {describe, expect, it} from 'vitest';
import {addTask, editTask, MINUTES_MESSAGE} from './engine';
import {dayLoad, dayLoadWords, minutesWords, minutesWordsNl} from './minutes';
import {parseTaskLine} from './parse';
import {emptyTasks, tasksSchema} from './schema';

/** Session AV (owner follow-up 1, F-TASK-MINUTES; Todoist durations, Sunsama): how long a task takes, and the day's load. */
const TODAY = '2026-11-23', at = new Date('2026-11-23T09:00:00Z');
describe('Session AV (F-TASK-MINUTES)', () => {
  it('reads a length from the line, in English and Dutch, and never a clock time', () => {
    const read = (s: string) => { const p = parseTaskLine(s, TODAY); return [p.title, p.minutes ?? null]; };
    expect(read('Read for 30 min tomorrow')).toEqual(['Read', 30]);
    expect(read('Gym for 1h30')).toEqual(['Gym', 90]);
    expect(read('Meeting for 1h 15m')).toEqual(['Meeting', 75]);
    expect(read('Walk for 2 hours')).toEqual(['Walk', 120]);
    expect(read('Stretch 10m')).toEqual(['Stretch', 10]);
    expect(read('Bellen 45 minuten morgen')).toEqual(['Bellen', 45]);
    expect(read('Om 1 uur lunch')).toEqual(['lunch', null]); // one o'clock in Dutch
    expect(read('Run 5 m')).toEqual(['Run 5 m', null]); // metres, perhaps
    expect(read('Plan for 2000 min')[1]).toBeNull(); // more than a day stays text
  });
  it('is kept, changed and cleared; out of range is refused with words', () => {
    let r = addTask(emptyTasks(), {title: 'Fictional report', due: TODAY, minutes: 45}, {id: 'a', at, today: TODAY});
    expect(r.tasks[0]!.minutes).toBe(45);
    r = editTask(r, 'a', {minutes: 90}, TODAY); expect(r.tasks[0]!.minutes).toBe(90);
    r = editTask(r, 'a', {minutes: null}, TODAY); expect('minutes' in r.tasks[0]!).toBe(false);
    expect(() => addTask(emptyTasks(), {title: 'x', minutes: 0}, {id: 'b', at, today: TODAY})).toThrow(MINUTES_MESSAGE);
    expect(() => editTask(r, 'a', {minutes: 1441}, TODAY)).toThrow(MINUTES_MESSAGE);
    // A value this build cannot read is dropped on read; the task stays.
    expect(tasksSchema.parse({version: 1, tasks: [{...r.tasks[0], minutes: 'soon'}]}).tasks[0]!.minutes).toBeUndefined();
  });
  it('adds up the minutes of the day, and says how many tasks have none', () => {
    let r = emptyTasks();
    for (const [id, minutes, due] of [['a', 45, TODAY], ['b', 60, TODAY], ['c', undefined, TODAY], ['d', 30, '2026-11-24']] as const) r = addTask(r, {title: `Fictional ${id}`, due, ...(minutes ? {minutes} : {})}, {id, at, today: TODAY});
    expect(dayLoad(r, TODAY)).toEqual({tasks: 3, timed: 2, minutes: 105});
    expect(dayLoadWords(dayLoad(r, TODAY))).toBe('About 1 h 45 min planned for 2 tasks; 1 more without a length.');
    expect(dayLoadWords(dayLoad(emptyTasks(), TODAY))).toBeNull();
    expect([minutesWords(45), minutesWords(60), minutesWords(135), minutesWordsNl(90)]).toEqual(['45 min', '1 h', '2 h 15 min', '1 uur 30 min']);
  });
});
