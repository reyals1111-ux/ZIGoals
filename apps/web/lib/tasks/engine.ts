import {addLocalDays} from '../local-date';
import {MAX_TASKS, DONE_KEEP_DAYS, taskSchema, tasksSchema, type Task, type TaskPriority, type Tasks} from './schema';

/** Session AI (tasks): add, finish, reopen and remove, and the open list in the order Today shows it. Pure. */
export const TASK_LIMIT_MESSAGE = `You have ${MAX_TASKS} tasks, the most kept. Finish or remove one first.`;
export function addTask(record: Tasks, input: {title: string; priority?: TaskPriority; due?: string; goal?: string}, options: {id: string; at: Date; today: string}): Tasks {
  const title = input.title.trim();
  if (!title) throw new Error('Give the task a few words.');
  if (input.due && input.due < options.today) throw new Error('Choose today or a later day for when it is due.');
  const kept = prune(record, options.today);
  if (kept.tasks.length >= MAX_TASKS) throw new Error(TASK_LIMIT_MESSAGE);
  const task = taskSchema.parse({id: options.id, title, priority: input.priority ?? 'normal', ...(input.due ? {due: input.due} : {}), ...(input.goal ? {goal: input.goal} : {}), createdAt: options.at.toISOString()});
  return tasksSchema.parse({...kept, tasks: [...kept.tasks, task]});
}
export const finishTask = (record: Tasks, id: string, at: Date): Tasks => tasksSchema.parse({...record, tasks: record.tasks.map(t => t.id === id ? {...t, doneAt: at.toISOString()} : t)});
export const reopenTask = (record: Tasks, id: string): Tasks => tasksSchema.parse({...record, tasks: record.tasks.map(t => { if (t.id !== id) return t; const {doneAt: _d, ...rest} = t; return rest; })});
export const removeTask = (record: Tasks, id: string): Tasks => ({...record, tasks: record.tasks.filter(t => t.id !== id)});
export const restoreTask = (record: Tasks, task: Task): Tasks => record.tasks.some(t => t.id === task.id) ? record : tasksSchema.parse({...record, tasks: [...record.tasks, task]});
/** Done tasks older than 30 days go. */
export function prune(record: Tasks, today: string): Tasks {
  const from = addLocalDays(today, -DONE_KEEP_DAYS);
  return {...record, tasks: record.tasks.filter(t => !t.doneAt || t.doneAt.slice(0, 10) >= from)};
}
const RANK: Record<TaskPriority, number> = {high: 0, normal: 1, low: 2};
export type TaskState = 'overdue' | 'today' | 'soon' | 'later' | 'someday';
export function taskState(task: Task, today: string): TaskState {
  if (!task.due) return 'someday';
  if (task.due < today) return 'overdue';
  if (task.due === today) return 'today';
  return task.due <= addLocalDays(today, 7) ? 'soon' : 'later';
}
/** Open tasks: overdue first, then due today, then by due day, then by priority, then the oldest. */
export function openTasks(record: Tasks, today: string): Task[] {
  const order: Record<TaskState, number> = {overdue: 0, today: 1, soon: 2, later: 3, someday: 4};
  return record.tasks.filter(t => !t.doneAt).sort((a, b) => order[taskState(a, today)] - order[taskState(b, today)] || (a.due ?? '9').localeCompare(b.due ?? '9') || RANK[a.priority] - RANK[b.priority] || a.createdAt.localeCompare(b.createdAt));
}
