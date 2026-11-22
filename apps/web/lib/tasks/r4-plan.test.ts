import {describe, expect, test} from 'vitest';
import {addTask, editTask, finishTask, taskCounts, viewTasks, waitingFor, WAIT_LOOP_MESSAGE} from './engine';
import {fitDay, taskBusy} from './layouts';
import {blockLength, inPieces, piecesOf} from './pieces';
import {emptyTaskPlan} from './plan-record';
import {fitWeek, keepPlacements, taskSpan, weekCandidates} from './plan-week';
import {deadlineAtRisk} from './at-risk';
import {describeRecur, flexRule, nextOccurrence, windowEnd, windowStart} from './recurrence';
import {emptyTasks, tasksSchema, type Task, type Tasks} from './schema';
import {afterHours, checkBlocks, closedBusy, freeIn, hoursOn, setAfterHours, setWeekdayHours, weekdayHours} from './work-hours';

/** Session AV lane 2 (r4-plan, LEDGER #300–#305; Motion): the planned week's pure parts. */
const MON = '2026-11-23', at = new Date(`${MON}T07:00:00Z`);
const add = (r: Tasks, id: string, input: Parameters<typeof addTask>[1]) => addTask(r, input, {id, at, today: MON, allowPast: true});
const task = (r: Tasks, id: string) => r.tasks.find(t => t.id === id)!;

describe('working hours (LEDGER #301)', () => {
  test('the usual 09:00–18:00 until set; two blocks for a lunch break; none is a day off; set back to the usual', () => {
    const plan = emptyTaskPlan();
    expect(weekdayHours(plan, 1)).toEqual([{from: '09:00', to: '18:00'}]);
    const lunch = setWeekdayHours(plan, [1, 2, 3, 4, 5], [{from: '13:30', to: '17:30'}, {from: '08:30', to: '12:30'}]);
    expect(hoursOn(lunch, MON)).toEqual([{from: '08:30', to: '12:30'}, {from: '13:30', to: '17:30'}]);
    const off = setWeekdayHours(lunch, [0, 6], []);
    expect(hoursOn(off, '2026-11-29')).toEqual([]);
    expect(weekdayHours(setWeekdayHours(off, [1], null), 1)).toEqual([{from: '09:00', to: '18:00'}]);
    expect(afterHours(plan)).toEqual({from: '20:00', to: '23:00'});
    expect(afterHours(setAfterHours(plan, {from: '21:00', to: '23:30'}))).toEqual({from: '21:00', to: '23:30'});
    expect(setAfterHours(setAfterHours(plan, {from: '21:00', to: '23:30'}), null).workHours).toBeUndefined();
  });
  test('blocks are checked in words', () => {
    expect(checkBlocks([{from: '12:00', to: '09:00'}])).toBe('Each block ends after it starts (within the same day).');
    expect(checkBlocks([{from: '09:00', to: '13:00'}, {from: '12:00', to: '17:00'}])).toBe('The second block starts after the first one ends.');
    expect(checkBlocks([{from: '9', to: '10:00'}])).toBe('Choose times such as 09:00 and 17:30.');
    expect(() => setWeekdayHours(emptyTaskPlan(), [1], [{from: '07:00', to: '08:00'}, {from: '09:00', to: '10:00'}, {from: '11:00', to: '12:00'}])).toThrow('two blocks');
  });
  test('closed and free time', () => {
    expect(closedBusy([{from: '09:00', to: '12:00'}, {from: '13:00', to: '17:00'}]).map(b => [b.start, b.end])).toEqual([[0, 540], [720, 780], [1020, 1440]]);
    expect(freeIn([{from: '09:00', to: '12:00'}, {from: '13:00', to: '17:00'}], [{start: 600, end: 660, title: 'call'}], 0)).toBe(420 - 60);
    expect(freeIn([{from: '09:00', to: '12:00'}], [], 630)).toBe(90);
    expect(freeIn([{from: '09:00', to: '12:00'}, {from: '11:00', to: '13:00'}], [], 0)).toBe(240);
  });
  test('Plan my day keeps to the hours and puts an "after hours" task in the evening', () => {
    let r = add(emptyTasks(), 'a', {title: 'Fictional report', due: MON, minutes: 180});
    r = add(r, 'b', {title: 'Fictional guitar', due: MON, minutes: 60});
    r = editTask(r, 'b', {afterHours: true}, MON);
    const plan = setWeekdayHours(emptyTaskPlan(), [1], [{from: '09:00', to: '11:00'}, {from: '12:00', to: '17:00'}]);
    const fit = fitDay(r.tasks, [], {from: '09:00', until: '17:00', windows: hoursOn(plan, MON), after: [afterHours(plan)]});
    expect(fit.placed.map(p => [p.task.id, p.start, p.end])).toEqual([['a', '12:00', '15:00'], ['b', '20:00', '21:00']]);
  });
});

describe('pieces of a long task (LEDGER #303)', () => {
  test('pieces of the minutes left, time spent counted against the whole', () => {
    const t = {chunk: 60, minutes: 240, spent: 0} as Task;
    expect(piecesOf(t)).toEqual({pieces: [60, 60, 60, 60], done: 0});
    expect(piecesOf({...t, spent: 90})).toEqual({pieces: [60, 60, 30], done: 1});
    expect(inPieces({...t, spent: 200})).toBe(false);
    expect(blockLength(t)).toBe(60); expect(blockLength({minutes: 45} as Task)).toBe(45);
  });
  test('Plan my day places a task in pieces where each first fits, "part n of m", and counts the pieces left over', () => {
    const r = editTask(add(emptyTasks(), 'a', {title: 'Fictional thesis', due: MON, minutes: 180}), 'a', {chunk: 60}, MON);
    const busy = [{start: 600, end: 660, title: 'call'}, {start: 720, end: 1020, title: 'away'}];
    const fit = fitDay(r.tasks, busy, {from: '09:00', until: '18:00'});
    expect(fit.placed.map(p => [p.start, p.end, p.part, p.of])).toEqual([['09:00', '10:00', 1, 3], ['11:00', '12:00', 2, 3], ['17:00', '18:00', 3, 3]]);
    const tight = fitDay(r.tasks, busy, {from: '09:00', until: '17:00'});
    expect(tight.placed).toHaveLength(2); expect(tight.rest).toEqual([{task: task(r, 'a'), pieces: 1}]);
    // A timed task in pieces holds one piece on its day.
    expect(taskBusy(editTask(r, 'a', {time: '09:00'}, MON), MON)).toEqual([{start: 540, end: 600, title: 'Fictional thesis'}]);
  });
});

describe('a task that waits for another (LEDGER #304)', () => {
  test('not in Today nor Today’s count until the ones it waits for are done; then it joins its day', () => {
    let r = add(emptyTasks(), 'venue', {title: 'Fictional venue', due: MON});
    r = add(r, 'invites', {title: 'Fictional invitations', due: MON});
    r = editTask(r, 'invites', {after: ['venue', 'invites', 'gone']}, MON);
    expect(task(r, 'invites').after).toEqual(['venue', 'gone']);
    expect(waitingFor(r, task(r, 'invites')).map(t => t.id)).toEqual(['venue']);
    expect(viewTasks(r, {kind: 'today'}, MON).map(t => t.id)).toEqual(['venue']);
    expect(taskCounts(r, MON, '08:00').today).toBe(1);
    r = finishTask(r, 'venue', at, {today: MON});
    expect(waitingFor(r, task(r, 'invites'))).toEqual([]);
    expect(viewTasks(r, {kind: 'today'}, MON).map(t => t.id)).toEqual(['invites']);
  });
  test('a loop is refused in words; a repeating task is not waited for; [] clears', () => {
    let r = add(add(add(emptyTasks(), 'a', {title: 'A'}), 'b', {title: 'B'}), 'c', {title: 'C', due: MON, recur: {every: 'week', interval: 1}});
    r = editTask(editTask(r, 'b', {after: ['a']}, MON), 'c', {}, MON);
    expect(() => editTask(r, 'a', {after: ['b']}, MON)).toThrow(WAIT_LOOP_MESSAGE);
    r = editTask(r, 'a', {after: ['c']}, MON);
    expect(waitingFor(r, task(r, 'a'))).toEqual([]);
    expect(editTask(r, 'b', {after: []}, MON).tasks.find(t => t.id === 'b')!.after).toBeUndefined();
  });
});

describe('a repeat that floats in its week or month (LEDGER #305)', () => {
  test('its window and words; written so an older build reads a fixed repeat', () => {
    expect(windowEnd('week', '2026-11-25')).toBe('2026-11-29'); expect(windowEnd('week', '2026-11-29')).toBe('2026-11-29');
    expect(windowStart('week', '2026-11-29')).toBe(MON);
    expect(windowEnd('month', '2026-02-10')).toBe('2026-02-28'); expect(windowStart('month', '2026-02-10')).toBe('2026-02-01');
    expect(flexRule('week')).toEqual({every: 'week', weekdays: [0], interval: 1, flex: 'week'});
    expect(flexRule('month', 'once a month')).toEqual({every: 'month', monthDay: -1, interval: 1, flex: 'month', text: 'once a month'});
    expect(describeRecur(flexRule('week'))).toBe('Once a week, any day');
  });
  test('done early or on time: the next window; a missed week is one overdue task, and the next keeps its own week', () => {
    const rule = flexRule('week');
    expect(nextOccurrence(rule, '2026-11-25', '2026-11-25', '2026-11-25')!.due).toBe('2026-12-06');
    expect(nextOccurrence(rule, '2026-11-29', '2026-11-29', '2026-11-29')!.due).toBe('2026-12-06');
    // Due on 15 Nov, finished on 25 Nov: the weeks past are skipped, this week's comes next (one, never a pile).
    expect(nextOccurrence(rule, '2026-11-15', '2026-11-25', '2026-11-25')!.due).toBe('2026-11-29');
    expect(nextOccurrence(flexRule('month'), '2026-11-12', '2026-11-12', '2026-11-12')!.due).toBe('2026-12-31');
    let r = add(emptyTasks(), 'p', {title: 'Fictional plants', due: '2026-11-29', recur: rule});
    r = finishTask(r, 'p', new Date('2026-11-25T10:00:00Z'), {today: '2026-11-25', doneDay: '2026-11-25'});
    expect(task(r, 'p').due).toBe('2026-12-06');
  });
});

describe('Plan my week (LEDGER #300)', () => {
  const plan = setWeekdayHours(emptyTaskPlan(), [0, 6], []);
  test('the earliest deadline first, then priority; never before its own day; never after its deadline', () => {
    let r = add(emptyTasks(), 'late', {title: 'Fictional no deadline', minutes: 60, level: 1});
    r = add(r, 'soon', {title: 'Fictional deadline Wed', minutes: 60, level: 4, deadline: '2026-11-25'});
    r = add(r, 'fri', {title: 'Fictional on Friday', minutes: 60, due: '2026-11-27'});
    r = add(r, 'early', {title: 'Fictional early', minutes: 60, due: '2026-12-10'});
    r = editTask(r, 'early', {early: 14}, MON);
    r = add(r, 'beyond', {title: 'Fictional later', minutes: 60, due: '2026-12-10'});
    r = add(r, 'none', {title: 'Fictional no minutes'});
    expect(weekCandidates(r, MON, '08:00').map(t => t.id)).toEqual(['soon', 'late', 'fri', 'early']);
    const week = fitWeek({record: r, plan, today: MON, clock: '08:00'});
    expect(week.days).toHaveLength(7);
    expect(week.placed.map(p => [p.task.id, p.day, p.start])).toEqual([['soon', MON, '09:00'], ['late', MON, '10:00'], ['early', '2026-11-26', '09:00'], ['fri', '2026-11-27', '09:00']]);
    expect(taskSpan(task(r, 'beyond'), MON, '2026-11-29')).toBeNull();
  });
  test('a deadline that leaves no room is said; a task in pieces spreads over days; waits, background tasks and fixed repeats stay', () => {
    const tight = setWeekdayHours(emptyTaskPlan(), [0, 1, 2, 3, 4, 5, 6], [{from: '09:00', to: '11:00'}]);
    let r = add(emptyTasks(), 'big', {title: 'Fictional big', minutes: 300, deadline: '2026-11-24'});
    r = add(r, 'thesis', {title: 'Fictional thesis', minutes: 240});
    r = editTask(r, 'thesis', {chunk: 90}, MON);
    r = add(r, 'wait', {title: 'Fictional waits', minutes: 30}); r = editTask(r, 'wait', {after: ['thesis']}, MON);
    r = add(r, 'bg', {title: 'Fictional wash', minutes: 30}); r = editTask(r, 'bg', {parallel: true}, MON);
    r = add(r, 'weekly', {title: 'Fictional weekly', minutes: 30, due: MON, recur: {every: 'week', interval: 1}});
    const week = fitWeek({record: r, plan: tight, today: MON, clock: '08:00'});
    expect(week.left).toEqual([{task: task(r, 'big'), why: 'deadline', placed: 0, of: 1, by: '2026-11-24'}]);
    expect(week.placed.map(p => [p.day, p.start, p.end, p.part, p.of])).toEqual([[MON, '09:00', '10:30', 1, 3], ['2026-11-24', '09:00', '10:30', 2, 3], ['2026-11-25', '09:00', '10:00', 3, 3]]);
  });
  test('around timed tasks and imported events; today from now; a floating repeat inside its week; "after hours" in the evening', () => {
    let r = add(emptyTasks(), 'fixed', {title: 'Fictional dentist', due: MON, time: '13:00', minutes: 60});
    r = add(r, 'a', {title: 'Fictional A', minutes: 120});
    r = add(r, 'flex', {title: 'Fictional plants', minutes: 30, due: '2026-11-29', recur: flexRule('week')});
    r = add(r, 'eve', {title: 'Fictional guitar', minutes: 45}); r = editTask(r, 'eve', {afterHours: true}, MON);
    const week = fitWeek({record: r, plan, today: MON, clock: '11:10', extra: d => d === MON ? [{start: 720, end: 750, title: 'lunch'}] : []});
    expect(week.placed.map(p => [p.task.id, p.day, p.start, p.end])).toEqual([['a', MON, '14:00', '16:00'], ['flex', MON, '11:15', '11:45'], ['eve', MON, '20:00', '20:45']].sort((x, y) => x[2]!.localeCompare(y[2]!)));
  });
  test('kept placements are the tasks’ day and time (the first kept piece); Undo is the caller’s', () => {
    let r = add(emptyTasks(), 'thesis', {title: 'Fictional thesis', minutes: 180}); r = editTask(r, 'thesis', {chunk: 60}, MON);
    r = add(r, 'b', {title: 'Fictional B', minutes: 30});
    const week = fitWeek({record: r, plan, today: MON, clock: '08:00'});
    const kept = keepPlacements(r, week.placed.filter(p => p.part !== 1), MON);
    expect(task(kept, 'thesis')).toMatchObject({due: MON, time: week.placed.find(p => p.part === 2)!.start});
    expect(task(kept, 'b')).toMatchObject({due: MON});
    expect(tasksSchema.parse(kept)).toEqual(kept);
  });
});

describe('a deadline at risk (LEDGER #302)', () => {
  test('the minutes due by a deadline against the free hours until it, as a fact; nothing when they fit', () => {
    const plan = setWeekdayHours(emptyTaskPlan(), [0, 1, 2, 3, 4, 5, 6], [{from: '09:00', to: '10:00'}]);
    let r = add(emptyTasks(), 'a', {title: 'Fictional report', minutes: 90, deadline: '2026-11-24'});
    r = add(r, 'b', {title: 'Fictional slides', minutes: 60, deadline: '2026-11-24'});
    r = add(r, 'c', {title: 'Fictional no length', deadline: '2026-11-24'});
    const risk = deadlineAtRisk({record: r, plan, today: MON, clock: '08:00'});
    expect(risk).toMatchObject({deadline: '2026-11-24', need: 150, free: 120, unsized: 1});
    expect(risk!.tasks.map(t => t.id)).toEqual(['a', 'b']);
    expect(deadlineAtRisk({record: editTask(r, 'b', {spent: 40}, MON), plan, today: MON, clock: '08:00'})).toBeNull();
    expect(deadlineAtRisk({record: r, plan: emptyTaskPlan(), today: MON, clock: '08:00'})).toBeNull();
  });
});
