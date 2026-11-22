import {describe, expect, test} from 'vitest';
import {addTask, completedLog, editTask, finishTask, reopenTask, viewTasks} from './engine';
import {tasksSchema, type Tasks} from './schema';
import {emptyTaskPlan, finishesByDay, taskPlanSchema} from './plan-record';
import {CANCEL_REPEAT_MESSAGE, cancelTask, isCancelled, isDoing, startDoing, stopDoing} from './task-state';
import {OCCURRENCE_FUTURE_MESSAGE, moveFinish, moveInDoneLog, takeBackFinish} from './occurrences';
import {bucketGroups, bucketOf, bucketTitle, periodEnd, periodStart, planFor, rollBuckets} from './plan-bucket';
import {addBlock, blockProgress, blockTasks, blocksOn, dropIntoBlock, editBlock, eventBusy, eventIdOf, fitWithBlocks, leaveBy, moveWhatIsLeft, nextBlockOfName, removeBlock, setEventTravel} from './time-blocks';
import {taskBusy} from './layouts';
import {clockText, finishStep, pauseClock, playSteps, resumeClock, runMs, spentMinutes, startClock} from './play-steps';
import {matchTasks} from './search';
import {r5Patch, r5FieldsOf} from './r5-fields';
import {blockTimelineItems, travelTimelineItems} from './timeline-source';
import {weekCandidates} from './plan-week';
import {getTaskActivities} from './activity';
import {tasksReview} from './review';
import {buildIcs, unfold} from '../ics/ics';
import {zoneClock, zoneDifference, zoneName} from '../agenda/second-zone';
import {leaveByWakes} from './leave-by';
import {zonedInstant} from '../notify/zone';

/**
 * Session AV lane 2 (r5-plan, LEDGER #348–#354, #356, #357; Akiflow, Logseq, Tiimo): Doing and Cancelled, earlier finishes, a
 * week or a month without a day, time blocks, travel minutes, playing a task's steps, a place, search words, the .ics LOCATION,
 * the timeline's spans and the second zone. Fictional tasks only.
 */
const MON = '2026-11-23', TUE = '2026-11-24', WED = '2026-11-25', at = new Date('2026-11-23T08:00:00.000Z');
const add = (r: Tasks, id: string, input: Parameters<typeof addTask>[1]) => addTask(r, input, {id, at, today: MON, allowPast: true});
const empty = (): Tasks => ({version: 1, tasks: []});
const day = (iso: string) => iso.slice(0, 10);

describe('Doing and Cancelled (LEDGER #350)', () => {
  test('Doing: first in Today, also without a day; finishing or "not doing it now" ends it', () => {
    let r = add(add(add(empty(), 'late', {title: 'Fictional late', due: '2026-11-20'}), 'now', {title: 'Fictional now'}), 'today', {title: 'Fictional today', due: MON});
    r = startDoing(r, 'now', at);
    expect(isDoing(r.tasks.find(t => t.id === 'now')!)).toBe(true);
    expect(r.tasks.find(t => t.id === 'now')!.state).toEqual({kind: 'doing', at: at.toISOString()});
    expect(viewTasks(r, {kind: 'today'}, MON).map(t => t.id)).toEqual(['now', 'late', 'today']);
    expect(stopDoing(r, 'now', at).tasks.find(t => t.id === 'now')!.state).toBeUndefined();
    const done = finishTask(r, 'now', at);
    expect(done.tasks.find(t => t.id === 'now')!.state).toBeUndefined();
    expect(() => startDoing(done, 'now', at)).toThrow(/already closed/);
  });
  test('Doing on a repeating task ends when this time is finished; the next one is open', () => {
    const r = startDoing(add(empty(), 'w', {title: 'Fictional water plants', due: MON, recur: {every: 'day', interval: 1}}), 'w', at);
    const next = finishTask(r, 'w', at, {today: MON, doneDay: MON}).tasks[0]!;
    expect(next.due).toBe(TUE); expect(next.state).toBeUndefined();
  });
  test('Cancelled: closed with doneAt (older builds read it finished), its open subtasks with it; never a finish', () => {
    let r = add(add(add(empty(), 'p', {title: 'Fictional trip'}), 'k', {title: 'Fictional tickets', parentId: 'p'}), 'x', {title: 'Fictional bag'});
    r = finishTask(r, 'x', at);
    r = cancelTask(r, 'p', at);
    const p = r.tasks.find(t => t.id === 'p')!, k = r.tasks.find(t => t.id === 'k')!;
    expect(p.doneAt).toBe(at.toISOString()); expect(isCancelled(p)).toBe(true); expect(isCancelled(k)).toBe(true);
    expect(completedLog(r).filter(e => e.cancelled).map(e => e.task.id).sort()).toEqual(['k', 'p']);
    expect(finishesByDay(emptyTaskPlan(), r, day).get(MON)).toBe(1); // only the bag: the daily goal and its streak leave cancelled ones out
    expect(tasksReview(r, {start: MON, end: MON, prevStart: '2026-11-16', prevEnd: '2026-11-22'}, MON, day).finished).toBe(1);
    expect(getTaskActivities(r, day).find(a => a.id === 'task-done:p')!.detail).toBe('Cancelled');
    // Ticked open again, it is an open task.
    const open = reopenTask(r, 'p').tasks.find(t => t.id === 'p')!;
    expect(open.doneAt).toBeUndefined(); expect(open.state).toBeUndefined();
    expect(() => cancelTask(add(empty(), 'w', {title: 'Fictional', due: MON, recur: {every: 'day', interval: 1}}), 'w', at)).toThrow(CANCEL_REPEAT_MESSAGE);
  });
  test('search: doing and cancelled', () => {
    const r = cancelTask(startDoing(add(add(empty(), 'a', {title: 'Fictional a'}), 'b', {title: 'Fictional b'}), 'a', at), 'b', at);
    expect(matchTasks(r, 'doing', {today: MON}).map(t => t.id)).toEqual(['a']);
    expect(matchTasks(r, 'cancelled', {today: MON}).map(t => t.id)).toEqual(['b']);
  });
});

describe('earlier finishes of a repeating task (LEDGER #352)', () => {
  const series = () => {
    let r = add(empty(), 'w', {title: 'Fictional run', due: '2026-11-20', recur: {every: 'day', interval: 1}});
    r = finishTask(r, 'w', new Date('2026-11-20T18:00:00.000Z'), {today: '2026-11-20', doneDay: '2026-11-20'});
    return finishTask(r, 'w', new Date('2026-11-21T18:00:00.000Z'), {today: '2026-11-21', doneDay: '2026-11-21'});
  };
  test('take back one tick: only that finish goes; the next day stays', () => {
    const r = series(), first = r.tasks[0]!.completions![0]!.at, due = r.tasks[0]!.due;
    const back = takeBackFinish(r, 'w', first).tasks[0]!;
    expect(back.completions!.map(c => c.at)).toEqual(['2026-11-21T18:00:00.000Z']);
    expect(back.due).toBe(due); expect(back.recur).toEqual(r.tasks[0]!.recur);
    expect(() => takeBackFinish(r, 'w', 'nope')).toThrow(/no longer on this task/);
  });
  test('move one finish to the day it was really done; never to a later day than today', () => {
    const r = series(), first = r.tasks[0]!.completions![0]!.at;
    const moved = moveFinish(r, 'w', first, '2026-11-19', MON, {toIso: d => `${d}T12:00:00.000Z`}).tasks[0]!;
    expect(moved.completions!.map(c => c.at)).toEqual(['2026-11-19T12:00:00.000Z', '2026-11-21T18:00:00.000Z']);
    expect(moved.due).toBe(r.tasks[0]!.due);
    expect(() => moveFinish(r, 'w', first, TUE, MON)).toThrow(OCCURRENCE_FUTURE_MESSAGE);
  });
  test('the finishes-per-day log moves with it, only for the days it has counted', () => {
    const plan = taskPlanSchema.parse({version: 1, doneLog: {through: '2026-11-21', days: {'2026-11-20': 1, '2026-11-21': 2}}});
    expect(moveInDoneLog(plan, '2026-11-20', '2026-11-19').doneLog!.days).toEqual({'2026-11-19': 1, '2026-11-21': 2});
    expect(moveInDoneLog(plan, '2026-11-21', null).doneLog!.days).toEqual({'2026-11-20': 1, '2026-11-21': 1});
    expect(moveInDoneLog(plan, '2026-11-22', MON)).toBe(plan);
    expect(moveInDoneLog(emptyTaskPlan(), '2026-11-20', null)).toEqual(emptyTaskPlan());
  });
});

describe('a week or a month without a day (LEDGER #349)', () => {
  test('periods start on Monday and the first of the month', () => {
    expect(periodStart('week', WED)).toBe(MON); expect(periodEnd('week', MON)).toBe('2026-11-29');
    expect(periodStart('month', WED)).toBe('2026-11-01'); expect(periodEnd('month', '2026-12-01')).toBe('2026-12-31'); expect(periodEnd('month', '2027-02-01')).toBe('2027-02-28');
    expect(planFor('next-week', WED)).toEqual({kind: 'week', of: '2026-11-30'}); expect(planFor('next-month', WED)).toEqual({kind: 'month', of: '2026-12-01'});
  });
  test('shown under its week or month until done or given a day; a passed week reads as this one, written once', () => {
    let r = add(add(add(empty(), 'w', {title: 'Fictional gutters'}), 'm', {title: 'Fictional tax letter'}), 'old', {title: 'Fictional shelves'});
    r = editTask(editTask(editTask(r, 'w', {plan: planFor('week', MON)}, MON), 'm', {plan: planFor('next-month', MON)}, MON), 'old', {plan: {kind: 'week', of: '2026-11-09'}}, MON);
    expect(bucketOf(r.tasks.find(t => t.id === 'old')!, MON)).toEqual({kind: 'week', of: MON, moved: true});
    expect(bucketGroups(r, MON).map(g => [g.kind, g.of, g.tasks.map(t => t.id)])).toEqual([['week', MON, ['w', 'old']], ['month', '2026-12-01', ['m']]]);
    const rolled = rollBuckets(r, MON, at);
    expect(rolled.moved.map(t => t.id)).toEqual(['old']);
    expect(rolled.record.tasks.find(t => t.id === 'old')!.plan).toEqual({kind: 'week', of: MON});
    expect(rollBuckets(rolled.record, MON, at).moved).toEqual([]); // said once
    const dated = editTask(r, 'w', {due: WED}, MON);
    expect(bucketOf(dated.tasks.find(t => t.id === 'w')!, MON)).toBeNull(); // a day wins
    expect(bucketTitle('week', MON, MON, () => 'December', d => d)).toBe('This week');
    expect(bucketTitle('month', '2026-12-01', MON, () => 'December', d => d)).toBe('Next month');
    expect(bucketTitle('month', '2027-01-01', MON, () => 'January', d => d)).toBe('January');
    expect(matchTasks(r, 'plan:month', {today: MON}).map(t => t.id)).toEqual(['m']);
  });
  test('the editor: a day drops the week, a week needs no day; travel only with a day and a time', () => {
    const t = tasksSchema.parse({version: 1, tasks: [{id: 't', title: 'Fictional', priority: 'normal', createdAt: at.toISOString(), plan: {kind: 'week', of: MON}, travel: 20, place: 'Fictional Street 1'}]}).tasks[0]!;
    const v = r5FieldsOf(t);
    expect(v).toEqual({place: 'Fictional Street 1', travel: '20', bucket: 'keep', block: ''});
    expect(r5Patch(v, '', '', MON)).toEqual({place: 'Fictional Street 1', travel: null, block: null});
    expect(r5Patch({...v, bucket: 'month'}, '', '', MON)).toMatchObject({plan: {kind: 'month', of: '2026-11-01'}});
    expect(r5Patch(v, WED, '09:00', MON)).toEqual({place: 'Fictional Street 1', travel: 20, plan: null, block: null});
    expect(r5Patch({...v, travel: '0'}, WED, '09:00', MON)).toBe('invalid');
    expect(r5Patch({...v, place: '   '}, WED, '09:00', MON)).toMatchObject({place: null});
  });
});

describe('time blocks (LEDGER #348)', () => {
  const plan = () => addBlock(addBlock(addBlock(emptyTaskPlan(), {name: 'Deep work', colour: 'teal', from: '09:00', to: '11:00', days: [1, 3]}, 'deep'), {name: 'deep work', colour: 'blue', from: '15:00', to: '16:00', on: MON}, 'deep2'), {name: 'Errands', colour: 'yellow', from: '14:00', to: '15:00', on: TUE}, 'err');
  test('kept, checked in words, changed and removed', () => {
    const p = plan();
    expect(blocksOn(p, MON).map(b => b.id)).toEqual(['deep', 'deep2']);
    expect(blocksOn(p, TUE).map(b => b.id)).toEqual(['err']);
    expect(() => addBlock(p, {name: ' ', colour: 'blue', from: '09:00', to: '10:00', days: [1]}, 'x')).toThrow(/name/);
    expect(() => addBlock(p, {name: 'Late', colour: 'blue', from: '10:00', to: '09:00', days: [1]}, 'x')).toThrow(/ends after it starts/);
    expect(() => addBlock(p, {name: 'Never', colour: 'blue', from: '09:00', to: '10:00', days: []}, 'x')).toThrow(/Choose a day/);
    expect(editBlock(p, 'err', {name: 'Errands', colour: 'green', from: '13:00', to: '15:00', on: TUE}).blocks!.find(b => b.id === 'err')).toEqual({id: 'err', name: 'Errands', colour: 'green', from: '13:00', to: '15:00', on: TUE});
    expect(removeBlock(removeBlock(removeBlock(p, 'deep'), 'deep2'), 'err').blocks).toBeUndefined();
  });
  test('dropped in, counted "2 of 4 done" (cancelled ones leave the count), and placed inside by Plan my day', () => {
    const p = plan(), deep = p.blocks![0]!;
    let r = add(add(add(add(add(empty(), 'a', {title: 'Fictional a', minutes: 60}), 'b', {title: 'Fictional b', minutes: 30}), 'c', {title: 'Fictional c'}), 'd', {title: 'Fictional d'}), 'o', {title: 'Fictional other', due: MON, minutes: 30});
    for (const id of ['a', 'b', 'c', 'd']) r = dropIntoBlock(r, id, deep, MON);
    expect(r.tasks.find(t => t.id === 'a')).toMatchObject({due: MON, block: 'deep'});
    r = cancelTask(finishTask(r, 'c', at), 'd', at);
    expect(blockProgress(blockTasks(r, deep, MON))).toEqual({done: 1, total: 3});
    const open = r.tasks.filter(t => !t.doneAt);
    const fit = fitWithBlocks(open, [], {from: '08:00', until: '18:00'}, blocksOn(p, MON));
    expect(fit.placed.map(x => [x.task.id, x.start, x.end])).toEqual([['o', '08:00', '08:30'], ['a', '09:00', '10:00'], ['b', '10:00', '10:30']]);
    // From 09:00 the other task waits outside the block, after it.
    expect(fitWithBlocks(open, [], {from: '09:00', until: '18:00'}, blocksOn(p, MON)).placed.find(x => x.task.id === 'o')!.start).toBe('11:00');
    expect(fit.inBlock.get('a:1')).toBe('Deep work');
    expect(weekCandidates(r, MON, '08:00').map(t => t.id)).not.toContain('a'); // Plan my week leaves block tasks to Plan my day
  });
  test('Move what is left: to the next block of the same name (later that day first), times cleared', () => {
    const p = plan(), deep = p.blocks![0]!;
    let r = dropIntoBlock(dropIntoBlock(add(add(empty(), 'a', {title: 'Fictional a'}), 'b', {title: 'Fictional b'}), 'a', deep, MON), 'b', deep, MON);
    r = editTask(r, 'b', {time: '09:30'}, MON);
    expect(nextBlockOfName(p, deep, MON)).toEqual({block: p.blocks![1], day: MON});
    const moved = moveWhatIsLeft(r, p, deep, MON, at);
    expect(moved.to.block.id).toBe('deep2');
    expect(moved.record.tasks.map(t => [t.id, t.due, t.block, t.time ?? null])).toEqual([['a', MON, 'deep2', null], ['b', MON, 'deep2', null]]);
    expect(nextBlockOfName(p, p.blocks![1]!, MON)).toEqual({block: deep, day: WED});
    expect(() => moveWhatIsLeft(r, removeBlock(removeBlock(p, 'deep2'), 'deep'), deep, MON)).toThrow(/No later “Deep work” block/);
  });
  test('the Day Timeline draws a block as a span with its count', () => {
    const p = plan();
    const r = dropIntoBlock(add(empty(), 'a', {title: 'Fictional a'}), 'a', p.blocks![0]!, MON);
    expect(blockTimelineItems(r, p, MON)[0]).toMatchObject({id: `block:deep:${MON}`, title: 'Deep work', time: '09:00', minutes: 120, band: 'morning', label: 'Time block · until 11:00 AM · 0 of 1 done'});
  });
});

describe('travel minutes (LEDGER #353)', () => {
  test('busy before the task for Plan my day; "leave by"; an imported event keyed by its id', () => {
    const r = editTask(add(empty(), 'd', {title: 'Fictional dentist', due: MON, time: '09:00', minutes: 30}), 'd', {travel: 20}, MON);
    expect(taskBusy(r, MON)).toEqual([{start: 520, end: 570, title: 'Fictional dentist'}]);
    expect(leaveBy('09:00', 20)).toBe('08:40'); expect(leaveBy('00:10', 20)).toBeNull();
    expect(travelTimelineItems(r, MON)).toEqual([{id: 'travel:d', title: 'Travel to “Fictional dentist”', done: false, href: '/app/tasks?task=d', band: 'morning', time: '08:40', minutes: 20, pillar: null, label: 'Travel · leave by 8:40 AM', lockedReason: 'Its travel minutes are set in the task’s editor.'}]); // Session AV lane 2 (review B5L-12: a span says where it is set, deliberate)
    const item = {id: 'event:cal_abcdefgh:0123456789abcdef:2026-11-23', time: '14:00', minutes: 60, title: 'Fictional meeting'};
    expect(eventIdOf(item.id)).toBe('0123456789abcdef');
    const p = setEventTravel(emptyTaskPlan(), '0123456789abcdef', 25);
    expect(eventBusy(p, item, 30)).toEqual({start: 815, end: 900, title: 'Fictional meeting'});
    expect(setEventTravel(p, '0123456789abcdef', null)).toEqual(emptyTaskPlan());
    expect(() => setEventTravel(p, '0123456789abcdef', 601)).toThrow(/600/);
  });
  test('the leave-by wakes: tasks and events, the next days, none in the past', () => {
    const ZONE = 'Europe/Amsterdam', now = zonedInstant(MON, '07:00', ZONE);
    const r = editTask(editTask(add(add(empty(), 'd', {title: 'Fictional dentist', due: MON, time: '09:00'}), 'e', {title: 'Fictional early', due: MON, time: '07:10'}), 'd', {travel: 20}, MON), 'e', {travel: 30}, MON);
    const wakes = leaveByWakes({tasks: r, plan: null, calendars: null, zone: ZONE, now, today: MON});
    expect(wakes).toEqual([{id: 'd', title: 'Fictional dentist', at: zonedInstant(MON, '08:40', ZONE), leave: '08:40', href: '/app/tasks?task=d'}]);
  });
});

describe('playing a task’s steps (LEDGER #351)', () => {
  test('the current step, its countdown, Next ticks it and adds its minutes; nothing new stored', () => {
    let r = add(add(add(empty(), 'p', {title: 'Fictional move'}), 's1', {title: 'Fictional boxes', parentId: 'p', minutes: 10}), 's2', {title: 'Fictional labels', parentId: 'p'});
    expect(playSteps(r, 'p').now!.id).toBe('s1');
    let c = startClock(1000);
    c = pauseClock(c, 61_000); expect(runMs(c, 999_999)).toBe(60_000);
    c = resumeClock(c, 100_000); expect(runMs(c, 160_000)).toBe(120_000);
    expect(clockText({minutes: 10}, 120_000)).toEqual({text: '8:00', over: false, counting: 'down'});
    expect(clockText({minutes: 1}, 90_000)).toEqual({text: '+0:30', over: true, counting: 'down'});
    expect(clockText({}, 75_000)).toEqual({text: '1:15', over: false, counting: 'up'});
    expect(spentMinutes(0)).toBe(0); expect(spentMinutes(10_000)).toBe(1); expect(spentMinutes(150_000)).toBe(3);
    r = finishStep(r, 's1', 120_000, at, MON);
    const s1 = r.tasks.find(t => t.id === 's1')!;
    expect(s1.doneAt).toBeTruthy(); expect(s1.spent).toBe(2);
    const steps = playSteps(r, 'p');
    expect([steps.done.map(t => t.id), steps.now?.id, steps.coming]).toEqual([['s1'], 's2', []]);
    expect(Object.keys(s1).sort()).not.toContain('steps');
  });
});

describe('a place, its .ics LOCATION, and the second zone (LEDGER #354, #357)', () => {
  test('LOCATION is written and escaped; absent without a place', () => {
    const ics = unfold(buildIcs([{id: 'task:a', date: MON, time: '09:00', summary: 'Fictional dentist', location: 'Fictional Street 1, Utrecht; 2nd floor'}, {id: 'task:b', date: MON, summary: 'Fictional none'}], {stamp: at}));
    expect(ics).toContain('LOCATION:Fictional Street 1\\, Utrecht\\; 2nd floor');
    expect(ics.filter(l => l.startsWith('LOCATION:'))).toHaveLength(1);
  });
  test('a zone’s clock and its difference', () => {
    expect(zoneName('America/New_York')).toBe('New York');
    expect(zoneClock(MON, '12:00', 'UTC')).not.toBeNull();
    expect(zoneDifference(MON, Intl.DateTimeFormat().resolvedOptions().timeZone)).toBe('the same time');
    expect(zoneClock(MON, '12:00', 'Not/AZone')).toBeNull();
  });
});
