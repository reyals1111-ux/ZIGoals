'use client';
import Link from 'next/link';
import {useId, useRef, useState, type FormEvent} from 'react';
import {TASK_PRIORITIES, type Task, type TaskPriority} from '../../lib/tasks/schema';
import {taskState, type TaskInput} from '../../lib/tasks/engine';
import {formatClock, formatDate} from '../../lib/visual-format';
import type {GoalOption} from './use-goal-options';
import type {TaskPatch} from './use-task-list';
import {celebrateCompletion} from '../motion/completion';

/**
 * Session AK (T1): the task pieces every surface shares — the add form, a task's row (tick, Focus, Edit, Remove) and its
 * editor — so the Tasks page, a goal's next actions and the Agenda read and act alike. Real labels and buttons, 44 px
 * targets (tasks.css), no motion.
 */
export const PRIORITY_WORDS: Record<TaskPriority, string> = {high: 'High', normal: 'Normal', low: 'Low'};
export function dueText(t: Task, today: string): string {
  const s = taskState(t, today), at = t.time ? ` at ${formatClock(t.time)}` : '';
  return s === 'overdue' ? `Overdue · ${formatDate(t.due!, {year: false})}` : s === 'today' ? `Due today${at}` : s === 'someday' ? 'No day' : `Due ${formatDate(t.due!, {weekday: true, year: false})}${at}`;
}

/**
 * The add form. `fixedDue` (the Agenda's day) or `fixedGoal` (a goal page) take that field out of the form. `folded`
 * (Session AK G2, RELEASE_REVIEW_2 R2-17; the Tasks page): one line — the task and Add — with priority, day, time and goal
 * behind "More options", as Todoist's add field does; what is chosen there stays chosen while it is folded again.
 */
export function TaskAddForm({onAdd, goals, today, fixedDue, fixedGoal, label = 'Add a task', submit = 'Add task', compact = false, folded = false}: {onAdd: (input: TaskInput) => boolean; goals: readonly GoalOption[]; today: string; fixedDue?: string; fixedGoal?: string; label?: string; submit?: string; compact?: boolean; folded?: boolean}) {
  const id = useId();
  const [title, setTitle] = useState(''), [priority, setPriority] = useState<TaskPriority>('normal'), [due, setDue] = useState(''), [time, setTime] = useState(''), [goal, setGoal] = useState('');
  const [more, setMore] = useState(false), titleInput = useRef<HTMLInputElement>(null);
  const day = fixedDue ?? due;
  const send = (event: FormEvent) => {
    event.preventDefault();
    const input: TaskInput = {title, priority, ...(day ? {due: day} : {}), ...(day && time ? {time} : {}), ...((fixedGoal ?? goal) ? {goal: fixedGoal ?? goal} : {})};
    // Session AK lane EXF (EX-8): the title field takes the focus back, ready for the next task (Add turns disabled as the
    // field clears, and a focused button that turns disabled drops the focus to the page).
    if (onAdd(input)) { setTitle(''); setDue(''); setTime(''); setPriority('normal'); setGoal(''); titleInput.current?.focus(); }
  };
  const titleField = <label className="field tasks-add-title"><span>New task</span><input ref={titleInput} value={title} maxLength={140} onChange={e => setTitle(e.target.value)} placeholder="Call the dentist" /></label>;
  const fields = <>
    {!compact && <label className="field"><span>Priority</span><select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>{TASK_PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_WORDS[p]}</option>)}</select></label>}
    {fixedDue === undefined && <label className="field"><span>Due (optional)</span><input id={`${id}-due`} type="date" min={today} value={due} onChange={e => { setDue(e.target.value); if (!e.target.value) setTime(''); }} /></label>}
    {(fixedDue !== undefined || !compact) && <label className="field"><span>Time (optional)</span><input type="time" value={time} disabled={!day} onChange={e => setTime(e.target.value)} aria-describedby={day ? undefined : `${id}-time-note`} /></label>}
    {!day && !compact && <span id={`${id}-time-note`} className="sr-only">Choose a day first to give the task a time.</span>}
    {fixedGoal === undefined && goals.length > 0 && <label className="field"><span>Goal (optional)</span><select value={goal} onChange={e => setGoal(e.target.value)}><option value="">No goal</option>{goals.map(g => <option key={g.key} value={g.key}>{g.name}</option>)}</select></label>}
  </>;
  const add = <button type="submit" className="secondary" disabled={!title.trim()}>{submit}</button>;
  if (folded) return <form className="tasks-add is-folded" onSubmit={send} aria-label={label}>
    {titleField}
    {add}
    <button type="button" className="quiet tasks-add-toggle" aria-expanded={more} aria-controls={`${id}-more`} onClick={() => setMore(m => !m)}>More options</button>
    {more && <div id={`${id}-more`} className="tasks-add-more" role="group" aria-label="More options">{fields}</div>}
  </form>;
  return <form className={`tasks-add${compact ? ' is-compact' : ''}`} onSubmit={send} aria-label={label}>
    {titleField}
    {fields}
    {add}
  </form>;
}

/** One task: tick it (Undo is the caller's status line), and when given, Focus, Edit and Remove. */
export function TaskRow({task, today, goal, onToggle, onRemove, onEdit, onFocus, goals = [], showGoal = true}: {task: Task; today: string; goal?: GoalOption; onToggle: (done: boolean) => void; onRemove?: () => void; onEdit?: (patch: TaskPatch) => boolean; onFocus?: () => void; goals?: readonly GoalOption[]; showGoal?: boolean}) {
  const [editing, setEditing] = useState(false), done = !!task.doneAt, state = taskState(task, today);
  return <li id={`task-${task.id}`} className={`task task-${done ? 'finished' : state} task-priority-${task.priority}`} data-done={done || undefined}>
    <label className="task-done"><input type="checkbox" checked={done} onChange={e => { if (e.target.checked) celebrateCompletion(e.currentTarget.parentElement); /* Session AK M1: the completion moment */ onToggle(e.target.checked); }} /><span className="sr-only">{done ? `Mark “${task.title}” not done` : `Mark “${task.title}” done`}</span></label>
    <span className="task-title">{task.title}</span>
    <span className="task-meta">
      {task.priority !== 'normal' && <span className={`task-chip task-chip-${task.priority}`}>{PRIORITY_WORDS[task.priority]}</span>}
      <span>{done ? `Done ${formatDate(task.doneAt!, {year: false})}` : dueText(task, today)}</span>
      {showGoal && goal && <Link prefetch={false} className="task-goal" href={goal.href}>Goal · {goal.name}</Link>}
    </span>
    {(onFocus || onEdit || onRemove) && <span className="task-actions">
      {onFocus && !done && <button type="button" className="text-link" aria-label={`Focus on “${task.title}”`} onClick={onFocus}>Focus</button>}
      {onEdit && <button type="button" className="text-link" aria-expanded={editing} aria-label={`Edit “${task.title}”`} onClick={() => setEditing(!editing)}>Edit</button>}
      {onRemove && <button type="button" className="text-link" aria-label={`Remove the task “${task.title}”`} onClick={onRemove}>Remove</button>}
    </span>}
    {editing && onEdit && <TaskEditor task={task} today={today} goals={goals} linked={goal} onSave={patch => { if (onEdit(patch)) setEditing(false); }} onCancel={() => setEditing(false)} />}
  </li>;
}

function TaskEditor({task, today, goals, linked, onSave, onCancel}: {task: Task; today: string; goals: readonly GoalOption[]; /** The goal the task is linked to, also when it is no longer active (finished). */ linked?: GoalOption; onSave: (patch: TaskPatch) => void; onCancel: () => void}) {
  const [title, setTitle] = useState(task.title), [priority, setPriority] = useState<TaskPriority>(task.priority), [due, setDue] = useState(task.due ?? ''), [time, setTime] = useState(task.time ?? ''), [goal, setGoal] = useState(task.goal ?? '');
  const known = goals.some(g => g.key === goal || g.id === goal);
  return <form className="task-editor tasks-add" aria-label={`Edit “${task.title}”`} onSubmit={e => { e.preventDefault(); onSave({title, priority, due: due || null, time: due && time ? time : null, goal: goal || null}); }}>
    <label className="field tasks-add-title"><span>Title</span><input value={title} maxLength={140} onChange={e => setTitle(e.target.value)} /></label>
    <label className="field"><span>Priority</span><select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>{TASK_PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_WORDS[p]}</option>)}</select></label>
    <label className="field"><span>Due</span><input type="date" min={task.due && task.due < today ? task.due : today} value={due} onChange={e => { setDue(e.target.value); if (!e.target.value) setTime(''); }} /></label>
    <label className="field"><span>Time</span><input type="time" value={time} disabled={!due} onChange={e => setTime(e.target.value)} /></label>
    {(goals.length > 0 || goal) && <label className="field"><span>Goal</span><select value={goal} onChange={e => setGoal(e.target.value)}><option value="">No goal</option>{!known && goal && <option value={goal}>{linked && (linked.key === goal || linked.id === goal) ? linked.name : 'A goal no longer here'}</option>}{goals.map(g => <option key={g.key} value={g.key}>{g.name}</option>)}</select></label>}
    <span className="task-editor-actions"><button type="submit" className="secondary" disabled={!title.trim()}>Save</button><button type="button" className="quiet" onClick={onCancel}>Cancel</button></span>
  </form>;
}

/** The status line with Undo, and an error, under a task list. */
export function TaskStatusLine({status, error, onUndo}: {status: {text: string; undo?: () => void} | null; error: string; onUndo: () => void}) {
  return <>
    <p role="status" className="fine tasks-status">{status?.text} {status?.undo && <button type="button" className="text-link" onClick={onUndo}>Undo</button>}</p>
    {error && <p role="alert" className="tasks-error">{error}</p>}
  </>;
}
