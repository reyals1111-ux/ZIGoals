import {describe, expect, test} from 'vitest';
import {addTask, finishTask, isLate, skipOccurrence, taskState, viewTasks} from './engine';
import {emptyTaskPlan} from './plan-record';
import {fitWeek, keepPlacements, weekCandidates} from './plan-week';
import {flexRule} from './recurrence';
import {emptyTasks, type Tasks} from './schema';
import {setWeekdayHours} from './work-hours';
import {taskAgendaItems} from '../agenda/time-items';
import {taskTimelineItems} from './timeline-source';

/** Session AV lane 2 (r4-plan): the fixes of batch 4 review D (B4D-2, B4D-3, B4D-6, B4D-7). */
const MON = '2026-11-23', WED = '2026-11-25', THU = '2026-11-26', SUN = '2026-11-29', at = new Date(`${MON}T07:00:00Z`);
const plants = (): Tasks => addTask(emptyTasks(), {title: 'Fictional plants', minutes: 30, due: SUN, recur: flexRule('week', 'once a week')}, {id: 'p', at, today: MON});
const p = (r: Tasks) => r.tasks.find(t => t.id === 'p')!;
const day = (iso: string) => iso.slice(0, 10);
const taskItems = (r: Tasks, today: string) => ({overdueSince: taskAgendaItems(r, today, today, today, day)[0]?.overdueSince, label: taskTimelineItems(r, today, today, day)[0]?.label});

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
  test('the Agenda and the Day Timeline call it overdue only after its week', () => {
    let r = plants();
    r = keepPlacements(r, fitWeek({record: r, plan: weekdays, today: WED, clock: '08:00'}).placed, WED);
    expect(taskItems(r, THU)).toEqual({overdueSince: undefined, label: 'Task'});
    expect(taskItems(r, '2026-11-30')).toEqual({overdueSince: WED, label: 'Task · overdue'});
  });
});
