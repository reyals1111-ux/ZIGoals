'use client';
import {useMemo, useState} from 'react';
import type {Workouts} from '../../../lib/workouts/schema';
import {shiftMonthKey, workoutMonth} from '../../../lib/workouts/calendar';
import {formatMonth, formatWeekdayLong} from '../../../lib/visual-format';
import './workout-calendar.css';

/**
 * Session AV (owner follow-up 1, F-WORKOUT-CALENDAR; Hevy's calendar): Health → Workouts → "Calendar": a month of finished
 * workouts as weeks (Monday first), today ringed, each day trained lit with its workout's name; earlier months by the
 * arrows. Each cell says its day and workouts to a screen reader. Opened on demand; its own chunk.
 */
export default function WorkoutCalendar({w, today}: {w: Workouts; today: string}) {
  const thisMonth = today.slice(0, 7), [month, setMonth] = useState(thisMonth);
  const m = useMemo(() => workoutMonth(w, month, today), [w, month, today]);
  return <div className="workout-calendar">
    <div className="workout-calendar-nav" role="group" aria-label="Month">
      <button type="button" className="quiet" aria-label="Previous month" onClick={() => setMonth(shiftMonthKey(month, -1))}>‹</button>
      <h4 aria-live="polite">{formatMonth(`${month}-01`)}</h4>
      <button type="button" className="quiet" aria-label="Next month" disabled={month >= thisMonth} onClick={() => setMonth(shiftMonthKey(month, 1))}>›</button>
    </div>
    <p className="fine">{m.days ? `${m.days} ${m.days === 1 ? 'day' : 'days'} with a workout this month${m.sessions > m.days ? ` (${m.sessions} workouts)` : ''}.` : 'No finished workout this month.'}</p>
    <table className="workout-calendar-grid">
      <caption className="sr-only">Workouts in {formatMonth(`${month}-01`)}, by week (Monday first)</caption>
      <thead><tr>{m.weekdays.map((d, i) => <th key={i} scope="col" abbr={formatWeekdayLong(m.weeks[0]![i]!.date)}>{d}</th>)}</tr></thead>
      <tbody>{m.weeks.map(week => <tr key={week[0]!.date}>{week.map(d => <td key={d.date} aria-label={d.words} className={`${d.inMonth ? '' : 'is-out'}${d.today ? ' is-today' : ''}${d.names.length && d.inMonth ? ' is-trained' : ''}`.trim() || undefined}>
        <span className="workout-calendar-day" aria-hidden="true">{d.day}</span>
        {d.inMonth && d.names.length > 0 && <span className="workout-calendar-names" aria-hidden="true"><small>{d.names[0]}</small>{d.names.length > 1 && <small>+{d.names.length - 1}</small>}</span>}
      </td>)}</tr>)}</tbody>
    </table>
  </div>;
}
