import {describe, expect, test} from 'vitest';
import {addTask, editTask, finishTask, orderAhead, viewTasks, waitsTurn, withLabel} from './engine';
import {setProjectInOrder} from './project-states';
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
