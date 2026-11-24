import {describe, expect, test} from 'vitest';
import {tasksSchema, type Task} from './schema';
import {pausedRepeat} from './paused';
import {pausedDue} from './engine';
import {deadlinesOn} from '../agenda/deadlines';
import {doneByDay, goalLine} from './done-chart';

/** Session AV lane 2 (minors): the open q1 Minors' remainders — a paused repeat, deadlines on the Agenda, the daily goal line. */
const TODAY = '2026-11-22'; // a Sunday
const task = (fields: Record<string, unknown>): Task => tasksSchema.parse({version: 1, tasks: [{id: 'task_m-01', title: 'Water the plants', priority: 'normal', createdAt: '2026-11-01T08:00:00.000Z', ...fields}]}).tasks[0]!;

describe('pausedRepeat (q1 #43 check 3)', () => {
  test('a daily task finished today and due tomorrow is not paused; one moved by the pause is, with its resume day', () => {
    const daily = {every: 'day', interval: 1};
    expect(pausedRepeat(task({due: '2026-11-23', recur: daily}), TODAY)).toBeNull();
    expect(pausedRepeat(task({due: TODAY, recur: daily}), TODAY)).toBeNull();
    const until = pausedDue(task({due: TODAY, recur: daily}), '2026-12-01', TODAY);
    expect(until).toBe('2026-12-01');
    expect(pausedRepeat(task({due: until, recur: daily}), TODAY)).toEqual({until: '2026-12-01', resume: TODAY});
  });
  test('a weekly task due on its next weekday is not paused; three weeks on, it is, and resumes on the next Monday', () => {
    const mondays = {every: 'week', interval: 1, weekdays: [1]};
    expect(pausedRepeat(task({due: '2026-11-23', recur: mondays}), TODAY)).toBeNull();
    expect(pausedRepeat(task({due: '2026-11-30', recur: mondays}), TODAY)).toBeNull();
    expect(pausedRepeat(task({due: '2026-12-14', recur: mondays}), TODAY)).toEqual({until: '2026-12-14', resume: '2026-11-23'});
    // "Every week" with no weekday: the next week's day is not a pause.
    expect(pausedRepeat(task({due: '2026-11-29', recur: {every: 'week', interval: 1}}), TODAY)).toBeNull();
  });
  test('never for a task without a repeat, a finished one, an overdue one, "after it is done" or every 2', () => {
    expect(pausedRepeat(task({due: '2026-12-14'}), TODAY)).toBeNull();
    expect(pausedRepeat(task({due: '2026-12-14', recur: {every: 'day', interval: 1}, doneAt: '2026-11-21T10:00:00.000Z'}), TODAY)).toBeNull();
    expect(pausedRepeat(task({due: '2026-11-10', recur: {every: 'day', interval: 1}}), TODAY)).toBeNull();
    expect(pausedRepeat(task({due: '2026-12-14', recur: {every: 'day', interval: 3, afterDone: true}}), TODAY)).toBeNull();
    expect(pausedRepeat(task({due: '2026-12-14', recur: {every: 'week', interval: 2, weekdays: [1]}}), TODAY)).toBeNull();
  });
});

describe('deadlinesOn (q1 #15 check 8)', () => {
  const record = tasksSchema.parse({version: 1, tasks: [
    {id: 'task_m-01', title: 'Draft the trip budget', priority: 'low', due: '2026-11-25', deadline: '2026-11-28', createdAt: '2026-11-01T08:00:00.000Z'},
    {id: 'task_m-02', title: 'Same day', priority: 'normal', due: '2026-11-28', deadline: '2026-11-28', createdAt: '2026-11-01T08:00:00.000Z'},
    {id: 'task_m-03', title: 'Finished', priority: 'normal', due: '2026-11-25', deadline: '2026-11-28', doneAt: '2026-11-21T08:00:00.000Z', createdAt: '2026-11-01T08:00:00.000Z'},
    {id: 'task_m-04', title: 'A subtask', priority: 'normal', parentId: 'task_m-01', deadline: '2026-11-28', createdAt: '2026-11-01T08:00:00.000Z'},
    {id: 'task_m-05', title: 'No day', priority: 'normal', deadline: '2026-11-28', createdAt: '2026-11-01T08:00:00.000Z'},
  ]});
  test('the open top-level tasks whose deadline is that day and that are planned for another day (or none)', () => {
    expect(deadlinesOn(record, '2026-11-28').map(t => t.title)).toEqual(['Draft the trip budget', 'No day']);
    expect(deadlinesOn(record, '2026-11-25')).toEqual([]);
  });
});

describe('goalLine (q1 #6 check 8)', () => {
  const at = (day: string, n: number) => Array.from({length: n}, () => ({at: `${day}T10:00:00.000Z`}));
  const days = doneByDay([...at('2026-11-20', 4), ...at('2026-11-21', 1), ...at(TODAY, 3)], TODAY, iso => iso.slice(0, 10));
  test('no goal, no line; a goal gives the scale with the goal in it and the days that reached it', () => {
    expect(goalLine(days, undefined)).toBeNull();
    expect(goalLine(days, 0)).toBeNull();
    expect(goalLine(days, 3)).toEqual({goal: 3, top: 4, reached: 2});
    expect(goalLine(days, 6)).toEqual({goal: 6, top: 6, reached: 0});
  });
});
