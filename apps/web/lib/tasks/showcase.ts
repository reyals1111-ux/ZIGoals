import {addLocalDays} from '../local-date';
import {goalKeyOf} from './engine';
import {tasksSchema, type Tasks} from './schema';
import {taskPlanSchema, type TaskPlan} from './plan-record';
import {taskWhenSchema, type TaskWhen} from './when';

/**
 * Session AK (T1): the Showcase's fictional tasks, for lib/showcase-data.ts to write under `zigoals:tasks:v1`
 * (TASKS_KEY). Deterministic for a day; every title starts "Example · ". Two are next actions of the Showcase's first
 * two goals when their ids are passed (the platform record's `goals[].id`), so a goal page shows its next actions; one
 * is overdue (carried to today on the Agenda), one has a time (it sits among the habits), one has no day (Tasks page
 * only) and one was finished yesterday. Session AV (F-DEADLINES): the trip budget, planned in five days, has a deadline in
 * eight (far enough that the Showcase's Today stays as it was); Session AV (F-TASK-MINUTES): the dentist call takes 15
 * minutes, so Tasks → Today shows the day's load. Session AW (X2, LEDGER #432–#434, #437; Amazing Marvin): the garden bed
 * is marked as dreaded ("quite a bit") and was moved three times; the photo folder has sat unchanged for 75 days (Tasks →
 * Review's "Open a long time"); the savings comparison carries @admin, the label of the Showcase's time target
 * (showcaseTaskPlan). Never written outside the Showcase.
 */
export function showcaseTasks(day: string, goalIds: readonly string[] = []): Tasks {
  const at = (offset: number) => `${addLocalDays(day, offset)}T08:00:00.000Z`;
  const goal = (i: number) => goalIds[i] ? {goal: goalKeyOf(goalIds[i]!)} : {};
  return tasksSchema.parse({version: 1, tasks: [
    {id: 'task_showcase-01', title: 'Example · Book the dentist', priority: 'high', due: day, time: '10:30', minutes: 15, createdAt: at(-3)},
    {id: 'task_showcase-02', title: 'Example · Compare two savings accounts', priority: 'normal', due: addLocalDays(day, 2), createdAt: at(-2), labels: ['admin'], ...goal(0)},
    {id: 'task_showcase-03', title: 'Example · Sketch the garden bed', priority: 'normal', due: addLocalDays(day, -1), createdAt: at(-5), dread: 2, moved: 3, ...goal(1)},
    {id: 'task_showcase-04', title: 'Example · Draft the trip budget', priority: 'low', due: addLocalDays(day, 5), deadline: addLocalDays(day, 8), createdAt: at(-1), ...goal(0)},
    {id: 'task_showcase-05', title: 'Example · Sort the photo folder', priority: 'low', createdAt: at(-75)},
    {id: 'task_showcase-06', title: 'Example · Renew the library card', priority: 'normal', due: addLocalDays(day, -1), createdAt: at(-4), doneAt: `${addLocalDays(day, -1)}T16:00:00.000Z`},
  ]});
}
/**
 * Session AM-2 (step 3, "NOVA connected"): the Showcase's "This evening" and "Someday" (`zigoals:task-when:v1`, in the
 * Showcase tab's own storage only), on two of the fictional tasks above: the dentist call is on tonight's list (for this
 * day only), and the photo folder, which has no day, is set aside in Someday.
 */
export function showcaseTaskWhen(day: string): TaskWhen {
  return taskWhenSchema.parse({version: 1, tasks: {'task_showcase-01': {evening: day}, 'task_showcase-05': {someday: true}}});
}
/**
 * Session AW (X2, LEDGER #437; Amazing Marvin's time targets): the Showcase's planning record (`zigoals:task-plan:v1`, the
 * Showcase tab's own storage only) holds one fictional time target — 3 h a week on @admin, met from the Pomodoro blocks of
 * "Example · Compare two savings accounts" (lib/focus-sessions/showcase.ts). Nothing else is set, so every other planning
 * choice reads as unset, as before.
 */
export function showcaseTaskPlan(): TaskPlan {
  return taskPlanSchema.parse({version: 1, timeTargets: [{id: 'tt_showcase-admin', kind: 'label', of: 'admin', minutes: 180, per: 'week'}]});
}
