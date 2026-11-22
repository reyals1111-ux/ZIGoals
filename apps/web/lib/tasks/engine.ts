import {addLocalDays, localDate} from '../local-date';
import {nextOccurrence, olderDay, windowEnd} from './recurrence';
import {
  DEFAULT_LEVEL, LABEL_PATTERN, MAX_AFTER, MAX_COMPLETIONS, MAX_SUBTASK_DEPTH, MAX_TASK_MINUTES, TASK_LABELS_MAX, MAX_PROJECTS, MAX_SECTIONS, MAX_TASKS, DONE_KEEP_DAYS, TASK_CLOCK, TASK_TITLE_MAX,
  levelFields, taskLevel, taskSchema, tasksSchema, type HealthLink, type LabelGroup, type Project, type Recur, type SavedFilter, type Section,
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
  reminders?: TaskReminder[]; notes?: string; habit?: string; health?: HealthLink; order?: number;
  /** Session AV (F-DEADLINES): the day it must be done by, apart from the planned day. */
  deadline?: string;
  /** Session AV (F-TASK-MINUTES): how long it takes, in minutes. */
  minutes?: number};
export type AddOptions = {id: string; at: Date; today: string;
  /** Session AL (P-LS-11, DV-164): the Tasks page takes a past day (the task shows as overdue). Other callers keep the refusal. */
  allowPast?: boolean};

/** A task without some of its fields (a cleared project, section, parent or finish). */
const omit = (t: Task, ...keys: (keyof Task)[]): Task => { const out = {...t}; for (const k of keys) delete out[k]; return out; };
const cleanLabels = (labels: readonly string[] | undefined) => labels ? [...new Set(labels.map(l => l.trim().replace(/^@/, '')).filter(l => LABEL_PATTERN.test(l)))] : [];
function optional(input: Partial<TaskInput>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.level !== undefined) Object.assign(out, levelFields(input.level));
  for (const key of ['projectId', 'sectionId', 'parentId', 'recur', 'notes', 'habit', 'health', 'order', 'deadline', 'minutes'] as const) { const v = input[key]; if (v !== undefined && v !== '' && v !== null) out[key] = v; }
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
  if (input.deadline) checkDeadline(input.deadline, !!input.recur, options.today, !!options.allowPast);
  if (input.minutes !== undefined) checkMinutes(input.minutes);
  if (input.parentId && !record.tasks.some(t => t.id === input.parentId)) throw new Error('That parent task is no longer on this device.');
  const kept = prune(record, options.today);
  if (kept.tasks.length >= MAX_TASKS) throw new Error(TASK_LIMIT_MESSAGE);
  const at = options.at.toISOString();
  const extra = optional(input);
  // Session AV lane 2 (r6-plan, LEDGER #397, #398): one label of each group (the last typed wins); a repeat from the month's end keeps a plain day for older builds.
  if (Array.isArray(extra.labels)) { const one = oneOfEachGroup(extra.labels as string[], [], record.labelGroups); if (one.length) extra.labels = one; }
  if (input.recur && input.due) extra.recur = olderDay(input.recur, input.due);
  const task = taskSchema.parse({id: options.id, title, priority: input.priority ?? 'normal', ...(input.due ? {due: input.due} : {}), ...(input.time ? {time: input.time} : {}), ...(input.goal ? {goal: input.goal} : {}), ...extra, createdAt: at, updatedAt: at});
  return tasksSchema.parse({...kept, tasks: [...kept.tasks, task]});
}
/** A finished occurrence of a repeating task is kept on the task (its `completions`), and the task moves to its next day. */
export function finishTask(record: Tasks, id: string, at: Date, {today, doneDay}: {today?: string; doneDay?: string} = {}): Tasks {
  const finished = doneDay ?? localDate(at), now = today ?? finished, stamp = at.toISOString();
  const task = record.tasks.find(t => t.id === id);
  // Session AL (P-LS-01): finishing a parent finishes its open subtasks with it.
  const children = new Set(task && !task.recur ? descendants(record, id).filter(t => !t.doneAt).map(t => t.id) : []);
  // Session AV (owner follow-up 1, F-REPEAT-PAUSE; Things): when a repeating task comes round again, its finished
  // subtasks open again for the next time (a checklist that repeats with it).
  const comesRound = !!task?.recur && !task.doneAt && !!nextOccurrence(task.recur, task.due ?? finished, finished, now);
  const reset = new Set(comesRound ? descendants(record, id).filter(t => t.doneAt).map(t => t.id) : []);
  return tasksSchema.parse({...record, tasks: record.tasks.map(t => {
    if (reset.has(t.id)) return {...omit(t, 'doneAt'), updatedAt: stamp};
    if (t.id === id && t.recur && !t.doneAt) {
      const next = nextOccurrence(t.recur, t.due ?? finished, finished, now);
      const completions = [...(t.completions ?? []), {at: stamp, ...(t.due ? {due: t.due} : {})}].slice(-MAX_COMPLETIONS);
      // Session AV lane 2 (r4-plan, review B4D-2): a floating repeat's next copy floats again: no kept time, due by its window's last day.
      // Session AV lane 2 (r5-plan, LEDGER #350): a finished time is no longer "doing".
      if (next) return {...omit(t, ...(t.recur.flex ? ['time', 'state'] as const : ['state'] as const)), due: next.due, recur: next.rule, completions, updatedAt: stamp};
      return {...omit(t, 'state'), doneAt: stamp, completions, updatedAt: stamp};
    }
    return t.id === id || children.has(t.id) ? {...omit(t, 'state'), doneAt: stamp, updatedAt: stamp} : t;
  })});
}
/** Session AV lane 2 (r5-plan, LEDGER #350): a cancelled task ticked open again is an open task (its state goes). */
export const reopenTask = (record: Tasks, id: string): Tasks => tasksSchema.parse({...record, tasks: record.tasks.map(t => t.id === id ? omit(t, 'doneAt', 'state') : t)});
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
/* ---- Session AV (owner follow-up 1, F-DEADLINES; Things, Todoist Deadlines) -------------------------------------- */
export const DEADLINE_PAST_MESSAGE = 'Choose today or a later day for the deadline.';
export const DEADLINE_REPEAT_MESSAGE = 'A repeating task moves its own day each time, so it has no separate deadline. Leave the deadline empty, or stop the repeat.';
function checkDeadline(deadline: string, repeats: boolean, today: string, allowPast: boolean) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) throw new Error('Choose a day for the deadline.');
  if (repeats) throw new Error(DEADLINE_REPEAT_MESSAGE);
  if (deadline < today && !allowPast) throw new Error(DEADLINE_PAST_MESSAGE);
}
/**
 * Session AV (owner follow-up 1, F-REPEAT-PAUSE; TickTick's pause): a repeating task paused until a day — its first
 * occurrence on or after that day, the ones before it skipped (not recorded as done). Throws in words when the repeat
 * ends before then, or the day is not after today. Pure.
 */
export const PAUSE_PAST_MESSAGE = 'Choose a day after today to pause until.';
export function pausedDue(task: Pick<Task, 'recur' | 'due'>, until: string, today: string): string {
  if (!task.recur) throw new Error('Only a repeating task can be paused.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(until) || until <= today) throw new Error(PAUSE_PAST_MESSAGE);
  if (task.recur.afterDone) return until;
  const next = nextOccurrence({...task.recur, left: undefined}, task.due ?? today, today, until);
  if (!next || (task.recur.until && next.due > task.recur.until)) throw new Error('The repeat ends before then. Remove the task, or change the repeat.');
  return next.due;
}
/** Session AV (owner follow-up 1, F-TASK-MINUTES): a task's minutes, a whole number from 1 to a day. */
export const MINUTES_MESSAGE = `Enter the minutes as a whole number from 1 to ${MAX_TASK_MINUTES.toLocaleString('en-GB')}.`;
function checkMinutes(minutes: number) { if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_TASK_MINUTES) throw new Error(MINUTES_MESSAGE); }
export type DeadlineState = 'passed' | 'today' | 'soon' | 'later';
/** Where a task's deadline stands: passed, today, within 3 days, or later; null without one (or once done). */
export function deadlineState(task: Pick<Task, 'deadline' | 'doneAt'>, today: string): DeadlineState | null {
  if (!task.deadline || task.doneAt) return null;
  return task.deadline < today ? 'passed' : task.deadline === today ? 'today' : task.deadline <= addLocalDays(today, 3) ? 'soon' : 'later';
}
/** Open tasks whose deadline is today or has passed, whatever day they are planned for (Things: a deadline reaches Today). */
export const deadlineDue = (task: Pick<Task, 'deadline' | 'doneAt'>, today: string) => { const s = deadlineState(task, today); return s === 'passed' || s === 'today'; };
export function prune(record: Tasks, today: string, doneDay: (iso: string) => string = iso => iso.slice(0, 10)): Tasks {
  const from = addLocalDays(today, -DONE_KEEP_DAYS);
  return {...record, tasks: record.tasks.filter(t => !t.doneAt || doneDay(t.doneAt) >= from)};
}
/**
 * Session AV lane 2 (r4-plan, review B4D-2): the last day a task is on time — its day; for a repeat that floats in its week
 * or month, the last day of that window (planned for a Wednesday, it is not late on Thursday while its week runs).
 */
export const onTimeUntil = (t: Pick<Task, 'due' | 'recur'>): string | undefined => t.due && t.recur?.flex ? windowEnd(t.recur.flex, t.due) : t.due;
export const isLate = (t: Pick<Task, 'due' | 'recur'>, today: string): boolean => !!t.due && onTimeUntil(t)! < today;
/** How many open tasks are late on `date` (the "Plan your day" notification's count, lib/notify/sync.ts). */
/** Session AV lane 2 (r6-plan, LEDGER #392): a task of a project on hold is not counted. */
export const lateCount = (record: Pick<Tasks, 'tasks'> & Partial<Pick<Tasks, 'projects'>>, date: string): number => record.tasks.filter(t => !t.doneAt && isLate(t, date) && !heldProject(record, t, date)).length;
export type TaskState = 'overdue' | 'today' | 'soon' | 'later' | 'someday';
export function taskState(task: Task, today: string, nowClock?: string): TaskState {
  if (!task.due) return 'someday';
  if (task.due < today) return isLate(task, today) ? 'overdue' : 'today';
  // Session AL (P-LS-12, LS-011): a timed task due today is late once its time has passed (when the clock is given); a
  // floating repeat is not, while its window runs (review B4D-2).
  if (task.due === today) return nowClock && task.time && task.time < nowClock && isLate(task, addLocalDays(today, 1)) ? 'overdue' : 'today';
  return task.due <= addLocalDays(today, 7) ? 'soon' : 'later';
}
/**
 * Session AV lane 2 (r4-plan, LEDGER #304; Motion's blockers): the open tasks this task still waits for. A task no longer
 * on the list, done, repeating (it never finishes for good), itself, or one waiting for this task in turn is not waited for.
 * A waiting task is not in Today (nor Today's count) and is not placed; it joins its day once they are done.
 */
export function waitingFor(record: Pick<Tasks, 'tasks'>, task: Pick<Task, 'id' | 'after' | 'doneAt'>): Task[] {
  if (!task.after?.length || task.doneAt) return [];
  return task.after.flatMap(id => { const t = id !== task.id ? record.tasks.find(x => x.id === id) : undefined; return t && !t.doneAt && !t.recur && !t.after?.includes(task.id) ? [t] : []; });
}
export const WAIT_LOOP_MESSAGE = 'That task already waits for this one, so this one cannot wait for it.';
/* ---- Session AV lane 2 (r6-plan, LEDGER #392, #393, #397; OmniFocus's On Hold, sequential projects, tag groups) ---------- */
/** Whether a project is on hold on `today`: from its hold until the day before `until` (none: until it is resumed). */
export const projectHeld = (p: Pick<Project, 'hold'> | undefined, today: string): boolean => !!p?.hold && (!p.hold.until || p.hold.until > today);
type Lookup = Pick<Tasks, 'tasks'> & Partial<Pick<Tasks, 'projects' | 'sections'>>;
/** The project on hold a task belongs to (its own, or its top task's), or undefined. */
export function heldProject(record: Lookup, task: Pick<Task, 'projectId' | 'parentId'>, today: string): Project | undefined {
  const projects = record.projects;
  if (!projects?.some(p => p.hold)) return undefined;
  let t: Pick<Task, 'projectId' | 'parentId'> | undefined = task;
  for (let steps = 0; t && !t.projectId && t.parentId && steps < MAX_SUBTASK_DEPTH; steps++) { const parent: string = t.parentId; t = record.tasks.find(x => x.id === parent); }
  const pid = t?.projectId, p = pid ? projects.find(x => x.id === pid) : undefined;
  return p && projectHeld(p, today) ? p : undefined;
}
const AHEAD = new WeakMap<object, Map<string, Task>>();
/**
 * In-order projects and tasks with subtasks: each open task that waits its turn, with the one now up (the first open one,
 * in the order the project lists them, that waits for no other task: no section first, then each section; an archived
 * section's tasks are put away). A
 * repeating task never waits and never holds the others up (it never finishes for good).
 */
export function orderAhead(record: Lookup): Map<string, Task> {
  const cached = AHEAD.get(record); if (cached) return cached;
  // Review B6M-2: the task now up is the first open one that does not wait for another task (`after`), so a line can never
  // block for good (a head waiting for a later task of its own line lets that task go first). A task that waits for another
  // keeps that wait as its reason; every other open task of the line waits its turn after the one now up.
  const out = new Map<string, Task>(), line = (list: Task[]) => {
    const open = list.filter(t => !t.doneAt && !t.recur), free = open.filter(t => !waitingFor(record, t).length), head = free[0];
    if (head) for (const t of free.slice(1)) out.set(t.id, head);
  };
  for (const p of record.projects ?? []) {
    if (!p.inOrder) continue;
    const sections = (record.sections ?? []).filter(s => s.projectId === p.id).sort((a, b) => a.order - b.order), at = new Map(sections.map((s, i) => [s.id, i])), away = new Set(sections.filter(s => s.archived).map(s => s.id));
    const rank = (t: Task) => t.sectionId ? at.get(t.sectionId) ?? -1 : -1;
    line(byOrder(record.tasks.filter(t => t.projectId === p.id && !t.parentId && !(t.sectionId && away.has(t.sectionId)))).sort((a, b) => rank(a) - rank(b)));
  }
  for (const t of record.tasks) if (t.inOrder && !t.doneAt) line(byOrder(record.tasks.filter(k => k.parentId === t.id)));
  AHEAD.set(record, out);
  return out;
}
/** The open task a task waits its turn after (its own, or the one a task above it waits after), or undefined. */
export function waitsTurn(record: Lookup, task: Pick<Task, 'id' | 'parentId' | 'doneAt'>): Task | undefined {
  if (task.doneAt) return undefined;
  const ahead = orderAhead(record); // computed once per record (cached)
  if (!ahead.size) return undefined;
  let t: Pick<Task, 'id' | 'parentId'> | undefined = task;
  for (let steps = 0; t && steps <= MAX_SUBTASK_DEPTH; steps++) { const a = ahead.get(t.id); if (a) return a; const parent: string | undefined = t.parentId; t = parent ? record.tasks.find(x => x.id === parent) : undefined; }
  return undefined;
}
/** Out of Today, Upcoming, the matrix and the plans for now: its project is on hold, or it waits its turn. */
export const setAside = (record: Lookup, task: Task, today: string): boolean => !!heldProject(record, task, today) || !!waitsTurn(record, task);
/** One label of each group: where several of a group are given, the newly given one stays (the last one, if several are new). */
export function oneOfEachGroup(labels: readonly string[], before: readonly string[], groups: readonly LabelGroup[] | undefined): string[] {
  if (!groups?.length) return [...labels];
  let out = [...labels];
  for (const g of groups) {
    const inGroup = out.filter(l => g.labels.includes(l));
    if (inGroup.length < 2) continue;
    const fresh = inGroup.filter(l => !before.includes(l)), keep = (fresh.length ? fresh : inGroup).at(-1)!;
    out = out.filter(l => !g.labels.includes(l) || l === keep);
  }
  return out;
}
/**
 * Review B6M-1: the one way a label is given to a task — by the Select bar, a project's rule and a rename (the editor and quick
 * add give a whole list, read by the same oneOfEachGroup in editTask and addTask). The label is added and its group's other
 * label goes; the list is returned unchanged when the task has it already, or carries the most labels a task keeps.
 */
export function withLabel(labels: readonly string[] | undefined, label: string, groups: readonly LabelGroup[] | undefined): string[] {
  const now = [...(labels ?? [])];
  if (now.includes(label)) return now;
  const next = oneOfEachGroup([...now, label], now, groups);
  return next.length > TASK_LABELS_MAX ? now : next;
}
/** Whether `from` waits for `target`, directly or through the tasks it waits for (bounded by the list). */
function waitsThrough(record: Tasks, from: string, target: string): boolean {
  const seen = new Set<string>(), todo = [from];
  while (todo.length && seen.size <= record.tasks.length) { const at = todo.pop()!; if (at === target) return true; if (seen.has(at)) continue; seen.add(at); todo.push(...(record.tasks.find(t => t.id === at)?.after ?? [])); }
  return false;
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
  recur?: Recur | null; reminders?: TaskReminder[]; notes?: string | null; habit?: string | null; health?: HealthLink | null; order?: number;
  /** Session AV (F-DEADLINES). */
  deadline?: string | null;
  /** Session AV (F-TASK-MINUTES). */
  minutes?: number | null;
  /** Session AV lane 2 (tasks): start-early days, a background task, minutes worked, the week objective, comments. */
  early?: number | null; parallel?: true | null; spent?: number | null; objective?: string | null; comments?: NonNullable<Task['comments']>;
  /** Session AV lane 2 (tasks-r2, LEDGER #229): the values of the project's own fields (lib/tasks/custom-fields.ts checks them); null clears all. */
  fields?: NonNullable<Task['fields']> | null;
  /** Session AV lane 2 (r3-plan, LEDGER #257, #259): the task's symbol and colour, and how much it asks (null clears). */
  look?: NonNullable<Task['look']> | null; energy?: NonNullable<Task['energy']> | null;
  /** Session AV lane 2 (r4-plan, LEDGER #303, #304, #301): the smallest piece, the tasks it waits for ([] clears), "after hours". */
  chunk?: number | null; after?: string[]; afterHours?: true | null;
  /** Session AV lane 2 (r5-plan, LEDGER #349, #348, #353, #354): a week or a month without a day, the time block, travel minutes, a place. */
  plan?: NonNullable<Task['plan']> | null; block?: string | null; travel?: number | null; place?: string | null;
  /** Session AV lane 2 (r6-plan, LEDGER #393): its subtasks one at a time, in order (null ends it). */
  inOrder?: true | null};
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
  for (const key of ['due', 'time', 'goal', 'projectId', 'sectionId', 'parentId', 'recur', 'notes', 'habit', 'health', 'deadline', 'minutes', 'early', 'parallel', 'spent', 'objective', 'look', 'energy', 'chunk', 'afterHours', 'plan', 'block', 'travel', 'place', 'inOrder'] as const) { const value = patch[key]; if (value === null || value === '') delete next[key]; else if (value !== undefined) next[key] = value; }
  if (patch.projectId !== undefined && patch.sectionId === undefined && next.sectionId) {
    const section = record.sections?.find(s => s.id === next.sectionId);
    if (!section || section.projectId !== next.projectId) delete next.sectionId;
  }
  // Session AV lane 2 (r6-plan, LEDGER #397): a label given from a group takes the group's other label away.
  if (patch.labels !== undefined) { const labels = oneOfEachGroup(cleanLabels(patch.labels), task.labels ?? [], record.labelGroups); if (labels.length) next.labels = labels; else delete next.labels; }
  if (patch.reminders !== undefined) { if (patch.reminders.length) next.reminders = patch.reminders; else delete next.reminders; }
  if (patch.comments !== undefined) { if (patch.comments.length) next.comments = patch.comments; else delete next.comments; }
  if (patch.fields !== undefined) { if (patch.fields && Object.keys(patch.fields).length) next.fields = patch.fields; else delete next.fields; }
  if (patch.order !== undefined) next.order = patch.order;
  // Session AV lane 2 (r4-plan, LEDGER #304): never itself, never one that already waits for it (directly or through others).
  if (patch.after !== undefined) {
    const ids = [...new Set(patch.after)].filter(x => x !== id).slice(0, MAX_AFTER);
    if (ids.some(x => waitsThrough(record, x, id))) throw new Error(WAIT_LOOP_MESSAGE);
    if (ids.length) next.after = ids; else delete next.after;
  }
  if (typeof next.due === 'string' && next.due !== task.due && next.due < today && !allowPast) throw new Error(PAST_DAY_MESSAGE);
  if (next.time !== undefined && !next.due) throw new Error('Choose a day for the task before a time.');
  if (typeof next.time === 'string' && !TASK_CLOCK.test(next.time)) throw new Error('Choose a time such as 09:30.');
  if (next.recur && !next.due) throw new Error('A repeating task needs its first day.');
  if (patch.recur && typeof next.due === 'string') next.recur = olderDay(patch.recur, next.due); // Session AV lane 2 (r6-plan, LEDGER #398)
  if (typeof patch.minutes === 'number') checkMinutes(patch.minutes);
  // Session AV (F-DEADLINES): checked when the deadline or the repeat changes; an old passed deadline left alone is kept.
  if (typeof next.deadline === 'string' && (next.deadline !== task.deadline || (next.recur && !task.recur))) checkDeadline(next.deadline, !!next.recur, next.deadline === task.deadline ? '0000-01-01' : today, allowPast);
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
  // Session AV lane 2 (r4-plan, LEDGER #304): a task that waits for another is not in Today's count.
  // Session AV lane 2 (r6-plan, LEDGER #392, #393): nor a task of a project on hold (not overdue either), nor one waiting its turn.
  return {open: open.length, overdue: open.filter(t => taskState(t, today, nowClock) === 'overdue' && !heldProject(record, t, today)).length, today: open.filter(t => taskState(t, today, nowClock) === 'today' && !waitingFor(record, t).length && !setAside(record, t, today)).length};
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
  return editTask(record, id, {due: next.due, recur: next.rule, ...(task.recur.flex ? {time: null} : {})}, today, {allowPast: true, at});
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
  | {kind: 'evening'} | {kind: 'someday'} | {kind: 'matrix'}
  /** Session AV lane 2 (tasks): This week, Table, Calendar, Timeline, Insights, Areas and templates (components/tasks/tasks-plan-views.tsx). */
  | {kind: 'week'} | {kind: 'table'} | {kind: 'days'} | {kind: 'timeline'} | {kind: 'insights'} | {kind: 'organise'}
  /** Session AV lane 2 (r6-plan, LEDGER #395): the projects whose review has come round (components/tasks/project-review.tsx). */
  | {kind: 'review'};
/** The open top-level tasks a view lists (subtasks are shown under their parent), in the order it shows them. */
export function viewTasks(record: Tasks, view: TaskView, today: string, nowClock?: string): Task[] {
  const open = record.tasks.filter(t => !t.doneAt);
  const top = (list: Task[]) => list.filter(t => !t.parentId || !open.some(p => p.id === t.parentId));
  const dated = (list: Task[]) => openTasks({...record, tasks: list}, today);
  switch (view.kind) {
    case 'inbox': return byOrder(top(open.filter(t => !t.projectId)));
    // Session AV (F-DEADLINES): a task whose deadline is today or has passed is in Today too, whatever its planned day.
    // Session AV lane 2 (LEDGER #17; Things' start early): a task with `early` days shows from that many days before its day.
    // Session AV lane 2 (r4-plan, LEDGER #304): a task that waits for another joins Today once those are done.
    // Session AV lane 2 (r5-plan, LEDGER #350; Logseq's DOING): a task being done is in Today, first, also without a day.
    // Session AV lane 2 (r6-plan, LEDGER #392, #393): a task of a project on hold, or one waiting its turn, is out of Today,
    // Upcoming and the matrix (Overdue: on hold only); it is in its project's list, and in All open, as before.
    case 'today': return dated(open.filter(t => !waitingFor(record, t).length && !setAside(record, t, today) && (t.state?.kind === 'doing' || (t.due && (t.due <= today || (t.early && addLocalDays(t.due, -t.early) <= today))) || deadlineDue(t, today)))).sort((a, b) => Number(b.state?.kind === 'doing') - Number(a.state?.kind === 'doing') || Number(taskState(b, today, nowClock) === 'overdue') - Number(taskState(a, today, nowClock) === 'overdue'));
    case 'upcoming': return dated(open.filter(t => t.due && t.due >= today && !setAside(record, t, today)));
    case 'overdue': return dated(open.filter(t => taskState(t, today, nowClock) === 'overdue' && !heldProject(record, t, today)));
    case 'all': return dated(top(open));
    case 'project': return byOrder(top(open.filter(t => t.projectId === view.id)));
    case 'label': return dated(open.filter(t => t.labels?.includes(view.name)));
    case 'priority': return dated(open.filter(t => taskLevel(t) === view.level));
    case 'filter': return [];
    // Session AP: the matrix sorts every open top-level task into its boxes; the two lists read their own record, in their view.
    case 'matrix': return dated(top(open.filter(t => !setAside(record, t, today))));
    case 'evening': case 'someday': return [];
    // Session AV lane 2 (tasks): the planning and layout views read the record themselves (tasks-plan-views.tsx).
    case 'week': case 'table': case 'days': case 'timeline': case 'insights': case 'organise': case 'review': return [];
    case 'completed': return doneTasks(record);
  }
}
/** Session AL (LS-037): finished tasks whose local finish day is within the last 30 days. */
export const recentlyDone = (record: Tasks, today: string, doneDay: (iso: string) => string): Task[] => doneTasks(record).filter(t => doneDay(t.doneAt!) >= addLocalDays(today, -DONE_KEEP_DAYS));
/** Every finished occurrence, newest first: finished tasks and the past occurrences of repeating ones. */
/** Session AV lane 2 (r5-plan, LEDGER #350): `cancelled` marks a task closed without being done (never counted as a finish). */
export function completedLog(record: Tasks): {task: Task; at: string; occurrence: boolean; cancelled?: true}[] {
  const out: {task: Task; at: string; occurrence: boolean; cancelled?: true}[] = [];
  for (const t of record.tasks) {
    if (t.doneAt) out.push({task: t, at: t.doneAt, occurrence: false, ...(t.state?.kind === 'cancelled' ? {cancelled: true as const} : {})});
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
