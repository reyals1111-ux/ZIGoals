import {describe, expect, it} from 'vitest';
import {addTask, deadlineState, DEADLINE_PAST_MESSAGE, DEADLINE_REPEAT_MESSAGE, editTask, viewTasks} from './engine';
import {parseTaskLine} from './parse';
import {isUrgent, quadrantOf} from './matrix';
import {emptyTasks, tasksSchema} from './schema';

/** Session AV (owner follow-up 1, F-DEADLINES; Things, Todoist Deadlines): a deadline kept apart from the planned day. */
const TODAY = '2026-11-23', at = new Date('2026-11-23T09:00:00Z');
const add = (input: Parameters<typeof addTask>[1], id = 'a', record = emptyTasks()) => addTask(record, input, {id, at, today: TODAY});
describe('Session AV (F-DEADLINES)', () => {
  it('kept beside the planned day; Today lists it from its deadline, whatever the planned day', () => {
    let r = add({title: 'Send the fictional report', due: '2026-11-30', deadline: '2026-11-25'});
    r = add({title: 'No day yet', deadline: '2026-11-23'}, 'b', r);
    r = add({title: 'Plain', due: '2026-11-24'}, 'c', r);
    expect(r.tasks[0]).toMatchObject({due: '2026-11-30', deadline: '2026-11-25'});
    expect(viewTasks(r, {kind: 'today'}, TODAY).map(t => t.id)).toEqual(['b']);
    expect(viewTasks(r, {kind: 'today'}, '2026-11-25').map(t => t.id).sort()).toEqual(['a', 'b', 'c']);
    expect([deadlineState(r.tasks[0]!, TODAY), deadlineState(r.tasks[0]!, '2026-11-25'), deadlineState(r.tasks[0]!, '2026-11-26'), deadlineState(r.tasks[2]!, TODAY)]).toEqual(['soon', 'today', 'passed', null]);
  });
  it('a past deadline is refused on change, kept when left alone; a repeating task has none', () => {
    expect(() => add({title: 'x', deadline: '2026-11-20'})).toThrow(DEADLINE_PAST_MESSAGE);
    expect(() => add({title: 'x', due: TODAY, recur: {every: 'week', interval: 1}, deadline: '2026-11-30'})).toThrow(DEADLINE_REPEAT_MESSAGE);
    const r = add({title: 'x', deadline: TODAY});
    // A day later the deadline has passed; renaming the task keeps it.
    const renamed = editTask(r, 'a', {title: 'y'}, '2026-11-24');
    expect(renamed.tasks[0]).toMatchObject({title: 'y', deadline: TODAY});
    expect(() => editTask(r, 'a', {deadline: '2026-11-22'}, TODAY)).toThrow(DEADLINE_PAST_MESSAGE);
    expect(editTask(r, 'a', {deadline: null}, TODAY).tasks[0]).not.toHaveProperty('deadline');
  });
  it('an unreadable deadline is dropped on read, the task kept', () => {
    const read = tasksSchema.parse({...emptyTasks(), tasks: [{id: 'a', title: 'x', priority: 'normal', createdAt: at.toISOString(), deadline: 'Friday'}]});
    expect(read.tasks[0]!.deadline).toBeUndefined();
    expect(JSON.stringify(read.tasks[0])).not.toContain('deadline');
  });
  it('"deadline Friday" in the task line, apart from the planned day (English and Dutch)', () => {
    const p = parseTaskLine('Hand in the fictional form tomorrow deadline friday', TODAY);
    expect(p).toMatchObject({title: 'Hand in the fictional form', due: '2026-11-24', deadline: '2026-11-27'});
    expect(p.spans.map(s => s.kind)).toEqual(['date', 'deadline']);
    expect(parseTaskLine('Belasting invullen deadline vrijdag', TODAY)).toMatchObject({title: 'Belasting invullen', deadline: '2026-11-27'});
    expect(parseTaskLine('Read about deadlines', TODAY)).toMatchObject({title: 'Read about deadlines'});
  });
});

/** Session AV (1c, q1 #15, fresh-agent review; Things): the matrix counts a near deadline as urgent. */
describe('Session AV (1c): a near deadline is urgent in the matrix', () => {
  it('a task planned later but due by a deadline within the urgent days is urgent; a far deadline is not', () => {
    expect(isUrgent({due: '2026-12-10', deadline: '2026-11-24'}, '2026-11-23')).toBe(true);
    expect(isUrgent({deadline: '2026-11-25'}, '2026-11-23')).toBe(true);
    expect(isUrgent({due: '2026-12-10', deadline: '2026-11-30'}, '2026-11-23')).toBe(false);
    expect(quadrantOf({id: 'a', title: 'Fictional report', priority: 'high', level: 1, deadline: '2026-11-24', createdAt: '2026-11-20T08:00:00.000Z'} as never, '2026-11-23')).toBe('do');
  });
});
