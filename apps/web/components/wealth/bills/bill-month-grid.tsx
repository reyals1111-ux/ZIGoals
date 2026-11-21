'use client';
import {useMemo} from 'react';
import type {BillsRecord} from '../../../lib/bills/schema';
import {BILL_DAYS, billGrid} from '../../../lib/nova/cards/ax/money-bills';

/**
 * Session AV (owner follow-up 1, F-BILL-CALENDAR; Rocket Money, Undebt.it's bill tracker): Upcoming bills on a calendar —
 * the next 31 days as weeks (Monday first), today ringed, each day a bill falls due lit with its name and amount; the same
 * days as a list for a screen reader (each cell says its day and bills). From the shared grid NOVA's "Bill calendar"
 * widget draws (lib/nova/cards/ax/money-bills.ts billGrid); NOVA itself is unchanged. Reminders only; nothing is paid.
 */
export default function BillMonthGrid({record, today}: {record: BillsRecord; today: string}) {
  const view = useMemo(() => billGrid(record, today), [record, today]);
  if (view.state === 'empty') return <p className="fine">Your bills will show here on a calendar once you add or confirm one.</p>;
  return <div className="bills-calendar">
    <p className="fine">{view.due.length ? `${view.due.length} ${view.due.length === 1 ? 'due date' : 'due dates'} in the next ${BILL_DAYS} days (${view.span}).` : `No bill falls due in the next ${BILL_DAYS} days.`}</p>
    <table className="bills-calendar-grid">
      <caption className="sr-only">Bills due in the next {BILL_DAYS} days, {view.span}, by week (Monday first)</caption>
      <thead><tr>{view.weekdays.map((w, i) => <th key={i} scope="col" abbr={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i]}>{w}</th>)}</tr></thead>
      <tbody>{view.weeks.map(week => <tr key={week[0]!.date}>{week.map(d => <td key={d.date} className={`${d.inRange ? '' : 'is-out'}${d.today ? ' is-today' : ''}${d.bills.length ? ' is-due' : ''}`.trim() || undefined} aria-label={d.words}>
        <span className="bills-calendar-day" aria-hidden="true">{d.day}</span>
        {d.bills.length > 0 && <span className="bills-calendar-bills" aria-hidden="true">{d.bills.slice(0, 2).map(b => <small key={`${b.id}-${b.date}`}>{b.title}</small>)}{d.bills.length > 2 && <small>+{d.bills.length - 2}</small>}</span>}
      </td>)}</tr>)}</tbody>
    </table>
    {view.totals.length > 0 && <p className="fine">Due in these days: {view.totals.map(t => `${t.text} (${t.count} ${t.count === 1 ? 'date' : 'dates'})`).join(' · ')}; each currency on its own.</p>}
  </div>;
}
