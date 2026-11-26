'use client';
import {Suspense, lazy, useId, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus, showUndo} from '../ui/undo-toast';
import {TASKS, type Task, type Tasks} from '../../lib/tasks/schema';
import {addTask, byOrder, childrenOf, editTask, restoreTasks} from '../../lib/tasks/engine';
import {changedBy} from '../../lib/tasks/play-steps';
import {tasksToday} from '../../lib/tasks/device';
import {addLocalDays} from '../../lib/local-date';
import {STUCK_CLOSE, STUCK_GUIDE, STUCK_INTRO, stepLines, stuckAnswer, type StuckReason} from '../../lib/tasks/stuck-guide';
import {formatDate} from '../../lib/visual-format';
import './tasks-aw-x2.css';

/** The steps player (LEDGER #351) and the focus block (Focus Sessions), each loaded on the tap. */
const PlaySteps = lazy(() => import('./play-steps'));
const PomodoroPanel = lazy(() => import('../focus/pomodoro-panel'));

/**
 * Session AW (X2, LEDGER #448; Amazing Marvin's "help getting started"; owner decision 1d: written content), opened from a
 * task's editor ("Stuck? Help me start"), its own chunk. It asks why the task is stuck — too big, unclear, dreaded, not the
 * right time — and gives the written strategy for the answer (lib/tasks/stuck-guide.ts), which leads to a tool the app
 * already has: steps added as subtasks and played one at a time, the first step written down, a short focus block, or a
 * better day (or none). Each write is one change with its Undo; the guide never chooses for the person. No motion.
 */
export default function StuckGuide({task, onWrote, onClosed}: {task: Task; onWrote: (updatedAt: string | undefined) => void; onClosed: () => void}) {
  const tasks = useDeviceRecord(TASKS), id = useId();
  const [reason, setReason] = useState<StuckReason | null>(null), [steps, setSteps] = useState(''), [first, setFirst] = useState(''), [day, setDay] = useState('');
  const [playing, setPlaying] = useState(false), [focusing, setFocusing] = useState(false), [error, setError] = useState(''), [said, setSaid] = useState('');
  const strategy = useRef<HTMLDivElement>(null);
  if (!tasks.loaded) return null;
  const today = tasksToday(), live = tasks.data.tasks.find(t => t.id === task.id) ?? task, kids = childrenOf(tasks.data, task.id);
  const write = (fn: (r: Tasks) => Tasks, message: string, undone: string): Tasks | null => {
    if (tasks.unreadable) { showStatus('Your tasks on this device could not be read, so nothing was changed.', {tone: 'error'}); return null; }
    try { const before = tasks.data, after = tasks.update(fn), {was, added} = changedBy(before, after); showUndo({message, undone, restore: () => tasks.update(r => restoreTasks(r, was, added))}); setError(''); return after; }
    catch (e) { setError(e instanceof Error ? e.message : 'That could not be kept on this device.'); return null; }
  };
  const addSteps = (lines: readonly string[], atTop: boolean) => {
    if (!lines.length) { setError(atTop ? 'Type the first step, a few words.' : 'Type the steps, one on each line.'); return false; }
    const order = byOrder(kids).map(k => k.order ?? 0), base = atTop ? Math.min(0, ...order) - lines.length : Math.max(0, ...order) + 1, at = new Date();
    const done = write(r => lines.reduce((acc, title, i) => addTask(acc, {title, parentId: task.id, order: base + i}, {id: `task_${crypto.randomUUID()}`, at, today, allowPast: true}), r),
      lines.length === 1 ? `Added the step “${lines[0]}” to “${task.title}”.` : `Added ${lines.length} steps to “${task.title}”.`, 'The steps are taken back.');
    if (done) setSaid(lines.length === 1 ? 'The first step is under the task. Play the steps when you are ready.' : `${lines.length} steps are under the task. Play them one at a time when you are ready.`);
    return !!done;
  };
  const backToRow = () => requestAnimationFrame(() => { const el = document.getElementById(`task-${task.id}`)?.querySelector<HTMLElement>('.task-actions button[aria-label^="Edit"], input') ?? document.getElementById('tasks-title'); if (el && !el.matches('input, button')) el.setAttribute('tabindex', '-1'); el?.focus(); });
  const moveTo = (to: string | null) => {
    if (to !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(to) || to <= today)) { setError('Choose a day after today.'); return; }
    if (live.recur && to === null) { setError('A repeating task needs its day. Give it a later one, or pause the repeat below.'); return; }
    const after = write(r => editTask(r, task.id, {due: to, ...(to === null ? {time: null} : {})}, today, {allowPast: true}),
      to ? `“${task.title}” is planned for ${formatDate(to, {weekday: true, year: false})}.` : `“${task.title}” waits without a day.`, `“${task.title}” is back on its own day.`);
    if (!after) return;
    onWrote(after.tasks.find(t => t.id === task.id)?.updatedAt);
    // The task's day changed under the open editor, so the editor closes (its Due field would write the old day back).
    onClosed(); backToRow();
  };
  const choose = (r: StuckReason) => { setReason(r); setError(''); setSaid(''); setPlaying(false); setFocusing(false); requestAnimationFrame(() => strategy.current?.focus()); };
  const a = reason ? stuckAnswer(reason) : null;
  return <div className="task-stuck" role="group" aria-labelledby={`${id}-title`}>
    <p id={`${id}-title`} className="task-stuck-title">Stuck? Help me start</p>
    <p className="task-stuck-intro">{STUCK_INTRO.en}</p>
    <div className="task-stuck-reasons" role="group" aria-label="Why it is stuck">
      {STUCK_GUIDE.map(x => <button key={x.id} type="button" className={reason === x.id ? 'secondary' : 'quiet'} aria-pressed={reason === x.id} onClick={() => choose(x.id)}>{x.question.en}</button>)}
    </div>
    {a && <div ref={strategy} className="task-stuck-way" tabIndex={-1} aria-label={`A way in: ${a.question.en}`}>
      {a.strategy.en.map((line, i) => <p key={i}>{line}</p>)}
      {a.action === 'steps' && <>
        <label className="field"><span>Steps, one on each line</span><textarea dir="auto" rows={4} value={steps} maxLength={1200} placeholder={'Open the form\nFind last year’s numbers\nFill in page one'} aria-invalid={error ? true : undefined} onChange={e => { setSteps(e.target.value); setError(''); }} /></label>
        <p className="task-stuck-actions"><button type="button" className="secondary" onClick={() => { if (addSteps(stepLines(steps), false)) setSteps(''); }}>{a.actionLabel.en}</button>
          {(kids.length > 0 || said) && !live.doneAt && <button type="button" className="quiet" aria-expanded={playing} onClick={() => setPlaying(p => !p)}>{playing ? 'Close the steps' : 'Play the steps'}</button>}</p>
      </>}
      {a.action === 'first-step' && <>
        <label className="field"><span>The very next thing I would do</span><input dir="auto" value={first} maxLength={140} placeholder="Find the letter from the bank" aria-invalid={error ? true : undefined} onChange={e => { setFirst(e.target.value); setError(''); }} /></label>
        <p className="task-stuck-actions"><button type="button" className="secondary" onClick={() => { if (addSteps(stepLines(first, 1), true)) setFirst(''); }}>{a.actionLabel.en}</button>
          {(kids.length > 0 || said) && !live.doneAt && <button type="button" className="quiet" aria-expanded={playing} onClick={() => setPlaying(p => !p)}>{playing ? 'Close the steps' : 'Play the steps'}</button>}</p>
      </>}
      {a.action === 'focus' && <p className="task-stuck-actions"><button type="button" className="secondary" aria-expanded={focusing} onClick={() => setFocusing(f => !f)}>{focusing ? 'Close the focus block' : a.actionLabel.en}</button></p>}
      {a.action === 'day' && <>
        <label className="field"><span>A better day</span><input type="date" min={addLocalDays(today, 1)} value={day} aria-invalid={error ? true : undefined} onChange={e => { setDay(e.target.value); setError(''); }} /></label>
        <p className="task-stuck-actions"><button type="button" className="secondary" disabled={!day} onClick={() => moveTo(day)}>{a.actionLabel.en}</button>
          {!live.recur && live.due && <button type="button" className="quiet" onClick={() => moveTo(null)}>Let it wait without a day</button>}</p>
      </>}
      {said && <p className="fine" role="status">{said}</p>}
      {error && <p className="tasks-field-error" role="alert">{error}</p>}
      {playing && <Suspense fallback={<p className="fine" role="status">Opening the steps…</p>}><PlaySteps parent={live} onClose={() => setPlaying(false)} /></Suspense>}
      {focusing && <Suspense fallback={<p className="fine" role="status">Opening Focus Sessions…</p>}><div className="task-stuck-focus"><PomodoroPanel task={{id: task.id, title: task.title}} goalId={task.goal?.startsWith('private:') ? task.goal.slice(8) : undefined} heading="h3" onClose={() => setFocusing(false)} /></div></Suspense>}
    </div>}
    <p className="fine task-stuck-close">{STUCK_CLOSE.en}</p>
  </div>;
}
