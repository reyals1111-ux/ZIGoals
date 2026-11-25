'use client';
import './timers.css';
import {useEffect} from 'react';
import {showStatus} from '../ui/undo-toast';
import {openTimersEvent} from '../../lib/timers/open';
import {writeTimers} from '../../lib/timers/start';
import {activeTimers, bellOn, markRang, toRing} from '../../lib/timers/store';
import {TimerRow, useTimers} from './timer-row';

/** A timer that ended longer ago than this (the app was closed) is shown as done without a late bell. */
const LATE_MS = 10 * 60_000;

/**
 * Session AW (X1, LEDGER #440; Due's named timers): the small strip on every page while a timer runs, is paused or has
 * ended and is not stopped yet — each with Pause, +1 min and Stop, and "Timers" for the sheet. At a timer's end it rings
 * a bell made on the device (unless the bell is off in Timers, or the device is muted: a refused sound is simply silent)
 * and says so once, politely. The device's wake at that minute is the notification plan's (lib/notify/plan.ts `timer`).
 */
export default function TimerStrip() {
  const {record, now} = useTimers(), list = record.loaded ? activeTimers(record.data, now) : [];
  const due = record.loaded ? toRing(record.data, now) : [], dueKey = due.map(t => `${t.id}@${t.endsAt}`).join(',');
  useEffect(() => {
    if (!dueKey || record.unreadable) return;
    const at = Date.now(), ringing = due.filter(t => at - t.endsAt! < LATE_MS);
    try { writeTimers(r => markRang(r, due.map(t => t.id), at)); } catch { return; }
    if (!ringing.length) return;
    showStatus(ringing.length === 1 ? `Timer done: “${ringing[0]!.name}”.` : `Timers done: ${ringing.map(t => `“${t.name}”`).join(', ')}.`, {timeoutMs: 15_000});
    if (bellOn(record.data)) void import('../../lib/meditation/bells').then(m => m.ring('chime', 70)).catch(() => false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rings once per ended timer (its id and end are the key)
  }, [dueKey]);
  if (!list.length) return null;
  const shown = list.slice(0, 3);
  return <div className="aw-timer-strip" role="group" aria-label="Timers running">
    <ul>{shown.map(t => <TimerRow key={t.id} timer={t} now={now} compact />)}</ul>
    <button type="button" className="aw-timer-open" onClick={openTimersEvent}>{list.length > shown.length ? `Timers (${list.length - shown.length} more)` : 'Timers'}</button>
  </div>;
}
