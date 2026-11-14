'use client';
import Link from 'next/link';
import {useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {useTaskClock} from '../tasks/use-task-list';
import {showStatus, showUndo} from '../ui/undo-toast';
import {COUNTDOWNS, COUNTDOWN_NOTE_MAX, COUNTDOWN_TITLE_MAX, MAX_COUNTDOWNS, addCountdown, countdownWords, removeCountdown, restoreCountdown, splitCountdowns, type Countdown} from '../../lib/countdowns/schema';
import {formatDate, formatNumber} from '../../lib/visual-format';
import './countdowns.css';

/**
 * Session AP ("Days until"): a Today card kept on this device (`countdowns` in zigoals:today-cards:v1), off until the
 * person turns it on while arranging Today. The person's own countdowns (zigoals:countdowns:v1, at most 50): the coming
 * ones soonest first, each "Today", "Tomorrow" or "In N days"; a passed one moves to "Passed" and says "N days ago",
 * never a negative count. Each also shows on the Agenda's day of the event. Written only on the person's taps; Remove
 * has Undo.
 */
const fmt = (n: number) => formatNumber(n);
export default function CountdownsCard() {
  const record = useDeviceRecord(COUNTDOWNS), {today} = useTaskClock(), id = useId();
  const [title, setTitle] = useState(''), [date, setDate] = useState(''), [note, setNote] = useState(''), [error, setError] = useState('');
  const {upcoming, passed} = useMemo(() => splitCountdowns(record.data, today), [record.data, today]);
  if (!record.loaded) return <p className="fine" role="status">Opening your countdowns…</p>;
  const year = (d: string) => d.slice(0, 4) !== today.slice(0, 4);
  const add = () => {
    if (record.unreadable) { setError('Your countdowns could not be read on this device, so nothing was written over them.'); return; }
    if (!title.trim()) { setError('Give the countdown a name.'); return; }
    if (!date) { setError('Choose its date.'); return; }
    try { record.update(r => addCountdown(r, {title, date, note}, {id: `countdown_${crypto.randomUUID()}`, at: new Date()})); }
    catch (e) { setError(e instanceof Error ? e.message : 'This device refused to keep it.'); return; }
    showStatus(`Added “${title.trim()}”: ${countdownWords(date, today, fmt).toLowerCase()}.`);
    setTitle(''); setDate(''); setNote(''); setError('');
  };
  const remove = (c: Countdown) => {
    const index = record.data.items.findIndex(i => i.id === c.id);
    try { record.update(r => removeCountdown(r, c.id)); } catch { showStatus('It could not be removed on this device.', {tone: 'error'}); return; }
    showUndo({message: `Removed “${c.title}”.`, undone: `“${c.title}” is back.`, restore: () => record.update(r => restoreCountdown(r, c, index))});
  };
  const row = (c: Countdown) => <li key={c.id} className="countdown" data-passed={c.date < today || undefined}>
    <span className="countdown-days">{countdownWords(c.date, today, fmt)}</span>
    <span className="countdown-text"><strong>{c.title}</strong><small>{formatDate(c.date, {weekday: true, year: year(c.date)})}{c.note ? ` · ${c.note}` : ''}</small></span>
    <button type="button" className="text-link" aria-label={`Remove the countdown “${c.title}”`} onClick={() => remove(c)}>Remove</button>
  </li>;
  return <section className="countdowns-card" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Days until</h3>
    {record.unreadable && <p className="notice" role="status">Your countdowns could not be read on this device; they are not written over.</p>}
    {upcoming.length ? <ul className="countdowns" aria-label="Coming up">{upcoming.map(row)}</ul> : <p className="fine">No countdown yet. Add a day you are looking forward to: a trip, a birthday, a race.</p>}
    {passed.length > 0 && <details className="countdowns-passed"><summary>Passed ({fmt(passed.length)})</summary><ul className="countdowns" aria-label="Passed">{passed.map(row)}</ul></details>}
    <details className="countdowns-add" open={!upcoming.length && !passed.length ? true : undefined}>
      <summary>Add a countdown</summary>
      <form noValidate aria-label="Add a countdown" onSubmit={e => { e.preventDefault(); add(); }}>
        <label className="field"><span>Name</span><input value={title} maxLength={COUNTDOWN_TITLE_MAX} placeholder="Trip to Lisbon" aria-invalid={error && !title.trim() ? true : undefined} onChange={e => { setTitle(e.target.value); setError(''); }} /></label>
        <label className="field"><span>Date</span><input type="date" value={date} onChange={e => { setDate(e.target.value); setError(''); }} /></label>
        <label className="field countdowns-note"><span>Note (optional)</span><input value={note} maxLength={COUNTDOWN_NOTE_MAX} onChange={e => setNote(e.target.value)} /></label>
        <button type="submit" className="secondary" disabled={record.unreadable || record.data.items.length >= MAX_COUNTDOWNS}>Add</button>
        {error && <p className="countdowns-error" role="alert">{error}</p>}
      </form>
      <p className="fine">{fmt(record.data.items.length)} of {fmt(MAX_COUNTDOWNS)} kept on this device. Each one also shows on its day in your <Link prefetch={false} className="text-link" href="/app/agenda">Agenda</Link>.</p>
    </details>
  </section>;
}
