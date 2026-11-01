import {addLocalDays} from '../local-date';
import {MAX_TASKS, DONE_KEEP_DAYS, TASK_CLOCK, taskSchema, tasksSchema, type Task, type TaskPriority, type Tasks} from './schema';

/** Session AI (tasks): add, finish, reopen and remove, and the open list in the order Today shows it. Pure. */
export const TASK_LIMIT_MESSAGE = `You have ${MAX_TASKS} tasks, the most kept. Finish or remove one first.`;
export type TaskInput = {title: string; priority?: TaskPriority; due?: string; goal?: string; time?: string};
export function addTask(record: Tasks, input: TaskInput, options: {id: string; at: Date; today: string}): Tasks {
  const title = input.title.trim();
  if (!title) throw new Error('Give the task a few words.');
  if (input.due && input.due < options.today) throw new Error('Choose today or a later day for when it is due.');
  // Session AK (T1): a time belongs to a day; a time with no day is refused rather than guessed.
  if (input.time && !input.due) throw new Error('Choose a day for the task before a time.');
  if (input.time && !TASK_CLOCK.test(input.time)) throw new Error('Choose a time such as 09:30.');
  const kept = prune(record, options.today);
  if (kept.tasks.length >= MAX_TASKS) throw new Error(TASK_LIMIT_MESSAGE);
  const task = taskSchema.parse({id: options.id, title, priority: input.priority ?? 'normal', ...(input.due ? {due: input.due} : {}), ...(input.time ? {time: input.time} : {}), ...(input.goal ? {goal: input.goal} : {}), createdAt: options.at.toISOString()});
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

/* ---- Session AK (T1): edits, goal next actions and the tasks of a day ------------------------------------------- */

/**
 * Changes a task's title, priority, day, time or goal. `null` clears an optional field; a field left out is kept. A day
 * may be moved earlier than today only when it already was (an overdue task keeps its day until the person moves it).
 */
export function editTask(record: Tasks, id: string, patch: {title?: string; priority?: TaskPriority; due?: string | null; time?: string | null; goal?: string | null}, today: string): Tasks {
  const task = record.tasks.find(t => t.id === id);
  if (!task) throw new Error('That task is no longer on this device.');
  const next: Record<string, unknown> = {...task};
  if (patch.title !== undefined) { const title = patch.title.trim(); if (!title) throw new Error('Give the task a few words.'); next.title = title; }
  if (patch.priority !== undefined) next.priority = patch.priority;
  for (const key of ['due', 'time', 'goal'] as const) { const value = patch[key]; if (value === null || value === '') delete next[key]; else if (value !== undefined) next[key] = value; }
  if (typeof next.due === 'string' && next.due !== task.due && next.due < today) throw new Error('Choose today or a later day for when it is due.');
  if (next.time !== undefined && !next.due) throw new Error('Choose a day for the task before a time.');
  if (typeof next.time === 'string' && !TASK_CLOCK.test(next.time)) throw new Error('Choose a time such as 09:30.');
  const parsed = taskSchema.parse(next);
  return tasksSchema.parse({...record, tasks: record.tasks.map(t => t.id === id ? parsed : t)});
}

/** The stored form of a goal link: the goal's key as the goal lists name it (`private:<id>` for a goal on this device). */
export const goalKeyOf = (goalId: string) => goalId.startsWith('private:') || goalId.startsWith('legacy:') ? goalId : `private:${goalId}`;
/** Whether a task serves a goal (its key, or the bare id an earlier writer may have kept). */
export const servesGoal = (task: Task, goalId: string) => !!task.goal && (task.goal === goalKeyOf(goalId) || task.goal === goalId || goalKeyOf(task.goal) === goalKeyOf(goalId));
/** A goal's next actions: its open tasks in the open list's order. */
export const goalNextActions = (record: Tasks, goalId: string, today: string): Task[] => openTasks(record, today).filter(t => servesGoal(t, goalId));

/**
 * The tasks a day shows (the Agenda and NOVA): open tasks due that day; on today also every overdue open task (it is
 * still to do, so it is carried to today rather than left on a past day); and a finished task on its due day, or on
 * the day it was finished when that came after its due day (`doneDay` reads that day from the finish time). Tasks with
 * no day ("someday") are on the Tasks page, never on a calendar day. Order: the open list's, then finished ones.
 */
export function tasksOnDay(record: Tasks, day: string, today: string, doneDay: (iso: string) => string): Task[] {
  const open = openTasks(record, today).filter(t => t.due && ((t.due === day && t.due >= today) || (day === today && t.due < today)));
  const done = record.tasks.filter(t => t.doneAt && t.due && shownDoneOn(t, doneDay) === day).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '') || a.doneAt!.localeCompare(b.doneAt!));
  return [...open, ...done];
}
/** The day a finished task shows on: its due day, or the day it was finished when that was later. */
export function shownDoneOn(task: Task, doneDay: (iso: string) => string): string | null {
  if (!task.doneAt || !task.due) return null;
  const finished = doneDay(task.doneAt);
  return finished > task.due ? finished : task.due;
}
/** Counts for a header line: open, overdue and due today. */
export function taskCounts(record: Tasks, today: string): {open: number; overdue: number; today: number} {
  const open = record.tasks.filter(t => !t.doneAt);
  return {open: open.length, overdue: open.filter(t => taskState(t, today) === 'overdue').length, today: open.filter(t => taskState(t, today) === 'today').length};
}
/** Recently finished tasks (kept 30 days), newest first. */
export const doneTasks = (record: Tasks): Task[] => record.tasks.filter(t => t.doneAt).sort((a, b) => b.doneAt!.localeCompare(a.doneAt!));
