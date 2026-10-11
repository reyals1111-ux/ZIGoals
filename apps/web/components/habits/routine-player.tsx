'use client';
import {useEffect, useRef, useState} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {GlassRing} from '../progress/glass-progress';
import {advanceRun, finishSummary, liveRun, routineOf, routineSteps, runFinished, startRun, stepElapsedMinutes} from '../../lib/routines/engine';
import {ROUTINE_RUN} from '../../lib/routines/run-schema';
import {habitDay, habitRuleOn} from '../../lib/habits';
import {logHabitValue, smartDoneValue} from '../../lib/habits';
import {useDeviceRecord} from '../ai/use-device-record';
import {habitBell} from '../../lib/habits-extras/store';
import {ringTimerBell} from '../../lib/habits-extras/bell';
import {zigiSignals} from '../zigi/bus';
import type {HabitsStore} from './use-habits';
import type {HabitExtrasState} from './use-habit-extras';

const mmss = (minutes: number) => { const s = Math.max(0, Math.round(minutes * 60)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
/**
 * H5: the routine player: one habit at a time, a timer where the habit measures minutes (the elapsed time comes from the
 * stored step start, so a reload keeps it), Next logs the step through the journal (a duration habit logs the minutes it
 * took, at least its target when the target was reached), Skip moves on without a check-in, and a calm finish screen.
 * The run itself is `zigoals:routine-run:v1` on this device.
 */
export function RoutinePlayer({headId, store, extras, onClose}: {headId: string; store: HabitsStore; extras: HabitExtrasState; onClose: () => void}) {
  const record = useDeviceRecord(ROUTINE_RUN), routine = routineOf(store.data, headId);
  const [now, setNow] = useState(() => new Date()), [busy, setBusy] = useState(false), [error, setError] = useState(''), rang = useRef<string | null>(null), closeButton = useRef<HTMLButtonElement>(null);
  const run = record.loaded && !record.unreadable ? liveRun(record.data, store.data, store.today) : null;
  const mine = run?.headId === headId ? run : null;
  useEffect(() => { if (record.loaded && !record.unreadable && !mine && routine) { try { record.update(r => ({...r, run: startRun(headId, store.today, new Date())})); } catch { /* the player still shows the steps */ } } }, [record.loaded, record.unreadable, mine, routine, headId, store.today]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(id); }, []);
  useEffect(() => { closeButton.current?.focus(); }, []);
  if (!routine) return <section className="routine-player" aria-label="Routine"><p>This routine is no longer a stack.</p><button type="button" className="secondary" onClick={onClose}>Close</button></section>;
  const steps = routineSteps(routine, mine, store.today), current = mine ? steps[mine.step] : undefined, finished = mine ? runFinished(routine, mine) : false;
  const elapsed = mine ? stepElapsedMinutes(mine, now) : 0, target = current?.minutes ?? null, share = target ? Math.min(1, elapsed / target) : 0;
  if (mine && current?.duration && target && elapsed >= target && rang.current !== current.habit.id && extras.loaded && habitBell(extras.data, current.habit.id)) { rang.current = current.habit.id; void ringTimerBell(); }
  async function step(outcome: 'done' | 'skipped') {
    if (!mine || !current) return; setBusy(true); setError('');
    try {
      if (outcome === 'done') {
        const rule = habitRuleOn(current.habit, store.today);
        const day = habitDay(current.habit, store.today, store.today);
        if (rule && day.scheduled && day.status !== 'complete') {
          const value = current.duration && rule.measurement.kind === 'duration' ? Math.max(rule.target, Number((rule.measurement.unit === 'hours' ? elapsed / 60 : elapsed).toFixed(2))) : smartDoneValue(rule);
          await store.update(data => logHabitValue(data, current.habit.id, store.today, value, {}));
          try { zigiSignals.emitValidated('habit_completed'); } catch { /* decoration */ }
        }
      }
      const next = advanceRun(mine, current.habit.id, outcome, new Date());
      record.update(r => ({...r, run: next}));
      if (runFinished(routine!, next)) { try { zigiSignals.emitValidated('routine_finished'); } catch { /* decoration */ } }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'This step was not saved.'); } finally { setBusy(false); }
  }
  function leave(clear: boolean) { if (clear) { try { record.update(r => ({...r, run: null})); } catch { /* kept */ } } onClose(); }
  if (!mine) return <section className="routine-player" aria-label={routine.title}><p role="status">Starting {routine.title}…</p></section>;
  if (finished) {
    const f = finishSummary(routine, mine, store.today);
    return <section className="routine-player routine-finish" aria-labelledby="routine-finish-title"><p className="eyebrow">Routine complete</p><h2 id="routine-finish-title"><NebulaFlow identity={`routine-finish:${headId}`}>Well done.</NebulaFlow></h2><p className="routine-finish-line">{f.done} of {f.total} steps done{f.skipped ? `, ${f.skipped} skipped` : ''}, in about {f.minutes} {f.minutes === 1 ? 'minute' : 'minutes'}.</p><ol className="routine-finish-steps">{steps.map(s => <li key={s.habit.id} data-status={s.status}><span aria-hidden="true">{s.status === 'done' ? '✓' : '○'}</span>{s.habit.title}</li>)}</ol><div className="actions"><button ref={closeButton} type="button" className="primary" onClick={() => leave(true)}>Close</button></div></section>;
  }
  return <section className="routine-player" aria-labelledby="routine-player-title">
    <div className="routine-player-head"><p className="eyebrow">{routine.title} · step {mine.step + 1} of {steps.length}</p><button ref={closeButton} type="button" className="quiet" onClick={() => leave(false)} aria-label="Pause the routine and close">Close</button></div>
    <ol className="routine-dots" aria-label="Steps">{steps.map(s => <li key={s.habit.id} data-status={s.status} aria-label={`${s.habit.title}: ${s.status}`} />)}</ol>
    <h2 id="routine-player-title"><NebulaFlow identity={`routine-step:${current!.habit.id}`}>{current!.habit.title}</NebulaFlow></h2>
    {current!.habit.description && <p className="routine-step-desc">{current!.habit.description}</p>}
    {current!.duration ? <div className="routine-timer"><GlassRing identity={`routine-ring:${current!.habit.id}`} className="routine-ring" arcs={[{key: 'elapsed', end: share * 100}]} role="timer" aria-label={`${mmss(elapsed)} of ${target} minutes`}><strong>{mmss(elapsed)}</strong><small>of {target} min</small></GlassRing><p className="fine">Counted from when this step began; a reload keeps it.</p></div> : <p className="routine-step-tick">Tick it off when it is done.</p>}
    <div className="actions routine-actions"><button type="button" className="primary" disabled={busy} onClick={() => void step('done')}>{busy ? 'Saving…' : mine.step + 1 === steps.length ? 'Done · finish' : 'Done · next'}</button><button type="button" className="quiet" disabled={busy} onClick={() => void step('skipped')}>Skip</button></div>
    {error && <p role="alert">{error}</p>}
  </section>;
}
