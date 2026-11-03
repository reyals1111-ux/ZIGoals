import {addLocalDays} from '../local-date';
import {goalKeyOf} from './engine';
import {tasksSchema, type Tasks} from './schema';

/**
 * Session AK (T1): the Showcase's fictional tasks, for lib/showcase-data.ts to write under `zigoals:tasks:v1`
 * (TASKS_KEY). Deterministic for a day; every title starts "Example · ". Two are next actions of the Showcase's first
 * two goals when their ids are passed (the platform record's `goals[].id`), so a goal page shows its next actions; one
 * is overdue (carried to today on the Agenda), one has a time (it sits among the habits), one has no day (Tasks page
 * only) and one was finished yesterday. Never written outside the Showcase.
 */
export function showcaseTasks(day: string, goalIds: readonly string[] = []): Tasks {
  const at = (offset: number) => `${addLocalDays(day, offset)}T08:00:00.000Z`;
  const goal = (i: number) => goalIds[i] ? {goal: goalKeyOf(goalIds[i]!)} : {};
  return tasksSchema.parse({version: 1, tasks: [
    {id: 'task_showcase-01', title: 'Example · Book the dentist', priority: 'high', due: day, time: '10:30', createdAt: at(-3)},
    {id: 'task_showcase-02', title: 'Example · Compare two savings accounts', priority: 'normal', due: addLocalDays(day, 2), createdAt: at(-2), ...goal(0)},
    {id: 'task_showcase-03', title: 'Example · Sketch the garden bed', priority: 'normal', due: addLocalDays(day, -1), createdAt: at(-5), ...goal(1)},
    {id: 'task_showcase-04', title: 'Example · Draft the trip budget', priority: 'low', due: addLocalDays(day, 5), createdAt: at(-1), ...goal(0)},
    {id: 'task_showcase-05', title: 'Example · Sort the photo folder', priority: 'low', createdAt: at(-6)},
    {id: 'task_showcase-06', title: 'Example · Renew the library card', priority: 'normal', due: addLocalDays(day, -1), createdAt: at(-4), doneAt: `${addLocalDays(day, -1)}T16:00:00.000Z`},
  ]});
}
