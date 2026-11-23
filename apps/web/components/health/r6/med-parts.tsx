'use client';
import {useId, useState, type FormEvent} from 'react';
import {consistency, consistencyLine} from '../../../lib/meditation/consistency';
import {MAX_RANGE_DAYS, rangeDays, removeSessions, saveManualRange} from '../../../lib/meditation/engine';
import {rangeDefaults} from '../../../lib/meditation/stats';
import {formatClock, formatDate} from '../../../lib/visual-format';
import {showUndo} from '../../ui/undo-toast';
import type {MeditationStore} from '../meditation/use-meditation';
import './body-r6.css';

/**
 * Session AV lane 2, round 6 (r6-body; Medito): the meditation view's round 6 parts, one lazy chunk —
 * - `consistency` (LEDGER #413): the days with a session out of the last 30 or 90, how it is counted, and the weeks the
 *   weekly goal was met; a missed day only moves the window, and nothing is called a fall.
 * - `range` (LEDGER #415): "Several days" — one session a day over a range of past days, with one Undo.
 */
export default function MedParts({part, store}: {part: 'consistency' | 'range'; store: MeditationStore}) {
  return part === 'consistency' ? <Consistency store={store}/> : <SeveralDays store={store}/>;
}

function Consistency({store}: {store: MeditationStore}) {
  const [window, setWindow] = useState<30 | 90>(30), c = consistency(store.meditation, store.today, window), id = useId();
  return <div className="r6-consistency" role="group" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`} className="r6-subtitle">Your consistency</h3>
    <div className="r6-toggle" role="group" aria-label="Days counted">
      {([30, 90] as const).map(n => <button key={n} type="button" className="quiet" aria-pressed={window === n} onClick={() => setWindow(n)}>Last {n} days</button>)}
    </div>
    {c ? <>
      <p className="r6-consistency-line"><strong>{c.withSession}</strong> {consistencyLine(c).replace(/^\d+ /, '')}</p>
      <div className="r6-days-bar" aria-hidden="true"><span style={{width: `${Math.round(c.withSession / c.days * 100)}%`}}/></div>
      <details className="r6-how"><summary className="fold-summary">How this is counted</summary>
        <p className="fine">The days from {formatDate(c.from)} to {formatDate(c.to)} with at least one session, out of those days{c.days < c.window ? ' (from your first session)' : ''}. While today has no session yet, the count runs to yesterday. A day without a session is a rest day: it moves the window on, and it never takes away a day already counted. {c.goal ? `A week counts for your goal (${c.goal} min) when its sessions reach it, Monday to Sunday.` : 'Set a weekly goal below to see the weeks it was met.'} Days follow “My day ends at” in Settings.</p>
      </details>
    </> : <p className="fine">Your consistency shows after your first session: the days with a session out of the last 30 or 90. Rest days are fine.</p>}
  </div>;
}

function SeveralDays({store}: {store: MeditationStore}) {
  // Review B6P-9: the default last day is the view's today ("My day ends at"); the calendar day now is the latest.
  const zone = store.zone, start = rangeDefaults(store.now, zone), max = start.max, id = useId();
  const [from, setFrom] = useState(start.from), [to, setTo] = useState(start.to), [time, setTime] = useState('07:00'), [minutes, setMinutes] = useState('10');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [said, setSaid] = useState('');
  const days = rangeDays(from, to);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); setSaid('');
    if (!/^\d{1,4}$/.test(minutes.trim())) { setError('Enter whole minutes from 1 to 1440.'); return; }
    setBusy(true);
    try {
      let added: string[] = [], skipped: string[] = [];
      await store.update(m => { const r = saveManualRange(m, {from, to, time, minutes: Number(minutes), timeZone: zone}, new Date()); added = r.added; skipped = r.skipped; return r.meditation; });
      const words = added.length ? `${added.length} ${added.length === 1 ? 'session' : 'sessions'} logged, ${formatDate(from)} to ${formatDate(to)} at ${formatClock(time)}.` : 'No session was logged.';
      const skip = skipped.length ? ` ${skipped.length} ${skipped.length === 1 ? 'day was' : 'days were'} skipped: ${skipped.length === 1 ? 'it' : 'they'} already had a session at ${formatClock(time)}, or it would end later than now.` : '';
      setSaid(words + skip);
      if (added.length) showUndo({message: words + skip, restore: () => store.update(m => removeSessions(m, added)), undone: `The ${added.length} ${added.length === 1 ? 'session is' : 'sessions are'} removed.`});
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save. Try again.'); }
    finally { setBusy(false); }
  }
  return <form className="meditation-form r6-range" onSubmit={submit} aria-label="Log several days" noValidate>
    <p className="fine">One session a day for each day from the first to the last (up to {MAX_RANGE_DAYS} days), at the same time and length. A day that already has a session at that time is skipped.</p>
    <div className="meditation-form-row">
      <label className="field">First day<input type="date" value={from} max={max} onChange={e => setFrom(e.target.value)} required/></label>
      <label className="field">Last day<input type="date" value={to} max={max} onChange={e => setTo(e.target.value)} required/></label>
    </div>
    <div className="meditation-form-row">
      <label className="field">Began (time)<input type="time" value={time} onChange={e => setTime(e.target.value)} required/></label>
      <label className="field">Minutes<input type="text" inputMode="numeric" autoComplete="off" value={minutes} onChange={e => setMinutes(e.target.value)} required/></label>
    </div>
    <p className="fine" id={`${id}-count`}>{days > 0 ? `${days} ${days === 1 ? 'day' : 'days'}${days > MAX_RANGE_DAYS ? `: choose at most ${MAX_RANGE_DAYS}` : ''} · times in ${zone}.` : 'Choose a last day on or after the first.'}</p>
    {error && <p role="alert">{error}</p>}
    <div className="actions"><button type="submit" className="primary" disabled={busy || days < 1 || days > MAX_RANGE_DAYS} aria-describedby={`${id}-count`}>{busy ? 'Saving…' : `Log ${days >= 1 && days <= MAX_RANGE_DAYS ? days : ''} ${days === 1 ? 'session' : 'sessions'}`.replace('  ', ' ')}</button></div>
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </form>;
}
