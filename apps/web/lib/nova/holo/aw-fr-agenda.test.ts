import {describe, expect, it} from 'vitest';
import {dayCounts, nextItems, type ClockInput} from './agenda';
import {taskAgendaItems} from '../../agenda/time-items';
import {tasksSchema} from '../../tasks/schema';

/**
 * Session AW (fr-answers, FR-AW-19; Max's walk): NOVA's agenda clock listed the overdue timed task "Book physio
 * appointment" (due Tue 1 Dec at 09:30, carried to Thu) as "any time". An overdue task says so, with its own time; it is
 * not counted as "any time", and nothing else on the clock moves.
 */
const item = (id: string, time: string | null, extra: Partial<ClockInput> = {}): ClockInput => ({id, source: 'task', pillar: 'life', title: id, time, href: null, state: 'open', ...extra});
describe('an overdue task on the clock', () => {
  it('the agenda item carries since when and its own time; it stays off today\'s dial', () => {
    const tasks = tasksSchema.parse({version: 1, tasks: [{id: 'physio', title: 'Book physio appointment', due: '2026-12-01', time: '09:30', priority: 'normal', createdAt: '2026-11-30T08:00:00.000Z', updatedAt: '2026-11-30T08:00:00.000Z'}]});
    const [i] = taskAgendaItems(tasks, '2026-12-03', '2026-12-03', '2026-12-03', d => d.slice(0, 10));
    expect(i).toMatchObject({date: '2026-12-03', time: null, overdueSince: '2026-12-01', overdueTime: '09:30', state: 'open'});
  });
  it('nextItems says "overdue" with the task\'s time; the coming and untimed items keep their words and order', () => {
    const items = [item('walk', '14:00'), item('physio', null, {overdue: {since: '2026-12-01', time: '09:30'}}), item('anytime', null), item('read', '19:00')];
    expect(nextItems(items, '13:30', 4).map(i => [i.id, i.time, i.when])).toEqual([['walk', '14:00', 'next'], ['read', '19:00', 'later'], ['physio', '09:30', 'overdue'], ['anytime', null, 'anytime']]);
    expect(dayCounts(items)).toEqual({total: 4, done: 0, timed: 2, anytime: 1});
    expect(nextItems([item('form', null, {overdue: {since: '2026-12-01', time: null}})], '08:00')[0]).toMatchObject({time: null, when: 'overdue'});
  });
});
