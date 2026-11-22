import {describe, expect, it} from 'vitest';
import {addTask, lateCount} from '../tasks/engine';
import {holdProject, resumeProject} from '../tasks/project-states';
import {reminderInstants} from '../tasks/reminders';
import {tasksSchema, type Tasks} from '../tasks/schema';
import {instantAt} from '../zone-time';

/**
 * Session AV lane 2 (r6-plan, LEDGER #392; OmniFocus's On Hold; TIER 3 (PWA)): what lib/notify/sync.ts reads for task wakes
 * and the "Plan your day · N overdue" count. A task of a project on hold has no reminder while the hold lasts (from its
 * resume day, or after Resume now, as before) and is not counted overdue. Only fewer wakes, never a new one.
 */
const ZONE = 'Europe/Amsterdam', TODAY = '2026-11-23', at = new Date('2026-11-20T08:00:00Z');
const add = (r: Tasks, id: string, input: Parameters<typeof addTask>[1]) => addTask(r, input, {id, at, today: TODAY, allowPast: true});
const base = () => tasksSchema.parse({version: 1, tasks: [], projects: [{id: 'p_house', name: 'Fictional house', colour: 'teal', order: 0}]});
const r0 = add(add(add(base(), 'a', {title: 'Fictional gutters', due: TODAY, time: '10:00', projectId: 'p_house', reminders: [{before: 0}]}),
  'b', {title: 'Fictional paint', due: '2026-12-08', time: '10:00', projectId: 'p_house', reminders: [{before: 0}]}),
  'c', {title: 'Fictional old', due: '2026-11-18', projectId: 'p_house'});
describe('a project on hold (LEDGER #392)', () => {
  it('no reminder before its resume day; the ones from that day stay; Resume now brings them all back', () => {
    const held = holdProject(r0, 'p_house', TODAY, '2026-12-07');
    expect(reminderInstants(held, ZONE).map(r => r.task.id)).toEqual(['b']);
    expect(reminderInstants(holdProject(r0, 'p_house', TODAY), ZONE)).toEqual([]);
    expect(reminderInstants(resumeProject(held, 'p_house'), ZONE).map(r => [r.task.id, r.at])).toEqual([['a', instantAt(TODAY, '10:00', ZONE)], ['b', instantAt('2026-12-08', '10:00', ZONE)]]);
  });
  it('the overdue count leaves it out while held, and counts it again after', () => {
    const held = holdProject(r0, 'p_house', TODAY, '2026-12-07');
    expect(lateCount(r0, TODAY)).toBe(1);
    expect(lateCount(held, TODAY)).toBe(0);
    expect(lateCount(held, '2026-12-07')).toBe(2);
  });
});
