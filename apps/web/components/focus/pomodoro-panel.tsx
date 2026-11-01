'use client';
import {useId, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {startSoundscape} from '../music/soundscape-start';
import {FOCUS_SESSIONS} from '../../lib/focus-sessions/schema';
import {POMODORO_DEFAULTS, cleanSettings, phaseShare, runMinutes, secondsLeft} from '../../lib/focus-sessions/pomodoro';
import {dismissPomodoroResult, skipPomodoroBreak, startPomodoro, stopPomodoro, undoPomodoroTick} from '../../lib/focus-sessions/pomodoro-run';
import {formatMinutes} from '../../lib/zone-time';
import {formatNumber} from '../../lib/visual-format';
import {PHASE_WORDS, clockOf, usePomodoro} from './use-pomodoro';
import './focus.css';

/**
 * Session AK (T3): Pomodoro mode in Focus Sessions — work blocks and breaks of the lengths the person picks, a number
 * of blocks, an optional focus sound from the ambient player (started inside the tap, stopped when the run ends) and,
 * started from a task, an optional tick of that task when the run finishes (with Undo). Each work block is a Focus
 * Session in the garden. The ring fills by the second; it has no animation of its own beyond a smooth step, and none
 * with reduced motion or Motion Off. Loaded on use (Journey's Focus Sessions, the Tasks page).
 */
const CHOICES = {work: [15, 20, 25, 30, 45, 50, 60], shortBreak: [3, 5, 10, 15], longBreak: [10, 15, 20, 30], cycles: [1, 2, 3, 4, 5, 6]} as const;
const LABELS = {work: 'Focus block', shortBreak: 'Short break', longBreak: 'Long break', cycles: 'Blocks'} as const;
const R = 52, C = 2 * Math.PI * R;
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;

export function PomodoroPanel({task, goalId, onClose, heading = 'h3'}: {task?: {id: string; title: string}; goalId?: string; onClose?: () => void; heading?: 'h2' | 'h3'}) {
  const id = useId(), record = useDeviceRecord(FOCUS_SESSIONS), snap = usePomodoro(), {run, last} = snap;
  const saved = record.loaded && !record.unreadable ? record.data.pomodoro : undefined;
  const [chosen, setChosen] = useState<Partial<Record<keyof typeof CHOICES, number>>>({});
  const [sound, setSound] = useState<boolean | null>(null), [tick, setTick] = useState<boolean | null>(null);
  const settings = cleanSettings({...POMODORO_DEFAULTS, ...(saved ?? {}), ...chosen});
  const withSound = sound ?? saved?.sound ?? false, tickTask = tick ?? saved?.tickTask ?? true;
  const H = heading;
  const start = () => startPomodoro({settings, ...(task ? {task} : {}), ...(goalId ? {goalId} : {}), tickTask, ...(withSound ? {startSound: () => { void startSoundscape('focus'); }} : {})});
  const phase = run ? run.phases[run.index]! : null, left = run ? secondsLeft(run, snap.now || run.phaseStartedAt) : 0, share = run ? phaseShare(run, snap.now || run.phaseStartedAt) : 0;
  const otherTask = run && task && run.taskId !== task.id;
  return <section className="pomodoro" aria-labelledby={`${id}-t`} data-phase={phase?.kind ?? (last ? 'finished' : 'idle')}>
    <H id={`${id}-t`} className="pomodoro-title">Pomodoro{run?.taskTitle ? <small> · {run.taskTitle}</small> : !run && task ? <small> · {task.title}</small> : null}</H>
    {run && phase ? <>
      {otherTask && <p className="fine">A Pomodoro is already running{run.taskTitle ? ` for “${run.taskTitle}”` : ''}. End it to start one for “{task!.title}”.</p>}
      <div className="pomodoro-stage">
        <svg className="pomodoro-ring" viewBox="0 0 120 120" aria-hidden="true">
          <circle className="pomodoro-ring-track" cx="60" cy="60" r={R} />
          <circle className="pomodoro-ring-fill" cx="60" cy="60" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - share)} transform="rotate(-90 60 60)" />
        </svg>
        <div className="pomodoro-readout">
          <p className="pomodoro-phase">{PHASE_WORDS[phase.kind]}</p>
          <p className="pomodoro-clock" role="timer" aria-live="off" aria-label={`${clockOf(left)} left`}>{clockOf(left)}</p>
          <p className="pomodoro-block">Block {phase.block} of {run.settings.cycles}</p>
        </div>
      </div>
      <p role="status" className="sr-only">{`${PHASE_WORDS[phase.kind]}, block ${phase.block} of ${run.settings.cycles}`}</p>
      <div className="pomodoro-actions">
        {phase.kind !== 'work' && <button type="button" className="secondary" onClick={skipPomodoroBreak}>Skip the break</button>}
        <button type="button" className="secondary" onClick={stopPomodoro}>End the run</button>
      </div>
      {(run.grown + run.withered > 0) && <p className="fine">So far: {plural(run.grown, 'block')} grown{run.withered ? `, ${formatNumber(run.withered)} withered (kept)` : ''}.</p>}
    </> : last ? <div className="pomodoro-result" role="status">
      <p>{last.endedEarly ? 'Run ended.' : 'Run finished.'} {plural(last.grown, 'block')} grown{last.withered ? `, ${formatNumber(last.withered)} withered and kept` : ''}, in your garden.</p>
      {last.ticked && last.taskTitle && <p>Marked “{last.taskTitle}” done. <button type="button" className="text-link" onClick={undoPomodoroTick}>Undo</button></p>}
      <div className="pomodoro-actions"><button type="button" className="secondary" onClick={dismissPomodoroResult}>Start another</button>{onClose && <button type="button" className="quiet" onClick={() => { dismissPomodoroResult(); onClose(); }}>Close</button>}</div>
    </div> : <>
      <div className="pomodoro-settings" role="group" aria-label="Pomodoro lengths">
        {(Object.keys(CHOICES) as (keyof typeof CHOICES)[]).map(key => <label key={key} className="field"><span>{LABELS[key]}</span>
          <select value={settings[key]} onChange={e => setChosen(c => ({...c, [key]: Number(e.target.value)}))}>{[...new Set<number>([...CHOICES[key], settings[key]])].sort((a, b) => a - b).map(v => <option key={v} value={v}>{key === 'cycles' ? formatNumber(v) : `${formatNumber(v)} min`}</option>)}</select>
        </label>)}
      </div>
      <p className="fine">{plural(settings.cycles, 'block')} of {formatNumber(settings.work)} minutes, about {formatMinutes(runMinutes(settings))} with the breaks.</p>
      <label className="pomodoro-check"><input type="checkbox" checked={withSound} onChange={e => setSound(e.target.checked)} /><span>Play a focus sound with it (made on this device; it stops when the run ends)</span></label>
      {task && <label className="pomodoro-check"><input type="checkbox" checked={tickTask} onChange={e => setTick(e.target.checked)} /><span>Mark “{task.title}” done when the run finishes (you can undo it)</span></label>}
      <div className="pomodoro-actions">
        <button type="button" className="primary" onClick={start}>Start the Pomodoro</button>
        {onClose && <button type="button" className="quiet" onClick={onClose}>Close</button>}
      </div>
    </>}
    {snap.error && <p role="alert" className="fine">{snap.error}</p>}
    <p className="fine">Each focus block counts like a Focus Session: it grows when the page stays open and in front, and withers (and is kept) when ended early or mostly away. A reload ends the run; finished blocks are kept.</p>
  </section>;
}
export default PomodoroPanel;
