import {describe, expect, test} from 'vitest';
import {addTask, editTask, finishTask, skipOccurrence} from './engine';
import {countMove, movedMost, movedWords} from './moved';
import {taskPlanSchema} from './plan-record';
import {tasksSchema, type Tasks} from './schema';
import {moveTaskDue, putTaskBack} from '../wrap-up-tasks/move';

/**
 * Session AW (X2, LEDGER #432, #433, #437; TIER 3 (stored formats), additive only): the task's optional `dread` and `moved`,
 * and the planning record's optional `timeTargets`. Each is read tolerantly (a value this build cannot read is dropped,
 * never the record), and a record without them reads exactly as before.
 */
const TODAY = '2026-11-25', at = new Date('2026-11-20T09:00:00Z');
const add = (r: Tasks, id: string, input: Parameters<typeof addTask>[1]) => addTask(r, input, {id, at, today: TODAY, allowPast: true});
const empty = (): Tasks => ({version: 1, tasks: []});

describe('the task’s dread and move count are optional and read tolerantly', () => {
  test('a valid value is kept; one this build cannot read is dropped, never the task', () => {
    const r = tasksSchema.parse({version: 1, tasks: [
      {id: 'a', title: 'Fictional tax form', priority: 'normal', createdAt: at.toISOString(), dread: 3, moved: 4},
      {id: 'b', title: 'Fictional letter', priority: 'normal', createdAt: at.toISOString(), dread: 7, moved: -1},
      {id: 'c', title: 'Fictional call', priority: 'normal', createdAt: at.toISOString(), dread: 'lots', moved: 2.5},
    ]});
    expect(r.tasks.map(t => [t.id, t.dread, t.moved])).toEqual([['a', 3, 4], ['b', undefined, undefined], ['c', undefined, undefined]]);
  });
  test('a record written before these fields reads as it did (an older build’s list)', () => {
    const old = {version: 1, tasks: [{id: 'o', title: 'Fictional old one', priority: 'high', due: '2026-11-01', createdAt: '2026-10-28T09:00:00.000Z'}]};
    expect(JSON.parse(JSON.stringify(tasksSchema.parse(old)))).toEqual(old);
  });
  test('the editor sets and clears dread; the day change alone writes `moved`', () => {
    let r = add(empty(), 't', {title: 'Fictional tax form', due: TODAY});
    r = editTask(r, 't', {dread: 2}, TODAY);
    expect(r.tasks[0]!.dread).toBe(2);
    r = editTask(r, 't', {dread: null}, TODAY);
    expect(r.tasks[0]!.dread).toBeUndefined();
  });
});

describe('a move is a one-off task’s day put off past today (LEDGER #433)', () => {
  test('later days count; the same day, an earlier day, today itself and a first day do not', () => {
    let r = add(empty(), 't', {title: 'Fictional tax form', due: TODAY});
    r = editTask(r, 't', {due: '2026-11-26'}, TODAY); // put off: 1
    r = editTask(r, 't', {due: '2026-11-26', title: 'Fictional tax form, page 1'}, TODAY); // the editor's save: same day
    r = editTask(r, 't', {due: '2026-11-30'}, TODAY); // put off: 2
    r = editTask(r, 't', {due: '2026-11-27'}, TODAY); // earlier: no
    expect(r.tasks[0]!.moved).toBe(2);
    let late = add(empty(), 'l', {title: 'Fictional overdue', due: '2026-11-20'});
    late = editTask(late, 'l', {due: TODAY}, TODAY, {allowPast: true}); // taken into today: no
    expect(late.tasks[0]!.moved).toBeUndefined();
    let none = add(empty(), 'n', {title: 'Fictional no day'});
    none = editTask(none, 'n', {due: '2026-12-01'}, TODAY); // given a first day: no
    expect(none.tasks[0]!.moved).toBeUndefined();
  });
  test('a repeat’s next day and a skipped time never count; a finished task never counts', () => {
    let r = add(empty(), 'r', {title: 'Fictional bins', due: TODAY, recur: {every: 'week', interval: 1}});
    r = finishTask(r, 'r', new Date(`${TODAY}T18:00:00Z`), {today: TODAY, doneDay: TODAY});
    r = skipOccurrence(r, 'r', TODAY);
    r = editTask(r, 'r', {due: '2026-12-20'}, TODAY);
    expect(r.tasks[0]!.moved).toBeUndefined();
    expect(countMove({due: TODAY, doneAt: `${TODAY}T10:00:00Z`}, '2026-11-30', TODAY)).toBeNull();
  });
  test('the wrap-up’s Move to tomorrow counts, and its Undo puts the count back', () => {
    const r = add(empty(), 't', {title: 'Fictional tax form', due: TODAY}), before = r.tasks[0]!;
    const moved = moveTaskDue(r, 't', '2026-11-26');
    expect(moved.tasks[0]!.moved).toBe(1);
    expect(putTaskBack(moved, before).tasks[0]!.moved).toBeUndefined();
  });
  test('the words are a calm count from the second move; Moved most lists the most moved first', () => {
    expect([movedWords(undefined), movedWords(1), movedWords(2), movedWords(4)]).toEqual([null, null, 'Moved twice', 'Moved 4 times']);
    for (const w of [movedWords(2), movedWords(12)]) expect(w).not.toMatch(/late|behind|again\?|warning|!/i);
    const r = tasksSchema.parse({version: 1, tasks: [
      {id: 'a', title: 'A', priority: 'normal', createdAt: at.toISOString(), moved: 2},
      {id: 'b', title: 'B', priority: 'normal', createdAt: at.toISOString(), moved: 5},
      {id: 'c', title: 'C', priority: 'normal', createdAt: at.toISOString(), moved: 1},
      {id: 'd', title: 'D', priority: 'normal', createdAt: at.toISOString(), moved: 9, doneAt: at.toISOString()},
    ]});
    expect(movedMost(r).items.map(t => t.id)).toEqual(['b', 'a']);
  });
});

describe('the planning record’s time targets (LEDGER #437)', () => {
  test('readable targets are kept, the others dropped (never the record); an older plan reads as before', () => {
    const plan = taskPlanSchema.parse({version: 1, dailyGoal: 3, timeTargets: [
      {id: 'tt_1', kind: 'label', of: 'writing', minutes: 300, per: 'week'},
      {id: 'tt_2', kind: 'project', of: 'project_house', minutes: 600, per: 'month'},
      {id: 'tt_3', kind: 'label', of: 'writing', minutes: 20_000, per: 'week'},
      {id: 'tt_4', kind: 'goal', of: 'x', minutes: 60, per: 'week'},
      {id: 'bad id!', kind: 'label', of: 'x', minutes: 60, per: 'week'},
    ]});
    expect(plan.timeTargets?.map(t => t.id)).toEqual(['tt_1', 'tt_2']);
    expect(plan.dailyGoal).toBe(3);
    expect(taskPlanSchema.parse({version: 1, timeTargets: 'many'}).timeTargets).toBeUndefined();
    expect(JSON.parse(JSON.stringify(taskPlanSchema.parse({version: 1, dailyGoal: 3})))).toEqual({version: 1, dailyGoal: 3});
  });
});
