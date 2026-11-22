'use client';
import {Suspense, lazy, useId, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus, showUndo} from '../ui/undo-toast';
import {TASKS, type Task, type Tasks} from '../../lib/tasks/schema';
import {childrenOf, descendants, restoreTasks} from '../../lib/tasks/engine';
import {CANCEL_REPEAT_MESSAGE, cancelTask, isDoing, startDoing, stopDoing} from '../../lib/tasks/task-state';
import {formatDate} from '../../lib/visual-format';
import './tasks-r5.css';
import {deviceDay} from '../../lib/tasks/device';

/** Session AV lane 2 (r5-plan, LEDGER #351; Tiimo's timers on the steps of a task): its own chunk, opened on the tap. */
const PlaySteps = lazy(() => import('./play-steps'));

/**
 * Session AV lane 2 (r5-plan), at the top of the task editor, its own chunk. Each acts at once (not with Save), with Undo:
 * - "Doing now" / "Not doing it now" (LEDGER #350, Logseq's DOING): first in Tasks → Today, its start day kept;
 * - "Cancel the task" (LEDGER #350, Logseq's CANCELED): closed without counting as done (Completed lists it as cancelled);
 * - "Copy link" (LEDGER #356, Akiflow's task links): the app's own `?task=` link, to paste into a note or the journal;
 * - "Play the steps" (LEDGER #351) for a task with subtasks.
 * `onWrote` gives the editor the task's new change time, so it does not read its own write as another tab's.
 */
export const taskLink = (id: string, origin: string) => `${origin}/app/tasks?task=${encodeURIComponent(id)}`;
export default function TaskR5Actions({task, onWrote, onClosed}: {task: Task; onWrote: (updatedAt: string | undefined) => void; onClosed: () => void}) {
  const tasks = useDeviceRecord(TASKS), id = useId(), linkRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState(''), [playing, setPlaying] = useState(false);
  if (!tasks.loaded) return null;
  const steps = childrenOf(tasks.data, task.id);
  const write = (fn: (r: Tasks) => Tasks, message: string, undone: string): Tasks | null => {
    if (tasks.unreadable) { showStatus('Your tasks on this device could not be read, so nothing was changed.', {tone: 'error'}); return null; }
    const near = new Set([task.id, ...descendants(tasks.data, task.id).map(t => t.id)]), before = tasks.data.tasks.filter(t => near.has(t.id));
    try {
      const next = tasks.update(fn);
      showUndo({message, undone, restore: () => tasks.update(r => restoreTasks(r, before))});
      return next;
    } catch (e) { showStatus(e instanceof Error ? e.message : 'That could not be kept on this device.', {tone: 'error'}); return null; }
  };
  const doing = isDoing(task);
  const toggleDoing = () => {
    const next = write(r => doing ? stopDoing(r, task.id, new Date()) : startDoing(r, task.id, new Date()), doing ? `“${task.title}” is open, no longer marked Doing.` : `Doing: “${task.title}”. It is first in Tasks → Today.`, `“${task.title}” is as it was.`);
    if (next) onWrote(next.tasks.find(t => t.id === task.id)?.updatedAt);
  };
  const cancel = () => {
    if (task.recur) { showStatus(CANCEL_REPEAT_MESSAGE, {tone: 'error'}); return; }
    // The task leaves its list, so focus goes to the page's title, never to the page itself.
    if (write(r => cancelTask(r, task.id, new Date()), `Cancelled: “${task.title}”. It is in Completed as cancelled and is not counted as done.`, `“${task.title}” is open again.`)) { onClosed(); requestAnimationFrame(() => { const el = document.getElementById(`task-${task.id}`)?.querySelector<HTMLElement>('input, button') ?? document.getElementById('tasks-title'); if (el && !el.matches('input, button')) el.setAttribute('tabindex', '-1'); el?.focus(); }); }
  };
  const copy = async () => {
    const url = taskLink(task.id, window.location.origin);
    try { await navigator.clipboard.writeText(url); setLink(''); showStatus('Link copied. Paste it into a note or the journal: it opens this task.'); }
    catch { setLink(url); requestAnimationFrame(() => { linkRef.current?.focus(); linkRef.current?.select(); }); }
  };
  return <div className="task-r5" role="group" aria-label={`Actions for “${task.title}”`}>
    {doing && task.state && <p><span className="task-doing">Doing</span> since {formatDate(deviceDay(task.state.at) /* review B5L-10: the device's own day */, {weekday: true, year: false})}.</p>}
    {!task.doneAt && <button type="button" className="secondary" onClick={toggleDoing}>{/* review B5L-12: the words say the state; no aria-pressed as well */}{doing ? 'Not doing it now' : 'Doing now'}</button>}
    {steps.length > 0 && !task.doneAt && <button type="button" className="secondary" aria-expanded={playing} onClick={() => setPlaying(p => !p)}>{playing ? 'Close the steps' : `Play the steps (${steps.length})`}</button>}
    <button type="button" className="quiet" onClick={() => void copy()}>Copy link</button>
    {!task.doneAt && !task.recur && <button type="button" className="quiet" onClick={cancel}>Cancel the task</button>}
    {link && <label className="field task-link-copy"><span>The task’s link (select it and copy)</span><input ref={linkRef} id={`${id}-link`} readOnly value={link} onFocus={e => e.currentTarget.select()} /></label>}
    {playing && <Suspense fallback={<p className="fine" role="status">Opening the steps…</p>}><PlaySteps parent={task} onClose={() => setPlaying(false)} /></Suspense>}
  </div>;
}
