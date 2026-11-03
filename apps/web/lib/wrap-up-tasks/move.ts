import {addLocalDays} from '../local-date';
import {openTasks, taskState} from '../tasks/engine';
import {taskSchema, tasksSchema, type Task, type Tasks} from '../tasks/schema';

/**
 * Session AK (BUILD list 2 #14, lane G1a): "What's moving to tomorrow" in the evening wrap-up. The tasks still open on
 * the day (due that day, or earlier and still open) are listed once each, in the task list's own order, with two choices:
 * move it to tomorrow, or let it go (it keeps its place in Tasks, without a day). No word of "missed", no count, no
 * streak; the Checklist is not touched. Pure steps on `zigoals:tasks:v1`; each returns the record to write.
 */
export function wrapUpTasks(rec: Tasks, today: string): Task[] {
  return openTasks(rec, today).filter(t => { const s = taskState(t, today); return s === 'today' || s === 'overdue'; });
}
const replace = (rec: Tasks, id: string, change: (t: Task) => Record<string, unknown>): Tasks => {
  if (!rec.tasks.some(t => t.id === id)) throw new Error('That task is no longer on this device.');
  return tasksSchema.parse({...rec, tasks: rec.tasks.map(t => t.id === id ? taskSchema.parse(change(t)) : t)});
};
/** Moves a task's day to `tomorrow` (its time, priority and goal stay). */
export const moveTaskDue = (rec: Tasks, id: string, tomorrow: string): Tasks => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tomorrow)) throw new Error('That day cannot be used.');
  return replace(rec, id, t => ({...t, due: tomorrow}));
};
/** Lets a task go for now: it stays in Tasks with no day (and so no time). */
export const letTaskGo = (rec: Tasks, id: string): Tasks => replace(rec, id, t => { const {due: _d, time: _t, ...rest} = t; void _d; void _t; return rest; });
/** Undo: the task as it was before the move (only while it is still on this device). */
export const putTaskBack = (rec: Tasks, before: Task): Tasks => rec.tasks.some(t => t.id === before.id) ? replace(rec, before.id, () => ({...before})) : rec;
/** Tomorrow on the device's calendar, from the day the wrap-up is for. */
export const tomorrowOf = (today: string) => addLocalDays(today, 1);
