import {describe, expect, test} from 'vitest';
import {addTask, editTask, finishTask, orderAhead, renameLabel, viewTasks, waitsTurn, withLabel} from './engine';
import {undoOfChange} from './undo';
import {holdProject, setProjectInOrder} from './project-states';
import {inPlayRecord, isOutOfPlay, readFocus} from './focus';
import {emptyTaskPlan, setFocus, startTimer} from './plan-record';
import {bucketGroups, rollBuckets} from './plan-bucket';
import {hasOperator, matchTasks} from './search';
import {wrapUpTasks} from '../wrap-up-tasks/move';
import {tasksHud} from '../nova/holo/lists';
import {runRules} from './rules';
import {setLabelGroup} from './label-groups';
import {tasksSchema, type Tasks} from './schema';

/** Session AV lane 2 (r6-plan, review B6M): the fixes to round 6's planning rows, each with its probe. */
const TODAY = '2026-11-23', at = new Date('2026-11-23T08:00:00Z');
const add = (r: Tasks, id: string, input: Parameters<typeof addTask>[1]) => addTask(r, input, {id, at, today: TODAY, allowPast: true});
const grouped = () => setLabelGroup(tasksSchema.parse({version: 1, tasks: [], projects: [{id: 'p', name: 'Fictional house', colour: 'teal', order: 0}]}), {id: 'g', name: 'Where', labels: ['home', 'office']});

describe('B6M-1: one shared way to give a label, the groups honoured', () => {
  test('withLabel adds it, takes the group’s other label away, and leaves a full or labelled list as it is', () => {
    const groups = grouped().labelGroups;
    expect(withLabel(['home', 'calls'], 'office', groups)).toEqual(['calls', 'office']);
    expect(withLabel(['office'], 'office', groups)).toEqual(['office']);
    const full = Array.from({length: 20}, (_, i) => `l${i}`);
    expect(withLabel(full, 'x', groups)).toEqual(full);
    expect(withLabel([...full.slice(0, 19), 'home'], 'office', groups)).toEqual([...full.slice(0, 19), 'office']);
    expect(withLabel(undefined, 'calls', undefined)).toEqual(['calls']);
  });
  test('a project rule “add @office” on a task added with @home leaves only @office', () => {
    const rule = {id: 'r', when: 'added' as const, then: 'label' as const, label: 'office'};
    const before = tasksSchema.parse({...grouped(), projects: [{...grouped().projects![0]!, rules: [rule]}]});
    const after = add(before, 't', {title: 'Fictional printer', projectId: 'p', labels: ['home']});
    const out = runRules(before, after, {today: TODAY, at, newId: () => 'n'});
    expect(out.record.tasks[0]!.labels).toEqual(['office']);
    expect(out.ran).toHaveLength(1);
    const again = runRules(before, add(before, 't', {title: 'Fictional printer', projectId: 'p', labels: ['office']}), {today: TODAY, at, newId: () => 'n'});
    expect(again.ran).toEqual([]);
  });
});
describe('B6M-6: renaming a label honours the groups and keeps the group’s membership', () => {
  test('a rename into a grouped label keeps one of the group; a grouped label renamed stays in its group; one Undo', () => {
    let r = add(add(grouped(), 'a', {title: 'Fictional printer', labels: ['home', 'remote']}), 'b', {title: 'Fictional desk', labels: ['office']});
    r = renameLabel(r, 'remote', 'office');
    expect(r.tasks.map(t => t.labels)).toEqual([['office'], ['office']]);
    const moved = renameLabel(r, 'office', 'work');
    expect(moved.labelGroups).toEqual([{id: 'g', name: 'Where', labels: ['home', 'work']}]);
    expect(moved.tasks.map(t => t.labels)).toEqual([['work'], ['work']]);
    expect(undoOfChange(r, moved)(moved).labelGroups).toEqual(r.labelGroups);
    const two = setLabelGroup(r, {id: 'e', name: 'Energy', labels: ['low', 'high']});
    expect(() => renameLabel(two, 'home', 'low')).toThrow(/sits in one group/);
    expect(renameLabel(add(grouped(), 'c', {title: 'Fictional', labels: ['calls']}), 'calls', 'phone').labelGroups).toEqual(grouped().labelGroups);
  });
});
describe('B6M-7: a task waiting its turn may be ticked done early (as OmniFocus allows), said in the project and in Help', () => {
  test('finishing the later one leaves the one now up as it was, and the line goes on', () => {
    let r = add(add(add(grouped(), 'a', {title: 'Fictional one', due: TODAY, projectId: 'p', order: 1}), 'b', {title: 'Fictional two', due: TODAY, projectId: 'p', order: 2}), 'c', {title: 'Fictional three', due: TODAY, projectId: 'p', order: 3});
    r = finishTask(setProjectInOrder(r, 'p', true), 'b', at, {today: TODAY, doneDay: TODAY});
    expect(r.tasks.find(t => t.id === 'b')!.doneAt).toBeDefined();
    expect(viewTasks(r, {kind: 'today'}, TODAY).map(t => t.id)).toEqual(['a']);
    expect(waitsTurn(r, r.tasks.find(t => t.id === 'c')!)?.id).toBe('a');
  });
});
describe('B6M-8: Focus and its Undo change the focus only', () => {
  test('a timer started meanwhile stays when the focus is put back', () => {
    const focused = setFocus(emptyTaskPlan(), {projects: ['p']});
    expect(focused.focus).toEqual({projects: ['p']});
    const timed = startTimer(focused, 't', 1000);
    const undone = setFocus(timed, readFocus(emptyTaskPlan().focus));
    expect(undone.focus).toBeUndefined();
    expect(undone.timers).toEqual([{taskId: 't', since: 1000}]);
    expect(setFocus(timed, {projects: [], areas: []}).focus).toBeUndefined();
  });
});
describe('B6M-9: is:hold and is:waiting, so “hold” and “waiting” in a title still match', () => {
  test('the words match titles; the prefixed ones the tasks on hold and waiting', () => {
    let r = add(add(add(grouped(), 'm', {title: 'Fictional hold music'}), 'w', {title: 'Fictional waiting room'}), 'h', {title: 'Fictional gutters', projectId: 'p'});
    r = holdProject(r, 'p', TODAY);
    expect(matchTasks(r, 'hold', {today: TODAY}).map(t => t.id)).toEqual(['m']);
    expect(matchTasks(r, 'waiting', {today: TODAY}).map(t => t.id)).toEqual(['w']);
    expect(matchTasks(r, 'is:hold', {today: TODAY}).map(t => t.id)).toEqual(['h']);
    expect(hasOperator('hold music')).toBe(false);
    expect(hasOperator('is:waiting')).toBe(true);
  });
});
describe('B6M-10: the evening wrap-up and NOVA’s Tasks queue leave a held project’s tasks out, as the counts do', () => {
  test('neither lists them; both list them again once resumed', () => {
    const r = add(add(grouped(), 'h', {title: 'Fictional held', due: '2026-11-20', projectId: 'p'}), 'i', {title: 'Fictional inbox', due: TODAY});
    const held = holdProject(r, 'p', TODAY);
    expect(wrapUpTasks(held, TODAY).map(t => t.id)).toEqual(['i']);
    expect(wrapUpTasks(r, TODAY).map(t => t.id)).toEqual(['h', 'i']);
    const hud = tasksHud(held, TODAY, iso => iso.slice(0, 10));
    expect(hud.queue.map(t => t.id)).toEqual(['i']);
    expect(hud.overdue).toBe(0);
    expect(tasksHud(r, TODAY, iso => iso.slice(0, 10)).queue.map(t => t.id)).toEqual(['h', 'i']);
  });
});
describe('B6M-2: in order with a wait for another task never blocks for good', () => {
  test('a head that waits for a later task of its own line lets that task go first; then comes back', () => {
    let r = add(add(add(grouped(), 'a', {title: 'Fictional venue', due: TODAY, projectId: 'p', order: 1}), 'b', {title: 'Fictional budget', due: TODAY, projectId: 'p', order: 2}), 'c', {title: 'Fictional music', due: TODAY, projectId: 'p', order: 3});
    r = editTask(setProjectInOrder(r, 'p', true), 'a', {after: ['b']}, TODAY);
    expect(viewTasks(r, {kind: 'today'}, TODAY).map(t => t.id)).toEqual(['b']);
    expect(waitsTurn(r, r.tasks.find(t => t.id === 'a')!)).toBeUndefined();
    expect(waitsTurn(r, r.tasks.find(t => t.id === 'c')!)?.id).toBe('b');
    const done = finishTask(r, 'b', at, {today: TODAY, doneDay: TODAY});
    expect(viewTasks(done, {kind: 'today'}, TODAY).map(t => t.id)).toEqual(['a']);
    expect(waitsTurn(done, done.tasks.find(t => t.id === 'c')!)?.id).toBe('a');
  });
  test('every task of the line waiting for another: none waits its turn, so each joins Today once its wait is over', () => {
    let r = add(add(add(grouped(), 'x', {title: 'Fictional outside'}), 'a', {title: 'Fictional one', due: TODAY, projectId: 'p', order: 1}), 'b', {title: 'Fictional two', due: TODAY, projectId: 'p', order: 2});
    r = editTask(editTask(setProjectInOrder(r, 'p', true), 'a', {after: ['x']}, TODAY), 'b', {after: ['x']}, TODAY);
    expect(orderAhead(r).size).toBe(0);
    const freed = finishTask(r, 'x', at, {today: TODAY, doneDay: TODAY});
    expect(viewTasks(freed, {kind: 'today'}, TODAY).map(t => t.id)).toEqual(['a']);
  });
});
describe('B6M-3, B6M-4: one test of out of play, read by My Day, the planners and Upcoming’s lines', () => {
  const r0 = add(add(add(grouped(), 'h', {title: 'Fictional held', due: TODAY, projectId: 'p', deadline: '2026-11-25'}), 'w', {title: 'Fictional week', projectId: 'p'}), 'i', {title: 'Fictional inbox', due: TODAY});
  const r = editTask(r0, 'w', {plan: {kind: 'week', of: '2026-11-09'}}, TODAY);
  test('a held project’s task, one waiting its turn, and one out of the focus are out of play; the Inbox never is', () => {
    const held = holdProject(r, 'p', TODAY);
    expect(isOutOfPlay(held, held.tasks[0]!, TODAY)).toBe(true);
    expect(isOutOfPlay(r, r.tasks[0]!, TODAY)).toBe(false);
    expect(isOutOfPlay(r, r.tasks[0]!, TODAY, {projects: ['other']})).toBe(true);
    expect(isOutOfPlay(r, r.tasks[2]!, TODAY, {projects: ['other']})).toBe(false);
    expect(inPlayRecord(held, TODAY).tasks.map(t => t.id)).toEqual(['i']);
    expect(inPlayRecord(r, TODAY)).toBe(r);
    const ordered = setProjectInOrder(r, 'p', true);
    expect(inPlayRecord(ordered, TODAY).tasks.map(t => t.id)).toEqual(['h', 'i']);
  });
  test('Upcoming’s week list and deadline lines leave them out; the roll never rewrites a held task', () => {
    const held = holdProject(r, 'p', TODAY);
    expect(bucketGroups(inPlayRecord(held, TODAY), TODAY)).toEqual([]);
    expect(bucketGroups(inPlayRecord(r, TODAY), TODAY).flatMap(g => g.tasks.map(t => t.id))).toEqual(['w']);
    expect(rollBuckets(held, TODAY).moved).toEqual([]);
    expect(rollBuckets(held, TODAY).record).toBe(held);
    expect(rollBuckets(r, TODAY).moved.map(t => t.id)).toEqual(['w']);
  });
});
