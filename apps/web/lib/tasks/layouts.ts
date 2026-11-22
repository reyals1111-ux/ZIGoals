import {addLocalDays, localWeekday} from '../local-date';
import {openTasks, byOrder} from './engine';
import {DEFAULT_BLOCK, blockLength, piecesOf} from './pieces';
import {closedBusy} from './work-hours';
import type {HoursBlock} from './plan-record';
import {MAX_AREAS, MAX_OBJECTIVES, MAX_TASK_MINUTES, TASK_TITLE_MAX, PROJECT_NAME_MAX, taskLevel, tasksSchema, type Area, type Objective, type Task, type Tasks} from './schema';

/**
 * Session AV lane 2 (tasks; Todoist, TickTick, Things, Sunsama, Notion): the pure parts of the planning and layout views
 * — fitting today's tasks around the day's fixed times, the week's objectives, Areas above projects, start-early days,
 * comments, time spent, and the table, 3-day, month, year and timeline layouts and the chart from your lists. Everything
 * reads the task list (and, for the year, the finishes per day); what it writes goes through the list's own change.
 */

/* ---- Clock helpers --------------------------------------------------------------------------------------------- */
export const toMin = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
export const toClock = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
/** The Monday of the week a day is in (weeks start on Monday, as the weekly review's do). */
export const weekStart = (day: string) => addLocalDays(day, -((localWeekday(day) + 6) % 7));

/* ---- Plan my day around the Agenda (Sunsama's timeboxing, LEDGER #21, #24) ------------------------------------- */

export type Busy = {start: number; end: number; title: string};
/** Session AV lane 2 (r4-plan, LEDGER #303): a piece of a long task says which part it is ("part 2 of 4"). */
export type Placement = {task: Task; start: string; end: string; minutes: number; part?: number; of?: number};
export {DEFAULT_BLOCK};
/** The first start from `start` where `need` minutes fit before `end` without touching a taken block; -1 when none. Pure. */
export function firstFit(need: number, taken: readonly {start: number; end: number}[], start: number, end: number, gap = 0): number {
  let at = start;
  for (let guard = 0; guard < 400 && at + need <= end; guard++) {
    const clash = taken.find(b => at < b.end && at + need > b.start);
    if (!clash) return at;
    at = Math.max(at + 1, clash.end + gap);
  }
  return -1;
}
/**
 * Places today's tasks that have no time into the free time between the day's fixed items (timed tasks and imported
 * events), from `from` (now, rounded up to the next quarter hour, or the day's start) to `until`, in the order given,
 * each for its own minutes (30 when it has none). Background tasks (`parallel`) take no slot. A task that fits nowhere
 * is listed in `left`. Pure.
 * Session AV lane 2 (r4-plan): with `windows` (LEDGER #301, the day's working hours) nothing is placed outside them, and an
 * "after hours" task goes in `after` (the evening hours) instead, past `until`; a task in pieces (LEDGER #303, `chunk`)
 * is placed piece by piece, each where it first fits, and the pieces that find no room today are counted in `rest`.
 */
export function fitDay(tasks: readonly Task[], busy: readonly Busy[], {from, until, gap = 0, windows, after}: {from: string; until: string; gap?: number; windows?: readonly HoursBlock[]; after?: readonly HoursBlock[]}): {placed: Placement[]; left: Task[]; rest: {task: Task; pieces: number}[]} {
  const blocks = [...busy].filter(b => b.end > b.start).sort((a, b) => a.start - b.start), placed: Placement[] = [], left: Task[] = [], rest: {task: Task; pieces: number}[] = [];
  // First fit: each task takes the earliest free time that holds it, so a short one fills a gap a long one skipped.
  const start = Math.ceil(toMin(from) / 15) * 15, end = toMin(until);
  const taken: {start: number; end: number}[] = blocks.map(b => ({start: b.start, end: b.end}));
  const closedWork = windows ? closedBusy(windows) : [], closedAfter = after ? closedBusy(after) : closedWork;
  for (const task of tasks) {
    if (task.time || task.parallel) continue;
    const late = !!task.afterHours && !!after, closed = late ? closedAfter : closedWork, stop = late ? 24 * 60 : end;
    const {pieces, done} = piecesOf(task), of = done + pieces.length, split = pieces.length > 1 || done > 0;
    let cursor = start, kept = 0;
    for (const piece of pieces) {
      const need = Math.min(piece, MAX_TASK_MINUTES), found = firstFit(need, [...taken, ...closed], cursor, stop, gap);
      if (found < 0) break;
      taken.push({start: found, end: found + need});
      placed.push({task, start: toClock(found), end: toClock(found + need), minutes: need, ...(split ? {part: done + kept + 1, of} : {})});
      kept++; cursor = found + need;
    }
    if (!kept) left.push(task); else if (kept < pieces.length) rest.push({task, pieces: pieces.length - kept});
  }
  return {placed: placed.sort((a, b) => a.start.localeCompare(b.start)), left, rest};
}
/** The next free slot of `minutes` after `from` (Sunsama's "next free slot"), or null when the day is full. */
export function nextFreeSlot(minutes: number, busy: readonly Busy[], from: string, until: string): string | null {
  const fake = {id: 'slot', title: 'slot', priority: 'normal', createdAt: '2000-01-01T00:00:00.000Z', minutes} as Task;
  return fitDay([fake], busy, {from, until}).placed[0]?.start ?? null;
}
/**
 * The day's fixed items as busy blocks: tasks with a time on that day (their minutes, else 30; Session AV lane 2 (r4-plan,
 * LEDGER #303): a task in pieces holds one piece). `except` leaves some out (the tasks being planned again).
 */
export function taskBusy(record: Tasks, day: string, except?: ReadonlySet<string>): Busy[] {
  return record.tasks.filter(t => !t.doneAt && t.due === day && t.time && !t.parallel && !except?.has(t.id)).map(t => ({start: toMin(t.time!), end: toMin(t.time!) + blockLength(t), title: t.title}));
}
/** Sunsama's workload line: the minutes planned against the day's limit. */
export function overLimit(minutes: number, limit: number | undefined): {over: boolean; by: number} {
  return limit && minutes > limit ? {over: true, by: minutes - limit} : {over: false, by: 0};
}

/* ---- Week objectives (Sunsama, LEDGER #22, #23) ---------------------------------------------------------------- */

export const weekObjectives = (record: Tasks, week: string): Objective[] => (record.objectives ?? []).filter(o => o.week === week);
export function addObjective(record: Tasks, input: {week: string; title: string; goal?: string}, id: string): Tasks {
  const title = input.title.trim().replace(/\s+/g, ' ');
  if (!title) throw new Error('Give the objective a few words.');
  if (title.length > TASK_TITLE_MAX) throw new Error(`An objective can be at most ${TASK_TITLE_MAX} characters.`);
  if ((record.objectives?.length ?? 0) >= MAX_OBJECTIVES) throw new Error(`This device keeps ${MAX_OBJECTIVES} objectives. Remove an old week's first.`);
  return tasksSchema.parse({...record, objectives: [...(record.objectives ?? []), {id, week: weekStart(input.week), title, ...(input.goal ? {goal: input.goal} : {})}]});
}
export function finishObjective(record: Tasks, id: string, done: boolean, at: Date): Tasks {
  return tasksSchema.parse({...record, objectives: (record.objectives ?? []).map(o => { if (o.id !== id) return o; const {doneAt: _d, ...rest} = o; void _d; return done ? {...rest, doneAt: at.toISOString()} : rest; })});
}
/** Removes an objective; its tasks keep everything but the link. */
export function removeObjective(record: Tasks, id: string): Tasks {
  return tasksSchema.parse({...record, objectives: (record.objectives ?? []).filter(o => o.id !== id), tasks: record.tasks.map(t => { if (t.objective !== id) return t; const {objective: _o, ...rest} = t; void _o; return rest; })});
}
/** Links (or unlinks, null) a task to an objective. */
export function linkObjective(record: Tasks, taskId: string, objectiveId: string | null): Tasks {
  if (objectiveId && !record.objectives?.some(o => o.id === objectiveId)) throw new Error('That objective is no longer on this device.');
  return tasksSchema.parse({...record, tasks: record.tasks.map(t => { if (t.id !== taskId) return t; const {objective: _o, ...rest} = t; void _o; return objectiveId ? {...rest, objective: objectiveId} : rest; })});
}
/** An objective's tasks and how many are done. */
export function objectiveProgress(record: Tasks, id: string): {tasks: Task[]; done: number} {
  const tasks = record.tasks.filter(t => t.objective === id && !t.parentId);
  return {tasks, done: tasks.filter(t => t.doneAt).length};
}
/** The week's open objectives carried to the next week (Sunsama's "roll over"), as new objectives there. */
export function carryObjectives(record: Tasks, fromWeek: string, ids: () => string): Tasks {
  const next = addLocalDays(weekStart(fromWeek), 7), have = new Set(weekObjectives(record, next).map(o => o.title.toLowerCase()));
  return weekObjectives(record, weekStart(fromWeek)).filter(o => !o.doneAt && !have.has(o.title.toLowerCase())).reduce((r, o) => addObjective(r, {week: next, title: o.title, ...(o.goal ? {goal: o.goal} : {})}, ids()), record);
}

/* ---- Areas above projects (Things' Areas, TickTick's folders, Sunsama's contexts; LEDGER #12, #20, #28) ------------ */

export function addArea(record: Tasks, name: string, id: string): Tasks {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean) throw new Error('Give the area a name.');
  if (clean.length > PROJECT_NAME_MAX) throw new Error(`An area's name can be at most ${PROJECT_NAME_MAX} characters.`);
  if ((record.areas?.length ?? 0) >= MAX_AREAS) throw new Error(`This device keeps ${MAX_AREAS} areas.`);
  if (record.areas?.some(a => a.name.toLowerCase() === clean.toLowerCase())) throw new Error(`There is already an area called “${clean}”.`);
  return tasksSchema.parse({...record, areas: [...(record.areas ?? []), {id, name: clean, order: record.areas?.length ?? 0}]});
}
export function renameArea(record: Tasks, id: string, name: string): Tasks {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean) throw new Error('Give the area a name.');
  return tasksSchema.parse({...record, areas: (record.areas ?? []).map(a => a.id === id ? {...a, name: clean.slice(0, PROJECT_NAME_MAX)} : a)});
}
/** Removes an area; its projects stay, outside any area. */
export function removeArea(record: Tasks, id: string): Tasks {
  return tasksSchema.parse({...record, areas: (record.areas ?? []).filter(a => a.id !== id), projects: (record.projects ?? []).map(p => { if (p.areaId !== id) return p; const {areaId: _a, ...rest} = p; void _a; return rest; })});
}
export function setProjectArea(record: Tasks, projectId: string, areaId: string | null): Tasks {
  if (areaId && !record.areas?.some(a => a.id === areaId)) throw new Error('That area is no longer on this device.');
  return tasksSchema.parse({...record, projects: (record.projects ?? []).map(p => { if (p.id !== projectId) return p; const {areaId: _a, ...rest} = p; void _a; return areaId ? {...rest, areaId} : rest; })});
}
/** Whether a task belongs to an area (through its project). */
export function inArea(record: Pick<Tasks, 'projects'>, task: Pick<Task, 'projectId'>, areaId: string): boolean {
  return !!task.projectId && record.projects?.find(p => p.id === task.projectId)?.areaId === areaId;
}
/** Projects grouped under their areas, in order; projects outside an area last. */
export function projectsByArea(record: Tasks): {area: Area | null; projects: NonNullable<Tasks['projects']>}[] {
  const areas = [...(record.areas ?? [])].sort((a, b) => a.order - b.order), live = (record.projects ?? []).filter(p => !p.archived);
  const known = new Set(areas.map(a => a.id));
  return [...areas.map(a => ({area: a, projects: live.filter(p => p.areaId === a.id)})), {area: null, projects: live.filter(p => !p.areaId || !known.has(p.areaId))}];
}
/** Archives (or brings back) a section as one block: the section is put away; its tasks stay in their project. */
export function archiveSection(record: Tasks, id: string, archived: boolean): Tasks {
  return tasksSchema.parse({...record, sections: (record.sections ?? []).map(s => { if (s.id !== id) return s; const {archived: _a, ...rest} = s; void _a; return archived ? {...rest, archived: true} : rest; })});
}

/* ---- Task extras: start early, background, time spent, comments (Things, Sunsama, Todoist) ----------------------- */

/** Whether a task with start-early days shows in Today already (from `early` days before its day up to the day). */
export const startsEarlyBy = (task: Pick<Task, 'due' | 'early' | 'doneAt'>, today: string): boolean => !task.doneAt && !!task.due && !!task.early && task.due > today && addLocalDays(task.due, -task.early) <= today;
function patchTask(record: Tasks, id: string, fn: (t: Record<string, unknown>) => void, at: Date): Tasks {
  if (!record.tasks.some(t => t.id === id)) throw new Error('That task is no longer on this device.');
  return tasksSchema.parse({...record, tasks: record.tasks.map(t => { if (t.id !== id) return t; const next: Record<string, unknown> = {...t}; fn(next); next.updatedAt = at.toISOString(); return next; })});
}
export function setTaskExtras(record: Tasks, id: string, patch: {early?: number | null; parallel?: boolean}, at = new Date()): Tasks {
  return patchTask(record, id, t => {
    if (patch.early === null || patch.early === 0) delete t.early; else if (patch.early !== undefined) { if (!Number.isInteger(patch.early) || patch.early < 1 || patch.early > 60) throw new Error('Start early by 1 to 60 days.'); t.early = patch.early; }
    if (patch.parallel === false) delete t.parallel; else if (patch.parallel) t.parallel = true;
  }, at);
}
/** Adds minutes worked (the timer, or typed); `set` replaces the total. */
export function addSpent(record: Tasks, id: string, minutes: number, {set = false, at = new Date()}: {set?: boolean; at?: Date} = {}): Tasks {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 100_000) throw new Error('Enter whole minutes.');
  return patchTask(record, id, t => { const total = set ? minutes : ((t.spent as number | undefined) ?? 0) + minutes; if (total) t.spent = Math.min(total, 100_000); else delete t.spent; }, at);
}
export const COMMENT_MAX = 1000, COMMENTS_MAX = 50;
export function addComment(record: Tasks, taskId: string, text: string, {id, at}: {id: string; at: Date}): Tasks {
  const clean = text.trim();
  if (!clean) throw new Error('Write a comment first.');
  if (clean.length > COMMENT_MAX) throw new Error(`A comment can be at most ${COMMENT_MAX} characters.`);
  const task = record.tasks.find(t => t.id === taskId);
  if ((task?.comments?.length ?? 0) >= COMMENTS_MAX) throw new Error(`A task keeps ${COMMENTS_MAX} comments. Remove an old one first.`);
  return patchTask(record, taskId, t => { t.comments = [...((t.comments as unknown[] | undefined) ?? []), {id, at: at.toISOString(), text: clean}]; }, at);
}
export function removeComment(record: Tasks, taskId: string, commentId: string, at = new Date()): Tasks {
  return patchTask(record, taskId, t => { const left = ((t.comments as {id: string}[] | undefined) ?? []).filter(c => c.id !== commentId); if (left.length) t.comments = left; else delete t.comments; }, at);
}
/** The web links in a comment, so each can be opened (http and https only; anything else stays text). */
export function commentParts(text: string): {text: string; href?: string}[] {
  const out: {text: string; href?: string}[] = [], re = /https?:\/\/[^\s<>"')]+/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({text: text.slice(last, m.index)});
    let href: string | undefined;
    try { const u = new URL(m[0]); href = u.protocol === 'http:' || u.protocol === 'https:' ? u.href : undefined; } catch { href = undefined; }
    out.push(href ? {text: m[0], href} : {text: m[0]});
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({text: text.slice(last)});
  return out;
}

/* ---- Planned vs actual (Sunsama, LEDGER #25) ------------------------------------------------------------------- */

/** Planned and worked minutes of a set of tasks (each task once). */
export function plannedVsActual(tasks: readonly Task[]): {planned: number; actual: number; withBoth: number} {
  let planned = 0, actual = 0, withBoth = 0;
  for (const t of tasks) { if (t.parentId) continue; planned += t.minutes ?? 0; actual += t.spent ?? 0; if (t.minutes && t.spent) withBoth++; }
  return {planned, actual, withBoth};
}

/* ---- The table (Todoist, Notion; LEDGER #7, #12, #29) ------------------------------------------------------------ */

export const TABLE_COLUMNS = ['title', 'project', 'priority', 'due', 'deadline', 'minutes', 'spent', 'labels', 'created', 'changed'] as const;
export type TableColumn = (typeof TABLE_COLUMNS)[number];
export function tableRows(record: Tasks, today: string, sort: TableColumn, dir: 'asc' | 'desc', projectId?: string): Task[] {
  const rows = openTasks(record, today).filter(t => !projectId || t.projectId === projectId);
  const name = (t: Task) => record.projects?.find(p => p.id === t.projectId)?.name ?? '';
  const key = (t: Task): string | number => {
    switch (sort) {
      case 'title': return t.title.toLowerCase();
      case 'project': return name(t).toLowerCase() || '￿';
      case 'priority': return taskLevel(t);
      case 'due': return t.due ? `${t.due}${t.time ?? ''}` : '￿';
      case 'deadline': return t.deadline ?? '￿';
      case 'minutes': return t.minutes ?? -1;
      case 'spent': return t.spent ?? -1;
      case 'labels': return (t.labels ?? []).join(' ').toLowerCase() || '￿';
      case 'created': return t.createdAt;
      case 'changed': return t.updatedAt ?? t.createdAt;
    }
  };
  const sorted = [...rows].sort((a, b) => { const x = key(a), y = key(b); return x < y ? -1 : x > y ? 1 : a.title.localeCompare(b.title); });
  return dir === 'desc' ? sorted.reverse() : sorted;
}

/* ---- Calendars: 3 days, a project's month, the year (TickTick, Todoist; LEDGER #7, #13) ---------------------------- */

/** The next `n` days from `from`, each with its timed and all-day open tasks (overdue ones on today). */
export function dayColumns(record: Tasks, from: string, today: string, n = 3, projectId?: string): {day: string; timed: Task[]; allDay: Task[]}[] {
  const open = openTasks(record, today).filter(t => t.due && !t.parentId && (!projectId || t.projectId === projectId));
  return Array.from({length: n}, (_, i) => {
    const day = addLocalDays(from, i), on = open.filter(t => (t.due! < today ? today : t.due) === day);
    return {day, timed: on.filter(t => t.time && t.due === day).sort((a, b) => a.time!.localeCompare(b.time!)), allDay: byOrder(on.filter(t => !t.time || t.due !== day))};
  });
}
/** A month as weeks of 7 days (Monday first), each day with its tasks (open on their day, done on the day finished). */
export function monthGrid(record: Tasks, month: string, doneDay: (iso: string) => string, projectId?: string): {day: string; inMonth: boolean; tasks: Task[]}[][] {
  const first = `${month}-01`, start = weekStart(first), mine = record.tasks.filter(t => !t.parentId && (!projectId || t.projectId === projectId));
  const weeks: {day: string; inMonth: boolean; tasks: Task[]}[][] = [];
  for (let w = 0, d = start; w < 6; w++) {
    const row = Array.from({length: 7}, (_, i) => { const day = addLocalDays(d, i); return {day, inMonth: day.slice(0, 7) === month, tasks: mine.filter(t => (t.doneAt ? doneDay(t.doneAt) : t.due) === day)}; });
    weeks.push(row); d = addLocalDays(d, 7);
    if (addLocalDays(d, 0).slice(0, 7) > month) break;
  }
  return weeks;
}
/** The last 53 weeks up to today as columns of 7 days (Monday first), with each day's finishes and a level 0–4. */
export function yearGrid(byDay: ReadonlyMap<string, number>, today: string): {weeks: {day: string; count: number; level: number; future: boolean}[][]; total: number; activeDays: number; max: number} {
  const start = addLocalDays(weekStart(today), -52 * 7), weeks: {day: string; count: number; level: number; future: boolean}[][] = [];
  let total = 0, activeDays = 0, max = 0;
  for (let w = 0; w < 53; w++) for (let i = 0; i < 7; i++) { const n = byDay.get(addLocalDays(start, w * 7 + i)) ?? 0; if (addLocalDays(start, w * 7 + i) <= today) max = Math.max(max, n); }
  for (let w = 0; w < 53; w++) {
    weeks.push(Array.from({length: 7}, (_, i) => {
      const day = addLocalDays(start, w * 7 + i), future = day > today, count = future ? 0 : byDay.get(day) ?? 0;
      if (!future) { total += count; if (count) activeDays++; }
      return {day, count, future, level: !count ? 0 : max <= 4 ? Math.min(4, count) : Math.min(4, Math.ceil((count / max) * 4))};
    }));
  }
  return {weeks, total, activeDays, max};
}

/* ---- Timeline / Gantt (TickTick, Notion; LEDGER #13, #29) ---------------------------------------------------------- */

/**
 * Each task of a project as a bar: from its start (its planned day, or the day it was added) to its end (its deadline,
 * else its planned day); a task with no day at all is left out and counted. Sorted by start.
 */
export function timelineBars(record: Tasks, today: string, projectId?: string): {bars: {task: Task; start: string; end: string; late: boolean}[]; undated: number; from: string; to: string} {
  const tasks = record.tasks.filter(t => !t.parentId && !t.doneAt && (!projectId || t.projectId === projectId));
  const bars: {task: Task; start: string; end: string; late: boolean}[] = [];
  let undated = 0;
  for (const t of tasks) {
    if (!t.due && !t.deadline) { undated++; continue; }
    const added = t.createdAt.slice(0, 10), start = t.due && t.deadline ? (t.due < t.deadline ? t.due : t.deadline) : t.due ?? (added < t.deadline! ? added : t.deadline!);
    const end = t.deadline && t.deadline > start ? t.deadline : t.due && t.due > start ? t.due : start;
    bars.push({task: t, start, end, late: end < today});
  }
  bars.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
  const from = bars.length ? (bars[0]!.start < today ? bars[0]!.start : today) : today;
  const to = bars.reduce((m, b) => b.end > m ? b.end : m, addLocalDays(from, 13));
  return {bars, undated, from, to};
}

/* ---- A chart from your lists (Notion's chart view, LEDGER #30) ------------------------------------------------------ */

export const CHART_GROUPS = ['week', 'project', 'label', 'priority'] as const;
export type ChartGroup = (typeof CHART_GROUPS)[number];
export const CHART_MEASURES = ['done', 'open', 'minutes'] as const;
export type ChartMeasure = (typeof CHART_MEASURES)[number];
/**
 * Bars from the task list: finished tasks per week (the last 8, from the finishes per day), or open tasks / finished tasks
 * / planned minutes per project, label or priority. Pure.
 */
export function chartSeries(record: Tasks, group: ChartGroup, measure: ChartMeasure, {today, byDay, doneDay, weeks = 8}: {today: string; byDay: ReadonlyMap<string, number>; doneDay: (iso: string) => string; weeks?: number}): {label: string; value: number}[] {
  if (group === 'week') {
    const monday = weekStart(today);
    return Array.from({length: weeks}, (_, i) => {
      const start = addLocalDays(monday, -7 * (weeks - 1 - i)); let value = 0;
      if (measure === 'done') for (let d = 0; d < 7; d++) value += byDay.get(addLocalDays(start, d)) ?? 0;
      else for (const t of record.tasks) { if (t.parentId) continue; const day = t.due; if (!day || day < start || day > addLocalDays(start, 6)) continue; if (measure === 'open' ? !t.doneAt : true) value += measure === 'minutes' ? t.minutes ?? 0 : 1; }
      return {label: start, value};
    });
  }
  const counts = new Map<string, number>();
  const bump = (k: string, n: number) => counts.set(k, (counts.get(k) ?? 0) + n);
  for (const t of record.tasks) {
    if (t.parentId) continue;
    const counted = measure === 'done' ? !!t.doneAt : !t.doneAt, n = measure === 'minutes' ? t.minutes ?? 0 : 1;
    if (!counted || !n) continue;
    if (group === 'project') bump(record.projects?.find(p => p.id === t.projectId)?.name ?? 'Inbox', n);
    else if (group === 'label') for (const l of t.labels?.length ? t.labels : ['(no label)']) bump(l.startsWith('(') ? l : `@${l}`, n);
    else bump(`P${taskLevel(t)}`, n);
  }
  void doneDay;
  return [...counts].map(([label, value]) => ({label, value})).sort((a, b) => group === 'priority' ? a.label.localeCompare(b.label) : b.value - a.value || a.label.localeCompare(b.label)).slice(0, 20);
}
