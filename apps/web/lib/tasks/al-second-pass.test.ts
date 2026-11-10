import {describe, expect, it} from 'vitest';
import {addTask, editTask, finishGoalTasks, finishTask, openTasks, removeTask, reopenTask, tasksLinkedTo, unlinkGoalTasks, addProject} from './engine';
import {emptyTasks, tasksSchema, type Tasks} from './schema';
import {getTaskActivities, TASK_ACTIVITY_PRESENTATION} from './activity';
import {undoOfChange} from './undo';
import {isTypingTarget, isUndoShortcut} from './undo-shortcut';
import {taskTimelineItems} from './timeline-source';
import {addTask as addOnDevice, completeTask, deleteTask, readTasks} from './device';

/** Session AL second pass (lane L5): the requests from L4/L10b/integrator and the keep-list guards, as pure checks. */
const TODAY = '2026-11-04', at = new Date('2026-11-04T09:00:00.000Z');
let n = 0;
const add = (r: Tasks, title: string, extra: Partial<Parameters<typeof addTask>[1]> = {}, id = `s${++n}`) => addTask(r, {title, ...extra}, {id, at, today: TODAY, allowPast: true});
const day = (iso: string) => iso.slice(0, 10);
const memory = () => { const m = new Map<string, string>(); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }}; };

describe('DV-172 (for L4): tasks in the Activity log', () => {
  it('a task added and each time it was finished, newest first, each on its own day, opening the task', () => {
    let r = add(emptyTasks(), 'Call the bank', {due: '2026-11-05'}, 'bank');
    r = finishTask(r, 'bank', new Date('2026-11-04T23:30:00.000Z'));
    r = add(r, 'Water plants', {due: TODAY, recur: {every: 'day', interval: 1}}, 'plants');
    r = finishTask(r, 'plants', new Date('2026-11-04T10:00:00.000Z'), {today: TODAY, doneDay: TODAY});
    const rows = getTaskActivities(r, iso => iso === '2026-11-04T23:30:00.000Z' ? '2026-11-05' : day(iso));
    expect(new Set(rows.map(x => x.id))).toEqual(new Set(['task-done:bank', 'task-done:plants:2026-11-04T10:00:00.000Z', 'task-added:bank', 'task-added:plants']));
    expect(rows.map(x => x.at)).toEqual([...rows.map(x => x.at)].sort().reverse());
    const done = rows.find(x => x.id === 'task-done:bank')!;
    expect(done).toMatchObject({category: 'TASK', title: 'Call the bank', day: '2026-11-05', href: '/app/tasks?task=bank'});
    expect(done.detail).toMatch(/^Done · was due /);
    expect(rows.find(x => x.id.startsWith('task-done:plants'))!.detail).toMatch(/repeats$/);
    expect(TASK_ACTIVITY_PRESENTATION).toEqual({label: 'Task', icon: 'tasks', tone: 'habit'});
    expect(getTaskActivities(null, day)).toEqual([]);
  });
});

describe('P-LS-43 (for L4): a closing goal’s tasks — keep, unlink or mark done', () => {
  const base = () => { let r = add(emptyTasks(), 'Buy shoes', {goal: 'private:g1'}, 'shoes'); r = add(r, 'Stretch daily', {goal: 'g1', due: TODAY, recur: {every: 'day', interval: 1}}, 'stretch'); r = add(r, 'Other', {goal: 'private:g2'}, 'other'); return add(r, 'Done one', {goal: 'private:g1'}, 'old'); };
  it('lists only the open tasks serving that goal (its key or its bare id)', () => {
    const r = finishTask(base(), 'old', at);
    expect(tasksLinkedTo(r, 'g1').map(t => t.id)).toEqual(['shoes', 'stretch']);
  });
  it('unlink keeps them as plain tasks; mark done ends a repeating one; Undo puts each back exactly', () => {
    const before = finishTask(base(), 'old', at);
    const unlinked = unlinkGoalTasks(before, 'g1');
    expect(unlinked.tasks.filter(t => t.goal?.includes('g1') && !t.doneAt)).toEqual([]);
    expect(unlinked.tasks.find(t => t.id === 'other')!.goal).toBe('private:g2');
    expect(undoOfChange(before, unlinked)(unlinked)).toEqual(before);
    const done = finishGoalTasks(before, 'g1');
    expect(done.tasks.filter(t => ['shoes', 'stretch'].includes(t.id)).every(t => !!t.doneAt)).toBe(true);
    expect(done.tasks.find(t => t.id === 'stretch')!.due).toBe(TODAY); // the series ends; it does not roll on
    expect(undoOfChange(before, done)(done)).toEqual(before);
  });
});

describe('A7 / integrator decision (a): a surface’s own Undo line restores the stored record', () => {
  it('add, edit, finish, reopen and remove each come back exactly; a change made since by anything else is kept', () => {
    const before = add(add(emptyTasks(), 'A', {}, 'a'), 'B', {}, 'b');
    for (const change of [
      (r: Tasks) => add(r, 'C', {}, 'c'),
      (r: Tasks) => editTask(r, 'a', {title: 'A2', due: TODAY}, TODAY, {allowPast: true, at}),
      (r: Tasks) => finishTask(r, 'a', at),
      (r: Tasks) => removeTask(r, 'b'),
      (r: Tasks) => addProject(r, {name: 'Home'}, 'p1'),
    ]) {
      const after = change(before), reverse = undoOfChange(before, after);
      expect(reverse(after)).toEqual(tasksSchema.parse(before));
      // Another tab added a task meanwhile: Undo keeps it.
      const latest = add(after, 'Elsewhere', {}, `x${n}`);
      const back = reverse(latest);
      expect(back.tasks.some(t => t.title === 'Elsewhere')).toBe(true);
      expect(back.tasks.filter(t => t.title !== 'Elsewhere')).toEqual(tasksSchema.parse(before).tasks);
    }
    const done = finishTask(before, 'a', at);
    expect(undoOfChange(done, reopenTask(done, 'a'))(reopenTask(done, 'a'))).toEqual(done);
  });
  it('the device Undos (ZIGi/NOVA cards, Quick add, the Pomodoro tick) restore the stored record', () => {
    const storage = memory();
    const added = addOnDevice({title: 'Floss', due: TODAY}, {storage, at, today: TODAY, id: 'floss'});
    const snapshot = readTasks(storage);
    const done = completeTask('floss', {storage, at});
    expect(readTasks(storage)!.tasks[0]!.doneAt).toBeTruthy();
    done.undo();
    expect(readTasks(storage)).toEqual(snapshot);
    const gone = deleteTask('floss', {storage});
    expect(readTasks(storage)!.tasks).toEqual([]);
    gone.undo();
    expect(readTasks(storage)).toEqual(snapshot);
    added.undo();
    expect(readTasks(storage)!.tasks).toEqual([]);
  });
});

describe('P-LS-08 (L10b’s condition): Ctrl/⌘+Z runs the toast’s Undo, never inside a text field', () => {
  const key = (over: Partial<Parameters<typeof isUndoShortcut>[0]> = {}) => ({key: 'z', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, ...over});
  it('fires on Ctrl+Z and ⌘+Z on the page', () => {
    expect(isUndoShortcut(key(), {tagName: 'BUTTON'})).toBe(true);
    expect(isUndoShortcut(key({ctrlKey: false, metaKey: true, key: 'Z'}), {tagName: 'BODY'})).toBe(true);
  });
  it('never in an input, a textarea, a select or an editable area; never with Shift (redo) or Alt; never under a dialog', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) expect(isUndoShortcut(key(), {tagName})).toBe(false);
    expect(isUndoShortcut(key(), {tagName: 'DIV', isContentEditable: true})).toBe(false);
    expect(isUndoShortcut(key({shiftKey: true}), {tagName: 'BODY'})).toBe(false);
    expect(isUndoShortcut(key({altKey: true}), {tagName: 'BODY'})).toBe(false);
    expect(isUndoShortcut(key({defaultPrevented: true}), {tagName: 'BODY'})).toBe(false);
    expect(isUndoShortcut(key(), {tagName: 'BODY'}, true)).toBe(false);
    expect(isUndoShortcut(key({ctrlKey: false}), {tagName: 'BODY'})).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe('PR-103 (P-PR-41): tasks on the Day Timeline', () => {
  it('the day’s tasks in their part of the day; overdue ones on today, said so; finished ones on their day', () => {
    let r = add(emptyTasks(), 'Dentist', {due: TODAY, time: '10:30'}, 'dent');
    r = add(r, 'Pay rent', {due: '2026-11-01'}, 'rent');
    r = add(r, 'Call mum', {due: TODAY, time: '18:00', goal: 'private:g1'}, 'mum');
    r = add(r, 'Later', {due: '2026-11-09'}, 'later');
    r = finishTask(r, 'mum', at);
    const items = taskTimelineItems(r, TODAY, TODAY, day);
    expect(items.map(i => [i.id, i.band, i.done, i.label])).toEqual([['rent', 'anytime', false, 'Task · overdue'], ['dent', 'morning', false, 'Task'], ['mum', 'evening', true, 'Task']]);
    expect(items.find(i => i.id === 'mum')!.pillar).toBe('goals');
    expect(taskTimelineItems(null, TODAY, TODAY, day)).toEqual([]);
  });
});

describe('Keep-list guards (Lisbon positives)', () => {
  it('LS-P18: the open list sorts overdue, today, then by day, time and priority', () => {
    let r = add(emptyTasks(), 'Low today', {due: TODAY, level: 4}, 'l');
    r = add(r, 'High today', {due: TODAY, level: 1}, 'h');
    r = add(r, 'Overdue', {due: '2026-11-01'}, 'o');
    r = add(r, 'Someday', {}, 's');
    r = add(r, 'Timed today', {due: TODAY, time: '08:00', level: 4}, 't');
    expect(openTasks(r, TODAY).map(t => t.id)).toEqual(['o', 't', 'h', 'l', 's']);
  });
  it('LS-P03 / P46: 120 adds stay quick, and the 121st is still accepted (no slow-down past 100)', () => {
    let r = emptyTasks();
    const start = performance.now();
    for (let i = 0; i < 121; i++) r = add(r, `Task ${i}`, {}, `bulk${i}`);
    expect(r.tasks).toHaveLength(121);
    expect(performance.now() - start).toBeLessThan(5_000);
  });
});
