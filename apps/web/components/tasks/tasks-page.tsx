'use client';
import {dayLoadWords, viewLoad} from '../../lib/tasks/minutes';
import Link from 'next/link';
import {Fragment, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode} from 'react';
import {PageHeader} from '../page-header';
import {OrbitArt} from '../header-art/orbit-art';
import {EmptyState} from '../ui/empty-state';
import {LoadBoundary} from '../load-boundary';
import {ZgSkeleton} from '../skeleton/zg-skeleton';
import {TasksGlyph} from './tasks-glyph';
import {TaskRow, TaskStatusLine} from './task-parts';
import {PASTE_PARENT, SmartAdd} from './smart-add';
import {ReminderRows} from './reminder-rows';
import {TasksNav, viewKey, readView, viewTitle} from './tasks-nav';
import {useTaskList} from './use-task-list';
import {useDeviceRecord} from '../ai/use-device-record';
import {MY_DAY_VIEW, picksToday} from '../../lib/tasks/my-day';
import {FOCUS_VIEW, focusedRecord, inFocus, inPlayRecord, isOutOfPlay, liveFocus} from '../../lib/tasks/focus';
import {useGoalOptions} from './use-goal-options';
import {
  addProject, addSection, addTask, childrenOf, clearDone, completedInWindow, dropOrder, editMany, editProject, finishMany, moveStep, moveTasks, recentlyDone, removeFilter,
  removeProject, removeSection, renameSection, saveFilter, setOrder, skipOccurrence, taskCounts, taskState, viewTasks, withLabel, labelPlan, type TaskInput, type TaskView,
} from '../../lib/tasks/engine';
import {dueReminders} from '../../lib/tasks/reminders';
import {salvageTasks, keepSalvaged} from '../../lib/tasks/device';
import {checklistZone} from '../../lib/checklist/zone';
import {addLocalDays} from '../../lib/local-date';
import {MAX_SUBTASK_DEPTH, MAX_TASKS, TASK_COLOURS, type Task, type TaskColour, type TaskLevel, type Tasks} from '../../lib/tasks/schema';
import {isShowcase} from '../../lib/showcase';
import {formatClock, formatDate, formatNumber} from '../../lib/visual-format';
import {showStatus} from '../ui/undo-toast';
import {chunk} from '../use-chunk';
import {isTypingTarget, isUndoShortcut} from '../../lib/tasks/undo-shortcut';
import './tasks.css';
import {TEXT_LIMITS} from '../../lib/limits/text'; // Session AO (M-011): the one limits table
import {isFinished} from '../../lib/tasks/finished';

/**
 * /app/tasks (Session AK, T1; Session AL Part 8: Tasks at Todoist/TickTick level, owner decision O6). Your to-do list:
 * the Inbox, Today, Upcoming, projects (a list or a board, with sections), labels, priorities, saved filters, overdue
 * and completed (with Undo); subtasks with progress; repeats; reminders in the app; a line that reads days, repeats,
 * p1–p4, #project and @label; bulk actions; drag (or Move up / Move down, Alt+↑/↓) to reorder or move; keyboard
 * shortcuts ("?"); import from Todoist, TickTick or a calendar file and export as CSV. The Checklist is the daily
 * routine and stays as it is. Everything stays on this device (`zigoals:tasks:v1`).
 */
/* Session AL (CI 1630, page weights; budgets are never raised): the search engine is needed only for a typed filter or a
   saved filter view, so it is a chunk of its own (asked for as soon as the page's code runs); until it is here such a view
   keeps the page's loading state, never an empty list. */
const useSearch = chunk(() => import('../../lib/tasks/search'));
const PomodoroPanel = lazy(() => import('../focus/pomodoro-panel'));
const TasksShortcuts = lazy(() => import('./tasks-shortcuts'));
const TasksIo = lazy(() => import('./tasks-io'));
// CI14 (weights): saving a filter, the bulk bar and the salvage view load as one chunk, asked for as this page loads.
const loadExtras = () => import('./tasks-page-extras');
if (typeof window !== 'undefined') void loadExtras().catch(() => undefined);
const FilterSave = lazy(() => loadExtras().then(m => ({default: m.FilterSave})));
const BulkBar = lazy(() => loadExtras().then(m => ({default: m.BulkBar})));
const Salvage = lazy(() => loadExtras().then(m => ({default: m.Salvage})));
// Session AP: This evening, Someday and the Priority matrix, a chunk of their own loaded when one of them is opened.
const WhenViews = lazy(() => import('./tasks-when-views'));
// Session AV (follow-up 1, F-TASKS-DONE): finished per day and week at the top of Completed, its own chunk.
const DoneChart = lazy(() => import('./done-chart'));
// Session AV (owner follow-up 1, F-PLAN-DAY): suggested tasks for today, its own chunk.
const PlanDay = lazy(() => import('./plan-day'));
// Session AV lane 2 (tasks): This week, Table, Calendar, Timeline, Insights, Areas and templates, in one chunk.
const PlanViews = lazy(() => import('./tasks-plan-views'));
// Session AV lane 2 (tasks-r2, LEDGER #224): the reminders written in notes, in Today and Upcoming, their own chunk.
const NoteReminders = lazy(() => import('./note-reminders-in-tasks'));
// Session AV lane 2 (tasks-r2, LEDGER #225): "Print this list", the print sheet in its own chunk.
const TasksPrint = lazy(() => import('./tasks-print'));
// Session AV lane 2 (tasks-r2, LEDGER #228, #229): a project's rules and custom fields, their own chunk.
const ProjectSetup = lazy(() => import('./project-setup'));
// Session AV lane 2 (r4-plan, LEDGER #302): a deadline at risk, one quiet line at the top of Upcoming, its own chunk.
const AtRiskLine = lazy(() => import('./at-risk-line'));
// Session AV lane 2 (r5-notes; LEDGER #355, Akiflow): every task's files, and a file dropped on Tasks, in their own chunk.
const FilesView = lazy(() => import('./task-files').then(m => ({default: m.FilesView})));
// Session AV lane 2 (r5-plan, LEDGER #349, #352): a week or a month without a day (Upcoming) and an earlier finish changed (Completed), each its own chunk.
const PlanBuckets = lazy(() => import('./plan-buckets'));
const OccurrenceEdit = lazy(() => import('./occurrence-edit'));
// Session AV lane 2 (r6-plan; OmniFocus): a project on hold, in order and up for review (#392, #393, #395), the Review view,
// and Focus (#394), each its own chunk.
const ProjectStates = lazy(() => import('./project-states'));
const ProjectReview = lazy(() => import('./project-review'));
const FocusBar = lazy(() => import('./focus-bar'));
/** Session AV lane 2 (r6-plan, LEDGER #394): the views Focus narrows (never the Inbox, a project's own view or Completed). */
const FOCUS_KINDS = new Set<TaskView['kind']>(['today', 'upcoming', 'all', 'overdue', 'label', 'priority', 'matrix', 'days']);
const AREA_KEY = 'zigoals:task-area';
const PLAN_KINDS = new Set<TaskView['kind']>(['week', 'table', 'days', 'timeline', 'insights', 'organise']);
const STATE_GROUPS = [{state: 'overdue', title: 'Overdue'}, {state: 'today', title: 'Today'}, {state: 'soon', title: 'Next 7 days'}, {state: 'later', title: 'Later'}, {state: 'someday', title: 'No day'}] as const;
/** Session AL (P-LS-40, LS-030): a long group shows its first 50 rows; the rest one tap away. */
const SHOWN_PER_GROUP = 50;
/** The drag's own type, so a drop knows a task row is coming (as the Agenda's day drop does). */
const TASK_DRAG = 'application/x-zigoals-task';
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
const typing = (t: EventTarget | null) => t instanceof HTMLElement && isTypingTarget(t);

export function TasksPage() {
  const list = useTaskList({toast: true}), goals = useGoalOptions(), {tasks, today, clock} = list, record = tasks.data;
  const [view, setView] = useState<TaskView>({kind: 'today'}), [query, setQuery] = useState(''), [board, setBoard] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set()), [focusId, setFocusId] = useState<string | null>(null), [editId, setEditId] = useState<string | null>(null);
  // Session AV lane 2 (fixb5): while a task's editor is open its row keeps its group in Today, Doing or not, so "Doing now"
  // (which acts at once, editor still open) never moves the row to another list, which would close the editor and drop focus.
  const [held, setHeld] = useState<ReadonlyMap<string, boolean>>(() => new Map());
  // Release review AL (RR-18): a row has one checkbox, the one that marks it done. Selecting for bulk actions is a mode
  // ("Select" in the list's head, or x on a row): while it is on, each row's box selects it ("Select “…”") and Done is
  // the bar's; Escape, Clear or "Select" again ends it.
  const [selecting, setSelecting] = useState(false);
  const [focus, setFocus] = useState<Task | null>(null), [showcase, setShowcase] = useState(false), [help, setHelp] = useState(false), [io, setIo] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false), [dropNote, setDropNote] = useState('');
  const donePrinting = useCallback(() => setPrinting(false), []);
  const [setupFor, setSetupFor] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set()), [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set()), [now, setNow] = useState(() => Date.now());
  const focusBox = useRef<HTMLDivElement>(null), addField = useRef<HTMLInputElement>(null), filterField = useRef<HTMLInputElement>(null), asked = useRef(false), lastPick = useRef<string | null>(null), gPressed = useRef(0);
  const projects = useMemo(() => byOrderProjects(record), [record]);
  const projectOf = useCallback((id?: string) => id ? record.projects?.find(p => p.id === id) : undefined, [record.projects]);

  useEffect(() => { if (tasks.loaded) queueMicrotask(() => setShowcase(isShowcase())); }, [tasks.loaded]);
  // Session AV lane 2 (rest, LEDGER #17): repeating projects whose time has come are made on open (its own chunk).
  const repeatsRan = useRef('');
  useEffect(() => {
    if (!tasks.loaded || tasks.unreadable || isShowcase() || repeatsRan.current === today) return;
    repeatsRan.current = today;
    void import('./repeat-projects-run').then(m => m.runDueRepeats({tasks: list.tasks.data, change: list.change, today})).catch(() => undefined);
    // Once on arrival, and when the day changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.loaded, today]);
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(t); }, [clock]);
  // The address: ?view=… (inbox, today, upcoming, all, overdue, completed, project:<id>, label:<name>, priority:<1-4>,
  // filter:<id>, board), ?task=<id> (from Search: shows and opens it), ?focus=<id> (the Agenda's Focus), ?add=1, ?q=.
  useEffect(() => {
    if (!tasks.loaded || asked.current) return;
    asked.current = true;
    const params = new URLSearchParams(window.location.search);
    const wanted = readView(params.get('view'), record);
    queueMicrotask(() => {
      if (wanted) { setView(wanted.view); setBoard(wanted.board); }
      const q = params.get('q'); if (q) setQuery(q);
      // ?task=<id> (Search) or #task-<id> (the Agenda's link) shows the task in a view that has it and opens it.
      const id = params.get('task') ?? /^#task-(.+)$/.exec(window.location.hash)?.[1] ?? null, task = id ? record.tasks.find(t => t.id === decodeURIComponent(id)) : undefined;
      if (task) { setView(task.doneAt ? {kind: 'completed'} : task.projectId ? {kind: 'project', id: task.projectId} : {kind: 'inbox'}); setFocusId(task.parentId ?? task.id); setEditId(task.id); if (task.parentId) setExpanded(new Set([task.parentId])); requestAnimationFrame(() => document.getElementById(`task-${task.id}`)?.scrollIntoView({block: 'center'})); }
      const f = params.get('focus'), ft = f ? record.tasks.find(t => t.id === f && !t.doneAt) : undefined;
      if (ft) setFocus(ft);
      if (params.get('add')) requestAnimationFrame(() => addField.current?.focus());
    });
  }, [tasks.loaded, record]);
  useEffect(() => { if (focus) focusBox.current?.scrollIntoView({block: 'nearest'}); }, [focus]);
  // The view is kept in the address so Back and a reload come back to it.
  const go = useCallback((next: TaskView, asBoard = false) => {
    setView(next); setBoard(asBoard); setSelected(new Set()); setSelecting(false); setFocusId(null); setEditId(null);
    try { const url = new URL(window.location.href); url.searchParams.set('view', viewKey(next, asBoard)); url.searchParams.delete('task'); window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash); } catch { /* no address */ }
  }, []);

  // What the view lists: a filter typed in the field narrows any view (and "Search" is the filter on every task).
  const search = useSearch(), matchTasks = search.mod?.matchTasks;
  // Session AV lane 2 (LEDGER #28; Sunsama's channels, one filter across views): an area chosen here narrows every list view.
  const [area, setArea] = useState(() => { try { return localStorage.getItem(AREA_KEY) ?? ''; } catch { return ''; } });
  const chooseArea = (v: string) => { setArea(v); try { if (v) localStorage.setItem(AREA_KEY, v); else localStorage.removeItem(AREA_KEY); } catch { /* this visit only */ } };
  const areaId = area && record.areas?.some(a => a.id === area) ? area : '';
  // Session AV lane 2 (tasks-r2, LEDGER #223; Microsoft To Do's My Day): tasks picked for today show in Today, on their own day still.
  const myDay = useDeviceRecord(MY_DAY_VIEW), picked = useMemo(() => new Set(picksToday(myDay.data, today)), [myDay.data, today]);
  // Session AV lane 2 (r6-plan, LEDGER #394; OmniFocus's Focus): chosen projects or areas narrow these views until it is ended.
  const focusRead = useDeviceRecord(FOCUS_VIEW), viewFocus = useMemo(() => liveFocus(focusRead.data, record), [focusRead.data, record]), [focusing, setFocusing] = useState(false);
  const focusOn = !!viewFocus && FOCUS_KINDS.has(view.kind);
  // Session AV lane 2 (r6-plan, LEDGER #395): projects whose review has come round (a turn never taken comes at once).
  const toReview = (record.projects ?? []).filter(p => !p.archived && p.review && (!p.review.last || addLocalDays(p.review.last, 7 * p.review.every) <= today)).length;
  const viewed = useMemo<Task[]>(() => {
    if (view.kind === 'filter') { const saved = record.filters?.find(f => f.id === view.id); return saved && matchTasks ? matchTasks(record, saved.query, {today, nowClock: clock}) : []; }
    // A typed filter searches every task (a project's view: that project's), whatever the view lists.
    if (query.trim() && matchTasks) return matchTasks({...record, tasks: view.kind === 'project' ? record.tasks.filter(t => t.projectId === view.id) : record.tasks}, query, {today, nowClock: clock});
    const listed = view.kind === 'completed' ? [] : viewTasks(record, view, today, clock);
    if (view.kind !== 'today' || !picked.size) return listed;
    const has = new Set(listed.map(t => t.id));
    // Review B6M-3: a pick whose project is on hold, or that waits its turn, is out of Today with the rest.
    return [...record.tasks.filter(t => picked.has(t.id) && !t.doneAt && !has.has(t.id) && !isOutOfPlay(record, t, today)), ...listed];
  }, [record, view, today, clock, query, matchTasks, picked]);
  const shown = useMemo(() => { const inArea = areaId ? viewed.filter(t => record.projects?.find(p => p.id === t.projectId)?.areaId === areaId) : viewed; return focusOn ? inArea.filter(t => inFocus(t, viewFocus, record)) : inArea; }, [viewed, areaId, record, focusOn, viewFocus]);
  // A saved filter view waits for the search chunk (it would read as empty); a typed query keeps the view's list meanwhile.
  const ready = tasks.loaded && (view.kind !== 'filter' || !!matchTasks);
  const counts = useMemo(() => taskCounts(record, today, clock), [record, today, clock]); // RR-8: the list's own clock
  const reminders = useMemo(() => tasks.loaded ? dueReminders(record, now, checklistZone(), {dismissed}) : [], [tasks.loaded, record, now, dismissed]);
  const salvage = useMemo(() => tasks.unreadable ? salvageTasks() : null, [tasks.unreadable]);
  const visibleIds = useMemo(() => shown.map(t => t.id), [shown]);
  const selectMode = selecting || selected.size > 0;

  /* ---- actions ---- */
  const ids = (one?: string) => selected.size ? [...selected] : one ? [one] : [];
  const makeProject = useCallback((name: string): string | null => {
    const id = `project_${crypto.randomUUID()}`;
    return list.quiet(r => addProject(r, {name}, id), `Made the project “${name.trim()}”.`) ? id : null;
  }, [list]);
  const defaults = useMemo<Partial<TaskInput>>(() => view.kind === 'project' ? {projectId: view.id} : view.kind === 'label' ? {labels: [view.name]} : view.kind === 'priority' ? {level: view.level} : view.kind === 'today' ? {due: today} : {}, [view, today]);
  const addFromLine = useCallback((input: TaskInput) => list.add({...input, ...(input.due === undefined && defaults.due ? {due: defaults.due} : {}), ...(input.level === undefined && defaults.level ? {level: defaults.level} : {})}), [list, defaults]);
  // Session AV (owner follow-up 1, F-PASTE-LIST): a pasted list, every task in one change, so one Undo takes them all back.
  const withDefaults = useCallback((input: TaskInput): TaskInput => ({...input, ...(input.due === undefined && defaults.due ? {due: defaults.due} : {}), ...(input.level === undefined && defaults.level ? {level: defaults.level} : {})}), [defaults]);
  // Session AV (1c, q1 #17): an indented pasted line is a subtask; its parent is named `paste:<index>` (SmartAdd) and gets its id here.
  const addManyFromLines = useCallback((inputs: TaskInput[]) => { const at = new Date(), made = inputs.map(() => `task_${crypto.randomUUID()}`); return list.change(r => inputs.reduce((acc, input, i) => { const parent = input.parentId?.startsWith(PASTE_PARENT) ? made[Number(input.parentId.slice(PASTE_PARENT.length))] : input.parentId; return addTask(acc, {...withDefaults(input), ...(parent ? {parentId: parent} : {parentId: undefined})}, {id: made[i]!, at, today, allowPast: true}); }, r), `Added ${plural(inputs.length, 'task')}.`, `${plural(inputs.length, 'task')} taken back.`); }, [list, withDefaults, today]);
  const setLevel = (level: TaskLevel, one?: string) => { const list_ = ids(one); if (list_.length) list.change(r => editMany(r, list_, () => ({level}), today, {allowPast: true}), `${list_.length > 1 ? plural(list_.length, 'task') : 'Task'} set to P${level}.`); };
  // Session AV lane 2 (r6-plan, LEDGER #391; OmniFocus's batch editing): any day, or no day (a repeating task keeps its day: it needs one).
  const setDue = (due: string | null, one?: string) => { const all = ids(one), list_ = due ? all : all.filter(id => !record.tasks.find(t => t.id === id)?.recur), kept = all.length - list_.length; if (!list_.length) { if (kept) showStatus('A repeating task needs its day, so the selected repeats keep theirs.'); return; } list.change(r => editMany(r, list_, () => due ? {due} : {due: null, time: null}, today, {allowPast: true}), `${list_.length > 1 ? plural(list_.length, 'task') : 'Task'} ${due ? `due ${due === today ? 'today' : formatDate(due, {weekday: true})}` : 'with no day'}.${kept ? ` ${plural(kept, 'repeating task')} kept ${kept === 1 ? 'its' : 'their'} day.` : ''}`); };
  /** LEDGER #391: a label added to or taken off every selected task, in one change (one Undo). A label of a group takes the group's other label away. */
  // Review B6M-12: the toast counts the tasks that really changed, says how many had it already, and names the full ones.
  const labelSelected = (label: string, on: boolean) => {
    const plan = labelPlan(record, ids(), label, on), full = plan.full.length ? ` ${plan.full.slice(0, 3).map(t => `“${t.title}”`).join(', ')}${plan.full.length > 3 ? ` and ${plural(plan.full.length - 3, 'more task')}` : ''} ${plan.full.length === 1 ? 'carries' : 'carry'} the most labels a task keeps, so it was not added there.` : '', had = on && plan.had ? ` ${plural(plan.had, 'task')} had it already.` : '';
    if (!plan.changed.length) { showStatus(on ? `Nothing changed:${had}${full}` : `None of the selected tasks carries @${label}.`); return; }
    list.change(r => editMany(r, plan.changed, t => ({labels: on ? withLabel(t.labels, label, r.labelGroups) : (t.labels ?? []).filter(l => l !== label)}), today, {allowPast: true}), `${on ? `Added @${label} to` : `Took @${label} off`} ${plural(plan.changed.length, 'task')}.${had}${full}`);
  };
  const finishSelected = (one?: string) => { const list_ = ids(one).filter(id => record.tasks.some(t => t.id === id && !t.doneAt)); if (list_.length) { list.change(r => finishMany(r, list_, new Date(), {today, doneDay: today}), list_.length > 1 ? `Done: ${plural(list_.length, 'task')}.` : `Done: “${record.tasks.find(t => t.id === list_[0])?.title}”.`); setSelected(new Set()); setSelecting(false); } };
  const removeSelected = (one?: string) => { const list_ = ids(one); if (list_.length) { list.removeIds(list_, record.tasks.find(t => t.id === list_[0])?.title ?? 'task'); setSelected(new Set()); setSelecting(false); } };
  const moveSelected = (projectId: string | null, sectionId: string | null = null, one?: string) => { const list_ = ids(one); if (!list_.length) return; list.change(r => moveTasks(r, list_, {projectId, sectionId}), `Moved ${list_.length > 1 ? plural(list_.length, 'task') : `“${record.tasks.find(t => t.id === list_[0])?.title}”`} to ${projectId ? projectOf(projectId)?.name ?? 'the project' : 'the Inbox'}.`); setSelected(new Set()); setSelecting(false); };
  /* ---- the siblings a task moves among (Move up / down, drag) ---- */
  const siblingsOf = (id: string): string[] => {
    const t = record.tasks.find(x => x.id === id);
    if (!t) return [];
    if (t.parentId) return childrenOf(record, t.parentId).filter(x => !x.doneAt).map(x => x.id);
    return shown.filter(x => !x.parentId && (x.sectionId ?? '') === (t.sectionId ?? '')).map(x => x.id);
  };
  const reorder = (id: string, step: -1 | 1, siblings: string[]) => { if (siblings.indexOf(id) + step < 0 || siblings.indexOf(id) + step >= siblings.length) return; list.change(r => moveStep(r, siblings, id, step), `Moved “${record.tasks.find(t => t.id === id)?.title}” ${step < 0 ? 'up' : 'down'}.`); requestAnimationFrame(() => document.getElementById(`task-${id}`)?.focus()); };
  // Computed outside the state updater: an updater that moves lastPick ran twice under React's development checks, so a
  // shift-click there took the range from the row it had just picked (one row instead of the range).
  const pick = (id: string, on: boolean, shift: boolean) => {
    const next = new Set(selected), from = lastPick.current;
    if (shift && from) { const a = visibleIds.indexOf(from), b = visibleIds.indexOf(id); if (a >= 0 && b >= 0) for (const x of visibleIds.slice(Math.min(a, b), Math.max(a, b) + 1)) next.add(x); }
    else if (on) next.add(id); else next.delete(id);
    lastPick.current = id;
    setSelected(next);
  };

  /* ---- keyboard (P-LS-07) ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || document.querySelector('dialog[open], [aria-modal="true"]')) return;
      // Ctrl/⌘+Z: the visible toast's Undo (LS-072), outside text fields (they keep their own undo).
      if (isUndoShortcut(e, e.target as HTMLElement | null)) {
        const undo = document.querySelector<HTMLButtonElement>('.aa-toast .aa-toast-undo:not([disabled])');
        if (undo) { e.preventDefault(); undo.click(); }
        return;
      }
      if (e.key === 'Escape') {
        if (editId) { setEditId(null); return; }
        if (selected.size || selecting) { e.preventDefault(); setSelected(new Set()); setSelecting(false); return; }
        if (query && (typing(e.target) ? e.target === filterField.current : true)) { e.preventDefault(); setQuery(''); return; }
        return;
      }
      if (e.ctrlKey || e.metaKey || typing(e.target)) return;
      // The row that holds the keyboard focus is the one the keys act on. After a mouse drag the dragged row keeps the
      // focus its press gave it, but the page's focus id is not set during a press (LS-H22), so Alt+↑ did nothing.
      const held = e.target instanceof HTMLElement && e.target.matches('li.task[id^="task-"]') ? e.target.id.slice(5) : null;
      const focused = held && record.tasks.some(t => t.id === held) ? held : focusId;
      const at = focused ? visibleIds.indexOf(focused) : -1, current = focused ?? undefined;
      const focusRow = (id: string | undefined) => { if (!id) return; setFocusId(id); requestAnimationFrame(() => document.getElementById(`task-${id}`)?.focus()); };
      if (Date.now() - gPressed.current < 1200) {
        gPressed.current = 0;
        const target: TaskView | null = e.key === 'i' ? {kind: 'inbox'} : e.key === 't' ? {kind: 'today'} : e.key === 'u' ? {kind: 'upcoming'} : e.key === 'c' ? {kind: 'completed'} : null;
        if (target) { e.preventDefault(); go(target); }
        return;
      }
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && current) { e.preventDefault(); reorder(current, e.key === 'ArrowUp' ? -1 : 1, siblingsOf(current)); return; }
      if (e.altKey) return;
      switch (e.key) {
        case 'q': case 'a': case 'n': e.preventDefault(); addField.current?.focus(); return;
        case 'f': e.preventDefault(); filterField.current?.focus(); return;
        case '?': e.preventDefault(); setHelp(true); return;
        case 'g': gPressed.current = Date.now(); return;
        case 'j': case 'ArrowDown': if (!visibleIds.length) return; e.preventDefault(); focusRow(visibleIds[Math.min(visibleIds.length - 1, at + 1)]); return;
        case 'k': case 'ArrowUp': if (!visibleIds.length) return; e.preventDefault(); focusRow(visibleIds[Math.max(0, at - 1)]); return;
      }
      if (!current && !selected.size) return;
      switch (e.key) {
        case 'e': { e.preventDefault(); const t = record.tasks.find(x => x.id === current); if (selected.size) finishSelected(); else if (t) list.toggle(t, !t.doneAt); return; }
        case 'Enter': if (current && (e.target as HTMLElement)?.tagName === 'LI') { e.preventDefault(); setEditId(current); } return;
        case '1': case '2': case '3': case '4': e.preventDefault(); setLevel(Number(e.key) as TaskLevel, current); return;
        case 't': e.preventDefault(); setDue(today, current); return;
        case 'T': e.preventDefault(); setDue(addLocalDays(today, 1), current); return;
        case 'x': if (current) { e.preventDefault(); pick(current, !selected.has(current), false); } return;
        case 'Delete': case 'Backspace': e.preventDefault(); removeSelected(current); return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ---- drag (pointer); the keyboard alternative is Alt+↑/↓ and the row's Move up / Move down ---- */
  // A focused row shows more (Add a subtask, its notes) and the row it leaves shows less. Focus comes with the press of a
  // mouse, so that change moved the rows under the pointer before its release (and the page scrolled with it), and the
  // click landed on another control: Edit did not open, a shift-click selected nothing (ls-025, ls-007). During a press the
  // row's focus waits for the release.
  const pressing = useRef(false), focusAfterPress = useRef<string | null>(null);
  const pressRow = () => {
    if (pressing.current) return;
    pressing.current = true;
    const release = () => {
      window.removeEventListener('pointerup', release, true); window.removeEventListener('pointercancel', release, true);
      pressing.current = false;
      const id = focusAfterPress.current; focusAfterPress.current = null;
      if (id) window.setTimeout(() => setFocusId(id), 0); // after the click that ends the press
    };
    window.addEventListener('pointerup', release, true); window.addEventListener('pointercancel', release, true);
  };
  // LS-H22 / C-LS-16: the dragged id travels in the drag itself (and a ref), not only in React state, so the first
  // dragover already accepts it; a press that becomes a drag never moves the focus (the focused row grows by its
  // "Add a subtask" line, which moved the rows under the pointer and the drop landed back on the dragged row).
  const dragging = useRef<string | null>(null);
  const draggedId = (e: DragEvent<HTMLElement>) => dragging.current ?? (e.dataTransfer.types.includes(TASK_DRAG) ? e.dataTransfer.getData(TASK_DRAG) || null : null);
  const accepts = (e: DragEvent<HTMLElement>) => !!dragging.current || e.dataTransfer.types.includes(TASK_DRAG);
  const endDrag = () => { dragging.current = null; };
  const dragProps = (t: Task) => ({
    draggable: !t.doneAt, tabIndex: -1, onPointerDown: pressRow, onFocus: () => { if (pressing.current) focusAfterPress.current = t.id; else if (!dragging.current) setFocusId(t.id); },
    onDragStart: (e: DragEvent<HTMLElement>) => { e.stopPropagation(); focusAfterPress.current = null; dragging.current = t.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData(TASK_DRAG, t.id); e.dataTransfer.setData('text/plain', t.title); },
    onDragEnd: endDrag,
    onDragOver: (e: DragEvent<HTMLElement>) => { if (accepts(e) && dragging.current !== t.id) { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; } },
    onDrop: (e: DragEvent<HTMLElement>) => {
      e.preventDefault(); e.stopPropagation();
      const from = draggedId(e); endDrag();
      if (!from || from === t.id) return;
      const moving = record.tasks.find(x => x.id === from);
      if (!moving) return;
      const box = e.currentTarget.getBoundingClientRect(), after = e.clientY > box.top + box.height / 2;
      const sameScope = (moving.projectId ?? '') === (t.projectId ?? '') && (moving.sectionId ?? '') === (t.sectionId ?? '') && (moving.parentId ?? '') === (t.parentId ?? '');
      const order = dropOrder(siblingsOf(t.id), from, t.id, after);
      list.change(r => setOrder(sameScope ? r : moveTasks(r, [from], {projectId: t.projectId ?? null, sectionId: t.sectionId ?? null}), order), sameScope ? `Moved “${moving.title}” ${after ? 'below' : 'above'} “${t.title}”.` : `Moved “${moving.title}” to ${t.projectId ? projectOf(t.projectId)?.name : 'the Inbox'}.`);
    },
  });
  const dropOnProject = (projectId: string | null, sectionId: string | null = null) => ({
    onDragOver: (e: DragEvent<HTMLElement>) => { if (accepts(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } },
    onDrop: (e: DragEvent<HTMLElement>) => { e.preventDefault(); const from = draggedId(e); endDrag(); if (from) moveSelected(projectId, sectionId, from); },
  });

  /* ---- rendering ---- */
  const row = (t: Task, depth = 0): ReactNode => {
    const kids = depth >= MAX_SUBTASK_DEPTH ? [] : childrenOf(record, t.id).filter(k => k.id !== t.id && (view.kind === 'completed' || !k.doneAt)), /* SB-3: a depth guard, so no chain of parents recurses without end */ open = expanded.has(t.id), project = view.kind === 'project' ? undefined : projectOf(t.projectId);
    const sib = siblingsOf(t.id), canMove = !t.doneAt && sib.length > 1 && (view.kind === 'project' || view.kind === 'inbox' || !!t.parentId);
    return <TaskRow key={t.id} task={t} today={today} nowClock={clock} record={record} depth={depth} goal={t.goal ? goals.byKey.get(t.goal) : undefined} goals={goals.open}
      links={project ? {projectName: project.name, projectColour: project.colour} : undefined}
      selected={selected.has(t.id)} onSelect={selectMode ? (on, shift) => pick(t.id, on, shift) : undefined} focused={focusId === t.id}
      onToggle={d => list.toggle(t, d)} onRemove={() => list.remove(t)} onEdit={(patch, scope) => { const ok = list.edit(t, patch, scope); if (ok) setEditId(null); return ok; }} onFocus={() => setFocus(t)}
      onMove={canMove ? step => reorder(t.id, step, sib) : undefined} drag={dragProps(t)} editor="inline"
      onEditing={on => setHeld(m => { const n = new Map(m); if (on) n.set(t.id, t.state?.kind === 'doing'); else n.delete(t.id); return n; })}
      onSkip={t.recur && t.due && !t.doneAt ? () => list.change(r => skipOccurrence(r, t.id, today), `Skipped this time: “${t.title}” moves to its next day.`, `“${t.title}” is back on its day.`) : undefined}>
      {editId === t.id && <EditorBridge onClose={() => setEditId(null)} />}
      {/* CI1 (p6-keyboard, 2.4.3): "Add a subtask" is always in the page, so Shift+Tab finds it as Tab did; tasks.css keeps it out
          of sight (still focusable) until its row has the focus, so a row still grows only with its focus. */}
      {(kids.length > 0 || (depth < 3 && !t.doneAt)) && <div className="task-sub" data-only-new={!kids.length && !open && focusId !== t.id ? '' : undefined}>
        {kids.length > 0 && <button type="button" className="text-link task-sub-toggle" aria-expanded={open} onClick={() => setExpanded(s => { const n = new Set(s); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n; })}>{open ? 'Hide subtasks' : `Subtasks (${kids.filter(k => k.doneAt).length}/${kids.length})`}</button>}
        {open && <ul className="tasks-list task-children" aria-label={`Subtasks of “${t.title}”`}>{kids.map(k => row(k, depth + 1))}</ul>}
        {open && !t.doneAt && depth < 3 && <SubtaskAdd parent={t} onAdd={title => list.add({title, parentId: t.id, ...(t.projectId ? {projectId: t.projectId} : {}), ...(t.sectionId ? {sectionId: t.sectionId} : {})})} />}
        {!kids.length && !open && !t.doneAt && depth < 3 && <button type="button" className="text-link task-sub-toggle" onClick={() => setExpanded(s => new Set(s).add(t.id))}>Add a subtask</button>}
      </div>}
    </TaskRow>;
  };
  const group = (key: string, title: ReactNode, items: Task[], extra?: ReactNode, drop?: object) => <GroupList key={key} id={key} title={title} items={items} row={row} extra={extra} drop={drop} />;

  let body: ReactNode;
  const own = view.kind === 'evening' || view.kind === 'someday' || view.kind === 'matrix' || view.kind === 'review' || PLAN_KINDS.has(view.kind);
  if (view.kind === 'review') {
    body = <LoadBoundary label="Review"><Suspense fallback={<ZgSkeleton label="Opening…" block lines={2} />}><ProjectReview list={list} onOpen={id => go({kind: 'project', id})} /></Suspense></LoadBoundary>;
  } else if (PLAN_KINDS.has(view.kind)) {
    body = <LoadBoundary label={viewTitle(view, record)}><Suspense fallback={<ZgSkeleton label="Opening…" block lines={2} />}><PlanViews kind={view.kind as 'week'} list={list} goals={goals} focus={focusOn ? viewFocus : null} /></Suspense></LoadBoundary>;
  } else if (own) {
    body = <LoadBoundary label={viewTitle(view, record)}><Suspense fallback={<ZgSkeleton label="Opening…" block lines={2} />}><WhenViews kind={view.kind as 'matrix'} list={list} goals={goals} shown={shown} /></Suspense></LoadBoundary>;
  } else if (view.kind === 'completed') {
    // LS-037: the view's window — finished in the last 30 days of this device's days; older ones are only counted.
    const {log, older} = completedInWindow(record, today, list.doneDay), recent = recentlyDone(record, today, list.doneDay);
    // Session AV (1c, q1 #6, fresh-agent review): the view's title already says "Completed"; this part says only the count.
    body = <section className="tasks-completed" aria-labelledby="tasks-done-title">
      {/* Session AV lane 2 (r5-plan, review B5L-3): finishes only; cancelled ones are said apart. */}
      {(() => { const cancelled = log.filter(e => e.cancelled).length, finishes = log.length - cancelled; return <p id="tasks-done-title" className="tasks-done-count">{finishes ? `${plural(finishes, 'finish', 'finishes')} in the last 30 days` : 'Finished in the last 30 days'}{cancelled ? ` · ${formatNumber(cancelled)} cancelled` : ''}</p>; })()}
      {log.length > 0 ? <LoadBoundary quiet><Suspense fallback={null}><DoneChart log={log.filter(e => !e.cancelled) /* Session AV lane 2 (r5-plan, LEDGER #350): a cancelled task is not a finish */} today={today} doneDay={list.doneDay}/></Suspense></LoadBoundary> : <p className="fine">When you finish tasks, this view shows how many per day and per week, from the last 30 days.</p>}
      {recent.length > 0 && <p className="tasks-bulk-inline"><button type="button" className="secondary" onClick={() => list.change(clearDone, `Cleared ${plural(record.tasks.filter(t => t.doneAt).length, 'finished task')}.`, 'Finished tasks put back.')}>Clear done ({formatNumber(record.tasks.filter(t => t.doneAt).length)})</button></p>}
      {log.length ? <ul className="tasks-list" aria-label="Completed">{log.slice(0, 200).map(e => e.occurrence
        ? <li key={`${e.task.id}@${e.at}`} className="task task-finished task-occurrence"><span className="task-done" aria-hidden="true">✓</span><span className="task-title" dir="auto">{e.task.title}</span><span className="task-meta"><span>Done {formatDate(e.at, {year: false})} · repeats, next {e.task.due ? formatDate(e.task.due, {weekday: true, year: false}) : '—'}</span></span><span className="task-actions"><LoadBoundary quiet><Suspense fallback={null}><OccurrenceEdit task={e.task} at={e.at} today={today} doneDay={list.doneDay} /></Suspense></LoadBoundary></span></li>
        : row(e.task))}</ul> : <p className="fine">Nothing finished in the last 30 days.</p>}
      {older > 0 && <p className="fine" role="note">{older === 1 ? '1 finish' : `${formatNumber(older)} finishes`} older than 30 days {older === 1 ? 'is' : 'are'} not listed; {older === 1 ? 'it leaves' : 'they leave'} this device’s list at the next change.</p>}
      <p className="fine">Finished tasks are kept 30 days, then they leave this device’s list (export them as CSV first to keep a copy). Tick one again to open it.</p>
    </section>;
  } else if (view.kind === 'project' && board) {
    const sections = byOrderSections(record, view.id).filter(s => !s.archived);
    const column = (sectionId: string | null, name: string) => {
      const items = shown.filter(t => (t.sectionId ?? null) === sectionId);
      return <section key={sectionId ?? 'none'} className="tasks-column" aria-label={`${name}, ${plural(items.length, 'task')}`} {...dropOnProject(view.id, sectionId)}>
        <h3>{name} <small>{formatNumber(items.length)}</small></h3>
        <ul className="tasks-list">{items.map(t => row(t))}</ul>
        {sectionId && <SectionTools name={name} onRename={n => list.change(r => renameSection(r, sectionId, n), `Renamed the section to “${n}”.`)} onRemove={() => list.change(r => removeSection(r, sectionId), `Removed the section “${name}”; its tasks stay in the project.`)} />}
      </section>;
    };
    body = <div className="tasks-board" role="region" aria-label="Board">{column(null, 'No section')}{sections.map(s => column(s.id, s.name))}<AddSectionForm onAdd={n => list.change(r => addSection(r, view.id, n), `Added the section “${n}”.`)} /></div>;
  } else if (view.kind === 'project') {
    const sections = byOrderSections(record, view.id).filter(s => !s.archived); // Session AV lane 2 (LEDGER #20): an archived section is put away as a block
    body = <>{group('none', null, shown.filter(t => !t.sectionId))}
      {sections.map(s => group(s.id, s.name, shown.filter(t => t.sectionId === s.id), <SectionTools name={s.name} onRename={n => list.change(r => renameSection(r, s.id, n), `Renamed the section to “${n}”.`)} onRemove={() => list.change(r => removeSection(r, s.id), `Removed the section “${s.name}”; its tasks stay in the project.`)} />, dropOnProject(view.id, s.id)))}
      <AddSectionForm onAdd={n => list.change(r => addSection(r, view.id, n), `Added the section “${n}”.`)} /></>;
  } else if (view.kind === 'upcoming' && !query) {
    const days = Array.from({length: 14}, (_, i) => addLocalDays(today, i));
    // Session AV (1c, q1 #15, fresh-agent review; Things): a deadline shows on its own day too, ahead of time.
    // Review B6M-4: the week and month lists, the deadline line and the at-risk line read only the tasks in play (and in focus).
    const inPlay = inPlayRecord(record, today, focusOn ? viewFocus : null);
    const deadlinesOn = (d: string) => inPlay.tasks.filter(t => !t.doneAt && !t.parentId && t.deadline === d && t.due !== d);
    body = <>{inPlay.tasks.some(t => t.plan && !t.doneAt && !t.due) && <LoadBoundary quiet><Suspense fallback={null}><PlanBuckets record={inPlay} today={today} row={row} quiet={list.quiet} /></Suspense></LoadBoundary>}{inPlay.tasks.some(t => t.deadline && !t.doneAt) && <LoadBoundary quiet><Suspense fallback={null}><AtRiskLine record={inPlay} today={today} clock={clock} /></Suspense></LoadBoundary>}{days.map(d => { const items = shown.filter(t => t.due === d), due = deadlinesOn(d), name = d === today ? 'Today' : d === addLocalDays(today, 1) ? `Tomorrow · ${formatDate(d, {weekday: true, year: false})}` : formatDate(d, {weekday: true, year: false}); if (!items.length && !due.length) return null;
      const load = dayLoadWords(viewLoad(items)); /* Session AV lane 2 (q1 #39 Minor; Sunsama): the load of each day */
      return <Fragment key={d}>{items.length ? group(d, name, items, load ? <small className="fine tasks-day-load">{load}</small> : undefined) : <div className="tasks-group" data-state={d}><h3>{name}</h3></div>}{due.length > 0 && <p className="fine tasks-deadline-line"><span aria-hidden="true">⚑ </span>Deadline: {due.map((t, i) => <span key={t.id}>{i ? ' · ' : ''}<span dir="auto">{t.title}</span></span>)}</p>}</Fragment>; })}
      {group('later', 'Later', shown.filter(t => t.due! > days.at(-1)!))}</>;
  } else if (view.kind === 'inbox' && !query) {
    body = group('inbox', null, shown);
  } else {
    // Session AV lane 2 (r5-plan, LEDGER #350; Logseq's DOING): the tasks being done come first in Today, as their own group.
    const isDoingHere = (t: Task) => held.get(t.id) ?? t.state?.kind === 'doing';
    const doing = view.kind === 'today' && !query ? shown.filter(isDoingHere) : [];
    const notDoing = doing.length ? shown.filter(t => !isDoingHere(t)) : shown;
    const mine = view.kind === 'today' && !query ? notDoing.filter(t => picked.has(t.id)) : [], rest = mine.length ? notDoing.filter(t => !picked.has(t.id)) : notDoing;
    body = <>{doing.length > 0 && group('doing', 'Doing', doing)}{mine.length > 0 && group('myday', 'My Day', mine, <small className="fine tasks-day-load">picked for today; each keeps its own day</small>)}{STATE_GROUPS.map(g => group(g.state, g.title, rest.filter(t => taskState(t, today, clock) === g.state)))}</>;
  }
  const title = viewTitle(view, record);
  const empty = view.kind !== 'completed' && !own && shown.length === 0 && !tasks.unreadable;
  const project = view.kind === 'project' ? projectOf(view.id) : undefined;

  // Session AV lane 2 (r5-notes; LEDGER #355, Akiflow): a file dropped on Tasks becomes an Inbox task holding it (only a
  // drag that carries files; moving a task by drag is untouched).
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
  const dropFiles = (e: DragEvent) => {
    if (!hasFiles(e) || !e.dataTransfer.files.length) return;
    e.preventDefault();
    const files = [...e.dataTransfer.files].slice(0, 10);
    void import('./task-files').then(async ({keepTaskFile}) => {
      let made = 0, said = '';
      for (const f of files) {
        const taskId = `task_${crypto.randomUUID()}`, title = f.name.replace(/\.[^.]{1,10}$/, '').trim().slice(0, 200) || 'A file';
        try { await keepTaskFile(taskId, f); } catch (err) { said = err instanceof Error ? err.message : 'A file was not kept.'; continue; }
        if (list.change(r => addTask(r, {title}, {id: taskId, at: new Date(), today, allowPast: true}), `Added “${title}” to the Inbox with its file.`, `“${title}” taken back; its file leaves this device after 30 days.`)) made++;
      }
      setDropNote(made ? `${made === 1 ? 'An Inbox task holds the file' : `${made} Inbox tasks hold the files`}: open one to see it.${said ? ` ${said}` : ''}` : said);
    }).catch(() => setDropNote('The files could not be kept on this device.'));
  };
  const openTaskFromFiles = (taskId: string) => { const t = record.tasks.find(x => x.id === taskId); if (!t) return; setFilesOpen(false); go(t.doneAt ? {kind: 'completed'} : t.projectId ? {kind: 'project', id: t.projectId} : {kind: 'inbox'}); setFocusId(t.parentId ?? t.id); setEditId(t.id); };

  return <div className="tasks-page" data-tasks={ready ? 'ready' : 'loading'} onDragOver={e => { if (hasFiles(e)) e.preventDefault(); }} onDrop={dropFiles}>
    {/* Session AL (DV-162, LS-H13): the naming, said plainly — Tasks is the to-do list, the Checklist is the daily routine. */}
    <PageHeader className="page-heading tasks-hero" titleId="tasks-title" eyebrow="Tasks" title="One list for the things to do"
      lede="Your to-do list: one-off things to do, with days, repeats, projects and labels. Your daily routine is the Checklist. On this device only."
      actions={<p className="tasks-links"><Link className="text-link" href="/app/agenda">Your agenda →</Link><Link className="text-link" href="/app/checklist">Daily Checklist →</Link><button type="button" className="text-link" onClick={() => setHelp(true)} aria-keyshortcuts="?">Shortcuts</button><button type="button" className="text-link" aria-expanded={io} onClick={() => setIo(v => !v)}>Import / export</button><button type="button" className="text-link" aria-expanded={filesOpen} onClick={() => setFilesOpen(v => !v)}>Files</button></p>}
      art={<OrbitArt glyph={TasksGlyph} tone="goals" spin={-26} />} />
    {!ready ? <ZgSkeleton label="Opening your tasks…" className="tasks-skeleton" block lines={3} /> : <>
      {showcase && <p className="fine tasks-showcase" role="note">Showcase · fictional. These example tasks are not yours.</p>}
      {tasks.unreadable && <LoadBoundary quiet><Suspense fallback={null}><Salvage salvage={salvage} onKeep={() => { if (salvage) { keepSalvaged(salvage.readable); showStatus(`Kept ${plural(salvage.readable.tasks.length, 'task')} that could be read.`); } }} /></Suspense></LoadBoundary>}
      {reminders.length > 0 && <section className="panel tasks-reminders" aria-label="Reminders">
        <h2>Reminders</h2>
        {/* Session AV (1c, q1 #1): Done, Snooze (15 min, 1 h, tomorrow) and Dismiss on every reminder. */}
        <ReminderRows reminders={reminders} className="tasks-reminder-list" label="Reminders that have gone off" change={list.change} onDone={t => list.toggle(t, true)} onDismiss={key => setDismissed(s => new Set(s).add(key))} onFocus={setFocus} fallback={() => addField.current}
          line={r => <span><span dir="auto">{r.task.title}</span> · {r.task.time ? `${formatClock(r.task.time)}` : 'today'}{r.task.due && r.task.due !== today ? ` · ${formatDate(r.task.due, {weekday: true, year: false})}` : ''}</span>} />
        <p className="fine">Reminders show here and on Today while the app is open. On your device’s notifications only when notifications are switched on in Settings.</p>
      </section>}
      {filesOpen && <section className="panel tasks-files-panel" aria-labelledby="tasks-files-title"><h2 id="tasks-files-title">Files</h2>
        <LoadBoundary label="Files"><Suspense fallback={<p className="fine">Opening…</p>}><FilesView titles={new Map(record.tasks.map(t => [t.id, t.title]))} onOpenTask={openTaskFromFiles}/></Suspense></LoadBoundary>
        <button type="button" className="quiet" onClick={() => setFilesOpen(false)}>Close</button></section>}
      {dropNote && <p className="fine" role="status">{dropNote}</p>}
      {io && <LoadBoundary label="Import and export"><Suspense fallback={<p className="fine">Opening…</p>}><TasksIo record={record} today={today} showcase={showcase} onClose={() => setIo(false)} apply={list.change} /></Suspense></LoadBoundary>}
      {focus && <div ref={focusBox} className="tasks-focus"><LoadBoundary quiet><Suspense fallback={<p className="fine">Opening Focus Sessions…</p>}><PomodoroPanel task={{id: focus.id, title: focus.title}} goalId={focus.goal?.startsWith('private:') ? focus.goal.slice(8) : undefined} onClose={() => setFocus(null)} /></Suspense></LoadBoundary></div>}
      <div className="tasks-layout">
        <TasksNav record={record} today={today} view={view} board={board} counts={counts} projects={projects} onGo={go}
          onAddProject={(name, colour) => list.quiet(r => addProject(r, {name, colour}), `Made the project “${name.trim()}”.`)} scope={v => viewFocus && FOCUS_KINDS.has(v.kind) ? focusedRecord(record, viewFocus) : record} toReview={toReview}
          dropOn={dropOnProject} onRemoveFilter={id => list.change(r => removeFilter(r, id), 'Removed the saved filter.')} />
        <section className="panel tasks-main" aria-labelledby="tasks-view-title">
          <header className="tasks-view-head">
            <h2 id="tasks-view-title">{title} <small>{view.kind === 'completed' || own ? '' : shown.length ? plural(shown.length, 'task') : 'none open'}{view.kind !== 'completed' && counts.overdue && view.kind !== 'overdue' ? ` · ${formatNumber(counts.overdue)} overdue in all` : ''}</small></h2>
            {!!record.areas?.length && view.kind !== 'project' && <label className="field tasks-area-pick"><span>Area</span><select value={areaId} onChange={e => chooseArea(e.target.value)}><option value="">All areas</option>{record.areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
            {project && <ProjectTools project={project} board={board} setup={setupFor === project.id} onSetup={() => setSetupFor(setupFor === project.id ? null : project.id)} onBoard={b => go(view, b)} onEdit={patch => list.change(r => editProject(r, project.id, patch), patch.archived ? `Archived “${project.name}”.` : `Saved “${patch.name ?? project.name}”.`)} onRemove={() => { list.change(r => removeProject(r, project.id), `Removed the project “${project.name}”; its tasks are in the Inbox.`, 'The project is back.'); go({kind: 'inbox'}); }} />}
            {/* Session AV lane 2 (r6-plan, LEDGER #394): Focus on chosen projects or areas, in the views it narrows */}
            {FOCUS_KINDS.has(view.kind) && !!record.projects?.some(p => !p.archived) && !viewFocus && <button type="button" className="text-link tasks-focus-open" aria-expanded={focusing} onPointerEnter={() => void import('./focus-bar').catch(() => undefined)} onClick={() => setFocusing(v => !v)}>Focus…</button>}
            {view.kind !== 'completed' && !own && visibleIds.length > 0 && <button type="button" className="secondary tasks-select-mode" aria-pressed={selectMode} onClick={() => { if (selectMode) { setSelected(new Set()); setSelecting(false); } else setSelecting(true); }}>Select</button>}
            {/* Session AV (AT D20): the filter comes once there is a task to filter (it stood before "New task" on an empty list) */}
            {(record.tasks.length > 0 || query !== '') && <label className="field tasks-filter"><span>Filter</span><input ref={filterField} type="search" value={query} placeholder="e.g. #Home p1 today" aria-describedby="tasks-filter-help" onChange={e => setQuery(e.target.value)} /></label>}
            {query.trim() && <LoadBoundary quiet><Suspense fallback={null}><FilterSave onSave={name => list.change(r => saveFilter(r, name, query), `Saved the filter “${name}”.`)} /></Suspense></LoadBoundary>}
            <p id="tasks-filter-help" className="sr-only">Words match titles and notes. Also #project, @label, p1 to p4, today, tomorrow, overdue, no date, due:2026-12-05, recurring; join with & or |; ! before a word leaves it out.</p>
          </header>
          {(focusOn || (focusing && FOCUS_KINDS.has(view.kind))) && <LoadBoundary quiet><Suspense fallback={null}><FocusBar record={record} focus={viewFocus} choosing={focusing} onChoosing={setFocusing} /></Suspense></LoadBoundary>}
          {project && <LoadBoundary quiet><Suspense fallback={null}><ProjectStates list={list} project={project} /></Suspense></LoadBoundary>}
          {project && setupFor === project.id && <LoadBoundary label="Rules and fields"><Suspense fallback={<ZgSkeleton label="Opening…" block lines={2} />}><ProjectSetup list={list} record={record} project={project} /></Suspense></LoadBoundary>}
          {view.kind !== 'completed' && view.kind !== 'filter' && !own && <SmartAdd record={record} today={today} onAdd={addFromLine} onAddMany={addManyFromLines} defaults={defaults} inputRef={addField} makeProject={makeProject} goals={goals.open} />}
          {selected.size > 0 && <LoadBoundary quiet><Suspense fallback={null}><BulkBar count={selected.size} projects={projects} onDone={() => finishSelected()} onLevel={l => setLevel(l)} onDue={d => setDue(d === 'today' ? today : d === 'tomorrow' ? addLocalDays(today, 1) : d)} today={today} labels={labelsOf(record, selected)} onLabel={labelSelected} onMove={p => moveSelected(p)} onRemove={() => removeSelected()} onClear={() => { setSelected(new Set()); setSelecting(false); }} onAll={() => setSelected(new Set(visibleIds))} total={visibleIds.length} /></Suspense></LoadBoundary>}
          {selectMode && !selected.size && <p className="fine tasks-select-hint" role="status">Tick the tasks to act on together; Escape ends selecting.</p>}
          <TaskStatusLine error={list.error} />
          {!tasks.unreadable && body}
          {empty && <EmptyState title={query ? 'Nothing matches' : !record.tasks.length ? 'Your list starts here' : view.kind === 'today' ? 'Nothing due today' : 'Nothing here'} level={2} art="orbit">
            {query ? 'Try fewer words, or one operator such as p1, today or #project.' : counts.open ? 'Open another view on the left, or add one above.' : 'Type a few words above, like “Call the dentist tomorrow 10am”. Add a day, “every …”, p1–p4, #project or @label as you type.'}
          </EmptyState>}
          {(view.kind === 'today' || view.kind === 'upcoming') && !query && !tasks.unreadable && <LoadBoundary quiet><Suspense fallback={null}><NoteReminders kind={view.kind} today={today} /></Suspense></LoadBoundary>}
          {/* Session AV (D-CI1987): below the list, so Today's first task starts where it did (A10-11). */}
          {view.kind === 'today' && !query && (() => { const w = dayLoadWords(viewLoad(shown)); return w ? <p className="fine tasks-day-load">{w}</p> : null; })()}{/* Session AV (1c, q1 #39): every task in Today's list, overdue ones too */}{/* Session AV (F-TASK-MINUTES): the day's load in minutes */}
          {view.kind === 'today' && !query && !tasks.unreadable && record.tasks.length > 0 && <LoadBoundary quiet><Suspense fallback={null}><PlanDay record={record} today={today} clock={clock} shown={shown} focus={focusOn ? viewFocus : null} change={list.change} doneDay={list.doneDay} onPlan={id => list.change(r => editMany(r, [id], () => ({due: today}), today, {allowPast: true}), 'Task planned for today.', 'The task is back on its own day.')}/></Suspense></LoadBoundary>}
          {view.kind === 'today' && !query && record.tasks.some(t => isFinished(t) && list.doneDay(t.doneAt!) === today) && /* review B5L-3: finishes only */ <p className="fine"><button type="button" className="text-link" onClick={() => go({kind: 'completed'})}>Done today: {formatNumber(record.tasks.filter(t => isFinished(t) && list.doneDay(t.doneAt!) === today).length)} →</button></p>}
          {/* Session AV lane 2 (tasks-r2, LEDGER #225): below the list, so the list starts where it did (A10-11). */}
          {view.kind !== 'completed' && !own && visibleIds.length > 0 && <p className="tasks-print-line"><button type="button" className="text-link" onPointerEnter={() => void import('./tasks-print').catch(() => undefined)} onClick={() => setPrinting(true)}>Print this list</button></p>}
        </section>
      </div>
      <p className="fine tasks-fine">{formatNumber(record.tasks.length)} of {formatNumber(MAX_TASKS)} tasks kept on this device (finished ones count for 30 days). Focus starts a Pomodoro on a task. Press ? for keyboard shortcuts. They are also in Settings › Export everything.</p>
    </>}
    {printing && <LoadBoundary quiet><Suspense fallback={null}><TasksPrint title={title} record={record} shown={shown} grouping={view.kind === 'project' ? 'section' : view.kind === 'upcoming' ? 'day' : 'none'} projectId={view.kind === 'project' ? view.id : undefined} today={today} onDone={donePrinting} /></Suspense></LoadBoundary>}
    {help && <LoadBoundary quiet><Suspense fallback={null}><TasksShortcuts onClose={() => setHelp(false)} /></Suspense></LoadBoundary>}
  </div>;
}
export default TasksPage;

/* ---- small parts ---------------------------------------------------------------------------------------------- */

const byOrderProjects = (r: Tasks) => [...(r.projects ?? [])].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
const byOrderSections = (r: Tasks, projectId: string) => (r.sections ?? []).filter(s => s.projectId === projectId).sort((a, b) => a.order - b.order);

/** Opens the row's own inline editor (the row's Edit button), for Enter and ?task=. */
function EditorBridge({onClose}: {onClose: () => void}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const li = ref.current?.closest('li'), edit = li?.querySelector<HTMLButtonElement>(':scope > .task-actions button[aria-expanded="false"][aria-label^="Edit"]');
    // The editor loads on first use (LS-067), so its title field is looked for until it is there (up to a second).
    if (edit) { edit.click(); let tries = 0; const find = () => { const input = li?.querySelector<HTMLInputElement>('.task-editor input'); if (input) input.focus(); else if (tries++ < 60) requestAnimationFrame(find); }; requestAnimationFrame(find); }
    onClose();
  }, [onClose]);
  return <span ref={ref} hidden />;
}
/** Session AV lane 2 (r6-plan, LEDGER #391): the labels the bar offers to add (every label in use or in a group) and to take off (those the selected tasks carry). */
function labelsOf(record: Tasks, selected: ReadonlySet<string>): {all: string[]; carried: string[]} {
  const all = new Set<string>(), carried = new Set<string>();
  for (const t of record.tasks) for (const l of t.labels ?? []) { if (!t.doneAt) all.add(l); if (selected.has(t.id)) carried.add(l); }
  for (const g of record.labelGroups ?? []) for (const l of g.labels) all.add(l);
  return {all: [...all].sort((a, b) => a.localeCompare(b)), carried: [...carried].sort((a, b) => a.localeCompare(b))};
}
function GroupList({id, title, items, row, extra, drop}: {id: string; title: ReactNode; items: Task[]; row: (t: Task) => ReactNode; extra?: ReactNode; drop?: object}) {
  const [all, setAll] = useState(false);
  if (!items.length && !extra) return null;
  const shown = all ? items : items.slice(0, SHOWN_PER_GROUP);
  return <div className="tasks-group" data-state={id} {...(drop ?? {})}>
    {title && <h3>{title} <small>{formatNumber(items.length)}</small>{extra}</h3>}
    {/* Not shown.map(row): map's index arrived as the row's depth, so the 2nd and 3rd top-level rows were indented as subtasks (LS-H22). */}
    <ul className="tasks-list" aria-label={typeof title === 'string' ? `${title} tasks` : 'Tasks'}>{shown.map(t => row(t))}</ul>
    {items.length > SHOWN_PER_GROUP && <button type="button" className="text-link" onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show ${formatNumber(items.length - SHOWN_PER_GROUP)} more`}</button>}
  </div>;
}
function SubtaskAdd({parent, onAdd}: {parent: Task; onAdd: (title: string) => boolean}) {
  const [text, setText] = useState(''), [error, setError] = useState('');
  return <form className="task-sub-add" aria-label={`Add a subtask to “${parent.title}”`} noValidate onSubmit={e => { e.preventDefault(); if (!text.trim()) { setError('Type a subtask first.'); return; } if (onAdd(text.trim())) { setText(''); setError(''); } }}>
    <label className="field"><span className="sr-only">New subtask</span><input dir="auto" value={text} maxLength={TEXT_LIMITS.taskTitle} placeholder="Add a subtask" aria-invalid={error ? true : undefined} onChange={e => { setText(e.target.value); setError(''); }} /></label>
    <button type="submit" className="quiet">Add</button>{error && <small role="alert" className="tasks-field-error">{error}</small>}
  </form>;
}
function AddSectionForm({onAdd}: {onAdd: (name: string) => boolean}) {
  const [open, setOpen] = useState(false), [name, setName] = useState('');
  if (!open) return <p className="tasks-add-section"><button type="button" className="text-link" onClick={() => setOpen(true)}>+ Add a section</button></p>;
  return <form className="tasks-add-section" noValidate onSubmit={e => { e.preventDefault(); if (name.trim() && onAdd(name.trim())) { setName(''); setOpen(false); } }}>
    <label className="field"><span>Section name</span><input autoFocus value={name} maxLength={TEXT_LIMITS.taskListName} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }} /></label>
    <button type="submit" className="secondary" disabled={!name.trim()}>Add section</button><button type="button" className="quiet" onClick={() => setOpen(false)}>Cancel</button>
  </form>;
}
function SectionTools({name, onRename, onRemove}: {name: string; onRename: (n: string) => boolean; onRemove: () => void}) {
  const [renaming, setRenaming] = useState(false), [value, setValue] = useState(name);
  if (renaming) return <form className="tasks-inline-form" noValidate onSubmit={e => { e.preventDefault(); if (value.trim() && onRename(value.trim())) setRenaming(false); }}><label className="field"><span className="sr-only">Section name</span><input autoFocus value={value} maxLength={TEXT_LIMITS.taskListName} onChange={e => setValue(e.target.value)} /></label><button type="submit" className="quiet">Save</button><button type="button" className="quiet" onClick={() => setRenaming(false)}>Cancel</button></form>;
  return <span className="tasks-section-tools"><button type="button" className="text-link" aria-label={`Rename the section “${name}”`} onClick={() => setRenaming(true)}>Rename</button><button type="button" className="text-link" aria-label={`Remove the section “${name}”`} onClick={onRemove}>Remove</button></span>;
}
function ProjectTools({project, board, setup, onSetup, onBoard, onEdit, onRemove}: {project: NonNullable<Tasks['projects']>[number]; board: boolean; setup: boolean; onSetup: () => void; onBoard: (b: boolean) => void; onEdit: (patch: {name?: string; colour?: TaskColour; archived?: boolean}) => boolean; onRemove: () => void}) {
  const [renaming, setRenaming] = useState(false), [name, setName] = useState(project.name);
  return <div className="tasks-project-tools">
    <span role="group" aria-label="Layout" className="tasks-toggle"><button type="button" aria-pressed={!board} onClick={() => onBoard(false)}>List</button><button type="button" aria-pressed={board} onClick={() => onBoard(true)}>Board</button></span>
    {renaming ? <form className="tasks-inline-form" noValidate onSubmit={e => { e.preventDefault(); if (onEdit({name})) setRenaming(false); }}><label className="field"><span>Project name</span><input autoFocus value={name} maxLength={TEXT_LIMITS.taskListName} onChange={e => setName(e.target.value)} /></label><button type="submit" className="quiet">Save</button><button type="button" className="quiet" onClick={() => setRenaming(false)}>Cancel</button></form>
      : <button type="button" className="text-link" onClick={() => setRenaming(true)}>Rename</button>}
    <label className="field tasks-colour"><span>Colour</span><select value={project.colour} onChange={e => onEdit({colour: e.target.value as TaskColour})}>{TASK_COLOURS.map(c => <option key={c} value={c}>{c[0]!.toUpperCase() + c.slice(1)}</option>)}</select></label>
    <button type="button" className="text-link" aria-expanded={setup} onPointerEnter={() => void import('./project-setup').catch(() => undefined)} onClick={onSetup}>Rules and fields</button>
    <button type="button" className="text-link" onClick={() => onEdit({archived: !project.archived})}>{project.archived ? 'Bring back from the archive' : 'Archive'}</button>
    <button type="button" className="text-link" onClick={onRemove}>Remove project</button>
  </div>;
}
