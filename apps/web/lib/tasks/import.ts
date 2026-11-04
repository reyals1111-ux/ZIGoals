import {csvSafeCell} from '../export/csv-safe';
import {parseTaskLine} from './parse';
import {describeRecur} from './recurrence';
import {MAX_TASKS, TASK_CLOCK, TASK_NOTES_MAX, TASK_TITLE_MAX, LABEL_PATTERN, levelFields, taskLevel, tasksSchema, type Recur, type Task, type TaskLevel, type Tasks} from './schema';

/**
 * Session AL (Part 8, P-LS-37, C-LS-23/24): bringing tasks in from Todoist (CSV), TickTick (CSV) and a calendar file's
 * to-dos (.ics VTODO), and taking them out as CSV. Everything is read here as text: nothing in a file is run, opened or
 * followed, and nothing is sent anywhere. A read gives a plan the person sees first ("12 tasks into 'Home', 3 done ones
 * left out"); `applyImport` adds it in one change (one Undo), up to the 500-task cap. Pure.
 */
export const MAX_IMPORT_BYTES = 2_000_000;
export type ImportedTask = {ref: string; parentRef?: string; title: string; level?: TaskLevel; due?: string; time?: string; recur?: Recur; labels?: string[]; notes?: string; project?: string; section?: string; done?: boolean};
export type ImportPlan = {source: 'todoist' | 'ticktick' | 'ics'; tasks: ImportedTask[]; skipped: {done: number; unreadable: number; notes: number}; projects: string[]};

/** RFC 4180 rows: quoted cells, doubled quotes, line breaks inside quotes; a BOM is dropped. */
export function readCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) { if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += c; continue; }
    if (c === '"' && cell === '') { quoted = true; continue; }
    if (c === ',') { row.push(cell); cell = ''; continue; }
    if (c === '\n' || c === '\r') { if (c === '\r' && src[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}
const clip = (s: string, n: number) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n);
const title = (s: string) => clip(s.replace(/\s+/g, ' '), TASK_TITLE_MAX);
const labelsOf = (list: string[]) => [...new Set(list.map(l => l.trim().replace(/^[@#]/, '').replace(/\s+/g, '_')).filter(l => LABEL_PATTERN.test(l)))];

/** An RRULE ("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,TH") as a repeat rule, or null when it says more than Tasks repeats. */
export function recurFromRrule(rrule: string): Recur | null {
  const parts = new Map(rrule.replace(/^RRULE:/i, '').split(';').map(p => { const [k, v] = p.split('='); return [k!.toUpperCase(), (v ?? '').toUpperCase()] as const; }));
  const every = ({DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', YEARLY: 'year'} as Record<string, Recur['every']>)[parts.get('FREQ') ?? ''] as Recur['every'] | undefined;
  if (!every) return null;
  const interval = Math.min(365, Math.max(1, Number(parts.get('INTERVAL') ?? 1) || 1));
  const rule: Recur = {every, interval};
  const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const byday = parts.get('BYDAY');
  if (byday) {
    const list = byday.split(',').map(d => /^([+-]?\d)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(d)).filter(Boolean) as RegExpExecArray[];
    if (every === 'month' && list.length === 1 && list[0]![1]) { const n = Number(list[0]![1]); if (n === -1 || (n >= 1 && n <= 5)) rule.nth = {n, weekday: days.indexOf(list[0]![2]!)}; else return null; }
    else if (every === 'week') rule.weekdays = list.map(m => days.indexOf(m[2]!));
    else if (every === 'day' && list.length) return {every: 'week', interval: 1, weekdays: list.map(m => days.indexOf(m[2]!))};
  }
  const bymonthday = parts.get('BYMONTHDAY');
  if (bymonthday && every === 'month') { const d = Number(bymonthday.split(',')[0]); if (d === -1 || (d >= 1 && d <= 31)) rule.monthDay = d; }
  const until = parts.get('UNTIL'); if (until && /^\d{8}/.test(until)) rule.until = `${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6, 8)}`;
  const count = Number(parts.get('COUNT')); if (Number.isInteger(count) && count >= 1 && count <= 999) rule.left = count;
  return rule;
}
/** "2026-11-05", "2026-11-05T10:00:00+0000", "20261105T100000Z" → day and (wall-clock as written) time. */
function dayTime(value: string): {due?: string; time?: string} {
  const m = /^(\d{4})-?(\d{2})-?(\d{2})(?:[T ](\d{2}):?(\d{2}))?/.exec(value.trim());
  if (!m) return {};
  const due = `${m[1]}-${m[2]}-${m[3]}`;
  if (Number.isNaN(Date.parse(`${due}T00:00:00Z`))) return {};
  const time = m[4] !== undefined ? `${m[4]}:${m[5]}` : undefined;
  return {due, ...(time && TASK_CLOCK.test(time) && time !== '00:00' ? {time} : {})};
}

/** Todoist's CSV (one project per file): task rows with INDENT for subtasks, section rows, notes kept as notes. */
export function readTodoistCsv(text: string, {project, today}: {project?: string; today: string}): ImportPlan {
  const rows = readCsv(text), head = (rows[0] ?? []).map(h => h.trim().toUpperCase());
  const col = (name: string) => head.indexOf(name);
  if (col('TYPE') < 0 || col('CONTENT') < 0) throw new Error('This is not a Todoist CSV: it has no TYPE and CONTENT columns.');
  const plan: ImportPlan = {source: 'todoist', tasks: [], skipped: {done: 0, unreadable: 0, notes: 0}, projects: project ? [project] : []};
  const stack: string[] = []; let section: string | undefined;
  rows.slice(1).forEach((row, i) => {
    const get = (name: string) => (col(name) >= 0 ? row[col(name)] ?? '' : '').trim();
    const type = get('TYPE').toLowerCase();
    if (type === 'section') { section = title(get('CONTENT')) || undefined; return; }
    if (type === 'note') { const last = plan.tasks.at(-1); if (last && get('CONTENT')) last.notes = clip(`${last.notes ? `${last.notes}\n\n` : ''}${get('CONTENT')}`, TASK_NOTES_MAX); else plan.skipped.notes++; return; }
    if (type !== 'task') return;
    // Todoist writes labels into the content ("Buy milk @errands"); the line reader takes them out, with p1–p4.
    const parsed = parseTaskLine(get('CONTENT'), today), name = title(parsed.title || get('CONTENT'));
    if (!name) { plan.skipped.unreadable++; return; }
    const indent = Math.min(5, Math.max(1, Number(get('INDENT')) || 1)), ref = `todoist-${i}`;
    stack.length = indent - 1; stack[indent - 1] = ref;
    const priority = Number(get('PRIORITY'));
    const when = get('DATE') ? parseTaskLine(get('DATE'), today) : null;
    plan.tasks.push({ref, ...(indent > 1 && stack[indent - 2] ? {parentRef: stack[indent - 2]} : {}), title: name,
      ...(priority >= 1 && priority <= 4 ? {level: (priority === 4 ? 3 : priority) as TaskLevel} : parsed.level ? {level: parsed.level} : {}),
      ...(when?.due ? {due: when.due} : {}), ...(when?.time ? {time: when.time} : {}), ...(when?.recur ? {recur: when.recur} : {}),
      ...(parsed.labels.length ? {labels: parsed.labels} : {}), ...(get('DESCRIPTION') ? {notes: clip(get('DESCRIPTION'), TASK_NOTES_MAX)} : {}),
      ...(project ? {project} : {}), ...(section ? {section} : {})});
  });
  return plan;
}

/** TickTick's CSV backup: a few lines before the header, then one row per task; status 0 is open. */
export function readTickTickCsv(text: string, {includeDone = false}: {includeDone?: boolean} = {}): ImportPlan {
  const rows = readCsv(text);
  const at = rows.findIndex(r => r.some(c => c.trim() === 'Title') && r.some(c => c.trim() === 'List Name'));
  if (at < 0) throw new Error('This is not a TickTick CSV backup: it has no “Title” and “List Name” columns.');
  const head = rows[at]!.map(h => h.trim()), col = (name: string) => head.indexOf(name);
  const plan: ImportPlan = {source: 'ticktick', tasks: [], skipped: {done: 0, unreadable: 0, notes: 0}, projects: []};
  const LEVEL: Record<string, TaskLevel> = {'0': 3, '1': 4, '3': 2, '5': 1};
  for (const [i, row] of rows.slice(at + 1).entries()) {
    const get = (name: string) => (col(name) >= 0 ? row[col(name)] ?? '' : '').trim();
    const name = title(get('Title'));
    if (!name) { plan.skipped.unreadable++; continue; }
    const done = get('Status') !== '' && get('Status') !== '0';
    if (done && !includeDone) { plan.skipped.done++; continue; }
    const list = clip(get('List Name'), 60), when = dayTime(get('Due Date') || get('Start Date'));
    const allDay = /^true$/i.test(get('Is All Day'));
    if (list && !plan.projects.includes(list) && !/^inbox$/i.test(list)) plan.projects.push(list);
    const recur = get('Repeat') ? recurFromRrule(get('Repeat')) : null;
    plan.tasks.push({ref: get('taskId') || `ticktick-${i}`, ...(get('parentId') ? {parentRef: get('parentId')} : {}), title: name,
      ...(LEVEL[get('Priority')] ? {level: LEVEL[get('Priority')]} : {}), ...(when.due ? {due: when.due} : {}), ...(when.time && !allDay ? {time: when.time} : {}),
      ...(recur && when.due ? {recur} : {}), ...(get('Tags') ? {labels: labelsOf(get('Tags').split(','))} : {}), ...(get('Content') ? {notes: clip(get('Content'), TASK_NOTES_MAX)} : {}),
      ...(list && !/^inbox$/i.test(list) ? {project: list} : {}), ...(get('Column Name') ? {section: clip(get('Column Name'), 60)} : {}), ...(done ? {done: true} : {})});
  }
  return plan;
}

/** The to-dos (VTODO) of a calendar file. Events are the Agenda's import; this reads only to-dos. */
export function readIcsTodos(text: string, {includeDone = false}: {includeDone?: boolean} = {}): ImportPlan {
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const plan: ImportPlan = {source: 'ics', tasks: [], skipped: {done: 0, unreadable: 0, notes: 0}, projects: []};
  const unescape = (v: string) => v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
  let current: Map<string, string> | null = null, n = 0;
  for (const line of lines) {
    if (/^BEGIN:VTODO$/i.test(line)) { current = new Map(); continue; }
    if (/^END:VTODO$/i.test(line) && current) {
      const fields = current, get = (k: string) => fields.get(k) ?? '', name = title(unescape(get('SUMMARY')));
      const done = /^COMPLETED$/i.test(get('STATUS')) || !!get('COMPLETED');
      current = null; n++;
      if (!name) { plan.skipped.unreadable++; continue; }
      if (done && !includeDone) { plan.skipped.done++; continue; }
      const when = dayTime(get('DUE') || get('DTSTART')), p = Number(get('PRIORITY')), recur = get('RRULE') ? recurFromRrule(get('RRULE')) : null;
      plan.tasks.push({ref: get('UID') || `ics-${n}`, ...(get('RELATED-TO') ? {parentRef: get('RELATED-TO')} : {}), title: name,
        ...(p >= 1 && p <= 9 ? {level: (p <= 4 ? 1 : p === 5 ? 2 : 4) as TaskLevel} : {}), ...when, ...(recur && when.due ? {recur} : {}),
        ...(get('CATEGORIES') ? {labels: labelsOf(unescape(get('CATEGORIES')).split(','))} : {}), ...(get('DESCRIPTION') ? {notes: clip(unescape(get('DESCRIPTION')), TASK_NOTES_MAX)} : {}), ...(done ? {done: true} : {})});
      continue;
    }
    if (!current) continue;
    const m = /^([A-Za-z-]+)(?:;[^:]*)?:(.*)$/.exec(line);
    if (m && !current.has(m[1]!.toUpperCase())) current.set(m[1]!.toUpperCase(), m[2]!);
  }
  return plan;
}
/** Which reader a file needs, by its name and first lines. */
export function readTaskFile(text: string, {fileName, today}: {fileName: string; today: string}): ImportPlan {
  if (text.length > MAX_IMPORT_BYTES) throw new Error('This file is over 2 MB, more than ZIGoals reads.');
  if (/BEGIN:VCALENDAR/i.test(text.slice(0, 2000))) return readIcsTodos(text);
  const first = text.slice(0, 4000);
  if (/"?TYPE"?\s*,\s*"?CONTENT"?/i.test(first)) return readTodoistCsv(text, {today, project: fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 60) || undefined});
  if (/List Name/.test(first) && /Title/.test(first)) return readTickTickCsv(text);
  throw new Error('This file is not one ZIGoals reads: a Todoist CSV, a TickTick CSV backup or a calendar (.ics) file.');
}

/** Adds a plan to the record: projects and sections made as needed, subtasks under their parents. Over the cap is left out. */
export function applyImport(record: Tasks, plan: ImportPlan, {at, newId}: {at: Date; newId: (kind: 'task' | 'project' | 'section') => string}): {record: Tasks; added: string[]; overCap: number} {
  const stamp = at.toISOString(), projects = [...(record.projects ?? [])], sections = [...(record.sections ?? [])], tasks = [...record.tasks];
  const projectId = (name?: string) => {
    if (!name) return undefined;
    let p = projects.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (!p) { p = {id: newId('project'), name: name.slice(0, 60), colour: 'grey', order: projects.length}; projects.push(p); }
    return p.id;
  };
  const sectionId = (pid: string | undefined, name?: string) => {
    if (!pid || !name) return undefined;
    let s = sections.find(x => x.projectId === pid && x.name.toLowerCase() === name.toLowerCase());
    if (!s) { s = {id: newId('section'), projectId: pid, name: name.slice(0, 60), order: sections.filter(x => x.projectId === pid).length}; sections.push(s); }
    return s.id;
  };
  const ids = new Map<string, string>(), added: string[] = [];
  let overCap = 0, order = 0;
  for (const item of plan.tasks) {
    if (tasks.length >= MAX_TASKS) { overCap++; continue; }
    const id = newId('task'), pid = projectId(item.project), sid = sectionId(pid, item.section);
    ids.set(item.ref, id);
    const parent = item.parentRef ? ids.get(item.parentRef) : undefined;
    tasks.push({id, title: item.title, ...(item.level ? levelFields(item.level) : {priority: 'normal' as const}), ...(item.due ? {due: item.due} : {}), ...(item.due && item.time ? {time: item.time} : {}),
      ...(item.due && item.recur ? {recur: item.recur} : {}), ...(item.labels?.length ? {labels: item.labels} : {}), ...(item.notes ? {notes: item.notes} : {}),
      ...(pid ? {projectId: pid} : {}), ...(sid ? {sectionId: sid} : {}), ...(parent ? {parentId: parent} : {}), order: (order += 10), createdAt: stamp, updatedAt: stamp, ...(item.done ? {doneAt: stamp} : {})} as Task);
    added.push(id);
  }
  return {record: tasksSchema.parse({...record, tasks, projects, sections}), added, overCap};
}

/** Every task as CSV (spreadsheet-safe cells: a title starting with = + - @ cannot run as a formula). */
export function tasksCsv(record: Tasks): string {
  const project = new Map((record.projects ?? []).map(p => [p.id, p.name])), section = new Map((record.sections ?? []).map(s => [s.id, s.name])), titleOf = new Map(record.tasks.map(t => [t.id, t.title]));
  const head = ['Title', 'Project', 'Section', 'Parent task', 'Priority', 'Due', 'Time', 'Repeat', 'Labels', 'Notes', 'Goal', 'Status', 'Created', 'Done'];
  const rows = record.tasks.map(t => [t.title, t.projectId ? project.get(t.projectId) ?? '' : 'Inbox', t.sectionId ? section.get(t.sectionId) ?? '' : '', t.parentId ? titleOf.get(t.parentId) ?? '' : '', `p${taskLevel(t)}`, t.due ?? '', t.time ?? '', t.recur ? describeRecur(t.recur) : '', (t.labels ?? []).join(' '), t.notes ?? '', t.goal ?? '', t.doneAt ? 'done' : 'open', t.createdAt, t.doneAt ?? '']);
  return [head, ...rows].map(r => r.map(csvSafeCell).join(',')).join('\r\n') + '\r\n';
}
