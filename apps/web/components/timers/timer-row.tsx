'use client';
import {useEffect, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus} from '../ui/undo-toast';
import {writeTimers} from '../../lib/timers/start';
import {TIMERS, addMinute, clockOf, pauseTimer, resumeTimer, secondsLeft, spokenLength, stopTimer, timerState, type Timer, type Timers} from '../../lib/timers/store';

/**
 * Session AW (X1, LEDGER #440): the timers' record with a clock that moves once a second while one runs (the numbers
 * change; nothing else moves, Motion Off or not), and one timer's row with Pause or Resume, +1 min and Stop — the same in
 * the strip and in the sheet.
 */
export function useTimers() {
  const record = useDeviceRecord(TIMERS), [now, setNow] = useState(() => Date.now());
  const running = record.data.timers.some(t => timerState(t, now) === 'running');
  useEffect(() => {
    if (!running) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [running]);
  useEffect(() => { setNow(Date.now()); }, [record.data]);
  return {record, now};
}
export function changeTimers(change: (r: Timers) => Timers, said?: string): boolean {
  try { writeTimers(change); if (said) showStatus(said); return true; }
  catch (e) { showStatus(e instanceof Error ? e.message : 'That could not be kept on this device.', {tone: 'error'}); return false; }
}
export function TimerRow({timer, now, compact = false}: {timer: Timer; now: number; compact?: boolean}) {
  const state = timerState(timer, now), left = secondsLeft(timer, now), name = timer.name;
  const at = () => Date.now();
  return <li className="aw-timer" data-state={state}>
    <span className="aw-timer-name" dir="auto">{name}</span>
    {/* The numbers change each second; they are not a live region (a screen reader reads them when it gets there). */}
    <span className="aw-timer-clock"><span className="aw-timer-digits" aria-hidden="true">{state === 'ended' ? 'Done' : clockOf(left)}{state === 'paused' && !compact ? ' · paused' : ''}</span>
      <span className="sr-only">{state === 'ended' ? 'done' : `${spokenLength(left)} left${state === 'paused' ? ', paused' : ''}`}</span></span>
    <span className="aw-timer-actions">
      {state === 'running' && <button type="button" aria-label={`Pause ${name}`} onClick={() => changeTimers(r => pauseTimer(r, timer.id, at()))}>Pause</button>}
      {state === 'paused' && <button type="button" aria-label={`Resume ${name}`} onClick={() => changeTimers(r => resumeTimer(r, timer.id, at()))}>Resume</button>}
      <button type="button" aria-label={`+1 min to ${name}`} onClick={() => changeTimers(r => addMinute(r, timer.id, at()), state === 'ended' ? `“${name}” runs one more minute.` : undefined)}>+1 min</button>
      <button type="button" aria-label={`Stop ${name}`} onClick={() => changeTimers(r => stopTimer(r, timer.id), `“${name}” stopped. It is kept in Timers to start again.`)}>Stop</button>
    </span>
  </li>;
}
