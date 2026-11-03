'use client';
import {useEffect, useId, useRef, useState, type KeyboardEvent} from 'react';
import {activeIndex, clock, creditedMinutes, idleTimer, pauseTimer, reachedTarget, startTimer, timerElapsedMs, type FullscreenStep, type StepTimer} from './routine-fullscreen-timer';
import {entranceAllowed} from '../use-entrance';
import {deviceFeedbackEnv, vibrationAvailable, type FeedbackEnv} from '../../lib/checklist/feedback';
import {ringTimerBell} from '../../lib/habits-extras/bell';
import {plainErrorMessage} from '../../lib/plain-error';
import './routine-fullscreen.css';

export const END_VIBRATION_MS = 200;
/**
 * The end of a step's time: a vibration only when the person turned haptics on, the device has one, and motion is welcome
 * (not reduced motion, not Motion Off); a bell only through the existing timer bell (its quiet hours, a muted or
 * suspended audio context: lib/habits-extras/bell.ts). Never throws.
 */
export async function stepEndFeedback({haptics, bell}: {haptics: boolean; bell: boolean}, env: FeedbackEnv = deviceFeedbackEnv(), motion: () => boolean = entranceAllowed, ring: () => Promise<boolean> = () => ringTimerBell()): Promise<{vibrated: boolean; rang: boolean}> {
  let vibrated = false, rang = false;
  try { if (haptics && motion() && vibrationAvailable(env)) vibrated = env.vibrate!(END_VIBRATION_MS) !== false; } catch { vibrated = false; }
  try { if (bell) rang = await ring(); } catch { rang = false; }
  return {vibrated, rang};
}
/**
 * Session AK (5.4): the routine player, full screen: one step at a time with its own timer (start, pause, skip), Done to
 * log the step (a timed step is credited the minutes it took), Log all to log every remaining step at once, and Close
 * (Escape) that keeps the run. The caller logs through the habit journal (`onLogStep`, `onSkipStep`, `onLogAll`), exactly
 * as the routine player does. A dialog over the whole screen: focus moves in on open and back on close.
 */
export function RoutineFullscreen({title, steps, onLogStep, onSkipStep, onLogAll, onClose, haptics = false, bellFor = () => false}: {
  title: string; steps: readonly FullscreenStep[];
  onLogStep: (stepId: string, minutes: number | null) => void | Promise<void>;
  onSkipStep: (stepId: string) => void | Promise<void>;
  onLogAll?: () => void | Promise<void>;
  onClose: () => void;
  /** The person's haptics setting (Options); vibration also needs motion to be welcome. */
  haptics?: boolean;
  /** Whether a step rings its bell at the end (the habit's own bell setting, lib/habits-extras). */
  bellFor?: (stepId: string) => boolean;
}) {
  const id = useId(), dialog = useRef<HTMLDivElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const [timers, setTimers] = useState<Record<string, StepTimer>>({}), [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [said, setSaid] = useState('');
  const rung = useRef(new Set<string>());
  const index = activeIndex(steps), step = index >= 0 ? steps[index]! : null;
  const timer = step ? timers[step.id] ?? idleTimer() : idleTimer(), running = timer.runningSince !== null;
  const left = steps.filter(s => s.status === 'pending' || s.status === 'current').length;
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    heading.current?.focus();
    return () => { before?.focus?.(); };
  }, []);
  useEffect(() => {
    if (!running) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [running]);
  useEffect(() => {
    if (!step || !running || rung.current.has(step.id) || !reachedTarget(timer, now, step.minutes)) return;
    rung.current.add(step.id);
    setSaid(`${step.title}: ${step.minutes} ${step.minutes === 1 ? 'minute' : 'minutes'} reached.`);
    void stepEndFeedback({haptics, bell: bellFor(step.id)});
  }, [now, running, step, timer, haptics, bellFor]);
  const setTimer = (stepId: string, change: (t: StepTimer) => StepTimer) => { const at = Date.now(); setNow(at); setTimers(all => ({...all, [stepId]: change(all[stepId] ?? idleTimer())})); };
  async function act(work: () => void | Promise<void>, done: string) {
    setBusy(true); setError('');
    try { await work(); setSaid(done); } catch (cause) { setError(plainErrorMessage(cause, 'This step was not saved.')); } finally { setBusy(false); }
  }
  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    if (event.key !== 'Tab' || !dialog.current) return;
    // Focus stays inside the dialog.
    const focusable = [...dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex="0"]')];
    if (!focusable.length) return;
    const first = focusable[0]!, last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  const elapsed = timerElapsedMs(timer, now), share = step?.minutes ? Math.min(1, elapsed / (step.minutes * 60_000)) : 0;
  return <div ref={dialog} className="routine-fullscreen" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} onKeyDown={onKeyDown}>
    <div className="routine-fullscreen-head">
      <p className="eyebrow">{title}{step ? ` · step ${index + 1} of ${steps.length}` : ''}</p>
      <button type="button" className="quiet" onClick={onClose} aria-label="Close the full-screen player; the routine keeps its place">Close</button>
    </div>
    <ol className="routine-fullscreen-dots" aria-label="Steps">{steps.map(s => <li key={s.id} data-status={s.status} aria-label={`${s.title}: ${s.status === 'current' ? 'now' : s.status}`}/>)}</ol>
    {step ? <div className="routine-fullscreen-body">
      <h2 id={`${id}-title`} ref={heading} tabIndex={-1}>{step.title}</h2>
      {step.description && <p className="routine-fullscreen-desc">{step.description}</p>}
      {step.minutes !== null ? <div className="routine-fullscreen-timer">
        <p className="routine-fullscreen-clock" role="timer" aria-label={`${clock(elapsed)} of ${step.minutes} ${step.minutes === 1 ? 'minute' : 'minutes'}`}><strong>{clock(elapsed)}</strong><small> of {step.minutes} min</small></p>
        <div className="routine-fullscreen-bar" aria-hidden="true"><span style={{inlineSize: `${share * 100}%`}}/></div>
        <div className="routine-fullscreen-controls">
          {running ? <button type="button" className="secondary" onClick={() => setTimer(step.id, t => pauseTimer(t, Date.now()))}>Pause</button>
            : <button type="button" className="secondary" onClick={() => setTimer(step.id, t => startTimer(t, Date.now()))}>{elapsed > 0 ? 'Resume' : 'Start'}</button>}
        </div>
      </div> : <p className="routine-fullscreen-desc">Tick it off when it is done.</p>}
      <div className="actions routine-fullscreen-actions">
        <button type="button" className="primary" disabled={busy} onClick={() => void act(() => onLogStep(step.id, step.minutes !== null ? creditedMinutes(pauseTimer(timer, Date.now()), Date.now()) : null), `${step.title} logged.`)}>{busy ? 'Saving…' : 'Done'}</button>
        <button type="button" className="quiet" disabled={busy} onClick={() => void act(() => onSkipStep(step.id), `${step.title} skipped.`)}>Skip</button>
        {onLogAll && left > 1 && <button type="button" className="quiet" disabled={busy} onClick={() => void act(onLogAll, 'Every remaining step logged.')}>Log all {left} remaining</button>}
      </div>
    </div> : <div className="routine-fullscreen-body"><h2 id={`${id}-title`} ref={heading} tabIndex={-1}>Routine complete</h2><p className="routine-fullscreen-desc">{steps.filter(s => s.status === 'done').length} of {steps.length} steps done.</p><div className="actions"><button type="button" className="primary" onClick={onClose}>Close</button></div></div>}
    <p className="sr-only" role="status" aria-live="polite">{said}</p>
    {error && <p role="alert" className="routine-fullscreen-error">{error}</p>}
  </div>;
}
export default RoutineFullscreen;
