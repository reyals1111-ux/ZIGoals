'use client';
import {useMemo, useState} from 'react';
import {formatDate, formatMonth} from '../../lib/visual-format';
import {monthGrid, shiftMonth} from '../../lib/journal/search';
import type {JournalEntry} from '../../lib/journal/schema';
import {kindOf, periodWords, periodsInMonth} from '../../lib/journal/periods';
import {daysMet} from '../../lib/journal/word-goal';

/**
 * Session AV lane 2 (journal; LEDGER #43, Day One's calendar view): one month at a time, Monday first; a day with an
 * entry is a button that shows that day's entries (the list's filter), with how many it holds in its name. Days to come
 * and days without an entry are plain numbers. Loaded when its fold opens.
 */
const HEAD = [['M', 'Monday'], ['T', 'Tuesday'], ['W', 'Wednesday'], ['T', 'Thursday'], ['F', 'Friday'], ['S', 'Saturday'], ['S', 'Sunday']] as const;
/**
 * Session AV lane 2 (r3-notes; LEDGER #269, Grid Diary's week, month and year entries): under the month, the entries about
 * its year, the month itself and its weeks, each a button that shows them (`onPeriod`).
 */
export default function JournalCalendar({entries, today, picked, onPick, startMonth, pickedPeriod = null, onPeriod, wordGoal}: {entries: readonly Pick<JournalEntry, 'date' | 'period' | 'text'>[]; today: string; /** Session AV lane 2 (r6-notes; LEDGER #400): the daily word goal; the days it was met get a quiet mark. */ wordGoal?: number; picked: string | null; onPick: (day: string | null) => void; startMonth?: string; pickedPeriod?: string | null; onPeriod?: (period: string | null) => void}) {
  const [month, setMonth] = useState((startMonth ?? picked ?? today).slice(0, 7));
  const weeks = useMemo(() => monthGrid(month, entries, today), [month, entries, today]);
  const written = weeks.flat().filter(d => d.inMonth && d.count > 0).length;
  const goal = wordGoal ?? null;
  const met = useMemo(() => daysMet(entries, goal), [entries, goal]);
  const metHere = weeks.flat().filter(d => d.inMonth && met.has(d.date)).length;
  const periods = useMemo(() => { const counts = new Map<string, number>(); for (const e of entries) if (e.period) counts.set(e.period, (counts.get(e.period) ?? 0) + 1); return periodsInMonth(month).flatMap(p => counts.get(p) ? [{p, n: counts.get(p)!}] : []); }, [entries, month]);
  return <div className="journal-calendar">
    <div className="journal-calendar-head">
      <button type="button" className="quiet" aria-label={`The month before: ${formatMonth(shiftMonth(month, -1))}`} onClick={() => setMonth(m => shiftMonth(m, -1))}>←</button>
      <p className="journal-calendar-title" aria-live="polite"><strong>{formatMonth(month)}</strong> <span className="fine">· written on {written === 1 ? '1 day' : `${written} days`}{wordGoal ? `, ${metHere === 1 ? '1 day' : `${metHere} days`} with your ${wordGoal} words` : ''}</span></p>
      <button type="button" className="quiet" aria-label={`The month after: ${formatMonth(shiftMonth(month, 1))}`} disabled={month >= today.slice(0, 7)} onClick={() => setMonth(m => shiftMonth(m, 1))}>→</button>
    </div>
    <table className="journal-calendar-grid">
      <caption className="sr-only">{formatMonth(month)}: a day with an entry opens its entries</caption>
      <thead><tr>{HEAD.map(([short, long]) => <th key={long} scope="col"><abbr title={long}>{short}</abbr></th>)}</tr></thead>
      <tbody>{weeks.map(week => <tr key={week[0]!.date}>{week.map(d => <td key={d.date} data-out={d.inMonth ? undefined : ''}>
        {!d.inMonth ? <span aria-hidden="true"/> : d.count > 0
          ? <button type="button" className="journal-calendar-day" aria-pressed={picked === d.date} aria-label={`${formatDate(d.date, {weekday: true})}: ${d.count === 1 ? '1 entry' : `${d.count} entries`}${met.has(d.date) ? ', word goal met' : ''}`} data-met={met.has(d.date) ? '' : undefined} onClick={() => onPick(picked === d.date ? null : d.date)}>{Number(d.date.slice(8))}</button>
          : <span className="journal-calendar-empty" data-today={d.date === today ? '' : undefined}>{Number(d.date.slice(8))}</span>}
      </td>)}</tr>)}</tbody>
    </table>
    {onPeriod && <div className="journal-calendar-periods" role="group" aria-label={`Entries about a week, ${formatMonth(month)} or its year`}>
      {periods.length ? periods.map(({p, n}) => <button key={p} type="button" className="quiet" aria-pressed={pickedPeriod === p} onClick={() => onPeriod(pickedPeriod === p ? null : p)}>
        <span className="fine">{kindOf(p) === 'week' ? 'Week' : kindOf(p) === 'month' ? 'Month' : 'Year'}</span> {periodWords(p)} <small>{n === 1 ? '1 entry' : `${n} entries`}</small></button>)
        : <p className="fine">No entry about a week, this month or its year yet. When you write, choose what the entry is about: this week, month or year, or the one before.</p>}
    </div>}
    {picked && <button type="button" className="text-link" onClick={() => onPick(null)}>Show every day again</button>}
  </div>;
}
