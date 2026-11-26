'use client';
import './timers.css';
import {useEffect, useId, useRef, useState, type FormEvent} from 'react';
import {showStatus} from '../ui/undo-toast';
import {startNamedTimer} from '../../lib/timers/start';
import {MAX_TIMERS, TIMER_NAME_MAX, activeTimers, bellOn, keptTimers, lengthWords, parseLength, removeTimer, setBell, startAgain, timerState} from '../../lib/timers/store';
import {TimerRow, changeTimers, useTimers} from './timer-row';

/**
 * Session AW (X1, LEDGER #440; Due's named timers): the Timers sheet — start a named countdown ("Pasta", 9 min), see the
 * ones running (several at once) with Pause, +1 min and Stop, start a kept one again (up to 20 kept), and the bell. A
 * native modal dialog: the page behind is inert, Escape and the backdrop close it, and the focus goes back where it was.
 * Everything is on this device and works offline.
 */
export default function TimersSheet({onClose}: {onClose: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null), back = useRef<HTMLElement | null>(null), nameRef = useRef<HTMLInputElement>(null), id = useId();
  const {record, now} = useTimers(), [name, setName] = useState(''), [length, setLength] = useState(''), [error, setError] = useState<{field: 'name' | 'length'; text: string} | null>(null);
  useEffect(() => {
    back.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const d = dialog.current; if (d && !d.open) d.showModal();
    nameRef.current?.focus();
    return () => { if (d?.open) d.close(); back.current?.focus?.(); };
  }, []);
  const active = record.loaded ? activeTimers(record.data, now) : [], kept = record.loaded ? keptTimers(record.data).filter(t => timerState(t, now) === 'kept') : [];
  const start = (e: FormEvent) => {
    e.preventDefault();
    const seconds = parseLength(length);
    if (!name.trim()) { setError({field: 'name', text: 'Give the timer a name, for example “Pasta”.'}); nameRef.current?.focus(); return; }
    if (seconds === null) { setError({field: 'length', text: 'Enter minutes (9), minutes and seconds (1:30), or words like 1 h 30 min — up to 24 hours.'}); return; }
    // The tap wakes the page's audio, so the bell at the end may sound (browsers allow sound only after a gesture).
    if (bellOn(record.data)) void import('../../lib/audio/context').then(m => m.wakeAudio()).catch(() => false);
    try { const t = startNamedTimer(name, seconds); setError(null); setName(''); setLength(''); showStatus(`“${t.name}” started: ${lengthWords(t.seconds)}.`); nameRef.current?.focus(); }
    catch (err) { setError({field: 'name', text: err instanceof Error ? err.message : 'That timer could not be kept on this device.'}); }
  };
  return <dialog ref={dialog} className="aw-timers-sheet" aria-labelledby={`${id}-t`} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === dialog.current) onClose(); }}>
    <div className="aw-timers-body">
      <header className="aw-timers-head"><h2 id={`${id}-t`}>Timers</h2><button type="button" className="quiet" onClick={onClose}>Close</button></header>
      <form className="aw-timers-add" noValidate onSubmit={start} aria-label="Start a timer">
        <label className="field"><span>Name</span><input ref={nameRef} dir="auto" autoComplete="off" maxLength={TIMER_NAME_MAX} value={name} placeholder="Pasta" aria-invalid={error?.field === 'name' || undefined} aria-describedby={error?.field === 'name' ? `${id}-err` : undefined} onChange={e => { setName(e.target.value); setError(null); }} /></label>
        <label className="field"><span>Minutes</span><input inputMode="text" autoComplete="off" value={length} placeholder="9" aria-invalid={error?.field === 'length' || undefined} aria-describedby={error?.field === 'length' ? `${id}-err` : `${id}-len`} onChange={e => { setLength(e.target.value); setError(null); }} /></label>
        <button type="submit" className="primary">Start</button>
        {error ? <p id={`${id}-err`} className="tasks-field-error" role="alert">{error.text}</p> : <p id={`${id}-len`} className="fine">Minutes, or 1:30 for a minute and a half, or 1 h 30 min.</p>}
      </form>
      {active.length > 0 && <><h3>Running</h3><ul className="aw-timer-list" aria-label="Timers running">{active.map(t => <TimerRow key={t.id} timer={t} now={now} />)}</ul></>}
      <h3>Kept to start again</h3>
      {kept.length ? <ul className="aw-timer-list" aria-label="Kept timers">{kept.map(t => <li key={t.id} className="aw-timer">
        <span className="aw-timer-name" dir="auto">{t.name}</span><span className="aw-timer-clock">{lengthWords(t.seconds)}</span>
        <span className="aw-timer-actions"><button type="button" aria-label={`Start ${t.name}, ${lengthWords(t.seconds)}`} onClick={() => { if (bellOn(record.data)) void import('../../lib/audio/context').then(m => m.wakeAudio()).catch(() => false); changeTimers(r => startAgain(r, t.id, Date.now()), `“${t.name}” started: ${lengthWords(t.seconds)}.`); }}>Start</button>
          <button type="button" aria-label={`Remove ${t.name}`} onClick={() => changeTimers(r => removeTimer(r, t.id), `“${t.name}” removed from Timers.`)}>Remove</button></span></li>)}</ul>
        : <p className="fine">{record.data.timers.length ? 'Every kept timer is running.' : `No timers yet. Name one and give it minutes — “Pasta” 9, “Laundry” 45 — and start it. Several can run at once; each is kept here to start again (up to ${MAX_TIMERS}).`}</p>}
      <label className="aw-timers-bell"><input type="checkbox" checked={bellOn(record.data)} onChange={e => { const on = e.target.checked; changeTimers(r => setBell(r, on), on ? 'A bell rings when a timer ends.' : 'No bell: a timer’s end is only said on screen.'); }} /> <span>Ring a bell when a timer ends (made on this device; a muted device stays silent)</span></label>
      <p className="fine">While a timer runs, a small strip shows it on every page. With notifications on (Settings → Notifications → Timers), this device is also woken at a timer’s end; its name shows there only if names are on. Kept on this device; works offline.</p>
    </div>
  </dialog>;
}
