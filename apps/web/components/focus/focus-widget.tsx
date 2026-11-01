'use client';
import Link from 'next/link';
import {useId} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {startSoundscape} from '../music/soundscape-start';
import {FOCUS_SESSIONS} from '../../lib/focus-sessions/schema';
import {gardenOf} from '../../lib/focus-sessions/engine';
import {POMODORO_DEFAULTS, cleanSettings, secondsLeft} from '../../lib/focus-sessions/pomodoro';
import {dismissPomodoroResult, skipPomodoroBreak, startPomodoro, stopPomodoro, undoPomodoroTick} from '../../lib/focus-sessions/pomodoro-run';
import {localDate} from '../../lib/local-date';
import {formatNumber} from '../../lib/visual-format';
import {PHASE_WORDS, clockOf, usePomodoro} from './use-pomodoro';
import './focus.css';

/**
 * Session AK (T3), exported for NOVA (lane NA): the focus timer as a widget. While a Pomodoro runs anywhere in ZIGoals it
 * shows the phase, the time left and Skip / End; after a run, what grew and the task's Undo; otherwise a Start with the
 * person's last lengths and sound choice, and this week's focus minutes ("none yet" teaches rather than a zero).
 * `size` 's' shows the essentials only. Reads only this device's records; nothing is sent anywhere.
 */
export type FocusWidgetProps = {size?: 's' | 'm' | 'l'; /** Start a run for this task (NOVA's "focus on this"). */ task?: {id: string; title: string}};
export function FocusWidget({size = 'm', task}: FocusWidgetProps) {
  const id = useId(), snap = usePomodoro(), record = useDeviceRecord(FOCUS_SESSIONS), {run, last} = snap;
  const saved = record.loaded && !record.unreadable ? record.data.pomodoro : undefined, settings = cleanSettings({...POMODORO_DEFAULTS, ...(saved ?? {})});
  const week = record.loaded && !record.unreadable ? gardenOf(record.data, localDate()) : null;
  const start = () => startPomodoro({settings, ...(task ? {task} : {}), tickTask: saved?.tickTask ?? true, ...(saved?.sound ? {startSound: () => { void startSoundscape('focus'); }} : {})});
  const phase = run ? run.phases[run.index]! : null;
  return <section className="focus-widget" data-size={size} aria-labelledby={`${id}-t`}>
    <h3 id={`${id}-t`} className="focus-widget-title">Focus</h3>
    {run && phase ? <>
      <p className="focus-widget-line"><span className="focus-widget-clock" role="timer" aria-live="off">{clockOf(secondsLeft(run, snap.now || run.phaseStartedAt))}</span> {PHASE_WORDS[phase.kind]} · block {phase.block} of {run.settings.cycles}</p>
      {run.taskTitle && size !== 's' && <p className="focus-widget-line fine">For “{run.taskTitle}”</p>}
      <div className="pomodoro-actions">{phase.kind !== 'work' && <button type="button" className="secondary" onClick={skipPomodoroBreak}>Skip the break</button>}<button type="button" className="secondary" onClick={stopPomodoro}>End the run</button></div>
    </> : last ? <div role="status">
      <p className="focus-widget-line">{last.endedEarly ? 'Run ended' : 'Run finished'}: {formatNumber(last.grown)} grown{last.withered ? `, ${formatNumber(last.withered)} withered (kept)` : ''}.</p>
      {last.ticked && last.taskTitle && <p className="focus-widget-line">Marked “{last.taskTitle}” done. <button type="button" className="text-link" onClick={undoPomodoroTick}>Undo</button></p>}
      <div className="pomodoro-actions"><button type="button" className="quiet" onClick={dismissPomodoroResult}>OK</button></div>
    </div> : <>
      <p className="focus-widget-line">{week && week.weekSessions > 0 ? `${formatNumber(week.weekMinutes)} minutes of focus this week, in ${formatNumber(week.weekSessions)} ${week.weekSessions === 1 ? 'session' : 'sessions'}.` : 'No focus sessions this week yet. A Pomodoro is a calm way to start.'}</p>
      <div className="pomodoro-actions">
        <button type="button" className="primary" onClick={start}>{task ? `Focus on “${task.title.slice(0, 40)}”` : `Start a ${formatNumber(settings.work)}-minute Pomodoro`}</button>
        {size !== 's' && <Link prefetch={false} className="text-link" href="/app/journey?focus=pomodoro#focus">Focus Sessions →</Link>}
      </div>
    </>}
    {snap.error && <p role="alert" className="fine">{snap.error}</p>}
  </section>;
}
export default FocusWidget;
