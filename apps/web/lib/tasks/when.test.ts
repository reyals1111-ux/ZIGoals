import {describe, expect, it} from 'vitest';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {tasksSchema} from './schema';
import {editTask, finishTask} from './engine';
import {TASK_WHEN, TASK_WHEN_KEY, TASK_WHEN_MAX, clearPlace, emptyTaskWhen, eveningTasks, placeOf, pruneWhen, putInSomeday, putOnEvening, restorePlace, somedayTasks, taskWhenSchema} from './when';

/** Session AP: "This evening" and "Someday", in their own device record beside the task list. */
const TODAY = '2026-11-14', TOMORROW = '2026-11-15', at = '2026-11-10T09:00:00.000Z';
const tasks = tasksSchema.parse({version: 1, tasks: [
  {id: 'a', title: 'Call Mum', priority: 'normal', createdAt: at},
  {id: 'b', title: 'Pay the rent', priority: 'high', due: TODAY, createdAt: at},
  {id: 'c', title: 'Learn the guitar', priority: 'low', createdAt: at},
  {id: 'd', title: 'Done already', priority: 'normal', createdAt: at, doneAt: '2026-11-13T10:00:00.000Z'},
]});
const memory = (initial: Record<string, string> = {}) => { const m = new Map(Object.entries(initial)); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, map: m}; };

describe('the stored format (TIER 3, additive key)', () => {
  it('its own versioned key, strict, empty by default; the task record is never touched', () => {
    expect(TASK_WHEN_KEY).toBe('zigoals:task-when:v1');
    expect(TASK_WHEN.key).toBe(TASK_WHEN_KEY);
    expect(emptyTaskWhen()).toEqual({version: 1, tasks: {}});
    expect(taskWhenSchema.safeParse({version: 1, tasks: {}, extra: 1}).success).toBe(false);
    expect(taskWhenSchema.safeParse({version: 2, tasks: {}}).success).toBe(false);
    expect(taskWhenSchema.safeParse({version: 1, tasks: {a: {evening: TODAY, someday: true}}}).success).toBe(false);
    expect(taskWhenSchema.safeParse({version: 1, tasks: {a: {someday: false}}}).success).toBe(false);
    expect(taskWhenSchema.safeParse({version: 1, tasks: {'bad id!': {someday: true}}}).success).toBe(false);
    expect(taskWhenSchema.safeParse({version: 1, tasks: {a: {evening: '2026-13-01'}}}).success).toBe(false);
    const next = putOnEvening(emptyTaskWhen(), tasks, TODAY, 'a');
    expect(next).toEqual({version: 1, tasks: {a: {evening: TODAY}}});
    expect(tasks.tasks.find(t => t.id === 'a')).not.toHaveProperty('evening');
  });
  it('is capped at 500 entries', () => {
    const many = Object.fromEntries(Array.from({length: TASK_WHEN_MAX + 1}, (_, i) => [`t${i}`, {someday: true}]));
    expect(taskWhenSchema.safeParse({version: 1, tasks: many}).success).toBe(false);
    many.t0 = undefined as never; delete many.t0;
    expect(taskWhenSchema.safeParse({version: 1, tasks: many}).success).toBe(true);
  });
  it('reads tolerantly: unreadable bytes read as empty and are not rewritten by a read', () => {
    const store = memory({[TASK_WHEN_KEY]: '{"version":1,"tasks":{"a":{"evening":"soon"}}}'});
    expect(readDeviceRecord(store, TASK_WHEN)).toEqual({data: emptyTaskWhen(), unreadable: true});
    expect(store.map.get(TASK_WHEN_KEY)).toContain('soon');
    updateDeviceRecord(store, TASK_WHEN, w => putInSomeday(w, tasks, TODAY, 'c'));
    expect(JSON.parse(store.map.get(TASK_WHEN_KEY)!)).toEqual({version: 1, tasks: {c: {someday: true}}});
  });
});

describe('This evening', () => {
  it('shows only on its date; after it the task is back in its normal place and the entry drops at the next write', () => {
    const w = putOnEvening(putOnEvening(emptyTaskWhen(), tasks, TODAY, 'b'), tasks, TODAY, 'a');
    expect(eveningTasks(w, tasks, TODAY).map(t => t.id)).toEqual(['a', 'b']);
    expect(placeOf(w, tasks.tasks[1]!, TODAY)).toBe('evening');
    // The next day: no evening list, nothing changed on the task (b keeps its due day and so shows as overdue in Today).
    expect(eveningTasks(w, tasks, TOMORROW)).toEqual([]);
    expect(placeOf(w, tasks.tasks[1]!, TOMORROW)).toBeNull();
    expect(pruneWhen(w, tasks, TOMORROW)).toEqual(emptyTaskWhen());
    expect(putInSomeday(w, tasks, TOMORROW, 'c')).toEqual({version: 1, tasks: {c: {someday: true}}});
  });
  it('a finished task leaves it; a done or missing task cannot be put there', () => {
    const w = putOnEvening(emptyTaskWhen(), tasks, TODAY, 'a');
    const finished = finishTask(tasks, 'a', new Date(`${TODAY}T18:00:00Z`), {today: TODAY, doneDay: TODAY});
    expect(eveningTasks(w, finished, TODAY)).toEqual([]);
    expect(() => putOnEvening(w, tasks, TODAY, 'd')).toThrow(/already done/);
    expect(() => putOnEvening(w, tasks, TODAY, 'zzz')).toThrow(/no longer on this device/);
  });
});

describe('Someday', () => {
  it('holds tasks without a day; giving a task a day takes it out', () => {
    const w = putInSomeday(putInSomeday(emptyTaskWhen(), tasks, TODAY, 'c'), tasks, TODAY, 'a');
    expect(somedayTasks(w, tasks, TODAY).map(t => t.id)).toEqual(['a', 'c']);
    const dated = editTask(tasks, 'c', {due: '2026-12-01'}, TODAY);
    expect(somedayTasks(w, dated, TODAY).map(t => t.id)).toEqual(['a']);
    expect(pruneWhen(w, dated, TODAY)).toEqual({version: 1, tasks: {a: {someday: true}}});
    // Clearing the day again does not put it back by itself: the stale entry was dropped at the write.
    expect(somedayTasks(pruneWhen(w, dated, TODAY), editTask(dated, 'c', {due: null}, TODAY), TODAY).map(t => t.id)).toEqual(['a']);
  });
  it('a task with a day is refused; a task moves from Someday to This evening and back out', () => {
    expect(() => putInSomeday(emptyTaskWhen(), tasks, TODAY, 'b')).toThrow(/clear its day first/);
    let w = putInSomeday(emptyTaskWhen(), tasks, TODAY, 'a');
    w = putOnEvening(w, tasks, TODAY, 'a');
    expect([somedayTasks(w, tasks, TODAY).length, eveningTasks(w, tasks, TODAY).length]).toEqual([0, 1]);
    expect(clearPlace(w, tasks, TODAY, 'a')).toEqual(emptyTaskWhen());
  });
  it('Undo puts the entry back as it was, on the latest record', () => {
    const before = putInSomeday(emptyTaskWhen(), tasks, TODAY, 'a');
    const cleared = clearPlace(putOnEvening(before, tasks, TODAY, 'c'), tasks, TODAY, 'a');
    expect(restorePlace(cleared, tasks, TODAY, 'a', before.tasks.a)).toEqual({version: 1, tasks: {c: {evening: TODAY}, a: {someday: true}}});
    expect(restorePlace(cleared, tasks, TODAY, 'c', undefined)).toEqual(emptyTaskWhen());
  });
  it('an entry named after a prototype key reads as no entry', () => {
    expect(placeOf(emptyTaskWhen(), {id: 'constructor', doneAt: undefined, due: undefined}, TODAY)).toBeNull();
  });
});
