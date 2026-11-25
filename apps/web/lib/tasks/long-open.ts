import {addLocalDays} from '../local-date';
import {editTask, removeTask} from './engine';
import type {Task, Tasks} from './schema';

/**
 * Session AW (X2, LEDGER #434; Amazing Marvin's "tasks that have been open a long time"): in Tasks → Review, the open
 * top-level one-off tasks that have not changed for 60 days or more (or 90), the longest unchanged first — each with Keep
 * (it stays as it is and is asked about again in that many days), Give it a day and Remove, each one change with its Undo.
 * Derived from `updatedAt` (its last change) or else `createdAt`; Keep is a normal write that touches `updatedAt`, so
 * nothing new is stored. A repeating task moves by itself and is never asked about. Pure.
 */
export const LONG_OPEN_DAYS = [60, 90] as const;
export type LongOpenDays = (typeof LONG_OPEN_DAYS)[number];
/** The day of the task's last change on this device's calendar. */
export const lastChangeDay = (t: Pick<Task, 'updatedAt' | 'createdAt'>, dayOf: (iso: string) => string) => dayOf(t.updatedAt ?? t.createdAt);
/** Whole days since the task last changed (0 on the day itself). */
export function daysUnchanged(t: Pick<Task, 'updatedAt' | 'createdAt'>, today: string, dayOf: (iso: string) => string): number {
  const from = Date.parse(`${lastChangeDay(t, dayOf)}T12:00:00Z`), to = Date.parse(`${today}T12:00:00Z`);
  return Number.isFinite(from) && Number.isFinite(to) ? Math.max(0, Math.round((to - from) / 86_400_000)) : 0;
}
export function longOpen(record: Pick<Tasks, 'tasks'>, today: string, days: number = 60, dayOf: (iso: string) => string = iso => iso.slice(0, 10)): {items: Task[]; more: number; all: number} {
  const before = addLocalDays(today, -days);
  const all = record.tasks.filter(t => !t.doneAt && !t.parentId && !t.recur && lastChangeDay(t, dayOf) <= before)
    .sort((a, b) => (a.updatedAt ?? a.createdAt).localeCompare(b.updatedAt ?? b.createdAt) || a.title.localeCompare(b.title));
  return {items: all.slice(0, 8), more: Math.max(0, all.length - 8), all: all.length};
}
/** Keep: the task as it is, its last change now (so it comes back after the same days). */
export const keepOpen = (record: Tasks, id: string, today: string, at = new Date()): Tasks => editTask(record, id, {}, today, {allowPast: true, at});
/** Give it a day (today or later). */
export const giveDay = (record: Tasks, id: string, day: string, today: string, at = new Date()): Tasks => editTask(record, id, {due: day}, today, {at});
/** Remove (with its subtasks; Undo puts them back). */
export const removeLongOpen = (record: Tasks, id: string): Tasks => removeTask(record, id);
/** "Open for 3 months", "Open for 64 days": how the row says it. */
export function openForWords(n: number): string {
  if (n >= 365) { const y = Math.floor(n / 365); return `Unchanged for over ${y === 1 ? 'a year' : `${y} years`}`; }
  if (n >= 90) return `Unchanged for about ${Math.round(n / 30)} months`;
  return `Unchanged for ${n} days`;
}
