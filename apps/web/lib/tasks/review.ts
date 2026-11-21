import {completedLog, taskState} from './engine';
import type {Task, Tasks} from './schema';

/**
 * Session AL fourth pass (N-PR-08): Tasks in the Life review. For a window of local days (the review's week or month):
 * what was finished in it (finished tasks and the past times of repeating ones), what was added, and what is open now
 * (overdue apart), with the period before for comparison. Pure; `doneDay` turns a finish time into the app's local day.
 */
export type TasksReview = {finished: number; before: number; added: number; open: number; overdue: number; titles: string[]};
export function tasksReview(record: Tasks, window: {start: string; end: string; prevStart: string; prevEnd: string}, today: string, doneDay: (iso: string) => string): TasksReview {
  const log = completedLog(record).map(e => ({...e, day: doneDay(e.at)}));
  const inWindow = log.filter(e => e.day >= window.start && e.day <= window.end);
  const before = log.filter(e => e.day >= window.prevStart && e.day <= window.prevEnd).length;
  const added = record.tasks.filter(t => { const d = doneDay(t.createdAt); return d >= window.start && d <= window.end; }).length;
  const open: Task[] = record.tasks.filter(t => !t.doneAt);
  const titles = [...new Set(inWindow.map(e => e.task.title))].slice(0, 5);
  return {finished: inWindow.length, before, added, open: open.length, overdue: open.filter(t => taskState(t, today) === 'overdue').length, titles};
}
/**
 * Session AV (1c, q1 #12, fresh-agent review; Sunsama's weekly planning pulls tasks into the week): the open top-level
 * tasks the weekly review asks about — past their day, or due before `before` (the Monday after the week) — oldest day
 * first, at most `limit`; `more` counts the rest. Pure.
 */
export function reviewTaskChoices(record: Tasks, before: string, limit = 8): {items: Task[]; more: number} {
  const open = record.tasks.filter(t => !t.doneAt && !t.parentId && t.due && t.due < before).sort((a, b) => a.due!.localeCompare(b.due!) || (a.time ?? '').localeCompare(b.time ?? '') || a.title.localeCompare(b.title));
  return {items: open.slice(0, limit), more: Math.max(0, open.length - limit)};
}
