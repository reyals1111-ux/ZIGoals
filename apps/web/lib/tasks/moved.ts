import {MAX_MOVED, type Task, type Tasks} from './schema';

/**
 * Session AW (X2, LEDGER #433; Amazing Marvin's procrastination count, said calmly): how often a task's day was put off.
 * A move counts when a one-off task's day goes to a later day that is also after today — by hand (the editor, the Select
 * bar, a drag to another day) or by the evening wrap-up's "Move to tomorrow". It does not count when the task repeats (its
 * next day is the repeat's), for a snooze (that is a reminder, not the day), for a day moved earlier, for an overdue task
 * taken into today, for a task with no day given one, or for a finished task. The count is a fact, never a warning: the
 * row says "Moved 4 times", nothing is red and nothing counts against a day. Undo puts the count back with the task. Pure.
 */
export function countMove(before: Pick<Task, 'due' | 'recur' | 'doneAt' | 'moved'>, nextDue: unknown, today?: string): number | null {
  if (before.recur || before.doneAt || !before.due || typeof nextDue !== 'string' || nextDue <= before.due) return null;
  if (today && nextDue <= today) return null;
  return Math.min(MAX_MOVED, (before.moved ?? 0) + 1);
}
/** The row's words: shown from the second move ("Moved twice", "Moved 4 times"); once is too small to mention. */
export const MOVED_SHOWN_FROM = 2;
export function movedWords(n: number | undefined): string | null {
  if (!n || n < MOVED_SHOWN_FROM) return null;
  return n === 2 ? 'Moved twice' : `Moved ${n.toLocaleString('en-GB')} times`;
}
/** The open top-level tasks moved most (at least twice), the most moved first, then the oldest; at most `limit`. */
export function movedMost(record: Pick<Tasks, 'tasks'>, limit = 8): {items: Task[]; more: number} {
  const all = record.tasks.filter(t => !t.doneAt && !t.parentId && (t.moved ?? 0) >= MOVED_SHOWN_FROM)
    .sort((a, b) => (b.moved ?? 0) - (a.moved ?? 0) || a.createdAt.localeCompare(b.createdAt) || a.title.localeCompare(b.title));
  return {items: all.slice(0, limit), more: Math.max(0, all.length - limit)};
}
