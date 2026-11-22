'use client';
import {useId, useMemo, useState} from 'react';
import type {BillsRecord} from '../../../lib/bills/schema';
import {billCalendar, CALENDAR_DAYS, MONTHS_AHEAD, monthAfter} from '../../../lib/bills/calendar';
import {formatMonth, formatWeekdayLong} from '../../../lib/visual-format';

/**
 * Session AV (owner follow-up 1, F-BILL-CALENDAR; Rocket Money, Undebt.it's bill tracker): Upcoming bills on a calendar —
 * the next 31 days as weeks (Monday first), today ringed, each day a bill falls due lit with its name and the day's
 * amount; the same days as a list for a screen reader (each cell says its day and bills).
 * Session AV (fresh-agent check q2, rank 10): or one calendar month at a time, paged with ‹ › from this month up to a
 * year ahead (Rocket Money's month you can page), with each day's total. On a phone a due day shows a dot, and the due
 * days are listed under the grid with name and amount (a cell is too narrow for a name). Copy at least 14 px. The paging
 * buttons stay focusable at either end (aria-disabled), so keyboard focus is never dropped. Reminders only; nothing is paid.
 */
type Shown = 'next' | number;
export default function BillMonthGrid({record, today}: {record: BillsRecord; today: string}) {
  const id = useId();
  const [shown, setShown] = useState<Shown>('next');
  const view = useMemo(() => billCalendar(record, today, shown === 'next' ? 'next' : monthAfter(today, shown)), [record, today, shown]);
  if (!record.bills.length) return <p className="fine">Your bills will show here on a calendar once you add or confirm one.</p>;
  const offset = shown === 'next' ? 0 : shown, atStart = shown !== 'next' && offset <= 0, atEnd = shown !== 'next' && offset >= MONTHS_AHEAD;
  const page = (step: -1 | 1) => { if (shown === 'next') return; const next = offset + step; if (next >= 0 && next <= MONTHS_AHEAD) setShown(next); };
  return <div className="bills-calendar">
    <div className="bills-window" role="radiogroup" aria-label="Calendar shows">
      <label className="bills-chip"><input type="radio" name={`${id}-shown`} checked={shown === 'next'} onChange={() => setShown('next')}/><span>Next {CALENDAR_DAYS} days</span></label>
      <label className="bills-chip"><input type="radio" name={`${id}-shown`} checked={shown !== 'next'} onChange={() => setShown(0)}/><span>By month</span></label>
    </div>
    {shown !== 'next' && <div className="bills-calendar-pager">
      <button type="button" className="quiet" aria-disabled={atStart || undefined} onClick={() => page(-1)} aria-label={atStart ? 'Earlier month (this is the current month)' : `Earlier month: ${formatMonth(`${monthAfter(today, offset - 1)}-01`)}`}>‹</button>
      <strong aria-live="polite">{view.title}</strong>
      <button type="button" className="quiet" aria-disabled={atEnd || undefined} onClick={() => page(1)} aria-label={atEnd ? 'Later month (a year ahead is the last)' : `Later month: ${formatMonth(`${monthAfter(today, offset + 1)}-01`)}`}>›</button>
    </div>}
    <p className="fine">{view.due.length ? `${view.due.length} ${view.due.length === 1 ? 'due date' : 'due dates'} in ${view.title} (${view.span}).` : `No bill falls due in ${view.title}.`}</p>
    <table className="bills-calendar-grid">
      <caption className="sr-only">Bills due in {view.title}, {view.span}, by week (Monday first)</caption>
      <thead><tr>{view.weekdays.map((w, i) => <th key={i} scope="col" abbr={view.weeks[0]?.[i] ? formatWeekdayLong(view.weeks[0][i]!.date) : undefined}>{w}</th>)}</tr></thead>
      <tbody>{view.weeks.map(week => <tr key={week[0]!.date}>{week.map(d => <td key={d.date} className={`${d.inRange ? '' : 'is-out'}${d.today ? ' is-today' : ''}${d.bills.length ? ' is-due' : ''}`.trim() || undefined} aria-label={d.words}>
        <span className="bills-calendar-day" aria-hidden="true">{d.day}</span>
        {d.bills.length > 0 && <span className="bills-calendar-dot" aria-hidden="true"/>}
        {d.bills.length > 0 && <span className="bills-calendar-bills" aria-hidden="true">{d.bills.slice(0, 2).map(b => <small key={`${b.id}-${d.date}`}>{b.title}</small>)}{d.bills.length > 2 && <small>+{d.bills.length - 2}</small>}{d.totals.map(t => <small key={t.currency} className="bills-calendar-amount">{t.text}</small>)}</span>}
      </td>)}</tr>)}</tbody>
    </table>
    {view.due.length > 0 && <ul className="bills-calendar-list" aria-label={`Due dates in ${view.title}`}>{view.due.map(d => <li key={`${d.id}-${d.date}`}><span>{d.dateWords}</span> <span dir="auto">{d.title}</span> <strong>{d.amount}</strong></li>)}</ul>}
    {view.totals.length > 0 && <p className="fine">Due in {view.title}: {view.totals.map(t => `${t.text} (${t.count} ${t.count === 1 ? 'date' : 'dates'})`).join(' · ')}; each currency on its own.</p>}
  </div>;
}
