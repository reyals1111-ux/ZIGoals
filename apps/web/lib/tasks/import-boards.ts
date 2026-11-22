import {wallClock} from '../zone-time';
import {readCsv, type ImportPlan, type ImportedTask} from './import';
import {LABEL_PATTERN, TASK_CLOCK, TASK_NOTES_MAX, TASK_TITLE_MAX, type TaskLevel} from './schema';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #227; Any.do's imports from other task apps): Trello's board export (JSON) and
 * Asana's project export (CSV), read into a project, its sections and tasks — the rule the habit importer keeps
 * (lib/import/switch/formats.ts): a layout is read only when it is documented.
 * - Trello: Board menu → Print, export and share → Export as JSON. The file is the board as Trello's REST API documents its
 *   objects: `name`, `lists` (id, name, closed, pos), `cards` (id, name, desc, idList, closed, due, dueComplete, labels,
 *   pos) and `checklists` (idCard, checkItems with name, state, pos). The board is the project, each open list a section,
 *   each card a task, each checklist item a subtask. Archived cards and lists, and finished cards or items, are left out
 *   (counted). Members are left out: nothing is shared between people.
 * - Asana: a project's ▾ menu → Export/Print → CSV. Asana's help lists the columns: Task ID, Created At, Completed At, Name,
 *   Section/Column, Assignee, Start Date, Due Date, Tags, Notes, Projects, Parent task. Its Projects (else the file's name)
 *   is the project, Section/Column the section, Parent task the parent (by name). Assignees are left out (counted).
 * Everything is read as text: nothing in a file is opened, run or followed, and nothing is sent. Pure.
 */
const clip = (s: string, n: number) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n);
const title = (s: string) => clip(s.replace(/\s+/g, ' '), TASK_TITLE_MAX);
const labelsOf = (list: readonly string[]) => [...new Set(list.map(l => l.trim().replace(/^[@#]/, '').replace(/\s+/g, '_')).filter(l => LABEL_PATTERN.test(l)))].slice(0, 20);
const str = (v: unknown) => typeof v === 'string' ? v : '';
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : 0;
const arr = (v: unknown): Record<string, unknown>[] => Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)) : [];
/** An ISO instant ("2026-11-25T11:00:00.000Z") as the day and time in `zone` (midnight there is a day only). */
function dueIn(iso: string, zone: string): {due?: string; time?: string} {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return {};
  const w = wallClock(ms, zone);
  return {due: w.date, ...(TASK_CLOCK.test(w.clock) && w.clock !== '00:00' ? {time: w.clock} : {})};
}
const emptyPlan = (source: ImportPlan['source']): ImportPlan => ({source, tasks: [], skipped: {done: 0, unreadable: 0, notes: 0, archived: 0, people: 0}, projects: []});

/** Whether a text looks like a Trello board export (an object with `cards` and `lists`). */
export const looksLikeTrello = (text: string) => /^\s*\{/.test(text) && /"cards"\s*:/.test(text) && /"lists"\s*:/.test(text);
export function readTrelloJson(text: string, {zone, includeDone = false}: {zone: string; includeDone?: boolean}): ImportPlan {
  let board: Record<string, unknown>;
  try { const v = JSON.parse(text) as unknown; if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('not an object'); board = v as Record<string, unknown>; }
  catch { throw new Error('This is not a Trello board export: it is not JSON that ZIGoals can read.'); }
  if (!Array.isArray(board.cards) || !Array.isArray(board.lists)) throw new Error('This is not a Trello board export: it has no cards and lists.');
  const plan = emptyPlan('trello'), project = title(str(board.name)).slice(0, 60) || 'Trello board';
  plan.projects.push(project);
  const lists = new Map(arr(board.lists).map(l => [str(l.id), {name: clip(str(l.name), 60), closed: l.closed === true}]));
  const checklists = arr(board.checklists);
  const people = new Set<string>();
  const cards = arr(board.cards).sort((a, b) => num(a.pos) - num(b.pos));
  // Lists keep their board order (their own `pos`), so sections come in the order the board shows them.
  const listOrder = new Map(arr(board.lists).sort((a, b) => num(a.pos) - num(b.pos)).map((l, k) => [str(l.id), k]));
  cards.sort((a, b) => (listOrder.get(str(a.idList)) ?? 999) - (listOrder.get(str(b.idList)) ?? 999));
  for (const [k, card] of cards.entries()) {
    const list = lists.get(str(card.idList)), name = title(str(card.name));
    if (!name) { plan.skipped.unreadable++; continue; }
    if (card.closed === true || list?.closed) { plan.skipped.archived!++; continue; }
    const done = card.dueComplete === true;
    if (done && !includeDone) { plan.skipped.done++; continue; }
    for (const m of Array.isArray(card.idMembers) ? card.idMembers : []) if (typeof m === 'string') people.add(m);
    const ref = str(card.id) || `trello-${k}`, labels = labelsOf(arr(card.labels).map(l => str(l.name) || str(l.color)));
    plan.tasks.push({ref, title: name, ...(str(card.due) ? dueIn(str(card.due), zone) : {}), ...(labels.length ? {labels} : {}),
      ...(str(card.desc).trim() ? {notes: clip(str(card.desc), TASK_NOTES_MAX)} : {}), project, ...(list?.name ? {section: list.name} : {}), ...(done ? {done: true} : {})});
    const items = checklists.filter(c => str(c.idCard) === str(card.id)).sort((a, b) => num(a.pos) - num(b.pos)).flatMap(c => arr(c.checkItems).sort((a, b) => num(a.pos) - num(b.pos)));
    for (const [j, item] of items.entries()) {
      const sub = title(str(item.name));
      if (!sub) { plan.skipped.unreadable++; continue; }
      const subDone = str(item.state) === 'complete';
      if (subDone && !includeDone) { plan.skipped.done++; continue; }
      plan.tasks.push({ref: str(item.id) || `${ref}-item-${j}`, parentRef: ref, title: sub, project, ...(list?.name ? {section: list.name} : {}), ...(str(item.due) ? dueIn(str(item.due), zone) : {}), ...(subDone ? {done: true} : {})});
    }
  }
  plan.skipped.people = people.size;
  return plan;
}

/** Whether a CSV's first line is Asana's export header (Task ID, Name, Section/Column). */
export const looksLikeAsana = (text: string) => { const first = text.replace(/^﻿/, '').split(/\r?\n/, 1)[0] ?? ''; return /\bTask ID\b/.test(first) && /\bName\b/.test(first) && /Section\/Column/.test(first); };
const ASANA_LEVEL: Record<string, TaskLevel> = {high: 1, medium: 2, low: 4};
export function readAsanaCsv(text: string, {project: fallback, includeDone = false}: {project?: string; includeDone?: boolean} = {}): ImportPlan {
  const rows = readCsv(text), head = (rows[0] ?? []).map(h => h.trim());
  const col = (name: string) => head.findIndex(h => h.toLowerCase() === name.toLowerCase());
  if (col('Name') < 0 || col('Section/Column') < 0) throw new Error('This is not an Asana CSV export: it has no “Name” and “Section/Column” columns.');
  const plan = emptyPlan('asana'), people = new Set<string>();
  const byName = new Map<string, string>(), items: ImportedTask[] = [];
  for (const [k, row] of rows.slice(1).entries()) {
    const get = (name: string) => (col(name) >= 0 ? row[col(name)] ?? '' : '').trim();
    const name = title(get('Name'));
    if (!name) { plan.skipped.unreadable++; continue; }
    const done = !!get('Completed At');
    if (done && !includeDone) { plan.skipped.done++; continue; }
    if (get('Assignee') || get('Assignee Email')) people.add(get('Assignee Email') || get('Assignee'));
    const project = clip(get('Projects').split(',')[0] ?? '', 60) || fallback || 'Asana project', section = clip(get('Section/Column'), 60).replace(/:$/, '');
    if (!plan.projects.includes(project)) plan.projects.push(project);
    const due = /^\d{4}-\d{2}-\d{2}/.exec(get('Due Date') || get('Start Date'))?.[0], level = ASANA_LEVEL[get('Priority').toLowerCase()];
    const ref = get('Task ID') || `asana-${k}`, tags = get('Tags') ? labelsOf(get('Tags').split(',')) : [];
    const parentName = title(get('Parent task'));
    items.push({ref, ...(parentName ? {parentRef: `name:${parentName.toLowerCase()}`} : {}), title: name, ...(due && !Number.isNaN(Date.parse(`${due}T00:00:00Z`)) ? {due} : {}), ...(level ? {level} : {}),
      ...(tags.length ? {labels: tags} : {}), ...(get('Notes') ? {notes: clip(get('Notes'), TASK_NOTES_MAX)} : {}), project, ...(section && !/^\(?no section\)?$/i.test(section) && !/^untitled section$/i.test(section) ? {section} : {}), ...(done ? {done: true} : {})});
    if (!byName.has(name.toLowerCase())) byName.set(name.toLowerCase(), ref);
  }
  // A parent named by its title: the first task of that name. Parents come before their subtasks (Asana may list them after).
  for (const t of items) if (t.parentRef?.startsWith('name:')) { const p = byName.get(t.parentRef.slice(5)); if (p && p !== t.ref) t.parentRef = p; else delete t.parentRef; }
  const placed = new Set<string>(), ordered: ImportedTask[] = [];
  const place = (t: ImportedTask, depth = 0) => {
    if (placed.has(t.ref)) return;
    const parent = t.parentRef ? items.find(x => x.ref === t.parentRef) : undefined;
    if (parent && depth < 8) place(parent, depth + 1);
    if (!placed.has(t.ref)) { placed.add(t.ref); ordered.push(t); }
  };
  for (const t of items) place(t);
  plan.tasks = ordered;
  plan.skipped.people = people.size;
  return plan;
}
