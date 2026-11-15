import {addLocalDays, localDate} from '../local-date';
import {nextOccurrence} from './recurrence';
import {
  DEFAULT_LEVEL, LABEL_PATTERN, MAX_COMPLETIONS, MAX_PROJECTS, MAX_SECTIONS, MAX_TASKS, DONE_KEEP_DAYS, TASK_CLOCK, TASK_TITLE_MAX,
  levelFields, taskLevel, taskSchema, tasksSchema, type HealthLink, type Project, type Recur, type SavedFilter, type Section,
  type Task, type TaskColour, type TaskLevel, type TaskPriority, type TaskReminder, type Tasks,
} from './schema';

/** Session AI (tasks): add, finish, reopen and remove, and the open list in the order Today shows it. Pure. */
export const TASK_LIMIT_MESSAGE = `You have ${MAX_TASKS} tasks, the most this device keeps (older versions of the app read up to ${MAX_TASKS}). Clear finished ones or remove one first.`;
export const PAST_DAY_MESSAGE = 'Choose today or a later day for when it is due.';
/**
 * What a new task can carry. Session AL (Part 8): `level` (p1–p4; wins over `priority`), a project and section, a
 * parent (a subtask), labels, a repeat rule, reminders, notes, a habit or Health link and a manual order.
 */
export type TaskInput = {title: string; priority?: TaskPriority; due?: string; goal?: string; time?: string;
  level?: TaskLevel; projectId?: string; sectionId?: string; parentId?: string; labels?: string[]; recur?: Recur;
  reminders?: TaskReminder[]; notes?: string; habit?: string; health?: HealthLink; order?: number};
export type AddOptions = {id: string; at: Date; today: string;
  /** Session AL (P-LS-11, DV-164): the Tasks page takes a past day (the task shows as overdue). Other callers keep the refusal. */
  allowPast?: boolean};

/** A task without some of its fields (a cleared project, section, parent or finish). */
const omit = (t: Task, ...keys: (keyof Task)[]): Task => { const out = {...t}; for (const k of keys) delete out[k]; return out; };
const cleanLabels = (labels: readonly string[] | undefined) => labels ? [...new Set(labels.map(l => l.trim().replace(/^@/, '')).filter(l => LABEL_PATTERN.test(l)))] : [];
function optional(input: Partial<TaskInput>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.level !== undefined) Object.assign(out, levelFields(input.level));
  for (const key of ['projectId', 'sectionId', 'parentId', 'recur', 'notes', 'habit', 'health', 'order'] as const) { const v = input[key]; if (v !== undefined && v !== '' && v !== null) out[key] = v; }
  const labels = cleanLabels(input.labels); if (labels.length) out.labels = labels;
  if (input.reminders?.length) out.reminders = input.reminders;
  return out;
}

export function addTask(record: Tasks, input: TaskInput, options: AddOptions): Tasks {
  const title = input.title.trim();
  if (!title) throw new Error('Give the task a few words.');
  if (title.length > TASK_TITLE_MAX) throw new Error(`A task title can be at most ${TASK_TITLE_MAX} characters (this one has ${title.length}).`);
  if (input.due && input.due < options.today && !options.allowPast) throw new Error(PAST_DAY_MESSAGE);
  // Session AK (T1): a time belongs to a day; a time with no day is refused rather than guessed.
  if (input.time && !input.due) throw new Error('Choose a day for the task before a time.');
  if (input.time && !TASK_CLOCK.test(input.time)) throw new Error('Choose a time such as 09:30.');
  if (input.recur && !input.due) throw new Error('A repeating task needs its first day.');
  if (input.parentId && !record.tasks.some(t => t.id === input.parentId)) throw new Error('That parent task is no longer on this device.');
  const kept = prune(record, options.today);
  if (kept.tasks.length >= MAX_TASKS) throw new Error(TASK_LIMIT_MESSAGE);
  const at = options.at.toISOString();
  const task = taskSchema.parse({id: options.id, title, priority: input.priority ?? 'normal', ...(input.due ? {due: input.due} : {}), ...(input.time ? {time: input.time} : {}), ...(input.goal ? {goal: input.goal} : {}), ...optional(input), createdAt: at, updatedAt: at});
  return tasksSchema.parse({...kept, tasks: [...kept.tasks, task]});
}
/** A finished occurrence of a repeating task is kept on the task (its `completions`), and the task moves to its next day. */
export function finishTask(record: Tasks, id: string, at: Date, {today, doneDay}: {today?: string; doneDay?: string} = {}): Tasks {
  const finished = doneDay ?? localDate(at), now = today ?? finished, stamp = at.toISOString();
  const task = record.tasks.find(t => t.id === id);
  // Session AL (P-LS-01): finishing a parent finishes its open subtasks with it.
  const children = new Set(task && !task.recur ? descendants(record, id).filter(t => !t.doneAt).map(t => t.id) : []);
  return tasksSchema.parse({...record, tasks: record.tasks.map(t => {
    if (t.id === id && t.recur && !t.doneAt) {
      const next = nextOccurrence(t.recur, t.due ?? finished, finished, now);
      const completions = [...(t.completions ?? []), {at: stamp, ...(t.due ? {due: t.due} : {})}].slice(-MAX_COMPLETIONS);
      if (next) return {...t, due: next.due, recur: next.rule, completions, updatedAt: stamp};
      return {...t, doneAt: stamp, completions, updatedAt: stamp};
    }
    return t.id === id || children.has(t.id) ? {...t, doneAt: stamp, updatedAt: stamp} : t;
  })});
}
export const reopenTask = (record: Tasks, id: string): Tasks => tasksSchema.parse({...record, tasks: record.tasks.map(t => t.id === id ? omit(t, 'doneAt') : t)});
/** Session AL: removing a task removes its subtasks too (Undo puts them all back). */
export const removeTask = (record: Tasks, id: string): Tasks => { const gone = new Set([id, ...descendants(record, id).map(t => t.id)]); return {...record, tasks: record.tasks.filter(t => !gone.has(t.id))}; };
export const restoreTask = (record: Tasks, task: Task): Tasks => record.tasks.some(t => t.id === task.id) ? record : tasksSchema.parse({...record, tasks: [...record.tasks, task]});
/**
 * Session AL: the Undo of any change — puts these tasks back exactly as they were (re-adding the ones removed since),
 * and removes `added` ids. Tasks changed by nothing else are untouched.
 */
export function restoreTasks(record: Tasks, before: readonly Task[], added: readonly string[] = []): Tasks {
  const byId = new Map(before.map(t => [t.id, t])), drop = new Set(added);
  const tasks = record.tasks.filter(t => !drop.has(t.id) || byId.has(t.id)).map(t => byId.get(t.id) ?? t);
  for (const t of before) if (!tasks.some(x => x.id === t.id)) tasks.push(t);
  return tasksSchema.parse({...record, tasks: tasks.slice(0, MAX_TASKS)});
}
/**
 * Done tasks older than 30 days go. Session AL (LS-037): the day is the local day it was finished (`doneDay`), not the
 * UTC date of the stamp, so the "last 30 days" list and this cut agree.
 */
export function prune(record: Tasks, today: string, doneDay: (iso: string) => string = iso => iso.slice(0, 10)): Tasks {
  const from = addLocalDays(today, -DONE_KEEP_DAYS);
  return {...record, tasks: record.tasks.filter(t => !t.doneAt || doneDay(t.doneAt) >= from)};
}
export type TaskState = 'overdue' | 'today' | 'soon' | 'later' | 'someday';
export function taskState(task: Task, today: string, nowClock?: string): TaskState {
  if (!task.due) return 'someday';
  if (task.due < today) return 'overdue';
  // Session AL (P-LS-12, LS-011): a timed task due today is late once its time has passed (when the clock is given).
  if (task.due === today) return nowClock && task.time && task.time < nowClock ? 'overdue' : 'today';
  return task.due <= addLocalDays(today, 7) ? 'soon' : 'later';
}
const STATE_ORDER: Record<TaskState, number> = {overdue: 0, today: 1, soon: 2, later: 3, someday: 4};
/** Open tasks: overdue first, then due today, then by due day (and time), then by priority, then the oldest. */
export function openTasks(record: Tasks, today: string): Task[] {
  return record.tasks.filter(t => !t.doneAt).sort((a, b) => STATE_ORDER[taskState(a, today)] - STATE_ORDER[taskState(b, today)] || (a.due ?? '9').localeCompare(b.due ?? '9') || (a.time ?? '99').localeCompare(b.time ?? '99') || taskLevel(a) - taskLevel(b) || a.createdAt.localeCompare(b.createdAt));
}

/* ---- Session AK (T1): edits, goal next actions and the tasks of a day ------------------------------------------- */

/** Session AL: the fields an edit can change (`null` clears an optional one). */
export type TaskPatch = {title?: string; priority?: TaskPriority; due?: string | null; time?: string | null; goal?: string | null;
  level?: TaskLevel; projectId?: string | null; sectionId?: string | null; parentId?: string | null; labels?: string[];
  recur?: Recur | null; reminders?: TaskReminder[]; notes?: string | null; habit?: string | null; health?: HealthLink | null; order?: number};
/**
 * Changes a task's title, priority, day, time or goal. `null` clears an optional field; a field left out is kept. A day
 * may be moved earlier than today only when it already was (an overdue task keeps its day until the person moves it),
 * or with `allowPast` (Session AL, the Tasks page: a past day is kept and shows as overdue).
 */
export function editTask(record: Tasks, id: string, patch: TaskPatch, today: string, {allowPast = false, at}: {allowPast?: boolean; at?: Date} = {}): Tasks {
  const task = record.tasks.find(t => t.id === id);
  if (!task) throw new Error('That task is no longer on this device.');
  const next: Record<string, unknown> = {...task};
  if (patch.title !== undefined) { const title = patch.title.trim(); if (!title) throw new Error('Give the task a few words.'); if (title.length > TASK_TITLE_MAX) throw new Error(`A task title can be at most ${TASK_TITLE_MAX} characters (this one has ${title.length}).`); next.title = title; }
  if (patch.priority !== undefined) { next.priority = patch.priority; delete next.level; }
  if (patch.level !== undefined) Object.assign(next, levelFields(patch.level));
  for (const key of ['due', 'time', 'goal', 'projectId', 'sectionId', 'parentId', 'recur', 'notes', 'habit', 'health'] as const) { const value = patch[key]; if (value === null || value === '') delete next[key]; else if (value !== undefined) next[key] = value; }
  if (patch.projectId !== undefined && patch.sectionId === undefined && next.sectionId) {
    const section = record.sections?.find(s => s.id === next.sectionId);
    if (!section || section.projectId !== next.projectId) delete next.sectionId;
  }
  if (patch.labels !== undefined) { const labels = cleanLabels(patch.labels); if (labels.length) next.labels = labels; else delete next.labels; }
  if (patch.reminders !== undefined) { if (patch.reminders.length) next.reminders = patch.reminders; else delete next.reminders; }
  if (patch.order !== undefined) next.order = patch.order;
  if (typeof next.due === 'string' && next.due !== task.due && next.due < today && !allowPast) throw new Error(PAST_DAY_MESSAGE);
  if (next.time !== undefined && !next.due) throw new Error('Choose a day for the task before a time.');
  if (typeof next.time === 'string' && !TASK_CLOCK.test(next.time)) throw new Error('Choose a time such as 09:30.');
  if (next.recur && !next.due) throw new Error('A repeating task needs its first day.');
  if (typeof next.parentId === 'string' && (next.parentId === id || descendants(record, id).some(t => t.id === next.parentId))) throw new Error('A task cannot sit under itself or one of its own subtasks.');
  next.updatedAt = (at ?? new Date()).toISOString();
  const parsed = taskSchema.parse(next);
  return tasksSchema.parse({...record, tasks: record.tasks.map(t => t.id === id ? parsed : t)});
}

/** The stored form of a goal link: the goal's key as the goal lists name it (`private:<id>` for a goal on this device). */
export const goalKeyOf = (goalId: string) => goalId.startsWith('private:') || goalId.startsWith('legacy:') ? goalId : `private:${goalId}`;
/** Whether a task serves a goal (its key, or the bare id an earlier writer may have kept). */
export const servesGoal = (task: Task, goalId: string) => !!task.goal && (task.goal === goalKeyOf(goalId) || task.goal === goalId || goalKeyOf(task.goal) === goalKeyOf(goalId));
/** A goal's next actions: its open tasks in the open list's order. */
export const goalNextActions = (record: Tasks, goalId: string, today: string): Task[] => openTasks(record, today).filter(t => servesGoal(t, goalId));

/**
 * Session AL (P-LS-43, LS-035; for lane L4's close flow): the open tasks still linked to a goal (subtasks included), and
 * what closing the goal can do with them — keep them, unlink them (they stay as plain tasks) or mark them done. A
 * repeating task marked done here ends its series (the goal it served is closed), keeping its past occurrences.
 */
export const tasksLinkedTo = (record: Tasks, goalId: string): Task[] => record.tasks.filter(t => !t.doneAt && servesGoal(t, goalId));
export function unlinkGoalTasks(record: Tasks, goalId: string, at = new Date()): Tasks {
  const stamp = at.toISOString();
  return tasksSchema.parse({...record, tasks: record.tasks.map(t => !t.doneAt && servesGoal(t, goalId) ? {...omit(t, 'goal'), updatedAt: stamp} : t)});
}
export function finishGoalTasks(record: Tasks, goalId: string, at = new Date()): Tasks {
  const stamp = at.toISOString();
  return tasksSchema.parse({...record, tasks: record.tasks.map(t => !t.doneAt && servesGoal(t, goalId) ? {...t, doneAt: stamp, updatedAt: stamp} : t)});
}

/**
 * The tasks a day shows (the Agenda and NOVA): open tasks due that day; on today also every overdue open task (it is
 * still to do, so it is carried to today rather than left on a past day); and a finished task on its due day, or on
 * the day it was finished when that came after its due day (`doneDay` reads that day from the finish time). Tasks with
 * no day ("someday") are on the Tasks page, never on a calendar day. Order: the open list's, then finished ones.
 */
export function tasksOnDay(record: Tasks, day: string, today: string, doneDay: (iso: string) => string): Task[] {
  const open = openTasks(record, today).filter(t => t.due && ((t.due === day && t.due >= today) || (day === today && t.due < today)));
  const done = record.tasks.filter(t => t.doneAt && t.due && shownDoneOn(t, doneDay) === day).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '') || a.doneAt!.localeCompare(b.doneAt!));
  return [...open, ...done];
}
/** The day a finished task shows on: its due day, or the day it was finished when that was later. */
export function shownDoneOn(task: Task, doneDay: (iso: string) => string): string | null {
  if (!task.doneAt || !task.due) return null;
  const finished = doneDay(task.doneAt);
  return finished > task.due ? finished : task.due;
}
/**
 * Counts for a header line: open, overdue and due today. Release review AL (RR-8): overdue is taskState's one rule, the day
 * and, today, the time (`nowClock`, the app's zone: lib/tasks/device.ts tasksClock), so the side list, the header, the
 * list's groups, Today's line and NOVA count the same tasks; the clock is asked for, so no caller counts by day alone.
 */
export function taskCounts(record: Tasks, today: string, nowClock: string | undefined): {open: number; overdue: number; today: number} {
  const open = record.tasks.filter(t => !t.doneAt);
  return {open: open.length, overdue: open.filter(t => taskState(t, today, nowClock) === 'overdue').length, today: open.filter(t => taskState(t, today, nowClock) === 'today').length};
}
/** Recently finished tasks (kept 30 days), newest first. */
export const doneTasks = (record: Tasks): Task[] => record.tasks.filter(t => t.doneAt).sort((a, b) => b.doneAt!.localeCompare(a.doneAt!));

/* ---- Session AL (Part 8): subtasks, projects, sections, labels, order, bulk -------------------------------------- */

/** A task's direct subtasks, in their manual order. */
export const childrenOf = (record: Tasks, id: string): Task[] => byOrder(record.tasks.filter(t => t.parentId === id));
/** Every task below this one (subtasks of subtasks too). */
export function descendants(record: Tasks, id: string): Task[] {
  const out: Task[] = [], seen = new Set<string>([id]);
  const walk = (parent: string) => { for (const t of record.tasks) if (t.parentId === parent && !seen.has(t.id)) { seen.add(t.id); out.push(t); walk(t.id); } };
  walk(id);
  return out;
}
/** Subtask progress: how many of the direct subtasks are done ("2 of 5"). */
export function subtaskProgress(record: Tasks, id: string): {done: number; total: number} {
  const kids = record.tasks.filter(t => t.parentId === id);
  return {done: kids.filter(t => t.doneAt).length, total: kids.length};
}
/** Manual order first (tasks given an order), then creation. */
export const byOrder = (tasks: readonly Task[]): Task[] => [...tasks].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.createdAt.localeCompare(b.createdAt));
/** Gives these tasks the order they are listed in (drag to reorder, or Move up / Move down). */
export function setOrder(record: Tasks, ids: readonly string[]): Tasks {
  const at = new Map(ids.map((id, i) => [id, (i + 1) * 10]));
  return tasksSchema.parse({...record, tasks: record.tasks.map(t => at.has(t.id) ? {...t, order: at.get(t.id)} : t)});
}
/** Moves one task a step up (-1) or down (+1) among `siblings` (the list as shown); returns the record unchanged at an end. */
export function moveStep(record: Tasks, siblings: readonly string[], id: string, step: -1 | 1): Tasks {
  const i = siblings.indexOf(id), j = i + step;
  if (i < 0 || j < 0 || j >= siblings.length) return record;
  const ids = [...siblings]; [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  return setOrder(record, ids);
}
/** Moves tasks into a project (null: the Inbox) and section; subtasks travel with their parent. */
export function moveTasks(record: Tasks, ids: readonly string[], to: {projectId: string | null; sectionId?: string | null}, at = new Date()): Tasks {
  if (to.projectId && !record.projects?.some(p => p.id === to.projectId)) throw new Error('That project is no longer on this device.');
  if (to.sectionId && !record.sections?.some(s => s.id === to.sectionId && s.projectId === to.projectId)) throw new Error('That section is not in this project.');
  const moving = new Set(ids.flatMap(id => [id, ...descendants(record, id).map(t => t.id)])), stamp = at.toISOString();
  return tasksSchema.parse({...record, tasks: record.tasks.map(t => {
    if (!moving.has(t.id)) return t;
    // A subtask whose parent is not moving leaves it (it becomes a task of its own in the new place).
    const parentStays = t.parentId && !moving.has(t.parentId);
    return {...(parentStays ? omit(t, 'projectId', 'sectionId', 'parentId') : omit(t, 'projectId', 'sectionId')), ...(to.projectId ? {projectId: to.projectId} : {}), ...(to.projectId && to.sectionId ? {sectionId: to.sectionId} : {}), updatedAt: stamp};
  })});
}
/** Applies the same patch to several tasks (bulk priority, day, labels added). */
export function editMany(record: Tasks, ids: readonly string[], change: (t: Task) => TaskPatch, today: string, options: {allowPast?: boolean; at?: Date} = {}): Tasks {
  return ids.reduce((r, id) => r.tasks.some(t => t.id === id) ? editTask(r, id, change(r.tasks.find(t => t.id === id)!), today, options) : r, record);
}
export const finishMany = (record: Tasks, ids: readonly string[], at: Date, options: {today?: string; doneDay?: string} = {}): Tasks => ids.reduce((r, id) => r.tasks.find(t => t.id === id && !t.doneAt) ? finishTask(r, id, at, options) : r, record);
export const removeMany = (record: Tasks, ids: readonly string[]): Tasks => ids.reduce((r, id) => removeTask(r, id), record);
/** "Clear done": every finished task leaves the list (Undo puts them back). */
export const clearDone = (record: Tasks): Tasks => ({...record, tasks: record.tasks.filter(t => !t.doneAt)});
/** Skips this occurrence of a repeating task without finishing it (P-LS-02: "this one" vs "all"). */
export function skipOccurrence(record: Tasks, id: string, today: string, at = new Date()): Tasks {
  const task = record.tasks.find(t => t.id === id);
  if (!task?.recur || !task.due) throw new Error('Only a repeating task can skip a day.');
  const next = nextOccurrence({...task.recur, afterDone: false}, task.due, today, today);
  if (!next) throw new Error('This was the last time it repeats. Finish or remove it instead.');
  return editTask(record, id, {due: next.due, recur: next.rule}, today, {allowPast: true, at});
}

const newId = (prefix: string) => `${prefix}_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
export function addProject(record: Tasks, {name, colour = 'grey'}: {name: string; colour?: TaskColour}, id = newId('project')): Tasks {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean) throw new Error('Give the project a name.');
  if (clean.length > 60) throw new Error(`A project name can be at most 60 characters (this one has ${clean.length}).`);
  const projects = record.projects ?? [];
  if (projects.some(p => p.name.toLowerCase() === clean.toLowerCase() && !p.archived)) throw new Error(`There is already a project called “${clean}”.`);
  if (projects.length >= MAX_PROJECTS) throw new Error(`You have ${MAX_PROJECTS} projects, the most kept. Remove one first.`);
  return tasksSchema.parse({...record, projects: [...projects, {id, name: clean, colour, order: projects.length}]});
}
export function editProject(record: Tasks, id: string, patch: Partial<Pick<Project, 'name' | 'colour' | 'archived' | 'view'>>): Tasks {
  const project = record.projects?.find(p => p.id === id);
  if (!project) throw new Error('That project is no longer on this device.');
  if (patch.name !== undefined) {
    const clean = patch.name.trim().replace(/\s+/g, ' ');
    if (!clean) throw new Error('Give the project a name.');
    if (record.projects!.some(p => p.id !== id && !p.archived && p.name.toLowerCase() === clean.toLowerCase())) throw new Error(`There is already a project called “${clean}”.`);
    patch = {...patch, name: clean};
  }
  return tasksSchema.parse({...record, projects: record.projects!.map(p => p.id === id ? {...p, ...patch} : p)});
}
/** Removes a project and its sections; its tasks move to the Inbox (nothing is lost; Undo puts the project back). */
export function removeProject(record: Tasks, id: string): Tasks {
  return tasksSchema.parse({...record, projects: (record.projects ?? []).filter(p => p.id !== id), sections: (record.sections ?? []).filter(s => s.projectId !== id),
    tasks: record.tasks.map(t => t.projectId === id ? omit(t, 'projectId', 'sectionId') : t)});
}
export function addSection(record: Tasks, projectId: string, name: string, id = newId('section')): Tasks {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean) throw new Error('Give the section a name.');
  if (!record.projects?.some(p => p.id === projectId)) throw new Error('That project is no longer on this device.');
  const sections = record.sections ?? [];
  if (sections.length >= MAX_SECTIONS) throw new Error(`You have ${MAX_SECTIONS} sections, the most kept.`);
  return tasksSchema.parse({...record, sections: [...sections, {id, projectId, name: clean.slice(0, 60), order: sections.filter(s => s.projectId === projectId).length}]});
}
export const renameSection = (record: Tasks, id: string, name: string): Tasks => {
  const clean = name.trim(); if (!clean) throw new Error('Give the section a name.');
  return tasksSchema.parse({...record, sections: (record.sections ?? []).map(s => s.id === id ? {...s, name: clean.slice(0, 60)} : s)});
};
/** Removes a section; its tasks stay in the project, outside any section. */
export const removeSection = (record: Tasks, id: string): Tasks => tasksSchema.parse({...record, sections: (record.sections ?? []).filter(s => s.id !== id), tasks: record.tasks.map(t => t.sectionId === id ? omit(t, 'sectionId') : t)});
/** Every label in use, with how many open tasks carry it, by name. */
export function labelsInUse(record: Tasks): {name: string; open: number; colour?: TaskColour}[] {
  const counts = new Map<string, number>();
  for (const t of record.tasks) for (const l of t.labels ?? []) counts.set(l, (counts.get(l) ?? 0) + (t.doneAt ? 0 : 1));
  return [...counts].map(([name, open]) => ({name, open, ...(record.labelColors?.[name] ? {colour: record.labelColors[name]} : {})})).sort((a, b) => a.name.localeCompare(b.name));
}
export function renameLabel(record: Tasks, from: string, to: string): Tasks {
  const clean = to.trim().replace(/^@/, '');
  if (!LABEL_PATTERN.test(clean)) throw new Error('A label is one word: letters, numbers, “_” or “-”, up to 40.');
  return tasksSchema.parse({...record, tasks: record.tasks.map(t => t.labels?.includes(from) ? {...t, labels: [...new Set(t.labels.map(l => l === from ? clean : l))]} : t)});
}
export function saveFilter(record: Tasks, name: string, query: string, id = newId('filter')): Tasks {
  if (!name.trim() || !query.trim()) throw new Error('A saved filter needs a name and a search.');
  const filters = record.filters ?? [];
  return tasksSchema.parse({...record, filters: [...filters.filter(f => f.name.toLowerCase() !== name.trim().toLowerCase()), {id, name: name.trim().slice(0, 60), query: query.trim().slice(0, 200)}]});
}
export const removeFilter = (record: Tasks, id: string): Tasks => ({...record, filters: (record.filters ?? []).filter(f => f.id !== id)});
/** A project by name (case-insensitive), the way "#Home" names it; archived ones too, so a typed name is not duplicated. */
export const projectByName = (record: Tasks, name: string): Project | undefined => record.projects?.find(p => p.name.toLowerCase() === name.trim().toLowerCase());
export type {Project, Section, SavedFilter};

/* ---- Views (Session AL, P-LS-06) -------------------------------------------------------------------------------- */

export type TaskView =
  | {kind: 'inbox'} | {kind: 'today'} | {kind: 'upcoming'} | {kind: 'all'} | {kind: 'overdue'} | {kind: 'completed'}
  | {kind: 'project'; id: string} | {kind: 'label'; name: string} | {kind: 'priority'; level: TaskLevel} | {kind: 'filter'; id: string}
  /** Session AP: "This evening" and "Someday" (their own record, lib/tasks/when.ts) and the Priority matrix (lib/tasks/matrix.ts). */
  | {kind: 'evening'} | {kind: 'someday'} | {kind: 'matrix'};
/** The open top-level tasks a view lists (subtasks are shown under their parent), in the order it shows them. */
export function viewTasks(record: Tasks, view: TaskView, today: string, nowClock?: string): Task[] {
  const open = record.tasks.filter(t => !t.doneAt);
  const top = (list: Task[]) => list.filter(t => !t.parentId || !open.some(p => p.id === t.parentId));
  const dated = (list: Task[]) => openTasks({...record, tasks: list}, today);
  switch (view.kind) {
    case 'inbox': return byOrder(top(open.filter(t => !t.projectId)));
    case 'today': return dated(open.filter(t => t.due && t.due <= today)).sort((a, b) => Number(taskState(b, today, nowClock) === 'overdue') - Number(taskState(a, today, nowClock) === 'overdue'));
    case 'upcoming': return dated(open.filter(t => t.due && t.due >= today));
    case 'overdue': return dated(open.filter(t => taskState(t, today, nowClock) === 'overdue'));
    case 'all': return dated(top(open));
    case 'project': return byOrder(top(open.filter(t => t.projectId === view.id)));
    case 'label': return dated(open.filter(t => t.labels?.includes(view.name)));
    case 'priority': return dated(open.filter(t => taskLevel(t) === view.level));
    case 'filter': return [];
    // Session AP: the matrix sorts every open top-level task into its boxes; the two lists read their own record, in their view.
    case 'matrix': return dated(top(open));
    case 'evening': case 'someday': return [];
    case 'completed': return doneTasks(record);
  }
}
/** Session AL (LS-037): finished tasks whose local finish day is within the last 30 days. */
export const recentlyDone = (record: Tasks, today: string, doneDay: (iso: string) => string): Task[] => doneTasks(record).filter(t => doneDay(t.doneAt!) >= addLocalDays(today, -DONE_KEEP_DAYS));
/** Every finished occurrence, newest first: finished tasks and the past occurrences of repeating ones. */
export function completedLog(record: Tasks): {task: Task; at: string; occurrence: boolean}[] {
  const out: {task: Task; at: string; occurrence: boolean}[] = [];
  for (const t of record.tasks) {
    if (t.doneAt) out.push({task: t, at: t.doneAt, occurrence: false});
    for (const c of t.completions ?? []) if (c.at !== t.doneAt) out.push({task: t, at: c.at, occurrence: true});
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}
/** Upcoming grouped by day for the next `days` days (overdue first as its own group). */
export function upcomingByDay(record: Tasks, today: string, days = 14): {day: string; tasks: Task[]}[] {
  const list = viewTasks(record, {kind: 'upcoming'}, today), out: {day: string; tasks: Task[]}[] = [];
  for (let i = 0; i < days; i++) { const day = addLocalDays(today, i); out.push({day, tasks: list.filter(t => t.due === day)}); }
  const later = list.filter(t => t.due! > addLocalDays(today, days - 1));
  if (later.length) out.push({day: 'later', tasks: later});
  return out;
}
export {DEFAULT_LEVEL, taskLevel};

/**
 * Session AL (P-LS-42, LS-021): a goal's "Next actions" card in one line while folded: "1 open task · Buy running shoes",
 * "3 open tasks · next: Call the bank (overdue)", or "No next action yet".
 */
export function nextActionsSummary(record: Tasks, goalId: string, today: string): string {
  const open = goalNextActions(record, goalId, today);
  if (!open.length) return 'No next action yet · add the first small step';
  const first = open[0]!, late = taskState(first, today) === 'overdue' ? ' (overdue)' : '';
  return `${open.length} open ${open.length === 1 ? 'task' : 'tasks'} · ${open.length === 1 ? '' : 'next: '}${first.title}${late}`;
}

/* ---- Session AL fourth pass (L5-4) ------------------------------------------------------------------------------ */

/**
 * C-LS-08 "this one / all future": changes only this occurrence of a repeating task. The change becomes a one-off task on
 * this occurrence's day (no repeat), and the series moves on to its next day as a skip does, unchanged.
 */
export function editOccurrence(record: Tasks, id: string, patch: TaskPatch, today: string, {at = new Date(), id: oneId = newId('task')}: {at?: Date; id?: string} = {}): Tasks {
  const task = record.tasks.find(t => t.id === id);
  if (!task?.recur || !task.due) throw new Error('Only a repeating task has a single occurrence to change.');
  const stamp = at.toISOString();
  const one = taskSchema.parse({...omit(task, 'recur', 'completions', 'order'), id: oneId, createdAt: stamp, updatedAt: stamp});
  const withOne = tasksSchema.parse({...record, tasks: [...record.tasks, one]});
  const moved = skipOccurrence(withOne, id, today, at);
  const rest: TaskPatch = {...patch}; delete rest.recur; // the one-off never repeats
  return editTask(moved, oneId, rest, today, {allowPast: true, at});
}

/**
 * LS-H22 / C-LS-16: the order after dropping `from` on the row `target`. `after` (the pointer is on the lower half of the
 * target) puts it below the target, otherwise above. Dropping a row on its neighbour below therefore moves it down.
 */
export function dropOrder(siblings: readonly string[], from: string, target: string, after: boolean): string[] {
  const order = siblings.filter(x => x !== from), at = order.indexOf(target);
  if (at < 0) return [...siblings];
  order.splice(after ? at + 1 : at, 0, from);
  return order;
}

/** LS-037: the Completed list within its window (finished in the last 30 local days); older ones are counted apart. */
export function completedInWindow(record: Tasks, today: string, doneDay: (iso: string) => string): {log: ReturnType<typeof completedLog>; older: number} {
  const from = addLocalDays(today, -DONE_KEEP_DAYS), all = completedLog(record);
  const log = all.filter(e => doneDay(e.at) >= from);
  return {log, older: all.length - log.length};
}
