import {describe, expect, it} from 'vitest';
import {addTask, editTask, finishTask, goalKeyOf, goalNextActions, servesGoal, shownDoneOn, taskCounts, taskState, tasksOnDay, doneTasks} from './engine';
import {TASKS, TASKS_KEY, emptyTasks, tasksSchema} from './schema';
import {addTask as addOnDevice, completeTask, deleteTask, dueTasks, readTasks} from './device';
import {showcaseTasks} from './showcase';
import {readDeviceRecord} from '../device-record';

/** Session AK (T1): tasks and goal next actions — the stored format stays additive, the day logic, the device writer. */
const TODAY = '2026-11-04', at = new Date('2026-11-04T09:00:00.000Z');
const day = (iso: string) => iso.slice(0, 10);
const add = (r = emptyTasks(), title: string, extra: Partial<Parameters<typeof addTask>[1]> = {}, id = title.replace(/\W/g, '')) => addTask(r, {title, ...extra}, {id, at, today: TODAY});
const memory = (initial: Record<string, string> = {}) => { const m = new Map(Object.entries(initial)); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, map: m}; };

describe('the stored format (TIER 3): additive and optional only', () => {
  it('a record written before Session AK reads unchanged, with no time', () => {
    const old = {version: 1, tasks: [{id: 'task_1', title: 'Fictional: call the bank', priority: 'high', due: '2026-10-30', createdAt: '2026-10-28T09:00:00.000Z'}]};
    const parsed = tasksSchema.parse(old);
    expect(parsed).toEqual(old);
    expect('time' in parsed.tasks[0]!).toBe(false);
  });
  it('a time is kept; a time this build cannot read is dropped without failing the list; unknown fields are kept', () => {
    const r = tasksSchema.parse({version: 1, tasks: [
      {id: 'a', title: 'A', priority: 'normal', due: TODAY, time: '09:30', createdAt: at.toISOString()},
      {id: 'b', title: 'B', priority: 'normal', due: TODAY, time: '25:99', createdAt: at.toISOString(), later: {x: 1}},
    ]});
    expect(r.tasks[0]!.time).toBe('09:30');
    expect(r.tasks[1]!.time).toBeUndefined();
    expect(JSON.parse(JSON.stringify(r.tasks[1]))).toEqual({id: 'b', title: 'B', priority: 'normal', due: TODAY, createdAt: at.toISOString(), later: {x: 1}});
  });
  it('a time needs a day and a real clock', () => {
    expect(add(undefined, 'Call', {due: TODAY, time: '14:15'}).tasks[0]).toMatchObject({due: TODAY, time: '14:15'});
    expect(() => add(undefined, 'Call', {time: '14:15'})).toThrow('Choose a day for the task before a time.');
    expect(() => add(undefined, 'Call', {due: TODAY, time: '2pm'})).toThrow('Choose a time such as 09:30.');
  });
});

describe('edits and goal next actions', () => {
  it('edits a title, a day, a time and a goal; null clears; a past day is refused unless it was the day already', () => {
    let r = add(undefined, 'Draft', {due: '2026-11-06'});
    r = editTask(r, 'Draft', {title: '  Draft the budget ', due: '2026-11-07', time: '08:00', goal: goalKeyOf('g1'), priority: 'high'}, TODAY);
    expect(r.tasks[0]).toMatchObject({title: 'Draft the budget', due: '2026-11-07', time: '08:00', goal: 'private:g1', priority: 'high'});
    expect(() => editTask(r, 'Draft', {due: null}, TODAY)).toThrow('Choose a day for the task before a time.');
    r = editTask(r, 'Draft', {due: null, time: null, goal: null}, TODAY);
    expect(r.tasks[0]).not.toHaveProperty('due');
    expect(r.tasks[0]).not.toHaveProperty('goal');
    expect(() => editTask(r, 'Draft', {due: '2026-11-01'}, TODAY)).toThrow(/today or a later day/);
    const overdue = tasksSchema.parse({version: 1, tasks: [{id: 'o', title: 'Old', priority: 'normal', due: '2026-10-20', createdAt: at.toISOString()}]});
    expect(editTask(overdue, 'o', {title: 'Old, renamed'}, TODAY).tasks[0]).toMatchObject({due: '2026-10-20', title: 'Old, renamed'});
    expect(() => editTask(r, 'missing', {title: 'x'}, TODAY)).toThrow('no longer on this device');
    expect(() => editTask(r, 'Draft', {title: '  '}, TODAY)).toThrow('Give the task a few words.');
  });
  it('a goal\'s next actions are its open tasks, matched by key or bare id', () => {
    let r = add(undefined, 'Compare accounts', {goal: goalKeyOf('g1'), due: '2026-11-05'});
    r = add(r, 'Ask the bank', {goal: 'g1', priority: 'high'});
    r = add(r, 'Other goal', {goal: goalKeyOf('g2')});
    r = finishTask(add(r, 'Done one', {goal: goalKeyOf('g1')}), 'Doneone', at);
    expect(goalNextActions(r, 'g1', TODAY).map(t => t.title)).toEqual(['Compare accounts', 'Ask the bank']);
    expect(goalNextActions(r, 'private:g1', TODAY)).toHaveLength(2);
    expect(servesGoal(r.tasks[2]!, 'g1')).toBe(false);
    expect(goalKeyOf('legacy:7')).toBe('legacy:7');
  });
});

describe('the tasks of a day (Agenda and NOVA)', () => {
  const record = () => {
    let r = add(undefined, 'Today', {due: TODAY, time: '10:00'});
    r = add(r, 'Tomorrow', {due: '2026-11-05'});
    r = add(r, 'Someday');
    r = tasksSchema.parse({...r, tasks: [...r.tasks, {id: 'late', title: 'Late', priority: 'high', due: '2026-11-01', createdAt: at.toISOString()}, {id: 'lateDone', title: 'Late done', priority: 'normal', due: '2026-11-01', createdAt: at.toISOString(), doneAt: '2026-11-03T10:00:00.000Z'}, {id: 'onTime', title: 'On time', priority: 'normal', due: '2026-11-02', createdAt: at.toISOString(), doneAt: '2026-11-01T10:00:00.000Z'}]});
    return r;
  };
  it('today: overdue carried forward first, then due today, then the finished; another day only its own', () => {
    expect(tasksOnDay(record(), TODAY, TODAY, day).map(t => t.title)).toEqual(['Late', 'Today']);
    expect(tasksOnDay(record(), '2026-11-05', TODAY, day).map(t => t.title)).toEqual(['Tomorrow']);
    // A late task finished later shows on the day it was finished; one finished early on its due day.
    expect(tasksOnDay(record(), '2026-11-03', TODAY, day).map(t => t.title)).toEqual(['Late done']);
    expect(tasksOnDay(record(), '2026-11-02', TODAY, day).map(t => t.title)).toEqual(['On time']);
    expect(tasksOnDay(record(), '2026-11-01', TODAY, day)).toEqual([]);
    expect(shownDoneOn(record().tasks.find(t => t.id === 'lateDone')!, day)).toBe('2026-11-03');
    expect(taskCounts(record(), TODAY, undefined)).toEqual({open: 4, overdue: 1, today: 1});
    // Release review AL (RR-8): with the clock, a task due today at 10:00 is overdue from 10:01, as the list's groups say.
    expect(taskCounts(record(), TODAY, '09:59')).toEqual({open: 4, overdue: 1, today: 1});
    expect(taskCounts(record(), TODAY, '21:45')).toEqual({open: 4, overdue: 2, today: 0});
    expect(taskCounts(record(), TODAY, '21:45').overdue).toBe(record().tasks.filter(t => !t.doneAt && taskState(t, TODAY, '21:45') === 'overdue').length);
    expect(doneTasks(record()).map(t => t.id)).toEqual(['lateDone', 'onTime']);
  });
  it('the device writer: add, complete and remove, each with an Undo; nothing written over unreadable bytes', () => {
    const storage = memory();
    const added = addOnDevice({title: 'Call the dentist', due: TODAY, priority: 'high'}, {storage, at, today: TODAY, id: 'task_a'});
    expect(added.task).toMatchObject({id: 'task_a', title: 'Call the dentist', due: TODAY, priority: 'high'});
    expect(dueTasks(TODAY, {storage, today: TODAY})!.map(t => t.id)).toEqual(['task_a']);
    const done = completeTask('task_a', {storage, at});
    expect(done.changed).toBe(true);
    expect(readTasks(storage)!.tasks[0]!.doneAt).toBe(at.toISOString());
    expect(completeTask('task_a', {storage}).changed).toBe(false);
    done.undo();
    expect(readTasks(storage)!.tasks[0]!.doneAt).toBeUndefined();
    const gone = deleteTask('task_a', {storage});
    expect(readTasks(storage)!.tasks).toEqual([]);
    gone.undo();
    expect(readTasks(storage)!.tasks.map(t => t.id)).toEqual(['task_a']);
    added.undo();
    expect(readTasks(storage)!.tasks).toEqual([]);
    expect(() => addOnDevice({title: ' '}, {storage, today: TODAY})).toThrow('Give the task a few words.');
    expect(() => completeTask('nope', {storage})).toThrow('no longer on this device');
    const broken = memory({[TASKS_KEY]: '{not json'});
    expect(readTasks(broken)).toBeNull();
    expect(dueTasks(TODAY, {storage: broken, today: TODAY})).toBeNull();
    expect(() => addOnDevice({title: 'x'}, {storage: broken, today: TODAY})).toThrow('could not be read');
    expect(broken.map.get(TASKS_KEY)).toBe('{not json');
  });
  it('the Showcase tasks are labelled, valid, and two serve the goals passed in', () => {
    const r = showcaseTasks(TODAY, ['g1', 'g2']);
    expect(readDeviceRecord(memory({[TASKS_KEY]: JSON.stringify(r)}), TASKS).unreadable).toBe(false);
    expect(r.tasks.every(t => t.title.startsWith('Example · '))).toBe(true);
    expect(goalNextActions(r, 'g1', TODAY).length).toBe(2);
    expect(tasksOnDay(r, TODAY, TODAY, day).map(t => t.id)).toEqual(['task_showcase-03', 'task_showcase-01']);
    expect(showcaseTasks(TODAY).tasks.some(t => t.goal)).toBe(false);
  });
});
