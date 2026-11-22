// @vitest-environment jsdom
import {afterEach, describe, expect, it} from 'vitest';
import {addNoteToTask} from './notes';
import {ZIGI_STORE_EVENT} from '../ai/store/keys';
import {addTask, editTask} from '../tasks/engine';
import {emptyTasks, TASKS, TASKS_KEY, tasksSchema} from '../tasks/schema';
import {readDeviceRecord} from '../device-record';
import {undoOfChange} from '../tasks/undo';

/**
 * Session AV lane 2 (r3-plan, review B3A-5): a focus note added to its task goes through the tasks' own writer — every open
 * view hears the change (ZIGI_STORE_EVENT), an unreadable record is refused, and the Undo puts back only the notes.
 */
const at = new Date('2026-11-23T09:00:00Z');
const seed = () => addTask(emptyTasks(), {title: 'Fictional report', notes: 'Outline first'}, {id: 'task_a', at, today: '2026-11-23'});
afterEach(() => localStorage.clear());
describe('adding a focus note to its task', () => {
  it('tells open views, and its Undo restores only the notes', () => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(seed()));
    const heard: unknown[] = [], listen = (e: Event) => heard.push((e as CustomEvent).detail);
    window.addEventListener(ZIGI_STORE_EVENT, listen);
    const {undo} = addNoteToTask('task_a', 'Then send it', {at, storage: localStorage});
    expect(readDeviceRecord(localStorage, TASKS).data.tasks[0]!.notes).toBe('Outline first\n\nThen send it');
    expect(heard).toEqual([TASKS.key]);
    // Another change to the task after it (its title) stays when the note is undone.
    localStorage.setItem(TASKS_KEY, JSON.stringify(editTask(readDeviceRecord(localStorage, TASKS).data, 'task_a', {title: 'Fictional final report'}, '2026-11-23')));
    undo();
    expect(readDeviceRecord(localStorage, TASKS).data.tasks[0]).toMatchObject({title: 'Fictional final report', notes: 'Outline first'});
    expect(heard).toEqual([TASKS.key, TASKS.key]);
    window.removeEventListener(ZIGI_STORE_EVENT, listen);
  });
  it('a list view that refreshed takes its next Undo from the noted task, so the note is kept', () => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(seed()));
    addNoteToTask('task_a', 'Then send it', {at, storage: localStorage});
    const fresh = readDeviceRecord(localStorage, TASKS).data, other = addTask(fresh, {title: 'Fictional other'}, {id: 'task_b', at, today: '2026-11-23'});
    expect(undoOfChange(fresh, other)(other).tasks.find(t => t.id === 'task_a')!.notes).toBe('Outline first\n\nThen send it');
  });
  it('refuses an unreadable record and writes nothing; an Undo after a later edit of the notes leaves them', () => {
    localStorage.setItem(TASKS_KEY, '{not json');
    expect(() => addNoteToTask('task_a', 'x', {storage: localStorage})).toThrow(/could not be read/);
    expect(localStorage.getItem(TASKS_KEY)).toBe('{not json');
    localStorage.setItem(TASKS_KEY, JSON.stringify(seed()));
    const {undo} = addNoteToTask('task_a', 'Then send it', {at, storage: localStorage});
    const edited = tasksSchema.parse({...readDeviceRecord(localStorage, TASKS).data, tasks: readDeviceRecord(localStorage, TASKS).data.tasks.map(t => ({...t, notes: 'Rewritten by hand'}))});
    localStorage.setItem(TASKS_KEY, JSON.stringify(edited));
    undo();
    expect(readDeviceRecord(localStorage, TASKS).data.tasks[0]!.notes).toBe('Rewritten by hand');
  });
});
