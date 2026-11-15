import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {getAppStorage} from '../showcase-storage';
import {ZIGI_STORE_EVENT} from '../ai/store/keys';
import {checklistZone, zonedDay} from '../checklist/zone';
import {wallClock} from '../zone-time';
import {MAX_TASKS, TASKS, TASKS_KEY, taskSchema, tasksSchema, type Task, type Tasks} from './schema';
import {addProject, addTask as addTo, editTask, projectByName, removeProject, finishTask, removeTask, reopenTask, restoreTask, restoreTasks, skipOccurrence, tasksOnDay, type TaskInput, type TaskPatch} from './engine';

/**
 * Session AK (T1): the tasks record on this device, for features outside the Tasks page — NOVA's widgets (lane NA) and
 * its confirm cards (lane NE). Reads and writes go through the app storage (the person's own, or the Showcase tab's,
 * never mixed) and every write tells the open pages to read again (the same event `useDeviceRecord` listens to). Each
 * write returns an `undo` that puts the record back the way that one change found it. Nothing here is sent anywhere.
 *
 * Session AL (Part 8): the tasks' day is the app's day (P-LS-13, LS-031/LS-066): the saved journal time zone when there is
 * one, else this device's — the same rule as the Checklist and Today. ZIGi and NOVA (lane L7) can edit, reschedule and
 * skip through `changeTask` / `rescheduleTask`; an unreadable record can be salvaged (P-LS-39).
 */
type Storage_ = Pick<Storage, 'getItem' | 'setItem'>;
const store = (storage?: Storage_) => storage ?? getAppStorage();
const announce = () => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: TASKS.key})); };
const newTaskId = () => `task_${crypto.randomUUID()}`;
/** Today in the app's time zone (the journal zone, else this device's). */
export const tasksToday = (now = new Date()): string => zonedDay(now, checklistZone());
/** The wall-clock time now in the app's zone ("HH:MM"), so a timed task turns late after its time. */
export const tasksClock = (now = new Date()): string => wallClock(now.getTime(), checklistZone()).clock;
/** The day a finish time falls on, in the app's zone. */
export const deviceDay = (iso: string) => zonedDay(new Date(iso), checklistZone());

/** The record, or null when the bytes on this device cannot be read (never guessed as "no tasks"). */
export function readTasks(storage?: Pick<Storage, 'getItem'>): Tasks | null {
  const read = readDeviceRecord(storage ?? getAppStorage(), TASKS);
  return read.unreadable ? null : read.data;
}
/**
 * Session AL (P-LS-39, LS-022): what can still be read from bytes the list cannot read as a whole — each task that reads
 * on its own, up to the cap. `raw` is kept so the person can save it before anything is written over it.
 */
export function salvageTasks(storage?: Pick<Storage, 'getItem'>): {raw: string; readable: Tasks; total: number; dropped: number; overCap: number} | null {
  let raw: string | null = null;
  try { raw = (storage ?? getAppStorage()).getItem(TASKS_KEY); } catch { return null; }
  if (raw === null) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return {raw, readable: {version: 1, tasks: []}, total: 0, dropped: 0, overCap: 0}; }
  const list = value && typeof value === 'object' && Array.isArray((value as {tasks?: unknown}).tasks) ? (value as {tasks: unknown[]}).tasks : [];
  const good: Task[] = [];
  for (const item of list) { const parsed = taskSchema.safeParse(item); if (parsed.success && !good.some(t => t.id === parsed.data.id)) good.push(parsed.data); }
  // Open ones first when there are too many, so nothing still to do is the part left out.
  const ordered = [...good.filter(t => !t.doneAt), ...good.filter(t => t.doneAt)];
  const kept = ordered.slice(0, MAX_TASKS);
  const base = value && typeof value === 'object' ? {...(value as Record<string, unknown>)} : {};
  const readable = tasksSchema.safeParse({...base, version: 1, tasks: kept});
  return {raw, readable: readable.success ? readable.data : {version: 1, tasks: kept}, total: list.length, dropped: list.length - good.length, overCap: Math.max(0, good.length - MAX_TASKS)};
}
/** Writes the salvaged tasks in place of unreadable bytes (only after the person chose it, with the raw copy saved). */
export function keepSalvaged(record: Tasks, storage?: Storage_): void {
  store(storage).setItem(TASKS_KEY, JSON.stringify(tasksSchema.parse(record)));
  announce();
}
/**
 * The tasks a day shows (NOVA's "due today" widget and brief): open tasks due that day, today's also every overdue one,
 * and the ones finished that day. Null when the record cannot be read.
 */
export function dueTasks(day: string, {today = tasksToday(), storage}: {today?: string; storage?: Pick<Storage, 'getItem'>} = {}): Task[] | null {
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
 * Adds a task (NOVA's and ZIGi's confirm card and the global Quick add call this only after the person confirms).
 * Throws with nothing written on a refusal (no title, the 500-task limit, a time without a day; a past day unless
 * `allowPast`). The `undo` removes it again.
 */
export function addTask(input: TaskInput, {at = new Date(), today = tasksToday(at), storage, id = newTaskId(), allowPast = false, projectName}: {at?: Date; today?: string; storage?: Storage_; id?: string; allowPast?: boolean;
  /** Session AL (AL_SCOPE C8): a typed "#Home": the project of that name, made in the same write when there is none yet. */
  projectName?: string} = {}): {task: Task; undo: () => void; project?: {id: string; name: string; made: boolean}} {
  let project: {id: string; name: string; made: boolean} | undefined;
  const next = write(r => {
    let rec = r;
    const name = projectName?.trim();
    if (name) {
      const found = projectByName(rec, name);
      if (found) project = {id: found.id, name: found.name, made: false};
      else { const pid = `project_${crypto.randomUUID()}`; rec = addProject(rec, {name}, pid); project = {id: pid, name: name.replace(/\s+/g, ' '), made: true}; }
    }
    return addTo(rec, {...input, ...(project ? {projectId: project.id} : {})}, {id, at, today, allowPast});
  }, storage);
  const task = next.tasks.find(t => t.id === id)!;
  // Undo takes the task away, and the project too when this add made it and nothing else is in it.
  return {task, ...(project ? {project} : {}), undo: () => { const made = project?.made ? project.id : null; write(r => { const gone = removeTask(r, id); return made && !gone.tasks.some(t => t.projectId === made) ? removeProject(gone, made) : gone; }, storage); }};
}
/** Marks a task done (a repeating one moves to its next day); `undo` puts it back as it was (`changed` is false when it was done already). */
export function completeTask(id: string, {at = new Date(), storage}: {at?: Date; storage?: Storage_} = {}): {task: Task; undo: () => void; changed: boolean} {
  const record = readTasks(storage), current = record?.tasks.find(t => t.id === id);
  if (!current) throw new Error('That task is no longer on this device.');
  if (current.doneAt) return {task: current, undo: () => undefined, changed: false};
  const before = record!.tasks.filter(t => t.id === id || t.parentId === id);
  const next = write(r => finishTask(r, id, at, {today: tasksToday(at), doneDay: deviceDay(at.toISOString())}), storage);
  return {task: next.tasks.find(t => t.id === id)!, undo: () => { write(r => current.recur ? restoreTasks(r, before) : before.length > 1 ? restoreTasks(r, before) : reopenTask(r, id), storage); }, changed: true};
}
/** Removes a task (and its subtasks); `undo` puts them back. */
export function deleteTask(id: string, {storage}: {storage?: Storage_} = {}): {undo: () => void} {
  const record = readTasks(storage), current = record?.tasks.find(t => t.id === id);
  if (!current) throw new Error('That task is no longer on this device.');
  const gone = record!.tasks.filter(t => t.id === id || isBelow(record!, t, id));
  write(r => removeTask(r, id), storage);
  return {undo: () => { write(r => gone.length > 1 ? restoreTasks(r, gone) : restoreTask(r, current), storage); }};
}
const isBelow = (record: Tasks, task: Task, id: string): boolean => { let p = task.parentId, guard = 0; while (p && guard++ < 50) { if (p === id) return true; p = record.tasks.find(t => t.id === p)?.parentId; } return false; };
/** Session AL (for ZIGi/NOVA confirm cards, lane L7): changes a task; `undo` puts it back as it was. */
export function changeTask(id: string, patch: TaskPatch, {at = new Date(), storage, allowPast = false}: {at?: Date; storage?: Storage_; allowPast?: boolean} = {}): {task: Task; undo: () => void} {
  const current = readTasks(storage)?.tasks.find(t => t.id === id);
  if (!current) throw new Error('That task is no longer on this device.');
  const next = write(r => editTask(r, id, patch, tasksToday(at), {allowPast, at}), storage);
  return {task: next.tasks.find(t => t.id === id)!, undo: () => { write(r => restoreTasks(r, [current]), storage); }};
}
/** Moves a task to another day (and time; null clears the time). */
export const rescheduleTask = (id: string, due: string | null, time?: string | null, options: {at?: Date; storage?: Storage_; allowPast?: boolean} = {}) =>
  changeTask(id, {due, ...(time !== undefined ? {time} : due === null ? {time: null, recur: null} : {})}, options);
/** Skips today's occurrence of a repeating task. */
export function skipTask(id: string, {at = new Date(), storage}: {at?: Date; storage?: Storage_} = {}): {task: Task; undo: () => void} {
  const current = readTasks(storage)?.tasks.find(t => t.id === id);
  if (!current) throw new Error('That task is no longer on this device.');
  const next = write(r => skipOccurrence(r, id, tasksToday(at), at), storage);
  return {task: next.tasks.find(t => t.id === id)!, undo: () => { write(r => restoreTasks(r, [current]), storage); }};
}
