import {describe, expect, it} from 'vitest';
import {addProject, addTask, editTask, finishTask} from './engine';
import {emptyTasks, MAX_TASKS, type Tasks} from './schema';
import {COPY_MAX, clearDay, clearPlan, copyDay, copyPlan, dayTasks} from './day-tools';
import {undoOfChange} from './undo';

/** Session AV lane 2 (r3-plan, LEDGER #261; Structured's copy day and clear day). */
const today = '2026-11-23', tomorrow = '2026-11-24', at = new Date('2026-11-23T07:00:00Z');
let n = 0;
const newId = () => `task_copy-${++n}`;
function seed(): Tasks {
  let r = addProject(emptyTasks(), {name: 'Fictional home', colour: 'teal'}, 'p1');
  r = addTask(r, {title: 'Fictional groceries', due: today, time: '17:00', minutes: 45, labels: ['errands'], notes: 'Milk, bread', projectId: 'p1', reminders: [{before: 30}]}, {id: 'a', at, today});
  r = addTask(r, {title: 'Fictional list', parentId: 'a'}, {id: 'a1', at, today});
  r = addTask(r, {title: 'Fictional run', due: today, recur: {every: 'day', interval: 1}}, {id: 'b', at, today});
  r = addTask(r, {title: 'Fictional call', due: today, time: '09:00'}, {id: 'c', at, today});
  r = finishTask(r, 'c', at, {today});
  r = addTask(r, {title: 'Fictional other day', due: tomorrow}, {id: 'd', at, today});
  r = editTask(r, 'a', {look: {glyph: '⌂', colour: 'teal'}, energy: 'light', reminders: [{before: 30}, {before: 0, at: '2026-11-23T08:00'}]}, today);
  return r;
}
describe('copy this day', () => {
  it('makes the day’s tasks again on the other day with their time, minutes, project, labels, notes, look and energy; subtasks come along', () => {
    const r = seed(), out = copyDay(r, today, tomorrow, {today, at, newId});
    expect(dayTasks(r, today).map(t => t.id)).toEqual(['a', 'b', 'c']);
    expect(out).toMatchObject({copied: 4, repeating: 1});
    const made = out.record.tasks.filter(t => t.id.startsWith('task_copy-'));
    const g = made.find(t => t.title === 'Fictional groceries')!;
    expect(g).toMatchObject({due: tomorrow, time: '17:00', minutes: 45, projectId: 'p1', labels: ['errands'], notes: 'Milk, bread', look: {glyph: '⌂', colour: 'teal'}, energy: 'light', reminders: [{before: 30}]});
    expect(made.find(t => t.title === 'Fictional list')).toMatchObject({parentId: g.id});
    expect(made.find(t => t.title === 'Fictional list')!.due).toBeUndefined();
    expect(made.find(t => t.title === 'Fictional run')!.recur).toBeUndefined();
    expect(made.find(t => t.title === 'Fictional call')).toMatchObject({due: tomorrow, time: '09:00'});
    expect(made.find(t => t.title === 'Fictional call')!.doneAt).toBeUndefined();
    // The originals are untouched; Undo takes the copies away.
    expect(out.record.tasks.filter(t => !t.id.startsWith('task_copy-'))).toEqual(r.tasks);
    expect(undoOfChange(r, out.record)(out.record).tasks.map(t => t.id)).toEqual(r.tasks.map(t => t.id));
  });
  it('refuses the same day, no day, and a copy past the 500 tasks', () => {
    const r = seed();
    expect(() => copyDay(r, today, today, {today, newId})).toThrow(/another day/);
    expect(() => copyDay(r, today, '', {today, newId})).toThrow(/Choose the day/);
    let big = r;
    for (let i = big.tasks.length; i < MAX_TASKS - 1; i++) big = addTask(big, {title: `Fictional ${i}`}, {id: `f${i}`, at, today});
    expect(() => copyDay(big, today, tomorrow, {today, newId})).toThrow(/most this device keeps/);
    expect(copyDay(r, '2026-12-25', tomorrow, {today, newId})).toMatchObject({copied: 0});
  });
});
describe('clear this day', () => {
  it('moves the open tasks to no day (time and reminders before it go with it; a dated reminder stays); repeating ones keep their day; nothing deleted', () => {
    const r = seed(), out = clearDay(r, today, at);
    expect(out).toMatchObject({cleared: 1, repeating: 1});
    const g = out.record.tasks.find(t => t.id === 'a')!;
    expect(g.due).toBeUndefined(); expect(g.time).toBeUndefined();
    expect(g.reminders).toEqual([{before: 0, at: '2026-11-23T08:00'}]);
    expect(out.record.tasks.find(t => t.id === 'b')!.due).toBe(today);
    expect(out.record.tasks.find(t => t.id === 'c')!.due).toBe(today); // finished: stays on its day
    expect(out.record.tasks).toHaveLength(r.tasks.length);
    expect(undoOfChange(r, out.record)(out.record).tasks.find(t => t.id === 'a')).toEqual(r.tasks.find(t => t.id === 'a'));
    expect(clearDay(r, '2026-12-25')).toMatchObject({cleared: 0, record: r});
  });
});
describe('the buttons count what the change does (review B3A-7)', () => {
  it('a copy counts subtasks, a clear leaves repeating tasks out, and the cap is said', () => {
    const r = seed();
    expect(copyPlan(r, today)).toEqual({copied: 4, left: 0});
    expect(copyPlan(r, today).copied).toBe(copyDay(r, today, tomorrow, {today, newId}).copied);
    expect(clearPlan(r, today)).toEqual({cleared: 1, repeating: 1});
    const cleared = clearDay(r, today);
    expect([cleared.cleared, cleared.repeating]).toEqual([clearPlan(r, today).cleared, clearPlan(r, today).repeating]);
    let big = emptyTasks();
    for (let i = 0; i < COPY_MAX + 7; i++) big = addTask(big, {title: `Fictional ${i}`, due: today}, {id: `big${i}`, at, today});
    expect(copyPlan(big, today)).toEqual({copied: COPY_MAX, left: 7});
    expect(copyDay(big, today, tomorrow, {today, newId})).toMatchObject({copied: COPY_MAX, left: 7});
  });
});
