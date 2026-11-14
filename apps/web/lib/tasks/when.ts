import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import type {Task, Tasks} from './schema';

/**
 * Session AP (owner-approved feature list, "This evening" and "Someday"; TIER 3 (stored format), additive key only):
 * which open tasks the person put on "This evening" (for one date) or in "Someday". Its own device record
 * `zigoals:task-when:v1`, never a field of the task record (whose schema older builds read; a new field there would be
 * theirs to keep or drop). Device only, versioned, strict, at most 500 entries (the task list's own cap); exported,
 * restored and erased with the account; never synced. Written only on the person's choice (lib/device-record.ts).
 *
 * Read rules (pure, so the lists and their tests agree):
 * - "This evening" holds only on its date. After it the entry is ignored and the task is back in its normal place
 *   (Today, its day, the Inbox); the stale entry is dropped at the next write.
 * - "Someday" holds only while the task has no due day: giving it a day takes it out of Someday.
 * - A task that is finished or no longer on this device has no place here.
 */
export const TASK_WHEN_KEY = 'zigoals:task-when:v1';
export const TASK_WHEN_MAX = 500;
const day = z.iso.date();
const id = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/).refine(k => k !== '__proto__' && k !== 'constructor' && k !== 'prototype', 'Not a task id.');
export const taskWhenEntrySchema = z.union([z.object({evening: day}).strict(), z.object({someday: z.literal(true)}).strict()]);
export type TaskWhenEntry = z.infer<typeof taskWhenEntrySchema>;
export const taskWhenSchema = z.object({
  version: z.literal(1),
  tasks: z.record(id, taskWhenEntrySchema).refine(t => Object.keys(t).length <= TASK_WHEN_MAX, `At most ${TASK_WHEN_MAX} tasks.`),
}).strict();
export type TaskWhen = z.infer<typeof taskWhenSchema>;
export const emptyTaskWhen = (): TaskWhen => ({version: 1, tasks: {}});
export const TASK_WHEN: DeviceRecordSpec<TaskWhen> = {key: TASK_WHEN_KEY, schema: taskWhenSchema, empty: emptyTaskWhen};

export type TaskPlace = 'evening' | 'someday';
/** Where a task is now: "This evening" (only on its date), "Someday" (only without a due day), or neither. */
export function placeOf(when: TaskWhen, task: Pick<Task, 'id' | 'due' | 'doneAt'>, today: string): TaskPlace | null {
  if (task.doneAt) return null;
  const entry = Object.hasOwn(when.tasks, task.id) ? when.tasks[task.id] : undefined;
  if (!entry) return null;
  if ('evening' in entry) return entry.evening === today ? 'evening' : null;
  return task.due ? null : 'someday';
}
/** The entries that still mean something: open tasks on this device, an evening that is today or later, Someday without a day. */
export function pruneWhen(when: TaskWhen, record: Tasks, today: string): TaskWhen {
  const open = new Map(record.tasks.filter(t => !t.doneAt).map(t => [t.id, t]));
  const kept: Record<string, TaskWhenEntry> = {};
  for (const [taskId, entry] of Object.entries(when.tasks)) {
    const t = open.get(taskId);
    if (!t) continue;
    if ('evening' in entry ? entry.evening >= today : !t.due) kept[taskId] = entry;
  }
  return {version: 1, tasks: kept};
}
const place = (when: TaskWhen, record: Tasks, today: string, taskId: string, entry: TaskWhenEntry | null): TaskWhen => {
  const task = record.tasks.find(t => t.id === taskId);
  if (!task) throw new Error('That task is no longer on this device.');
  if (task.doneAt) throw new Error('That task is already done.');
  const next = pruneWhen(when, record, today);
  if (entry) next.tasks[taskId] = entry; else delete next.tasks[taskId];
  return taskWhenSchema.parse(next);
};
/** Puts a task on "This evening" for today (its due day, if any, stays as it is). */
export const putOnEvening = (when: TaskWhen, record: Tasks, today: string, taskId: string): TaskWhen => place(when, record, today, taskId, {evening: today});
/** Puts a task in "Someday"; a task with a due day must lose its day first (the page clears it through the task's own edit). */
export function putInSomeday(when: TaskWhen, record: Tasks, today: string, taskId: string): TaskWhen {
  if (record.tasks.find(t => t.id === taskId)?.due) throw new Error('A task with a day is not for Someday: clear its day first.');
  return place(when, record, today, taskId, {someday: true});
}
/** Takes a task out of "This evening" or "Someday": back to its normal place. */
export const clearPlace = (when: TaskWhen, record: Tasks, today: string, taskId: string): TaskWhen => {
  const next = pruneWhen(when, record, today);
  delete next.tasks[taskId];
  return taskWhenSchema.parse(next);
};
/** The entry for one task as it was, put back (Undo), on the latest record. */
export function restorePlace(when: TaskWhen, record: Tasks, today: string, taskId: string, entry: TaskWhenEntry | undefined): TaskWhen {
  const next = pruneWhen(when, record, today);
  if (entry) next.tasks[taskId] = entry; else delete next.tasks[taskId];
  return taskWhenSchema.parse(pruneWhen(next, record, today));
}
const byTitle = (a: Task, b: Task) => a.createdAt.localeCompare(b.createdAt) || a.title.localeCompare(b.title);
/** Tonight's tasks (open, top-level or not), oldest first. */
export const eveningTasks = (when: TaskWhen, record: Tasks, today: string): Task[] => record.tasks.filter(t => placeOf(when, t, today) === 'evening').sort(byTitle);
/** The Someday list (open, no day), oldest first. */
export const somedayTasks = (when: TaskWhen, record: Tasks, today: string): Task[] => record.tasks.filter(t => placeOf(when, t, today) === 'someday').sort(byTitle);
