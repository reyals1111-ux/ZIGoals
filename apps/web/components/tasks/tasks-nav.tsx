'use client';
import {Suspense, lazy, useState, type DragEvent, type ReactNode} from 'react';
import {labelsInUse, projectHeld, viewTasks, type TaskView} from '../../lib/tasks/engine';
import {TASK_COLOURS, LEVEL_WORDS, type Project, type TaskColour, type TaskLevel, type Tasks} from '../../lib/tasks/schema';
import {formatNumber} from '../../lib/visual-format';
import {TEXT_LIMITS} from '../../lib/limits/text'; // Session AO (M-011): the one limits table

/**
 * Session AL (Part 8, P-LS-06, LS-045): the views of Tasks — Inbox, Today, Upcoming, everything, overdue, completed
 * (Session AP: This evening, Someday and the Priority matrix, each drawn by its own chunk, tasks-when-views.tsx);
 * projects (drop a dragged task on one to move it), labels, priorities and saved filters. A list of buttons on wide
 * screens; on a phone the same buttons wrap above the list. The view is kept in the address (?view=…).
 */
export function viewKey(view: TaskView, board = false): string {
  switch (view.kind) {
    case 'project': return `project:${view.id}${board ? ':board' : ''}`;
    case 'label': return `label:${view.name}`;
    case 'priority': return `priority:${view.level}`;
    case 'filter': return `filter:${view.id}`;
    default: return view.kind;
  }
}
/** Reads ?view= (also the words a person might type: board, calendar, filters, projects, labels). */
export function readView(raw: string | null, record: Tasks): {view: TaskView; board: boolean} | null {
  if (!raw) return null;
  const v = raw.trim();
  const simple = ['inbox', 'today', 'upcoming', 'all', 'overdue', 'completed', 'evening', 'someday', 'matrix', 'week', 'table', 'days', 'timeline', 'insights', 'organise', 'review'] as const;
  if ((simple as readonly string[]).includes(v)) return {view: {kind: v as (typeof simple)[number]}, board: false};
  if (v === 'done') return {view: {kind: 'completed'}, board: false};
  if (v === 'calendar') return {view: {kind: 'upcoming'}, board: false};
  if (v === 'board' || v === 'projects') { const first = record.projects?.find(p => !p.archived); return first ? {view: {kind: 'project', id: first.id}, board: v === 'board'} : {view: {kind: 'inbox'}, board: false}; }
  const [kind, value, extra] = v.split(':');
  if (kind === 'project' && value && record.projects?.some(p => p.id === value)) return {view: {kind: 'project', id: value}, board: extra === 'board'};
  if (kind === 'label' && value) return {view: {kind: 'label', name: value}, board: false};
  if (kind === 'priority' && /^[1-4]$/.test(value ?? '')) return {view: {kind: 'priority', level: Number(value) as TaskLevel}, board: false};
  if (kind === 'filter' && value && record.filters?.some(f => f.id === value)) return {view: {kind: 'filter', id: value}, board: false};
  return null;
}
export function viewTitle(view: TaskView, record: Tasks): string {
  switch (view.kind) {
    case 'inbox': return 'Inbox';
    case 'today': return 'Today';
    case 'upcoming': return 'Upcoming';
    case 'all': return 'All open tasks';
    case 'overdue': return 'Overdue';
    case 'completed': return 'Completed';
    case 'evening': return 'This evening';
    case 'someday': return 'Someday';
    case 'matrix': return 'Priority matrix';
    case 'week': return 'This week';
    case 'table': return 'Table';
    case 'days': return 'Calendar';
    case 'timeline': return 'Timeline';
    case 'insights': return 'Insights';
    case 'organise': return 'Areas and templates';
    case 'review': return 'Review';
    case 'project': return record.projects?.find(p => p.id === view.id)?.name ?? 'Project';
    case 'label': return `@${view.name}`;
    case 'priority': return LEVEL_WORDS[view.level];
    case 'filter': return record.filters?.find(f => f.id === view.id)?.name ?? 'Filter';
  }
}
const same = (a: TaskView, b: TaskView) => viewKey(a) === viewKey(b);
// Session AT (ADR-043 D7): This evening's and Someday's counts come from their own chunk, after the page shows.
const WhenCount = lazy(() => import('./tasks-when-count'));
export function TasksNav({record, today, view, board, counts, projects, onGo, onAddProject, dropOn, onRemoveFilter, scope, toReview = 0}: {record: Tasks; today: string; view: TaskView; board: boolean; counts: {open: number; overdue: number; today: number}; projects: Project[];
  /** Session AV lane 2 (r6-plan, LEDGER #394, #395): the focus applied to a view's count; how many projects wait for their review. */ scope?: (v: TaskView) => Tasks; toReview?: number;
  onGo: (v: TaskView, board?: boolean) => void; onAddProject: (name: string, colour: TaskColour) => boolean; dropOn: (projectId: string | null) => {onDragOver: (e: DragEvent<HTMLElement>) => void; onDrop: (e: DragEvent<HTMLElement>) => void}; onRemoveFilter: (id: string) => void}) {
  const [adding, setAdding] = useState(false), [name, setName] = useState(''), [colour, setColour] = useState<TaskColour>('blue'), [archived, setArchived] = useState(false);
  const count = (v: TaskView) => viewTasks(scope ? scope(v) : record, v, today).length;
  const item = (v: TaskView, label: string, n?: number | ReactNode, extra?: object, colourName?: string) => <li key={viewKey(v)}><button type="button" className="tasks-nav-item" aria-current={same(v, view) ? 'page' : undefined} data-colour={colourName} onClick={() => onGo(v, v.kind === 'project' && same(v, view) ? board : false)} {...(extra ?? {})}>
    <span dir="auto">{label}</span>{typeof n === 'number' ? n ? <small>{formatNumber(n)}</small> : null : n}</button></li>;
  const labels = labelsInUse(record), live = projects.filter(p => !p.archived), old = projects.filter(p => p.archived);
  return <nav className="tasks-nav" aria-label="Task views">
    <ul>
      {item({kind: 'inbox'}, 'Inbox', count({kind: 'inbox'}), dropOn(null))}
      {item({kind: 'today'}, 'Today', count({kind: 'today'}))}
      {item({kind: 'upcoming'}, 'Upcoming', count({kind: 'upcoming'}))}
      {item({kind: 'all'}, 'All open', counts.open)}
      {counts.overdue > 0 && item({kind: 'overdue'}, 'Overdue', counts.overdue)}
      {item({kind: 'evening'}, 'This evening', <Suspense fallback={null}><WhenCount kind="evening" record={record} today={today}/></Suspense>)}
      {item({kind: 'someday'}, 'Someday', <Suspense fallback={null}><WhenCount kind="someday" record={record} today={today}/></Suspense>)}
      {item({kind: 'matrix'}, 'Priority matrix')}
      {item({kind: 'completed'}, 'Completed')}
    </ul>
    {/* Session AV lane 2 (tasks): planning and layouts (Sunsama, Todoist, TickTick, Notion), drawn by their own chunk. */}
    <h3>Plan and views</h3>
    <ul>{([['week', 'This week'], ['table', 'Table'], ['days', 'Calendar'], ['timeline', 'Timeline'], ['insights', 'Insights'], ['organise', 'Areas and templates']] as const).map(([kind, label]) => item({kind}, label))}
      {/* Session AV lane 2 (r6-plan, LEDGER #395): once a project has a review interval */}{record.projects?.some(p => p.review && !p.archived) && item({kind: 'review'}, 'Review', toReview)}</ul>
    <h3>Projects</h3>
    {/* Session AV lane 2 (LEDGER #20, #12): projects under their area (Things' Areas, TickTick's folders). */}
    {(record.areas?.length ? [...record.areas.map(a => ({key: a.id, name: a.name as string | null, items: live.filter(p => p.areaId === a.id)})), {key: '', name: null, items: live.filter(p => !p.areaId || !record.areas!.some(a => a.id === p.areaId))}] : [{key: '', name: null, items: live}])
      .filter(g => g.items.length || g.name).map(g => <div key={g.key || 'none'} className="tasks-nav-area">{g.name && <h4 dir="auto">{g.name}</h4>}<ul>{g.items.map(p => item({kind: 'project', id: p.id}, p.name, projectHeld(p, today) ? <small>on hold</small> : count({kind: 'project', id: p.id}), dropOn(p.id), p.colour))}</ul></div>)}
    {old.length > 0 && <><button type="button" className="text-link" aria-expanded={archived} onClick={() => setArchived(!archived)}>Archived projects ({formatNumber(old.length)})</button>
      {archived && <ul>{old.map(p => item({kind: 'project', id: p.id}, p.name, undefined, undefined, p.colour))}</ul>}</>}
    {adding ? <form className="tasks-nav-add" noValidate onSubmit={e => { e.preventDefault(); if (name.trim() && onAddProject(name, colour)) { setName(''); setAdding(false); } }}>
      <label className="field"><span>Project name</span><input autoFocus dir="auto" value={name} maxLength={TEXT_LIMITS.taskListName} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setAdding(false); }} /></label>
      <label className="field"><span>Colour</span><select value={colour} onChange={e => setColour(e.target.value as TaskColour)}>{TASK_COLOURS.map(c => <option key={c} value={c}>{c[0]!.toUpperCase() + c.slice(1)}</option>)}</select></label>
      <span className="tasks-io-actions"><button type="submit" className="secondary" disabled={!name.trim()}>Add project</button><button type="button" className="quiet" onClick={() => setAdding(false)}>Cancel</button></span>
    </form> : <button type="button" className="text-link tasks-nav-new" onClick={() => setAdding(true)}>+ Add a project</button>}
    {labels.length > 0 && <><h3>Labels</h3><ul>{labels.map(l => item({kind: 'label', name: l.name}, `@${l.name}`, l.open))}</ul></>}
    <h3>Priority</h3>
    <ul>{/* Session AV (M-12c): every level, P3 (the default) too */([1, 2, 3, 4] as const).map(level => item({kind: 'priority', level}, LEVEL_WORDS[level], count({kind: 'priority', level})))}</ul>
    {(record.filters?.length ?? 0) > 0 && <><h3>Saved filters</h3><ul>{record.filters!.map(f => <li key={f.id} className="tasks-nav-filter">
      <button type="button" className="tasks-nav-item" aria-current={same({kind: 'filter', id: f.id}, view) ? 'page' : undefined} onClick={() => onGo({kind: 'filter', id: f.id})}><span dir="auto">{f.name}</span><small>{f.query}</small></button>
      <button type="button" className="text-link" aria-label={`Remove the saved filter “${f.name}”`} onClick={() => onRemoveFilter(f.id)}>×</button></li>)}</ul></>}
  </nav>;
}
