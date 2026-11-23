import {describe, expect, test} from 'vitest';
import {addTask, editTask, finishTask, subtaskProgress} from './engine';
import type {Tasks} from './schema';
import {emptyTaskPlan, taskPlanSchema} from './plan-record';
import {isCancelled, isFinished} from './finished';
import {cancelTask} from './task-state';
import {addObjective, fitDay, linkObjective, objectiveProgress} from './layouts';
import {matchTasks} from './search';
import {taskTimelineItems} from './timeline-source';
import {taskAgendaItems} from '../agenda/time-items';
import {hourRows, movable} from '../agenda/hour-grid';
import {taskTimeline, tasksMonth} from '../nova/cards/ax/day-tasks';
import {lifeRadar} from '../nova/cards/ax/day-life';
import {widgetPeriod} from '../nova/cards/ax/calendar';
import {tasksWidgetView} from '../nova/widgets/tasks';
import {buildDayTimeline} from '../timeline/build';
import {emptyHabitData} from '../habits';
import {changedBy, playSteps} from './play-steps';
import {restoreTasks} from './engine';
import {fitWeek} from './plan-week';
import {addBlock, dropIntoBlock, REPEAT_BLOCK_MESSAGE} from './time-blocks';
import {moveInDoneLog, unmoveInDoneLog} from './occurrences';
import {zoneNow} from '../agenda/second-zone';
import {r5Patch} from './r5-fields';
import {novaLocalAnswer} from '../ai/local-answers/nova';
import {DAY, freshAll, zigiEnv} from '../ai/evals/as/harness';

/**
 * Session AV lane 2 (r5-plan, review B5L-1 to B5L-12): a cancelled task is never a finish anywhere a finish is counted or
 * drawn; Play the steps' Undo puts back everything the finish changed; both planners keep blocks and travel free; and the
 * minors (Undo of the planning record's one part, early hours on the grid, repeats out of blocks, the zone's own instant).
 * Fictional tasks only.
 */
const MON = '2026-11-23', TUE = '2026-11-24', at = new Date('2026-11-23T08:00:00.000Z');
const add = (r: Tasks, id: string, input: Parameters<typeof addTask>[1]) => addTask(r, input, {id, at, today: MON, allowPast: true});
const empty = (): Tasks => ({version: 1, tasks: []});
const day = (iso: string) => iso.slice(0, 10);
/** One finished and one cancelled task, both on MON; and the same list without the cancelled one. */
function pair(): {both: Tasks; finishedOnly: Tasks} {
  const base = add(add(empty(), 'f', {title: 'Fictional finished', due: MON}), 'c', {title: 'Fictional cancelled', due: MON});
  const both = cancelTask(finishTask(base, 'f', at), 'c', at);
  return {both, finishedOnly: {...both, tasks: both.tasks.filter(t => t.id !== 'c')}};
}

describe('B5L-1, B5L-3: one rule for a finish', () => {
  test('isFinished and isCancelled', () => {
    const {both} = pair(), f = both.tasks.find(t => t.id === 'f')!, c = both.tasks.find(t => t.id === 'c')!;
    expect([isFinished(f), isCancelled(f), isFinished(c), isCancelled(c)]).toEqual([true, false, false, true]);
    expect(isFinished({})).toBe(false);
  });
  test('NOVA’s task cards and widget count only finishes (their look is not touched)', () => {
    const {both, finishedOnly} = pair(), week = widgetPeriod('this-week', MON);
    const tl = taskTimeline(both, week, MON, '20:00', day);
    expect(tl.counts.done).toBe(1);
    expect(tl.counts).toEqual(taskTimeline(finishedOnly, week, MON, '20:00', day).counts);
    const month = tasksMonth(both, widgetPeriod('this-month', MON), MON, '20:00', day);
    expect([month.done, month.doneDays]).toEqual([1, [MON]]);
    expect(lifeRadar({tasks: both}, week, MON, day).spokes.find(s => s.key === 'tasks')).toEqual(lifeRadar({tasks: finishedOnly}, week, MON, day).spokes.find(s => s.key === 'tasks'));
    expect(tasksWidgetView(both, MON, day, 'M').today.map(t => t.id)).toEqual(['f']);
  });
  test('subtasks, a week objective and search', () => {
    let r = add(add(add(add(empty(), 'p', {title: 'Fictional trip'}), 'a', {title: 'Fictional a', parentId: 'p'}), 'b', {title: 'Fictional b', parentId: 'p'}), 'k', {title: 'Fictional k', parentId: 'p'});
    r = cancelTask(finishTask(r, 'a', at), 'b', at);
    expect(subtaskProgress(r, 'p')).toEqual({done: 1, total: 2});
    let o = add(add(add(empty(), 'x', {title: 'Fictional x'}), 'y', {title: 'Fictional y'}), 'z', {title: 'Fictional z'});
    o = addObjective(o, {week: MON, title: 'Fictional objective'}, 'obj');
    for (const id of ['x', 'y', 'z']) o = linkObjective(o, id, 'obj');
    o = cancelTask(finishTask(o, 'x', at), 'y', at);
    expect(objectiveProgress(o, 'obj')).toMatchObject({done: 1, of: 2});
    expect(matchTasks(r, 'done', {today: MON}).map(t => t.id)).toEqual(['a']);
    expect(matchTasks(r, 'cancelled', {today: MON}).map(t => t.id)).toEqual(['b']);
  });
  test('the Day Timeline and the Agenda draw a cancelled task as cancelled, never done; it does not move', () => {
    const {both} = pair();
    const items = taskTimelineItems(both, MON, MON, day);
    expect(items.find(i => i.id === 'f')).toMatchObject({done: true, label: 'Task'});
    expect(items.find(i => i.id === 'c')).toMatchObject({done: false, cancelled: true, label: 'Task · cancelled'});
    const agenda = taskAgendaItems(both, MON, MON, MON, day);
    expect(agenda.find(i => i.taskId === 'f')!.state).toBe('done');
    const c = agenda.find(i => i.taskId === 'c')!;
    expect([c.state, c.cancelled, movable(c)]).toEqual(['skipped', true, false]);
  });
  test('the timeline build keeps a cancelled source item out of “done” and says where a source’s place is set (B5L-12)', () => {
    const day0 = buildDayTimeline({date: MON, now: new Date(`${MON}T09:00:00Z`), zone: 'UTC', habits: emptyHabitData(), extra: [
      {id: 'tasks:c', title: 'Fictional cancelled', done: false, cancelled: true, href: '/app/tasks', time: '10:00', lockedReason: 'Its day and time are set in Tasks.'},
      {id: 'tasks:block', title: 'Fictional deep work', done: false, href: '/app/tasks', time: '11:00', minutes: 60, lockedReason: 'Set in Tasks → This week → Time blocks.'},
    ]});
    const c = day0.blocks.find(b => b.id === 'tasks:c')!, b = day0.blocks.find(x => x.id === 'tasks:block')!;
    expect([c.done, c.skipped, c.cancelled]).toEqual([false, true, true]);
    expect([b.lockedReason, b.timeFrom, b.minutes]).toEqual(['Set in Tasks → This week → Time blocks.', 'its record', 60]);
  });
});

test('B5L-3: NOVA’s “tasks done today” leaves a cancelled task out', () => {
  const at0 = new Date(`${DAY}T08:00:00Z`), s = freshAll();
  let r = addTask(addTask(empty(), {title: 'Fictional finished'}, {id: 'f', at: at0, today: DAY}), {title: 'Fictional cancelled'}, {id: 'c', at: at0, today: DAY});
  r = cancelTask(finishTask(r, 'f', at0), 'c', at0);
  s.nova = {...s.nova, tasks: r};
  const reply = novaLocalAnswer('tasks done today', zigiEnv(s));
  expect(reply && 'text' in reply ? reply.text : '').toBe('1 task done today:\n• Fictional finished');
});
describe('B5L-2: Play the steps’ Undo puts back everything the finish changed', () => {
  test('a repeating routine: the finish reopens its steps; Undo puts the steps back done', () => {
    let r = add(add(add(empty(), 'r', {title: 'Fictional routine', due: MON, recur: {every: 'day', interval: 1}}), 's1', {title: 'Fictional stretch', parentId: 'r'}), 's2', {title: 'Fictional breathe', parentId: 'r'});
    r = finishTask(finishTask(r, 's1', at), 's2', at);
    expect(playSteps(r, 'r').done).toHaveLength(2);
    const after = finishTask(r, 'r', at, {today: MON, doneDay: MON});
    expect(after.tasks.filter(t => t.parentId === 'r' && t.doneAt)).toHaveLength(0); // reopened for the next time
    const {was, added} = changedBy(r, after);
    expect(was.map(t => t.id).sort()).toEqual(['r', 's1', 's2']);
    const undone = restoreTasks(after, was, added);
    expect(undone.tasks.find(t => t.id === 'r')!.due).toBe(MON);
    expect(undone.tasks.filter(t => t.parentId === 'r' && t.doneAt)).toHaveLength(2);
  });
  test('a step with its own subtasks: Undo opens them again', () => {
    const r = add(add(add(empty(), 'p', {title: 'Fictional move'}), 's', {title: 'Fictional pack', parentId: 'p'}), 'ss', {title: 'Fictional tape', parentId: 's'});
    const after = finishTask(r, 's', at), {was, added} = changedBy(r, after);
    expect(was.map(t => t.id).sort()).toEqual(['s', 'ss']);
    expect(restoreTasks(after, was, added).tasks.every(t => !t.doneAt)).toBe(true);
  });
});

describe('B5L-4, B5L-5: both planners keep blocks and travel free', () => {
  test('Plan my week keeps a non-block task out of a time block', () => {
    const plan = taskPlanSchema.parse({...addBlock(emptyTaskPlan(), {name: 'Deep work', colour: 'teal', from: '09:00', to: '11:00', days: [0, 1, 2, 3, 4, 5, 6]}, 'deep'), workHours: {days: {'2': [{from: '09:00', to: '12:00'}]}}});
    const r = add(empty(), 'x', {title: 'Fictional report', minutes: 60, due: TUE});
    const week = fitWeek({record: r, plan, today: MON, clock: '08:00'});
    expect(week.placed.map(p => [p.day, p.start, p.end])).toEqual([[TUE, '11:00', '12:00']]);
  });
  test('Plan my day and Plan my week leave the travel minutes free before a placed task', () => {
    const r = editTask(add(empty(), 't', {title: 'Fictional errand', minutes: 60, due: MON}), 't', {travel: 30}, MON);
    const day0 = fitDay(r.tasks, [{start: 720, end: 780, title: 'Fictional event'}], {from: '12:00', until: '18:00'});
    expect(day0.placed.map(p => [p.start, p.end])).toEqual([['13:30', '14:30']]); // 13:00–13:30 travel, after the event
    const week = fitWeek({record: r, plan: {}, today: MON, clock: '09:00'});
    expect(week.placed[0]).toMatchObject({day: MON, start: '09:30', end: '10:30'});
  });
  test('a block drop keeps the travel with the task, so the planner reserves it inside the block', () => {
    const plan = addBlock(emptyTaskPlan(), {name: 'Errands', colour: 'yellow', from: '13:00', to: '15:00', on: MON}, 'err');
    const r = dropIntoBlock(editTask(add(empty(), 't', {title: 'Fictional errand', minutes: 30, due: MON, time: '10:00'}), 't', {travel: 30}, MON), 't', plan.blocks![0]!, MON);
    expect(r.tasks[0]).toMatchObject({block: 'err', travel: 30}); expect(r.tasks[0]!.time).toBeUndefined();
    expect(fitDay(r.tasks, [{start: 720, end: 780, title: 'Fictional event'}], {from: '13:00', until: '15:00'}).placed[0]).toMatchObject({start: '13:30'});
  });
});

describe('the minors', () => {
  test('B5L-7: the finishes-per-day log is moved back alone', () => {
    const plan = taskPlanSchema.parse({version: 1, dailyGoal: 3, doneLog: {through: '2026-11-21', days: {'2026-11-20': 1}}});
    const moved = moveInDoneLog(plan, '2026-11-20', '2026-11-19');
    const later = taskPlanSchema.parse({...moved, dailyGoal: 5}); // another change while the toast is up
    expect(unmoveInDoneLog(later, '2026-11-20', '2026-11-19')).toEqual(taskPlanSchema.parse({...plan, dailyGoal: 5}));
  });
  test('B5L-8: an early block or "Leave by" gets its hour on the grid', () => {
    expect(hourRows({items: []})[0]!.hour).toBe(6);
    expect(hourRows({items: []}, ['05:00', '05:30'])[0]!.hour).toBe(5);
  });
  test('B5L-9: a repeating task is not put in a block', () => {
    const plan = addBlock(emptyTaskPlan(), {name: 'Admin', colour: 'grey', from: '09:00', to: '10:00', days: [1]}, 'adm');
    const r = add(empty(), 'd', {title: 'Fictional inbox zero', due: MON, recur: {every: 'day', interval: 1}});
    expect(() => dropIntoBlock(r, 'd', plan.blocks![0]!, MON)).toThrow(REPEAT_BLOCK_MESSAGE);
    expect(r5Patch({place: '', travel: '', bucket: '', block: 'adm'}, MON, '', MON, true)).toMatchObject({block: null});
  });
  test('B5L-11: the time in the second zone is read from the instant', () => {
    expect(zoneNow(new Date('2026-11-23T23:30:00Z'), 'Asia/Tokyo')).toEqual({clock: '08:30', date: '2026-11-24'});
    expect(zoneNow(new Date('2026-11-23T23:30:00Z'), 'UTC')).toEqual({clock: '23:30', date: MON});
  });
});
