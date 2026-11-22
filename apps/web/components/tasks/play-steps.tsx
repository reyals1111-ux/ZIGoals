'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus, showUndo} from '../ui/undo-toast';
import {TASKS, type Task, type Tasks} from '../../lib/tasks/schema';
import {finishTask, restoreTasks} from '../../lib/tasks/engine';
import {changedBy, clockText, finishStep, pauseClock, playSteps, resumeClock, runMs, spentMinutes, startClock, type StepClock} from '../../lib/tasks/play-steps';
import {tasksToday} from '../../lib/tasks/device';
import {minutesWords} from '../../lib/tasks/minutes';
import './tasks-r5.css';

/**
 * Session AV lane 2 (r5-plan, LEDGER #351; Tiimo's timers on the steps of a task), opened from a task's editor, its own
 * chunk: the current step with its own countdown (from its minutes; a count up when it has none), the done and coming steps,
 * Next (ticks it and adds the time it took to its time spent, with Undo), Pause and Close. The countdown is plain text that
 * changes once a second, never an animation, and it is not read out each second (role="timer"); the step changes are said.
 */
/** The clock, read in handlers only (never during render). */
const clockNow = () => Date.now();
export default function PlaySteps({parent, onClose}: {parent: Task; onClose: () => void}) {
  const tasks = useDeviceRecord(TASKS), id = useId(), nextRef = useRef<HTMLButtonElement>(null);
  const [clock, setClock] = useState<StepClock>(() => startClock(clockNow())), [now, setNow] = useState(() => clockNow()), [said, setSaid] = useState('');
  useEffect(() => { if (clock.since === null) return; const t = window.setInterval(() => setNow(clockNow()), 1000); return () => window.clearInterval(t); }, [clock.since]);
  useEffect(() => { nextRef.current?.focus(); }, []);
  if (!tasks.loaded) return null;
  const steps = playSteps(tasks.data, parent.id), step = steps.now, ms = runMs(clock, now), shown = step ? clockText(step, ms) : null;
  // Review B5L-2: the Undo puts back every task the change touched (a repeating parent's steps, a step's own subtasks).
  const write = (fn: (r: Tasks) => Tasks, message: string, undone: string): boolean => {
    if (tasks.unreadable) { showStatus('Your tasks on this device could not be read, so nothing was changed.', {tone: 'error'}); return false; }
    try { const before = tasks.data, after = tasks.update(fn), {was, added} = changedBy(before, after); showUndo({message, undone, restore: () => tasks.update(r => restoreTasks(r, was, added))}); return true; }
    catch (e) { showStatus(e instanceof Error ? e.message : 'That could not be kept on this device.', {tone: 'error'}); return false; }
  };
  const next = () => {
    if (!step) return;
    const t = clockNow(), took = spentMinutes(runMs(clock, t)), coming = steps.coming[0];
    if (!write(r => finishStep(r, step.id, runMs(clock, t), new Date(t), tasksToday()), `Done: “${step.title}”${took ? ` · ${minutesWords(took)} added to its time spent` : ''}.`, `“${step.title}” is open again.`)) return;
    setClock(startClock(t)); setNow(t);
    setSaid(coming ? `Next step: ${coming.title}.` : 'Every step is done.');
    requestAnimationFrame(() => nextRef.current?.focus());
  };
  const pause = () => { const t = clockNow(); setNow(t); setClock(c => c.since === null ? resumeClock(c, t) : pauseClock(c, t)); setSaid(clock.since === null ? 'Going on.' : 'Paused.'); };
  const finishParent = () => { if (write(r => finishTask(r, parent.id, new Date(), {today: tasksToday(), doneDay: tasksToday()}), `Done: “${parent.title}”.`, `“${parent.title}” is open again.`)) onClose(); };
  return <section className="task-play" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>Steps of “<span dir="auto">{parent.title}</span>” <small>{steps.done.length} of {steps.all.length} done</small></h4>
    {step && shown ? <>
      <p className="task-play-now">Now: <strong dir="auto">{step.title}</strong></p>
      <p className="task-play-clock" role="timer" aria-live="off" aria-label={shown.counting === 'up' ? `Running for ${shown.text}` : shown.over ? `${shown.text.slice(1)} past its ${minutesWords(step.minutes!)}` : `${shown.text} left of ${minutesWords(step.minutes!)}`}>
        {shown.text}<small> {shown.counting === 'up' ? 'running (no minutes set)' : shown.over ? `past its ${minutesWords(step.minutes!)}` : `left of ${minutesWords(step.minutes!)}`}{clock.since === null ? ' · paused' : ''}</small></p>
      <span className="task-play-actions">
        <button ref={nextRef} type="button" className="primary" onClick={next}>{steps.coming.length ? 'Next' : 'Done, last step'}</button>
        <button type="button" className="secondary" onClick={pause}>{clock.since === null ? 'Go on' : 'Pause'}</button>
        <button type="button" className="quiet" onClick={onClose}>Close</button>
      </span>
    </> : <>
      <p>Every step is done.</p>
      <span className="task-play-actions">
        {!parent.doneAt && <button ref={nextRef} type="button" className="primary" onClick={finishParent}>Mark “{parent.title}” done</button>}
        <button type="button" className="quiet" onClick={onClose}>Close</button>
      </span>
    </>}
    <ol className="task-play-steps" aria-label="All steps">{steps.all.map(s => <li key={s.id} data-step={s.doneAt ? 'done' : s.id === step?.id ? 'now' : 'coming'}>
      <span dir="auto">{s.title}</span>{s.minutes ? <small> · {minutesWords(s.minutes)}</small> : null}<span className="sr-only">{s.doneAt ? ' (done)' : s.id === step?.id ? ' (now)' : ''}</span>{s.doneAt && s.spent ? <small> · took {minutesWords(s.spent)}</small> : null}</li>)}</ol>
    <p className="sr-only" role="status">{said}</p>
    <p className="fine">Each step counts down from its own minutes (set them in the step’s editor). Next ticks it and adds the time to it. Nothing runs when this is closed.</p>
  </section>;
}
