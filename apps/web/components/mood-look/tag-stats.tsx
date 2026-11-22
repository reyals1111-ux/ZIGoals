'use client';
import {useMemo} from 'react';
import {tagStats} from '../../lib/daylio/rule';
import {formatMonth} from '../../lib/visual-format';
import {addLocalDays} from '../../lib/local-date';
import {useMoodLook} from './use-mood-look';
import './mood-look.css';

/**
 * Session AV lane 2 (habits; LEDGER #188, Daylio's activity and mood statistics): per tag (activities included), the days
 * with it this month and last month, and how the mood was on its days over the last year — a count per mood and the most
 * common one, in words, with a small bar per mood whose numbers are in the text. Counts of your own days, "goes with,
 * not a cause". Loaded when its fold opens.
 */
export default function TagStats({moods, entries, today}: {moods: Readonly<Record<string, {mood: number}>>; entries: Readonly<Record<string, readonly string[]>>; today: string}) {
  const look = useMoodLook(), rows = useMemo(() => tagStats(moods, entries, today), [moods, entries, today]);
  const month = today.slice(0, 7), last = addLocalDays(`${month}-01`, -1).slice(0, 7);
  if (!rows.length) return <p className="fine">No tag on any day yet. Tag a day’s mood (Health → Diary → How does today feel?) to see each tag here.</p>;
  return <div className="tag-stats">
    <table className="tag-stats-table"><caption className="sr-only">Each tag: days this month and last month, and the moods on its days over the last year</caption>
      <thead><tr><th scope="col">Tag</th><th scope="col">{formatMonth(month)}</th><th scope="col">{formatMonth(last)}</th><th scope="col">Moods on its days (last year)</th></tr></thead>
      <tbody>{rows.slice(0, 30).map(r => <tr key={r.tag}><th scope="row">{r.tag}</th><td>{r.thisMonth}</td><td>{r.lastMonth}</td>
        <td>{r.moodDays ? <><span className="tag-stats-bars" aria-hidden="true">{[5, 4, 3, 2, 1].map(l => <span key={l} data-level={l} style={{flexGrow: r.spread[l - 1]}}/>)}</span>
          <span className="tag-stats-words">{[5, 4, 3, 2, 1].filter(l => r.spread[l - 1]).map(l => `${look.words[l - 1]} ${r.spread[l - 1]}`).join(' · ')}{r.mostly ? ` — mostly ${look.words[r.mostly - 1]!.toLowerCase()}` : ''}</span></> : <span className="fine">No mood on its days</span>}</td></tr>)}</tbody>
    </table>
    {rows.length > 30 && <p className="fine">The 30 tags used most this month and last; {rows.length - 30} more.</p>}
    <p className="fine">Days counted from your own tags; they show what went together, not why.</p>
  </div>;
}
