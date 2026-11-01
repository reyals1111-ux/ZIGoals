import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {getAppStorage} from '../showcase-storage';
import {ZIGI_STORE_EVENT} from '../ai/store/keys';
import {localDate} from '../local-date';
import {TASKS, type Task, type Tasks} from './schema';
import {addTask as addTo, finishTask, reopenTask, removeTask, restoreTask, tasksOnDay, type TaskInput} from './engine';

/**
 * Session AK (T1): the tasks record on this device, for features outside the Tasks page — NOVA's widgets (lane NA) and
 * its confirm cards (lane NE). Reads and writes go through the app storage (the person's own, or the Showcase tab's,
 * never mixed) and every write tells the open pages to read again (the same event `useDeviceRecord` listens to). Each
 * write returns an `undo` that puts the record back the way that one change found it. Nothing here is sent anywhere.
 */
type Storage_ = Pick<Storage, 'getItem' | 'setItem'>;
const store = (storage?: Storage_) => storage ?? getAppStorage();
const announce = () => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: TASKS.key})); };
const newTaskId = () => `task_${crypto.randomUUID()}`;
/** The local day a finish time falls on, on this device. */
export const deviceDay = (iso: string) => localDate(new Date(iso));

/** The record, or null when the bytes on this device cannot be read (never guessed as "no tasks"). */
export function readTasks(storage?: Pick<Storage, 'getItem'>): Tasks | null {
  const read = readDeviceRecord(storage ?? getAppStorage(), TASKS);
  return read.unreadable ? null : read.data;
}
/**
 * The tasks a day shows (NOVA's "due today" widget and brief): open tasks due that day, today's also every overdue one,
 * and the ones finished that day. Null when the record cannot be read.
 */
export function dueTasks(day: string, {today = localDate(), storage}: {today?: string; storage?: Pick<Storage, 'getItem'>} = {}): Task[] | null {
  const record = readTasks(storage);
  return record ? tasksOnDay(record, day, today, deviceDay) : null;
}
function write(change: (r: Tasks) => Tasks, storage?: Storage_): Tasks {
  if (readDeviceRecord(store(storage), TASKS).unreadable) throw new Error('Your tasks on this device could not be read, so nothing was changed.');
  const next = updateDeviceRecord(store(storage), TASKS, change);
  announce();
  return next;
}
/**
 * Adds a task (NOVA's and ZIGi's confirm card calls this only after the person confirms). Throws with nothing written
 * on a refusal (no title, a past day, the 500-task limit, a time without a day). The `undo` removes it again.
 */
export function addTask(input: TaskInput, {at = new Date(), today = localDate(at), storage, id = newTaskId()}: {at?: Date; today?: string; storage?: Storage_; id?: string} = {}): {task: Task; undo: () => void} {
  const next = write(r => addTo(r, input, {id, at, today}), storage);
  const task = next.tasks.find(t => t.id === id)!;
  return {task, undo: () => { write(r => removeTask(r, id), storage); }};
}
/** Marks a task done; `undo` opens it again (`changed` is false when it was done already). Throws when the task is not on this device. */
export function completeTask(id: string, {at = new Date(), storage}: {at?: Date; storage?: Storage_} = {}): {task: Task; undo: () => void; changed: boolean} {
  const current = readTasks(storage)?.tasks.find(t => t.id === id);
  if (!current) throw new Error('That task is no longer on this device.');
  if (current.doneAt) return {task: current, undo: () => undefined, changed: false};
  const next = write(r => finishTask(r, id, at), storage);
  return {task: next.tasks.find(t => t.id === id)!, undo: () => { write(r => reopenTask(r, id), storage); }, changed: true};
}
/** Removes a task; `undo` puts it back. */
export function deleteTask(id: string, {storage}: {storage?: Storage_} = {}): {undo: () => void} {
  const current = readTasks(storage)?.tasks.find(t => t.id === id);
  if (!current) throw new Error('That task is no longer on this device.');
  write(r => removeTask(r, id), storage);
  return {undo: () => { write(r => restoreTask(r, current), storage); }};
}
