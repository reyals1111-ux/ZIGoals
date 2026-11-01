import {openTasks, tasksOnDay} from '../../tasks/engine';
import type {Task, Tasks} from '../../tasks/schema';
import type {WidgetSize} from '../store';

/**
 * Session AK WA (T1/N2): what NOVA's "Tasks" widget shows (components/nova/widgets/tasks.tsx). Today's tasks as the
 * Agenda's day view has them (lib/tasks/engine.ts `tasksOnDay`: due today, overdue ones carried to today, and the ones
 * finished today), then the next actions of the person's goals (open tasks linked to a goal that are not on today's list,
 * in the open list's order). How many of each depends on the widget's size; the rest waits on the Tasks page. Pure.
 * - `empty`: no task on this device at all (a fresh start teaches);
 * - `clear`: tasks exist, but nothing is left to do today (said plainly, never as a zero count);
 * - `some`: at least one open task due today or carried over.
 */
export const TASKS_SHOWN: Readonly<Record<WidgetSize, {today: number; next: number}>> = {S: {today: 3, next: 0}, M: {today: 4, next: 2}, L: {today: 8, next: 4}};
export type TasksWidgetView = {state: 'empty' | 'clear' | 'some'; today: Task[]; moreToday: number; todo: number; carried: number; next: Task[]};
export function tasksWidgetView(record: Tasks, today: string, doneDay: (iso: string) => string, size: WidgetSize): TasksWidgetView {
  const shown = TASKS_SHOWN[size] ?? TASKS_SHOWN.M;
  const day = tasksOnDay(record, today, today, doneDay), onDay = new Set(day.map(t => t.id));
  const open = day.filter(t => !t.doneAt);
  const next = shown.next ? openTasks(record, today).filter(t => !!t.goal && !onDay.has(t.id)).slice(0, shown.next) : [];
  return {
    state: record.tasks.length === 0 ? 'empty' : open.length ? 'some' : 'clear',
    today: day.slice(0, shown.today), moreToday: Math.max(0, day.length - shown.today),
    todo: open.length, carried: open.filter(t => !!t.due && t.due < today).length, next,
  };
}
/** The widget's first line, in words: how much is left today, and how much of it was carried over. */
export function tasksHeadline(view: Pick<TasksWidgetView, 'state' | 'todo' | 'carried'>): string {
  if (view.state === 'empty') return 'No tasks yet.';
  if (!view.todo) return 'Nothing left to do today.';
  return `${view.todo} to do today${view.carried ? `, ${view.carried} carried over` : ''}.`;
}
