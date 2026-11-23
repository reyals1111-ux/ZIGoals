import {descendants} from './engine';
import {tasksSchema, type Task, type Tasks} from './schema';

/**
 * Session AV lane 2 (r5-plan, LEDGER #350; Logseq's DOING and CANCELED): two more states of a task, beside open and done.
 * - "Doing": begun (`state.at` keeps when). One tap from the task's editor; first in Tasks → Today, also when it has no day.
 *   Finishing it, or "Not doing it now", ends it.
 * - "Cancelled": closed without being done. It also carries `doneAt` (the same moment), so an older build shows it as
 *   finished, never as open; this build lists it in Completed as cancelled and keeps it out of the done chart, the daily
 *   goal and its streak (lib/tasks/engine.ts completedLog marks it). Ticking it open again opens it as a normal task. Its
 *   open subtasks are cancelled with it. A repeating task is not cancelled (it would end the series): Skip this time, or
 *   stop the repeat. Pure.
 */
export const CANCEL_REPEAT_MESSAGE = 'A repeating task is not cancelled: skip this time instead, or remove the repeat first.';
export const isDoing = (t: Pick<Task, 'doneAt' | 'state'>): boolean => !t.doneAt && t.state?.kind === 'doing';
export {isCancelled, isFinished} from './finished';
const strip = (t: Task): Task => { const out = {...t}; delete out.state; return out; };
const find = (record: Tasks, id: string) => { const t = record.tasks.find(x => x.id === id); if (!t) throw new Error('That task is no longer on this device.'); return t; };

/** Marks an open task as being done now. */
export function startDoing(record: Tasks, id: string, at: Date): Tasks {
  const task = find(record, id);
  if (task.doneAt) throw new Error('That task is already closed. Tick it open first.');
  const stamp = at.toISOString();
  return tasksSchema.parse({...record, tasks: record.tasks.map(t => t.id === id ? {...t, state: {kind: 'doing', at: stamp}, updatedAt: stamp} : t)});
}
/** "Not doing it now": back to open (its day and everything else as they were). */
export function stopDoing(record: Tasks, id: string, at: Date): Tasks {
  const task = find(record, id), stamp = at.toISOString();
  if (!isDoing(task)) return record;
  return tasksSchema.parse({...record, tasks: record.tasks.map(t => t.id === id ? {...strip(t), updatedAt: stamp} : t)});
}
/** Closes a one-off task without counting it as done; its open subtasks with it. */
export function cancelTask(record: Tasks, id: string, at: Date): Tasks {
  const task = find(record, id);
  if (task.recur) throw new Error(CANCEL_REPEAT_MESSAGE);
  if (task.doneAt) throw new Error('That task is already closed.');
  const stamp = at.toISOString(), ids = new Set([id, ...descendants(record, id).filter(t => !t.doneAt && !t.recur).map(t => t.id)]);
  return tasksSchema.parse({...record, tasks: record.tasks.map(t => ids.has(t.id) ? {...t, doneAt: stamp, state: {kind: 'cancelled', at: stamp}, updatedAt: stamp} : t)});
}
/** The day a state began, for the row ("Doing since Mon, Nov 23"). */
export const stateSince = (t: Pick<Task, 'state'>): string | null => t.state?.at ?? null;
