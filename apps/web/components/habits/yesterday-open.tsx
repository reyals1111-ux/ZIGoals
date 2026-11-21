'use client';
import {useState} from 'react';
import {logHabitValue, restoreHabitEntry, type HabitData} from '../../lib/habits';
import {yesterdaysOpen, type OpenYesterday} from '../../lib/habits-yesterday';
import {showUndo} from '../ui/undo-toast';
import {formatNumber} from '../../lib/visual-format';

/**
 * Session AV (owner follow-up 1, F-YESTERDAY; Habitica): yesterday's daily habits left open, in one list at the top of
 * Habits, until anything is logged today — "Done" for one, "All done" for every one, each with Undo; "Not now" leaves it
 * for this visit. "Done" fills yesterday up to its target (a count habit: what is missing). Nothing new is stored. Calm
 * words: nothing is "missed" or "failed" here, and leaving it is fine.
 */
const HIDE = 'zigoals:yesterday-open:hidden';
export default function YesterdayOpen({data, today, update}: {data: HabitData; today: string; update: (fn: (d: HabitData) => HabitData) => Promise<unknown> | unknown}) {
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem(HIDE) === today; } catch { return false; } });
  const [status, setStatus] = useState('');
  const {day, open, loggedToday} = yesterdaysOpen(data, today);
  if (hidden || loggedToday || !open.length) return status ? <p className="fine habit-yesterday-status" role="status">{status}</p> : null;
  const mark = async (items: readonly OpenYesterday[]) => {
    const before = items.map(o => ({id: o.id, entry: data.habits.find(h => h.id === o.id)?.entries.find(e => e.date === day)}));
    const now = new Date();
    try {
      await update(d => items.reduce((acc, o) => logHabitValue(acc, o.id, day, o.missing, {mode: 'add'}, now), d));
      const words = items.length === 1 ? `${items[0]!.title}: done yesterday.` : `${items.length} habits done yesterday.`;
      setStatus(words);
      showUndo({message: words, undone: 'Yesterday is as it was.', restore: () => update(d => before.reduce((acc, b) => restoreHabitEntry(acc, b.id, day, b.entry), d))});
    } catch { setStatus('Yesterday could not be changed. Open the habit to change it.'); }
  };
  const notNow = () => { try { sessionStorage.setItem(HIDE, today); } catch { /* this visit only */ } setHidden(true); };
  return <section className="panel habit-yesterday" aria-labelledby="habit-yesterday-title">
    <div className="habit-section-heading"><div><p className="eyebrow">Before today starts</p><h2 id="habit-yesterday-title">Yesterday, still open</h2>
      <p className="fine">Did any of these happen after all? Tick them here; leaving them is fine too.</p></div></div>
    <ul className="habit-yesterday-list" aria-label="Yesterday's open habits">
      {open.map(o => <li key={o.id}><span dir="auto">{o.title}{o.target > 1 ? <small> · {formatNumber(o.count)} of {formatNumber(o.target)}</small> : null}</span>
        <button type="button" className="secondary" aria-label={`${o.title}: done yesterday`} onClick={() => void mark([o])}>Done</button></li>)}
    </ul>
    <div className="money-actions habit-yesterday-actions">
      {open.length > 1 && <button type="button" className="secondary" onClick={() => void mark(open)}>All done</button>}
      <button type="button" className="quiet" onClick={notNow}>Not now</button>
    </div>
    {status && <p className="fine" role="status">{status}</p>}
  </section>;
}
