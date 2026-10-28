'use client';
import {useId, useMemo, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {TASKS, TASK_PRIORITIES, type Task, type TaskPriority} from '../../lib/tasks/schema';
import {addTask, finishTask, openTasks, removeTask, reopenTask, restoreTask, taskState} from '../../lib/tasks/engine';
import {localDate} from '../../lib/local-date';
import {formatDate} from '../../lib/visual-format';
import './tasks.css';

const PRIORITY_WORDS: Record<TaskPriority, string> = {high: 'High', normal: 'Normal', low: 'Low'};
const SHOWN = 5;
/**
 * Session AI (tasks with a priority and a due date): one-off things to do on Today — add one with a priority and an
 * optional day, tick it done (Undo), remove it (Undo). Overdue and today's first. On this device only.
 */
export function TasksBody() {
  const tasks = useDeviceRecord(TASKS), id = useId(), today = localDate();
  const [title, setTitle] = useState(''), [priority, setPriority] = useState<TaskPriority>('normal'), [due, setDue] = useState('');
  const [status, setStatus] = useState<{text: string; undo?: () => void} | null>(null), [error, setError] = useState(''), [all, setAll] = useState(false);
  const open = useMemo(() => openTasks(tasks.data, today), [tasks.data, today]);
  if (!tasks.loaded) return <p className="fine">Loading your tasks…</p>;
  const change = (fn: (r: typeof tasks.data) => typeof tasks.data, text: string, undo?: () => void) => { try { tasks.update(fn); setStatus({text, undo}); setError(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'This could not be saved on this device.'); } };
  const add = (event: FormEvent) => {
    event.preventDefault();
    try { tasks.update(r => addTask(r, {title, priority, ...(due ? {due} : {})}, {id: `task_${crypto.randomUUID()}`, at: new Date(), today})); setStatus({text: `Added “${title.trim()}”.`}); setTitle(''); setDue(''); setPriority('normal'); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'This could not be saved on this device.'); }
  };
  const dueText = (t: Task) => { const s = taskState(t, today); return s === 'overdue' ? `Overdue · ${formatDate(t.due!, {year: false})}` : s === 'today' ? 'Due today' : s === 'someday' ? 'No day' : `Due ${formatDate(t.due!, {year: false})}`; };
  return <div className="tasks-body">
    {open.length ? <ul className="tasks-list" aria-label="Open tasks">{(all ? open : open.slice(0, SHOWN)).map(t => <li key={t.id} className={`task task-${taskState(t, today)} task-priority-${t.priority}`}>
      <label className="task-done"><input type="checkbox" checked={false} onChange={() => change(r => finishTask(r, t.id, new Date()), `Done: “${t.title}”.`, () => change(r => reopenTask(r, t.id), `“${t.title}” is open again.`))} /><span className="sr-only">Mark “{t.title}” done</span></label>
      <span className="task-title">{t.title}</span>
      <span className="task-meta">{t.priority !== 'normal' && <span className={`task-chip task-chip-${t.priority}`}>{PRIORITY_WORDS[t.priority]}</span>}<span>{dueText(t)}</span></span>
      <button type="button" className="text-link" aria-label={`Remove the task “${t.title}”`} onClick={() => change(r => removeTask(r, t.id), `Removed “${t.title}”.`, () => change(r => restoreTask(r, t), `“${t.title}” is back.`))}>Remove</button>
    </li>)}</ul> : <p className="fine">No open tasks. Add one below: a few words, a priority and, if it has one, a day.</p>}
    {open.length > SHOWN && <button type="button" className="text-link" onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show all ${open.length}`}</button>}
    <form className="tasks-add" onSubmit={add} aria-label="Add a task">
      <label className="field"><span>New task</span><input value={title} maxLength={140} onChange={e => setTitle(e.target.value)} placeholder="Call the dentist" /></label>
      <label className="field"><span>Priority</span><select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>{TASK_PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_WORDS[p]}</option>)}</select></label>
      <label className="field"><span>Due (optional)</span><input id={`${id}-due`} type="date" min={today} value={due} onChange={e => setDue(e.target.value)} /></label>
      <button type="submit" className="secondary" disabled={!title.trim()}>Add task</button>
    </form>
    {status && <p role="status" className="fine">{status.text} {status.undo && <button type="button" className="text-link" onClick={() => { const undo = status.undo!; setStatus(null); undo(); }}>Undo</button>}</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
export default TasksBody;
