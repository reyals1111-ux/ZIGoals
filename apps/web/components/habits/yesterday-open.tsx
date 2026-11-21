'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {logHabitValue, restoreHabitEntry, setHabitEntryStatus, type HabitData} from '../../lib/habits';
import {MISS_REASONS, missNote, yesterdaysOpen, type OpenYesterday} from '../../lib/habits-yesterday';
import {showUndo} from '../ui/undo-toast';
import {formatNumber} from '../../lib/visual-format';
import {HabitLookMark} from './habit-look-mark';
import './yesterday-open.css';

/**
 * Session AV (owner follow-up 1, F-YESTERDAY; Habitica): yesterday's daily habits left open, in one list at the top of
 * Habits — "Done" for one, "All done" for every one, each with Undo; "Not now" leaves it for this visit. "Done" fills
 * yesterday up to its target (a count habit: what is missing). Nothing new is stored. Calm words: nothing is "missed" or
 * "failed" here, and leaving it is fine.
 * Session AV (q4 #19, #32; Habitica shows it on the day's first action): the list is on Today too, from the day's first
 * open, and it stays until each habit is handled (done, or not done with what got in the way) or "Not now" is pressed —
 * logging something today no longer hides it. What got in the way starts with nothing chosen and is kept per habit;
 * Escape closes its form and gives the focus back to its button; after Done, All done or Save the focus moves to the
 * next habit's Done (or to the list's status when none is left), never to the page.
 */
const HIDE = 'zigoals:yesterday-open:hidden';
type Why = {reason: string | null; words: string};
export default function YesterdayOpen({data, today, update, extras = null, place = 'habits'}: {data: HabitData; today: string; update: (fn: (d: HabitData) => HabitData) => Promise<unknown> | unknown; /** The habit extras record, for each habit's symbol. */ extras?: unknown; place?: 'habits' | 'today'}) {
  const uid = useId();
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem(HIDE) === today; } catch { return false; } });
  const [status, setStatus] = useState(''), [asking, setAsking] = useState<string | null>(null), [why, setWhy] = useState<Record<string, Why>>({});
  const [focusTo, setFocusTo] = useState<string | null>(null), statusRef = useRef<HTMLParagraphElement>(null);
  const {day, open} = yesterdaysOpen(data, today);
  // After a row leaves, its successor's "Done" (or, with none left, the status line) takes the focus.
  useEffect(() => {
    if (!focusTo) return;
    const next = focusTo === 'status' ? statusRef.current : document.getElementById(focusTo);
    if (next) { next.focus(); setFocusTo(null); }
  }, [focusTo, status, open.length]);
  const doneId = (o: OpenYesterday) => `${uid}-done-${o.id}`, whyId = (o: OpenYesterday) => `${uid}-why-${o.id}`;
  const after = (gone: readonly string[]) => { const next = open.find(o => !gone.includes(o.id)); setFocusTo(next ? doneId(next) : 'status'); };
  if (hidden || !open.length) return status ? <p ref={statusRef} tabIndex={-1} className="fine habit-yesterday-status" role="status">{status}</p> : null;
  const mark = async (items: readonly OpenYesterday[]) => {
    const before = items.map(o => ({id: o.id, entry: data.habits.find(h => h.id === o.id)?.entries.find(e => e.date === day)}));
    const now = new Date();
    try {
      await update(d => items.reduce((acc, o) => logHabitValue(acc, o.id, day, o.missing, {mode: 'add'}, now), d));
      const words = items.length === 1 ? `${items[0]!.title}: done yesterday.` : `${items.length} habits done yesterday.`;
      setStatus(words); after(items.map(o => o.id));
      showUndo({message: words, undone: 'Yesterday is as it was.', restore: () => update(d => before.reduce((acc, b) => restoreHabitEntry(acc, b.id, day, b.entry), d))});
    } catch { setStatus('Yesterday could not be changed. Open the habit to change it.'); }
  };
  // Session AV (owner follow-up 1, F-MISS-REASON; Habitify): what got in the way, kept as the day's note on a "not done".
  const markMissed = async (o: OpenYesterday) => {
    const w = why[o.id] ?? {reason: null, words: ''}, entry = data.habits.find(h => h.id === o.id)?.entries.find(e => e.date === day), note = missNote(w.reason ?? '', w.words);
    try {
      await update(d => setHabitEntryStatus(d, o.id, day, 'failed', note, new Date()));
      const said = note ? `${o.title}: not done yesterday · “${note}”.` : `${o.title}: not done yesterday.`;
      setStatus(said); setAsking(null); after([o.id]);
      showUndo({message: said, undone: 'Yesterday is as it was.', restore: () => update(d => restoreHabitEntry(d, o.id, day, entry))});
    } catch { setStatus('Yesterday could not be changed. Open the habit to change it.'); }
  };
  const close = (o: OpenYesterday) => { setAsking(null); setFocusTo(whyId(o)); };
  const notNow = () => { try { sessionStorage.setItem(HIDE, today); } catch { /* this visit only */ } setHidden(true); setStatus('Yesterday’s list is put away for this visit.'); setFocusTo('status'); };
  const setWhyOf = (id: string, patch: Partial<Why>) => setWhy(all => ({...all, [id]: {...(all[id] ?? {reason: null, words: ''}), ...patch}}));
  return <section className={`panel habit-yesterday${place === 'today' ? ' is-today' : ''}`} aria-labelledby={`${uid}-title`}>
    <div className="habit-section-heading"><div><p className="eyebrow">Before today starts</p><h2 id={`${uid}-title`}>Yesterday, still open</h2>
      <p className="fine">Did any of these happen after all? Tick them here; leaving them is fine too.</p></div></div>
    <ul className="habit-yesterday-list" aria-label="Yesterday's open habits">
      {open.map(o => { const w = why[o.id] ?? {reason: null, words: ''}; return <li key={o.id}><span dir="auto"><HabitLookMark extras={extras} habitId={o.id}/>{o.title}{o.target > 1 ? <small> · {formatNumber(o.count)} of {formatNumber(o.target)}</small> : null}</span>
        <span className="habit-yesterday-row-actions"><button id={doneId(o)} type="button" className="secondary" aria-label={`${o.title}: done yesterday`} onClick={() => void mark([o])}>Done</button>
          <button id={whyId(o)} type="button" className="quiet" aria-expanded={asking === o.id} aria-label={`${o.title}: what got in the way?`} onClick={() => setAsking(a => a === o.id ? null : o.id)}>What got in the way?</button></span>
        {asking === o.id && <form className="habit-yesterday-why" aria-label={`What got in the way of ${o.title}`} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(o); } }} onSubmit={e => { e.preventDefault(); void markMissed(o); }}>
          <fieldset><legend>What got in the way?</legend>{MISS_REASONS.map(r => <label key={r} className="habit-yesterday-reason"><input type="radio" name={`${uid}-why-${o.id}`} checked={w.reason === r} onChange={() => setWhyOf(o.id, {reason: r})}/> {r}</label>)}</fieldset>
          <label className="field"><span>In your own words (optional)</span><input maxLength={150} value={w.words} onChange={e => setWhyOf(o.id, {words: e.target.value})}/></label>
          <button type="submit" className="secondary">Save as not done</button>
        </form>}</li>; })}
    </ul>
    <div className="money-actions habit-yesterday-actions">
      {open.length > 1 && <button type="button" className="secondary" onClick={() => void mark(open)}>All done</button>}
      <button type="button" className="quiet" onClick={notNow}>Not now</button>
    </div>
    {status && <p ref={statusRef} tabIndex={-1} className="fine habit-yesterday-status" role="status">{status}</p>}
  </section>;
}
