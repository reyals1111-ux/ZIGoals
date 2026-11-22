'use client';
import {useEffect, useId, useState} from 'react';
import {restoreHabitEntry, setHabitEntryStatus} from '../../lib/habits';
import {MISS_REASONS, missNote} from '../../lib/habits-yesterday';
import type {CompactCell} from '../../lib/habits-order/compact';
import {formatDate} from '../../lib/visual-format';
import {showUndo} from '../ui/undo-toast';
import type {HabitsStore} from './use-habits';

/**
 * Session AV (q4 #32; Habitify's "what got in the way"): under the week grid, the week's missed days of a "build" habit
 * (before today), each with "What got in the way?" — the same reasons and own words as yesterday's list, kept as that
 * day's note on a "not done", with Undo. A day already answered shows its reason. Nothing is chosen for the person;
 * Escape closes the form and gives the focus back to its button; after Save the focus is on that day's line. Lazy.
 */
type Missed = {key: string; id: string; title: string; date: string; note: string | null};
export default function WeekMissedWhy({rows, store}: {rows: readonly {id: string; title: string; cells: readonly CompactCell[]}[]; store: Pick<HabitsStore, 'data' | 'today' | 'update'>}) {
  const uid = useId(), [asking, setAsking] = useState<string | null>(null), [reason, setReason] = useState<string | null>(null), [words, setWords] = useState('');
  const [focusTo, setFocusTo] = useState<string | null>(null), [error, setError] = useState('');
  useEffect(() => { if (focusTo) { const el = document.getElementById(focusTo); if (el) { el.focus(); setFocusTo(null); } } }, [focusTo, asking, store.data]);
  const missed: Missed[] = rows.flatMap(r => r.cells.filter(c => c.status === 'failed' && c.tappable && c.date < store.today).map(c => {
    const entry = store.data.habits.find(h => h.id === r.id)?.entries.find(e => e.date === c.date);
    return {key: `${r.id}:${c.date}`, id: r.id, title: r.title, date: c.date, note: entry?.disposition === 'failed' ? entry.note || '' : null};
  }));
  if (!missed.length) return null;
  const lineId = (m: Missed) => `${uid}-line-${m.key}`, askId = (m: Missed) => `${uid}-ask-${m.key}`;
  const open = (m: Missed) => { setAsking(a => a === m.key ? null : m.key); setReason(null); setWords(''); setError(''); };
  const save = async (m: Missed) => {
    const entry = store.data.habits.find(h => h.id === m.id)?.entries.find(e => e.date === m.date), note = missNote(reason ?? '', words);
    try {
      await store.update(d => setHabitEntryStatus(d, m.id, m.date, 'failed', note, new Date()));
      setAsking(null); setFocusTo(lineId(m));
      showUndo({message: `${m.title}, ${formatDate(m.date, {weekday: true, year: false})}: not done${note ? ` · “${note}”` : ''}.`, undone: 'That day is as it was.', restore: () => store.update(d => restoreHabitEntry(d, m.id, m.date, entry))});
    } catch { setError('That day could not be changed. Open the habit to change it.'); }
  };
  return <details className="habit-week-why">
    <summary>What got in the way? ({missed.length} missed {missed.length === 1 ? 'day' : 'days'} this week)</summary>
    <ul aria-label="Missed days this week">{missed.map(m => <li key={m.key}>
      <div><span id={lineId(m)} tabIndex={-1} dir="auto">{m.title}, {formatDate(m.date, {weekday: true, year: false})}{m.note !== null ? <small> · {m.note ? `“${m.note}”` : 'not done'}</small> : null}</span>
        {m.note === null && <button id={askId(m)} type="button" className="quiet" aria-expanded={asking === m.key} aria-label={`${m.title}, ${formatDate(m.date, {weekday: true, year: false})}: what got in the way?`} onClick={() => open(m)}>What got in the way?</button>}</div>
      {asking === m.key && <form aria-label={`What got in the way of ${m.title} on ${formatDate(m.date, {weekday: true, year: false})}`} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setAsking(null); setFocusTo(askId(m)); } }} onSubmit={e => { e.preventDefault(); void save(m); }}>
        <fieldset><legend>What got in the way?</legend>{MISS_REASONS.map(r => <label key={r} className="reason"><input type="radio" name={`${uid}-${m.key}`} checked={reason === r} onChange={() => setReason(r)}/> {r}</label>)}</fieldset>
        <label className="field"><span>In your own words (optional)</span><input maxLength={150} value={words} onChange={e => setWords(e.target.value)}/></label>
        <button type="submit" className="secondary">Save as not done</button>
      </form>}
    </li>)}</ul>
    {error && <p className="field-error" role="alert">{error}</p>}
  </details>;
}
