'use client';
import {useMemo, useState} from 'react';
import {formatDate, formatMonth} from '../../lib/visual-format';
import {monthGrid, shiftMonth} from '../../lib/journal/search';
import type {JournalEntry} from '../../lib/journal/schema';

/**
 * Session AV lane 2 (journal; LEDGER #43, Day One's calendar view): one month at a time, Monday first; a day with an
 * entry is a button that shows that day's entries (the list's filter), with how many it holds in its name. Days to come
 * and days without an entry are plain numbers. Loaded when its fold opens.
 */
const HEAD = [['M', 'Monday'], ['T', 'Tuesday'], ['W', 'Wednesday'], ['T', 'Thursday'], ['F', 'Friday'], ['S', 'Saturday'], ['S', 'Sunday']] as const;
export default function JournalCalendar({entries, today, picked, onPick, startMonth}: {entries: readonly Pick<JournalEntry, 'date'>[]; today: string; picked: string | null; onPick: (day: string | null) => void; startMonth?: string}) {
  const [month, setMonth] = useState((startMonth ?? picked ?? today).slice(0, 7));
  const weeks = useMemo(() => monthGrid(month, entries, today), [month, entries, today]);
  const written = weeks.flat().filter(d => d.inMonth && d.count > 0).length;
  return <div className="journal-calendar">
    <div className="journal-calendar-head">
      <button type="button" className="quiet" aria-label={`The month before: ${formatMonth(shiftMonth(month, -1))}`} onClick={() => setMonth(m => shiftMonth(m, -1))}>←</button>
      <p className="journal-calendar-title" aria-live="polite"><strong>{formatMonth(month)}</strong> <span className="fine">· written on {written === 1 ? '1 day' : `${written} days`}</span></p>
      <button type="button" className="quiet" aria-label={`The month after: ${formatMonth(shiftMonth(month, 1))}`} disabled={month >= today.slice(0, 7)} onClick={() => setMonth(m => shiftMonth(m, 1))}>→</button>
    </div>
    <table className="journal-calendar-grid">
      <caption className="sr-only">{formatMonth(month)}: a day with an entry opens its entries</caption>
      <thead><tr>{HEAD.map(([short, long]) => <th key={long} scope="col"><abbr title={long}>{short}</abbr></th>)}</tr></thead>
      <tbody>{weeks.map(week => <tr key={week[0]!.date}>{week.map(d => <td key={d.date} data-out={d.inMonth ? undefined : ''}>
        {!d.inMonth ? <span aria-hidden="true"/> : d.count > 0
          ? <button type="button" className="journal-calendar-day" aria-pressed={picked === d.date} aria-label={`${formatDate(d.date, {weekday: true})}: ${d.count === 1 ? '1 entry' : `${d.count} entries`}`} onClick={() => onPick(picked === d.date ? null : d.date)}>{Number(d.date.slice(8))}</button>
          : <span className="journal-calendar-empty" data-today={d.date === today ? '' : undefined}>{Number(d.date.slice(8))}</span>}
      </td>)}</tr>)}</tbody>
    </table>
    {picked && <button type="button" className="text-link" onClick={() => onPick(null)}>Show every day again</button>}
  </div>;
}
