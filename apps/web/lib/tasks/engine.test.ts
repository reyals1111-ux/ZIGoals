import {expect, test} from 'vitest';
import {addTask, finishTask, openTasks, prune, removeTask, reopenTask, restoreTask, taskState} from './engine';
import {emptyTasks, tasksSchema} from './schema';

/** Session AI (tasks with a priority and a due date). */
const TODAY = '2026-10-28', at = new Date('2026-10-28T09:00:00.000Z');
const add = (r = emptyTasks(), title: string, extra: Parameters<typeof addTask>[1] extends infer I ? Partial<I> : never = {}, id = title.replace(/\W/g, '')) => addTask(r, {title, ...extra}, {id, at, today: TODAY});
test('the order: overdue, today, by day, by priority; finished ones leave the list and come back', () => {
  let r = add(undefined, 'Someday low', {priority: 'low'});
  r = add(r, 'Call the bank', {priority: 'high', due: '2026-10-30'});
  r = add(r, 'Pay rent', {due: TODAY});
  r = tasksSchema.parse({...r, tasks: [...r.tasks, {id: 'old', title: 'Overdue', priority: 'normal', due: '2026-10-20', createdAt: at.toISOString()}]});
  r = add(r, 'Book dentist', {priority: 'high'});
  expect(openTasks(r, TODAY).map(t => t.title)).toEqual(['Overdue', 'Pay rent', 'Call the bank', 'Book dentist', 'Someday low']);
  expect(taskState(r.tasks.find(t => t.id === 'old')!, TODAY)).toBe('overdue');
  const done = finishTask(r, 'Payrent', at);
  expect(openTasks(done, TODAY).map(t => t.title)).not.toContain('Pay rent');
  expect(openTasks(reopenTask(done, 'Payrent'), TODAY).map(t => t.title)).toContain('Pay rent');
});
test('refusals, removal with undo, and done tasks kept 30 days', () => {
  expect(() => add(undefined, '   ')).toThrow('Give the task a few words.');
  expect(() => add(undefined, 'Late', {due: '2026-10-01'})).toThrow(/today or a later day/);
  const r = add(undefined, 'Water plants'), gone = removeTask(r, 'Waterplants');
  expect(gone.tasks).toEqual([]); expect(restoreTask(gone, r.tasks[0]!).tasks).toEqual(r.tasks);
  const old = tasksSchema.parse({version: 1, tasks: [{id: 'a', title: 'A', priority: 'normal', createdAt: at.toISOString(), doneAt: '2026-09-01T10:00:00.000Z'}, {id: 'b', title: 'B', priority: 'weird', createdAt: at.toISOString(), later: 1}]});
  expect(prune(old, TODAY).tasks.map(t => t.id)).toEqual(['b']);
  expect(old.tasks[1]).toMatchObject({priority: 'normal', later: 1});
});
