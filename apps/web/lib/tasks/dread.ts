import type {Task, Tasks} from './schema';

/**
 * Session AW (X2, LEDGER #432; Amazing Marvin's dread mark, the "eat the frog" habit): how much the person is dreading a
 * task, 1 (a little) to 3 (a lot). Only the person sets it, in the task's editor; it shows as a small sign beside the
 * title, and Plan my day's "Hardest first" gives the most dreaded open task the first free time of the day. It is a note to
 * self, never a score: nothing is red, nothing counts against the person or the day. Pure.
 */
export type DreadLevel = 1 | 2 | 3;
export const DREAD_LEVELS = [1, 2, 3] as const;
export const DREAD_WORDS: Record<DreadLevel, string> = {1: 'A little', 2: 'Quite a bit', 3: 'A lot'};
export const DREAD_WORDS_NL: Record<DreadLevel, string> = {1: 'een beetje', 2: 'nogal', 3: 'erg'};
export const isDread = (v: unknown): v is DreadLevel => v === 1 || v === 2 || v === 3;
/** The row's sign: "Dreading · a lot"; nothing when not set. */
export const dreadSign = (t: Pick<Task, 'dread'>): string | null => isDread(t.dread) ? `Dreading · ${DREAD_WORDS[t.dread].toLowerCase()}` : null;
/**
 * "Hardest first": the same tasks, the most dreaded first (3, 2, 1), the rest after them in the order they came. A stable
 * order, so two tasks dreaded alike keep theirs, and with nothing marked the list is returned as it was.
 */
export function hardestFirst<T extends Pick<Task, 'dread'>>(tasks: readonly T[]): T[] {
  if (!tasks.some(t => isDread(t.dread))) return [...tasks];
  return tasks.map((t, i) => ({t, i})).sort((a, b) => (b.t.dread ?? 0) - (a.t.dread ?? 0) || a.i - b.i).map(x => x.t);
}
/** The open top-level tasks with a dread mark, the most dreaded first, then by their day (none last), then by title. */
export function dreadedTasks(record: Pick<Tasks, 'tasks'>): Task[] {
  return record.tasks.filter(t => !t.doneAt && !t.parentId && isDread(t.dread))
    .sort((a, b) => b.dread! - a.dread! || (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.title.localeCompare(b.title));
}
