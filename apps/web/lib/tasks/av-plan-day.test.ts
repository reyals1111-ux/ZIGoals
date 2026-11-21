import {describe, expect, it} from 'vitest';
import {addTask} from './engine';
import {planSuggestions, plannedToday, PLAN_DAY_MAX} from './plan-day';
import {emptyTasks, type Tasks} from './schema';

/** Session AV (owner follow-up 1, F-PLAN-DAY; TickTick, Sunsama): what is worth a look when planning today. */
const at = new Date('2026-11-20T09:00:00Z');
const add = (r: Tasks, id: string, input: Parameters<typeof addTask>[1], today = '2026-11-20') => addTask(r, input, {id, at, today});
describe('Session AV (F-PLAN-DAY)', () => {
  it('offers overdue, a near deadline and priority 1–2 without a day, in that order, each with why', () => {
    let r = add(emptyTasks(), 'p', {title: 'Call the fictional bank', level: 1});
    r = add(r, 'd', {title: 'Send the fictional form', due: '2026-11-28', deadline: '2026-11-24'});
    r = add(r, 'o', {title: 'Water the fictional plants', due: '2026-11-21'});
    r = add(r, 't', {title: 'Already today', due: '2026-11-23'});
    r = add(r, 'n', {title: 'Plain, no day'});
    r = add(r, 'l', {title: 'Far deadline', deadline: '2026-12-20'});
    const s = planSuggestions(r, '2026-11-23');
    expect(s.map(x => [x.task.id, x.why, x.words])).toEqual([
      ['o', 'overdue', 'Was planned for Sat, Nov 21'], ['d', 'deadline', 'Deadline Tue, Nov 24'], ['p', 'priority', 'Priority 1, no day yet']]);
    expect(planSuggestions(r, '2026-11-23', new Set(['o'])).map(x => x.task.id)).toEqual(['d', 'p']);
    expect(plannedToday(r, '2026-11-23')).toBe(1);
  });
  it('leaves out subtasks and finished tasks, and keeps to five', () => {
    let r = emptyTasks();
    for (let i = 0; i < 8; i++) r = add(r, `x${i}`, {title: `Fictional ${i}`, level: 2});
    r = add(r, 'c', {title: 'A step', level: 1, parentId: 'x0'});
    expect(planSuggestions(r, '2026-11-23')).toHaveLength(PLAN_DAY_MAX);
    expect(planSuggestions(r, '2026-11-23').some(x => x.task.id === 'c')).toBe(false);
  });
});
