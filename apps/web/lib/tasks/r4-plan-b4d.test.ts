import {describe, expect, test} from 'vitest';
import {addTask, finishTask, isLate, lateCount, skipOccurrence, taskState, viewTasks} from './engine';
import {emptyTaskPlan, taskPlanSchema} from './plan-record';
import {fitWeek, keepPlacements, weekCandidates} from './plan-week';
import {flexRule} from './recurrence';
import {emptyTasks, type Tasks} from './schema';
import {DEFAULT_WORK, blockWords, hoursOn, hoursUntil, setWeekdayHours} from './work-hours';
import {formatClock} from '../visual-format';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fitDay} from './layouts';
import {taskAgendaItems} from '../agenda/time-items';
import {taskTimelineItems} from './timeline-source';

/** Session AV lane 2 (r4-plan): the fixes of batch 4 review D (B4D-2, B4D-3, B4D-6, B4D-7). */
const MON = '2026-11-23', WED = '2026-11-25', THU = '2026-11-26', SUN = '2026-11-29', at = new Date(`${MON}T07:00:00Z`);
const plants = (): Tasks => addTask(emptyTasks(), {title: 'Fictional plants', minutes: 30, due: SUN, recur: flexRule('week', 'once a week')}, {id: 'p', at, today: MON});
const p = (r: Tasks) => r.tasks.find(t => t.id === 'p')!;
const day = (iso: string) => iso.slice(0, 10);
const taskItems = (r: Tasks, today: string) => ({overdueSince: taskAgendaItems(r, today, today, today, day)[0]?.overdueSince, label: taskTimelineItems(r, today, today, day)[0]?.label});

describe('B4D-7: the usual hours are written through the app’s clock format', () => {
  test('blockWords uses formatClock; the hours form has no hard-coded clock words', () => {
    expect(blockWords(DEFAULT_WORK)).toBe(`${formatClock('09:00')}–${formatClock('18:00')}`);
    expect(blockWords([])).toBe('Day off');
    const form = readFileSync(join(__dirname, '..', '..', 'components', 'tasks', 'task-hours-settings.tsx'), 'utf8');
    expect(form).toContain('`The usual (${blockWords(DEFAULT_WORK)})`');
    expect(form).not.toMatch(/\d:\d\d (?:AM|PM)/);
  });
});

describe('B4D-6: a weekday whose blocks cannot be read keeps the usual hours', () => {
  test('unreadable blocks: the usual 09:00–18:00; a stored empty list: a day off; readable ones beside unreadable ones are kept', () => {
    const plan = taskPlanSchema.parse({version: 1, workHours: {days: {'1': [{from: '22:00', to: '02:00'}], '2': [], '3': [{from: '25:00', to: '26:00'}, {from: '10:00', to: '12:00'}]}}});
    expect(plan.workHours?.days).toEqual({'2': [], '3': [{from: '10:00', to: '12:00'}]});
    expect(hoursOn(plan, MON)).toEqual([{from: '09:00', to: '18:00'}]);
    expect(hoursOn(plan, '2026-11-24')).toEqual([]);
    expect(hoursOn(plan, WED)).toEqual([{from: '10:00', to: '12:00'}]);
  });
});

describe('B4D-3: “My day ends at” moves the end of the day’s last hours, later or earlier', () => {
  test('with the usual hours (none set) a later end places tasks past 18:00, as before round 4', () => {
    const r = addTask(addTask(emptyTasks(), {title: 'Fictional A', due: MON, minutes: 480}, {id: 'a', at, today: MON}), {title: 'Fictional B', due: MON, minutes: 120}, {id: 'b', at, today: MON});
    const hours = hoursOn(emptyTaskPlan(), MON);
    expect(hoursUntil(hours, '21:00')).toEqual([{from: '09:00', to: '21:00'}]);
    const fit = fitDay(r.tasks, [], {from: '09:00', until: '21:00', windows: hoursUntil(hours, '21:00')});
    expect(fit.placed.map(x => [x.task.id, x.start, x.end])).toEqual([['a', '09:00', '17:00'], ['b', '17:00', '19:00']]);
    expect(fitDay(r.tasks, [], {from: '09:00', until: '16:00', windows: hoursUntil(hours, '16:00')}).placed.map(x => [x.task.id, x.start, x.end])).toEqual([['b', '09:00', '11:00']]);
  });
  test('with working hours set: the last block is extended or shortened; an earlier block is cut; a later one is left out; a day off stays off', () => {
    const two = [{from: '09:00', to: '12:30'}, {from: '13:30', to: '17:00'}];
    expect(hoursUntil(two, '19:00')).toEqual([{from: '09:00', to: '12:30'}, {from: '13:30', to: '19:00'}]);
    expect(hoursUntil(two, '15:00')).toEqual([{from: '09:00', to: '12:30'}, {from: '13:30', to: '15:00'}]);
    expect(hoursUntil(two, '13:00')).toEqual([{from: '09:00', to: '12:30'}]);
    expect(hoursUntil(two, '11:00')).toEqual([{from: '09:00', to: '11:00'}]);
    expect(hoursUntil([], '21:00')).toEqual([]);
  });
});

describe('B4D-2: a floating repeat keeps floating after a Keep', () => {
  const weekdays = setWeekdayHours(setWeekdayHours(emptyTaskPlan(), [1, 2, 3, 4, 5], [{from: '09:00', to: '17:00'}]), [0, 6], []);
  test('kept on Wednesday at a time; done; next week’s copy has no time, is due by its Sunday, and Plan my week places it again on a working day', () => {
    let r = plants();
    const week = fitWeek({record: r, plan: weekdays, today: WED, clock: '08:00'});
    r = keepPlacements(r, week.placed, WED);
    expect(p(r)).toMatchObject({due: WED, time: '09:00'});
    r = finishTask(r, 'p', new Date(`${WED}T10:00:00Z`), {today: WED, doneDay: WED});
    expect(p(r).due).toBe('2026-12-06');
    expect(p(r).time).toBeUndefined();
    const next = fitWeek({record: r, plan: weekdays, today: '2026-11-30', clock: '08:00'});
    expect(next.placed.map(x => [x.task.id, x.day, x.start])).toEqual([['p', '2026-11-30', '09:00']]);
  });
  test('a planned day that passes is not late while its week runs; late only after it', () => {
    let r = plants();
    r = keepPlacements(r, fitWeek({record: r, plan: weekdays, today: WED, clock: '08:00'}).placed, WED);
    expect(taskState(p(r), THU, '08:00')).toBe('today');
    expect(taskState(p(r), WED, '12:00')).toBe('today');
    expect(isLate(p(r), SUN)).toBe(false);
    expect(isLate(p(r), '2026-11-30')).toBe(true);
    expect(taskState(p(r), '2026-11-30', '08:00')).toBe('overdue');
    expect(viewTasks(r, {kind: 'overdue'}, THU, '08:00')).toEqual([]);
    // Not done on Wednesday: Plan my week (and Plan my day) offer it again inside its week, never on the weekend's days off.
    expect(weekCandidates(r, THU, '08:00').map(t => t.id)).toEqual(['p']);
    expect(fitWeek({record: r, plan: weekdays, today: THU, clock: '08:00'}).placed.map(x => x.day)).toEqual([THU]);
    expect(fitWeek({record: r, plan: weekdays, today: '2026-11-28', clock: '08:00'}).placed).toEqual([]);
  });
  test('a fixed repeat keeps its time into the next one, as before; a skipped floating one floats again', () => {
    const fixed = addTask(emptyTasks(), {title: 'Fictional weekly call', due: MON, time: '10:00', recur: {every: 'week', interval: 1}}, {id: 'f', at, today: MON});
    expect(finishTask(fixed, 'f', at, {today: MON, doneDay: MON}).tasks[0]).toMatchObject({due: '2026-11-30', time: '10:00'});
    let r = plants();
    r = keepPlacements(r, fitWeek({record: r, plan: weekdays, today: WED, clock: '08:00'}).placed, WED);
    const skipped = skipOccurrence(r, 'p', WED);
    expect(p(skipped).due).toBe('2026-12-06'); expect(p(skipped).time).toBeUndefined();
  });
  test('TIER 3 (PWA): the "Plan your day" count leaves it out until its week has passed; other tasks count as before', () => {
    let r = plants();
    r = keepPlacements(r, fitWeek({record: r, plan: weekdays, today: WED, clock: '08:00'}).placed, WED);
    r = addTask(r, {title: 'Fictional late letter', due: MON}, {id: 'l', at, today: MON});
    expect(lateCount(r, THU)).toBe(1);
    expect(lateCount(r, '2026-11-30')).toBe(2);
    expect(lateCount(r, MON)).toBe(0);
  });
  test('the Agenda and the Day Timeline call it overdue only after its week', () => {
    let r = plants();
    r = keepPlacements(r, fitWeek({record: r, plan: weekdays, today: WED, clock: '08:00'}).placed, WED);
    expect(taskItems(r, THU)).toEqual({overdueSince: undefined, label: 'Task'});
    expect(taskItems(r, '2026-11-30')).toEqual({overdueSince: WED, label: 'Task · overdue'});
  });
});
