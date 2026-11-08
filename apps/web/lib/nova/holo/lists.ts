import {noteName, type Notes} from '../../notes/schema';
import {inboxOf} from '../../notes/store';
import {openTasks, taskCounts, tasksOnDay} from '../../tasks/engine';
import type {Task, Tasks} from '../../tasks/schema';

/**
 * Session AL Part 11 (lane L8): the Tasks and Notes panels' figures, from their own engines.
 * - Tasks: the counters the left panel and the Tasks page count (lib/tasks/engine.ts taskCounts: overdue, due today,
 *   open) and today's queue as the Agenda's day view has it (tasksOnDay: due today and the overdue ones carried over),
 *   the open ones first.
 * - Notes: the newest captures (every kind, newest first by creation) and how many wait in the inbox.
 */
export type TasksHud = {overdue: number; today: number; open: number; queue: Task[]; total: number};
export function tasksHud(record: Tasks, today: string, doneDay: (iso: string) => string, queue = 4, nowClock?: string): TasksHud {
  const c = taskCounts(record, today, nowClock); // Release review AL (RR-8): late today counts as overdue, as on Tasks
  const day = tasksOnDay(record, today, today, doneDay).filter(t => !t.doneAt);
  const rest = day.length < queue ? openTasks(record, today).filter(t => !day.some(d => d.id === t.id) && !t.due).slice(0, queue - day.length) : [];
  return {...c, queue: [...day, ...rest].slice(0, queue), total: record.tasks.length};
}
export type NoteLine = {id: string; name: string; at: string; kind: string};
export function recentNotes(record: Notes, count = 3): {recent: NoteLine[]; inbox: number; total: number} {
  const recent = [...record.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, count).map(n => ({id: n.id, name: noteName(n), at: n.createdAt, kind: n.kind}));
  return {recent, inbox: inboxOf(record).length, total: record.notes.length};
}
