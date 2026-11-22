'use client';
import {useId, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus, showUndo} from '../ui/undo-toast';
import {TASK_PLAN} from '../../lib/tasks/plan-record';
import {moveFinish, moveInDoneLog, takeBackFinish, unmoveInDoneLog} from '../../lib/tasks/occurrences';
import {restoreTasks} from '../../lib/tasks/engine';
import {TASKS, type Task, type Tasks} from '../../lib/tasks/schema';
import {formatDate} from '../../lib/visual-format';
import './tasks-r5.css';

/**
 * Session AV lane 2 (r5-plan, LEDGER #352; Akiflow's past occurrences), in Completed, its own chunk: one earlier finish of a
 * repeating task opened — "It was not done" takes the tick back, "It was done on …" moves it to the day it really was. The
 * task's next day stays as it is. With Undo (one toast puts the task and the finishes-per-day log back).
 */
/** Focuses an element by id that is not focusable by itself (tabIndex -1), so focus is never dropped to the page. */
export function focusHeading(id: string) { const el = document.getElementById(id); if (!el) return; if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1'); el.focus(); }
export default function OccurrenceEdit({task, at, today, doneDay}: {task: Task; at: string; today: string; doneDay: (iso: string) => string}) {
  const id = useId(), plan = useDeviceRecord(TASK_PLAN), tasks = useDeviceRecord(TASKS), from = doneDay(at);
  const [open, setOpen] = useState(false), [day, setDay] = useState(from), [error, setError] = useState('');
  /** The task's change and the finishes-per-day log's, with one Undo that puts both back. */
  const write = (fn: (r: Tasks) => Tasks, to: string | null, message: string, undone: string): boolean => {
    if (tasks.unreadable) { showStatus('Your tasks on this device could not be read, so nothing was changed.', {tone: 'error'}); return false; }
    const was = tasks.data.tasks.find(t => t.id === task.id);
    try { tasks.update(fn); } catch (e) { setError(e instanceof Error ? e.message : 'That could not be kept on this device.'); return false; }
    // Review B5L-7: only the finishes-per-day log is written, only when it changed, and Undo moves that one count back.
    let logMoved = false;
    if (plan.loaded && !plan.unreadable) { try { const before = plan.data, after = moveInDoneLog(before, from, to); if (after !== before) { plan.update(p => moveInDoneLog(p, from, to)); logMoved = true; } } catch { /* the log keeps its count */ } }
    showUndo({message, undone, restore: () => { if (was) tasks.update(r => restoreTasks(r, [was])); if (logMoved) plan.update(p => unmoveInDoneLog(p, from, to)); }});
    return true;
  };
  // The finish leaves the list, so focus goes to the list's count line, never to the page.
  const takeBack = () => { if (write(r => takeBackFinish(r, task.id, at), null, `Taken back: “${task.title}” on ${formatDate(from, {weekday: true, year: false})}. Its next day stays as it was.`, 'The tick is back.')) requestAnimationFrame(() => focusHeading('tasks-done-title')); };
  const move = () => {
    if (day === from) { setOpen(false); return; }
    try { moveFinish({version: 1, tasks: [task]}, task.id, at, day, today); } catch (e) { setError(e instanceof Error ? e.message : 'Choose a day.'); return; }
    setError('');
    if (write(r => moveFinish(r, task.id, at, day, today), day, `“${task.title}”: done on ${formatDate(day, {weekday: true, year: false})}. Its next day stays as it was.`, 'Back on its day.')) setOpen(false);
  };
  if (!open) return <button type="button" className="text-link" aria-label={`Change this finish of “${task.title}” (${formatDate(from, {year: false})})`} onClick={() => { setOpen(true); setDay(from); }}>Change</button>;
  return <div className="task-occurrence-edit" role="group" aria-labelledby={`${id}-t`}>
    <span id={`${id}-t`} className="sr-only">This finish of “{task.title}”</span>
    <button type="button" className="quiet" onClick={takeBack}>It was not done</button>
    <label className="field"><span>It was done on</span><input type="date" max={today} value={day} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : undefined} onChange={e => { setDay(e.target.value); setError(''); }} /></label>
    <button type="button" className="secondary" onClick={move}>Move it</button>
    <button type="button" className="quiet" onClick={() => setOpen(false)}>Cancel</button>
    {error && <small id={`${id}-e`} className="tasks-field-error" role="alert">{error}</small>}
  </div>;
}
