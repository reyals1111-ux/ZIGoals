'use client';
import {Suspense, lazy, useEffect, useId, useRef, useState} from 'react';
import {showUndo} from '../ui/undo-toast';
import {useDeviceRecord} from '../ai/use-device-record';
import {startSoundscape} from '../music/soundscape-start';
import {FOCUS_SESSIONS} from '../../lib/focus-sessions/schema';
import {POMODORO_DEFAULTS, cleanSettings, phaseShare, runMinutes, secondsLeft} from '../../lib/focus-sessions/pomodoro';
import {dismissPomodoroResult, skipPomodoroBreak, startPomodoro, stopPomodoro, undoPomodoroTick} from '../../lib/focus-sessions/pomodoro-run';
import {formatMinutes} from '../../lib/zone-time';
import {formatNumber} from '../../lib/visual-format';
import {PHASE_WORDS, clockOf, usePomodoro} from './use-pomodoro';
import './focus.css';
// Session AK (BUILD list 2 #15, lane G1a): Focus intervals' bell at each change and the sound fading in breaks.
const FocusRounds = lazy(() => import('../focus-rounds/focus-rounds'));

/**
 * Session AK (T3): Pomodoro mode in Focus Sessions — work blocks and breaks of the lengths the person picks, a number
 * of blocks, an optional focus sound from the ambient player (started inside the tap, stopped when the run ends) and,
 * started from a task, an optional tick of that task when the run finishes (with Undo). Each work block is a Focus
 * Session in the garden. The ring fills by the second; it has no animation of its own beyond a smooth step, and none
 * with reduced motion or Motion Off. Loaded on use (Journey's Focus Sessions, the Tasks page).
 */
// Session AL (LS-H20): shorter blocks (5 and 10 minutes) to try it out; the stored limits allow 5 at the least.
const CHOICES = {work: [5, 10, 15, 20, 25, 30, 45, 50, 60], shortBreak: [1, 3, 5, 10, 15], longBreak: [10, 15, 20, 30], cycles: [1, 2, 3, 4, 5, 6]} as const;
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
  // Session AL (P-LS-53, LS-H20; PRIMITIVES 3e): the task ticked at the end of a run says so in the one toast, whose Undo
  // opens it again (completeTask's own undo, which puts the stored task back); once per run.
  const toasted = useRef('');
  useEffect(() => {
    if (!last?.ticked || !last.taskTitle || toasted.current === last.runId) return;
    toasted.current = last.runId;
    showUndo({message: `Pomodoro finished. Marked “${last.taskTitle}” done.`, undone: `“${last.taskTitle}” is open again.`, restore: undoPomodoroTick});
  }, [last]);
  // The choice to tick is remembered with the lengths when the run starts (lib/focus-sessions/pomodoro-run.ts).
  const tickOnEnd = (r: {taskId?: string}) => !!r.taskId && !!saved?.tickTask;
  const finalBreak = !!run && !!phase && phase.kind === 'long-break' && phase.block === run.settings.cycles;
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
      {/* Session AL (LS-H20): after the last block the run is in its long break; it says so, and finishing now ticks the task. */}
      {finalBreak && <p className="pomodoro-final" role="status">Every block is done{run.grown ? ` (${plural(run.grown, 'block')} grown)` : ''}. This is your long break{run.taskTitle && tickOnEnd(run) ? `; “${run.taskTitle}” is marked done when it ends` : ''}.</p>}
      <div className="pomodoro-actions">
        {finalBreak ? <button type="button" className="primary" onClick={skipPomodoroBreak}>{run.taskTitle && tickOnEnd(run) ? `Finish now and mark “${run.taskTitle}” done` : 'Finish now'}</button>
          : phase.kind !== 'work' && <button type="button" className="secondary" onClick={skipPomodoroBreak}>Skip the break</button>}
        <button type="button" className="secondary" onClick={stopPomodoro}>End the run</button>
      </div>
      {(run.grown + run.withered > 0) && <p className="fine">So far: {plural(run.grown, 'block')} grown{run.withered ? `, ${formatNumber(run.withered)} withered (kept)` : ''}.</p>}
    </> : last ? <div className="pomodoro-result" role="status">
      <p>{last.endedEarly ? 'Run ended.' : 'Run finished.'} {last.grown + last.withered === 0 ? (last.endedEarly ? 'No block reached a minute, so no focus time was kept.' : 'No block was kept.') : <>{plural(last.grown, 'block')} grown{last.withered ? `, ${formatNumber(last.withered)} withered and kept (the time you did focus counts)` : ''}, in your garden.</>}</p>
      {last.ticked && last.taskTitle && <p>Marked “{last.taskTitle}” done. Undo is in the message at the bottom of the screen.</p>}
      {!last.ticked && last.taskTitle && last.endedEarly && <p className="fine">“{last.taskTitle}” stays open: a run ended early does not mark it done.</p>}
      <div className="pomodoro-actions"><button type="button" className="secondary" onClick={dismissPomodoroResult}>Start another</button>{onClose && <button type="button" className="quiet" onClick={() => { dismissPomodoroResult(); onClose(); }}>Close</button>}</div>
    </div> : <>
      <div className="pomodoro-settings" role="group" aria-label="Pomodoro lengths">
        {(Object.keys(CHOICES) as (keyof typeof CHOICES)[]).map(key => <label key={key} className="field"><span>{LABELS[key]}</span>
          <select value={settings[key]} onChange={e => setChosen(c => ({...c, [key]: Number(e.target.value)}))}>{[...new Set<number>([...CHOICES[key], settings[key]])].sort((a, b) => a - b).map(v => <option key={v} value={v}>{key === 'cycles' ? formatNumber(v) : `${formatNumber(v)} min`}</option>)}</select>
        </label>)}
      </div>
      <p className="fine">{plural(settings.cycles, 'block')} of {formatNumber(settings.work)} minutes, about {formatMinutes(runMinutes(settings))} with the breaks.</p>
      <label className="pomodoro-check"><input type="checkbox" checked={withSound} onChange={e => setSound(e.target.checked)} /><span>Play a focus sound with it (made on this device; it stops when the run ends)</span></label>
      {task && <label className="pomodoro-check"><input type="checkbox" checked={tickTask} onChange={e => setTick(e.target.checked)} /><span>Mark “{task.title}” done when the run finishes, after its last break (you can finish the break early; you can undo it)</span></label>}
      <div className="pomodoro-actions">
        <button type="button" className="primary" onClick={start}>Start the Pomodoro</button>
        {onClose && <button type="button" className="quiet" onClick={onClose}>Close</button>}
      </div>
    </>}
    <Suspense fallback={null}><FocusRounds running={!!run}/></Suspense>
    {snap.error && <p role="alert" className="fine">{snap.error}</p>}
    <p className="fine">Each focus block counts like a Focus Session: it grows when the page stays open and in front, and withers (and is kept) when ended early or mostly away. A reload ends the run; finished blocks are kept.</p>
  </section>;
}
export default PomodoroPanel;
