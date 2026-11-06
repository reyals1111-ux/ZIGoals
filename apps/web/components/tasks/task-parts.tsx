'use client';
import Link from 'next/link';
import {Suspense, lazy, useId, useMemo, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent, type ReactNode} from 'react';
import {LEVEL_SHORT, LEVEL_WORDS, TASK_PRIORITIES, TASK_TITLE_MAX, taskLevel, type HealthLink, type Task, type TaskLevel, type TaskPriority, type Tasks} from '../../lib/tasks/schema';
import {subtaskProgress, taskState, type TaskInput} from '../../lib/tasks/engine';
import {describeRecur} from '../../lib/tasks/recurrence';
import {reminderLabel} from '../../lib/tasks/reminders';
import {formatClock, formatDate} from '../../lib/visual-format';
import type {GoalOption} from './use-goal-options';
import type {TaskPatch} from './use-task-list';
import {celebrateCompletion} from '../motion/completion';

// Session AL fourth pass (LS-067): the full editor (repeat reader, reminders, links) loads when a task is first edited.
const TaskEditor = lazy(() => import('./task-editor'));

/**
 * Session AK (T1): the task pieces every surface shares — the add form, a task's row (tick, Focus, Edit, Remove) and its
 * editor — so the Tasks page, a goal's next actions and the Agenda read and act alike. Real labels and buttons, 44 px
 * targets (tasks.css), no motion.
 *
 * Session AL (Part 8): the row shows p1–p4, the repeat, the project, labels, subtask progress, notes and links; titles
 * take their own direction (dir="auto", LS-073); a day in another year names its year (LS-060, LS-H44); a past day is
 * kept and shows as overdue (P-LS-11); a blank title says why instead of doing nothing (P-LS-25); a paste over 140
 * characters says it was cut (P-LS-15). The editor has every field (notes, repeat, reminders, labels, project, links).
 */
export const PRIORITY_WORDS: Record<TaskPriority, string> = {high: 'High', normal: 'Normal', low: 'Low'};
export const HEALTH_WORDS: Record<HealthLink, string> = {water: 'Water', food: 'Food', weight: 'Weight', sleep: 'Sleep', movement: 'Movement', workout: 'Workouts', mind: 'Mind', fasting: 'Fasting'};
const HEALTH_HREF: Record<HealthLink, string> = {water: '/app/health#water', food: '/app/health#food', weight: '/app/health#weight', sleep: '/app/health#sleep', movement: '/app/health#movement', workout: '/app/health#workouts', mind: '/app/health#mind', fasting: '/app/health#fasting'};
/** A day as the row says it: the year only when it is not this year's. */
const dayWords = (day: string, today: string, weekday = false) => formatDate(day, {weekday, year: day.slice(0, 4) !== today.slice(0, 4)});
export function dueText(t: Task, today: string, nowClock?: string): string {
  const s = taskState(t, today, nowClock), at = t.time ? ` at ${formatClock(t.time)}` : '';
  if (s === 'overdue') return t.due === today ? `Late · today${at}` : `Overdue · ${dayWords(t.due!, today)}${at}`;
  return s === 'today' ? `Due today${at}` : s === 'someday' ? 'No day' : `Due ${dayWords(t.due!, today, true)}${at}`;
}

/** The title field: its own 140 limit (older builds read up to 140), and a paste that would be cut says so. */
export function TaskTitleInput({value, onChange, label, describedBy, inputRef, placeholder, onKeyDown, error}: {value: string; onChange: (v: string) => void; label: string; describedBy?: string; inputRef?: React.Ref<HTMLInputElement>; placeholder?: string; onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void; error?: string}) {
  const id = useId(), [cut, setCut] = useState('');
  const paste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text'), el = e.currentTarget, room = TASK_TITLE_MAX - (el.value.length - ((el.selectionEnd ?? 0) - (el.selectionStart ?? 0)));
    setCut(text.length > room ? `Cut to ${TASK_TITLE_MAX} characters: the pasted text had ${text.length}.` : '');
  };
  const notes = [describedBy, cut ? `${id}-cut` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined;
  return <label className="field tasks-add-title"><span>{label}</span>
    <input ref={inputRef} dir="auto" value={value} maxLength={TASK_TITLE_MAX} placeholder={placeholder} aria-invalid={error ? true : undefined} aria-describedby={notes}
      onPaste={paste} onKeyDown={onKeyDown} onChange={e => { onChange(e.target.value); if (cut && e.target.value.length < TASK_TITLE_MAX) setCut(''); }} />
    {cut && <small id={`${id}-cut`} className="tasks-field-note" role="status">{cut}</small>}
    {error && <small id={`${id}-err`} className="tasks-field-error" role="alert">{error}</small>}
  </label>;
}

/**
 * The add form. `fixedDue` (the Agenda's day) or `fixedGoal` (a goal page) take that field out of the form. `folded`
 * (Session AK G2, RELEASE_REVIEW_2 R2-17; the Tasks page): one line — the task and Add — with priority, day, time and goal
 * behind "More options", as Todoist's add field does; what is chosen there stays chosen while it is folded again.
 * Session AL (LS-H41): with More options open, the day, time, priority and goal stay for the next task.
 */
export function TaskAddForm({onAdd, goals, today, fixedDue, fixedGoal, label = 'Add a task', submit = 'Add task', compact = false, folded = false}: {onAdd: (input: TaskInput) => boolean; goals: readonly GoalOption[]; today: string; fixedDue?: string; fixedGoal?: string; label?: string; submit?: string; compact?: boolean; folded?: boolean}) {
  const id = useId();
  const [title, setTitle] = useState(''), [level, setLevel] = useState<TaskLevel>(3), [due, setDue] = useState(''), [time, setTime] = useState(''), [goal, setGoal] = useState('');
  const [more, setMore] = useState(false), [blank, setBlank] = useState(''), titleInput = useRef<HTMLInputElement>(null);
  const day = fixedDue ?? due;
  const send = (event: FormEvent) => {
    event.preventDefault();
    // Session AL (P-LS-25, LS-049): a blank title says why, and the spaces are cleared.
    if (!title.trim()) { setBlank('Type a task first.'); setTitle(''); titleInput.current?.focus(); return; }
    const input: TaskInput = {title, level, ...(day ? {due: day} : {}), ...(day && time ? {time} : {}), ...((fixedGoal ?? goal) ? {goal: fixedGoal ?? goal} : {})};
    // Session AK lane EXF (EX-8): the title field takes the focus back, ready for the next task.
    if (onAdd(input)) { setTitle(''); setBlank(''); if (!(folded && more)) { setDue(''); setTime(''); setLevel(3); setGoal(''); } titleInput.current?.focus(); }
  };
  const titleField = <TaskTitleInput inputRef={titleInput} label="New task" value={title} placeholder="Call the dentist" error={blank} onChange={v => { setTitle(v); if (blank && v.trim()) setBlank(''); }} />;
  const fields = <>
    {!compact && <label className="field"><span>Priority</span><select value={level} onChange={e => setLevel(Number(e.target.value) as TaskLevel)}>{([1, 2, 3, 4] as const).map(p => <option key={p} value={p}>{LEVEL_WORDS[p]}</option>)}</select></label>}
    {fixedDue === undefined && <label className="field"><span>Due (optional)</span><input id={`${id}-due`} type="date" value={due} aria-describedby={due && due < today ? `${id}-past` : undefined} onChange={e => { setDue(e.target.value); if (!e.target.value) setTime(''); }} />
      {due && due < today && <small id={`${id}-past`} className="tasks-field-note">A past day: it shows as overdue.</small>}</label>}
    {(fixedDue !== undefined || !compact) && <label className="field"><span>Time (optional)</span><input type="time" value={time} disabled={!day} onChange={e => setTime(e.target.value)} aria-describedby={day ? undefined : `${id}-time-note`} /></label>}
    {!day && !compact && <span id={`${id}-time-note`} className="sr-only">Choose a day first to give the task a time.</span>}
    {fixedGoal === undefined && goals.length > 0 && <label className="field"><span>Goal (optional)</span><select value={goal} onChange={e => setGoal(e.target.value)}><option value="">No goal</option>{goals.map(g => <option key={g.key} value={g.key}>{g.name}</option>)}</select></label>}
  </>;
  const add = <button type="submit" className="secondary">{submit}</button>;
  if (folded) return <form className="tasks-add is-folded" onSubmit={send} aria-label={label} noValidate>
    {titleField}
    {add}
    <button type="button" className="quiet tasks-add-toggle" aria-expanded={more} aria-controls={`${id}-more`} onClick={() => setMore(m => !m)}>More options</button>
    {more && <div id={`${id}-more`} className="tasks-add-more" role="group" aria-label="More options">{fields}</div>}
  </form>;
  return <form className={`tasks-add${compact ? ' is-compact' : ''}`} onSubmit={send} aria-label={label} noValidate>
    {titleField}
    {fields}
    {add}
  </form>;
}

export type RowLinks = {projectName?: string; projectColour?: string; habitTitle?: string};
/** C-LS-08: an edit of a repeating task changes this occurrence only ('one') or the series from now on ('all'). */
export type EditScope = 'one' | 'all';
/**
 * One task: tick it (the toast carries Undo), and when given, Focus, Edit and Remove. Session AL: with `record` it shows
 * subtask progress; `selected`/`onSelect` for bulk actions; `onMove` gives Move up / Move down (the keyboard alternative
 * to dragging); `drag` adds the drag handle's props; `children` render under it (its subtasks).
 */
export function TaskRow({task, today, goal, onToggle, onRemove, onEdit, onFocus, goals = [], showGoal = true, record, nowClock, links, selected, onSelect, onMove, drag, depth = 0, editor, habits, children, focused, onOpen, onSkip}: {task: Task; today: string; goal?: GoalOption; onToggle: (done: boolean) => void; onRemove?: () => void; onEdit?: (patch: TaskPatch, scope?: EditScope) => boolean; onFocus?: () => void; goals?: readonly GoalOption[]; showGoal?: boolean;
  record?: Tasks; nowClock?: string; links?: RowLinks; selected?: boolean; onSelect?: (on: boolean, shift: boolean) => void; onMove?: (step: -1 | 1) => void; drag?: React.HTMLAttributes<HTMLElement> & {draggable?: boolean}; depth?: number; editor?: 'inline' | 'none'; habits?: readonly {id: string; title: string}[]; children?: ReactNode; focused?: boolean; onOpen?: () => void; /** A repeating task: skip this occurrence (P-LS-02 "this one"). */ onSkip?: () => void}) {
  const [editing, setEditing] = useState(false), done = !!task.doneAt, state = taskState(task, today, nowClock), level = taskLevel(task);
  const progress = useMemo(() => record ? subtaskProgress(record, task.id) : null, [record, task.id]);
  return <li id={`task-${task.id}`} className={`task task-${done ? 'finished' : state} task-priority-${task.priority} task-level-${level}${selected ? ' is-selected' : ''}`} data-done={done || undefined} data-depth={depth || undefined} data-focused={focused || undefined} style={depth ? {['--task-depth' as string]: depth} : undefined} {...(drag ?? {})}>
    {onSelect && <label className="task-select"><input type="checkbox" checked={!!selected} onClick={e => onSelect(!selected, e.shiftKey)} onChange={() => undefined} /><span className="sr-only">Select “{task.title}”</span></label>}
    <label className="task-done"><input type="checkbox" checked={done} onChange={e => { if (e.target.checked) celebrateCompletion(e.currentTarget.parentElement); /* Session AK M1: the completion moment */ onToggle(e.target.checked); }} /><span className="sr-only">{done ? `Mark “${task.title}” not done` : `Mark “${task.title}” done`}</span></label>
    <span className="task-title" dir="auto">{onOpen ? <button type="button" className="task-title-button" dir="auto" onClick={onOpen}>{task.title}</button> : task.title}</span>
    <span className="task-meta">
      {level !== 3 && <span className={`task-chip task-chip-p${level}`} title={LEVEL_WORDS[level]}>P{level} · {LEVEL_SHORT[level]}</span>}
      <span className="task-due">{done ? `Done ${formatDate(task.doneAt!, {year: false})}` : dueText(task, today, nowClock)}</span>
      {task.recur && <span className="task-recur"><span aria-hidden="true">↻ </span>{describeRecur(task.recur)}</span>}
      {progress && progress.total > 0 && <span className="task-progress" aria-label={`${progress.done} of ${progress.total} subtasks done`}><span aria-hidden="true">☑ {progress.done}/{progress.total}</span></span>}
      {links?.projectName && <span className="task-project" data-colour={links.projectColour}><span aria-hidden="true"># </span>{links.projectName}</span>}
      {(task.labels ?? []).map(l => <span key={l} className="task-label" dir="auto">@{l}</span>)}
      {task.reminders?.length ? <span className="task-reminder"><span aria-hidden="true">⏰ </span>{task.reminders.length === 1 ? reminderLabel(task.reminders[0]!) : `${task.reminders.length} reminders`}</span> : null}
      {task.notes && <span className="task-has-notes">Notes</span>}
      {showGoal && goal && <Link prefetch={false} className="task-goal" href={goal.href}>Goal · {goal.name}{goal.closed ? ` (${goal.closed})` : ''}</Link>}
      {task.habit && <Link prefetch={false} className="task-goal" href="/app/habits">Habit · {links?.habitTitle ?? 'linked'}</Link>}
      {task.health && <Link prefetch={false} className="task-goal" href={HEALTH_HREF[task.health]}>Health · {HEALTH_WORDS[task.health]}</Link>}
    </span>
    {(onFocus || onEdit || onRemove || onMove || onSkip) && <span className="task-actions">
      {onMove && <><button type="button" className="text-link task-move" aria-label={`Move “${task.title}” up`} onClick={() => onMove(-1)}>↑</button><button type="button" className="text-link task-move" aria-label={`Move “${task.title}” down`} onClick={() => onMove(1)}>↓</button></>}
      {onFocus && !done && <button type="button" className="text-link" aria-label={`Focus on “${task.title}”`} onClick={onFocus}>Focus</button>}
      {onSkip && <button type="button" className="text-link" aria-label={`Skip this time: “${task.title}”`} onClick={onSkip}>Skip</button>}
      {onEdit && editor !== 'none' && <button type="button" className="text-link" aria-expanded={editing} aria-label={`Edit “${task.title}”`} onClick={() => setEditing(!editing)}>Edit</button>}
      {onRemove && <button type="button" className="text-link" aria-label={`Remove the task “${task.title}”`} onClick={onRemove}>Remove</button>}
    </span>}
    {task.notes && focused && <p className="task-notes" dir="auto">{task.notes}</p>}
    {editing && onEdit && editor !== 'none' && <Suspense fallback={<p className="fine task-editor-loading" role="status">Opening the editor…</p>}><TaskEditor task={task} today={today} goals={goals} linked={goal} record={record} habits={habits} onSave={(patch, scope) => { if (onEdit(patch, scope)) setEditing(false); }} onCancel={() => setEditing(false)} /></Suspense>}
    {children}
  </li>;
}

/**
 * The status line with Undo, and an error, under a task list (a goal's next actions, the Agenda, NOVA, Today's card).
 * Session AL (P-LS-52, LS-H31): it takes no room while there is nothing to say; the Tasks page uses the app's toast.
 */
export function TaskStatusLine({status, error, onUndo}: {status?: {text: string; undo?: () => void} | null; error: string; onUndo?: () => void}) {
  return <>
    <p role="status" className="fine tasks-status" data-empty={status?.text ? undefined : ''}>{status?.text} {status?.undo && onUndo && <button type="button" className="text-link" onClick={onUndo}>Undo</button>}</p>
    {error && <p role="alert" className="tasks-error">{error}</p>}
  </>;
}
export {TASK_PRIORITIES};
