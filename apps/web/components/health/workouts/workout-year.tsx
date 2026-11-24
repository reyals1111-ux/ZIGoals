'use client';
import {useMemo, useState} from 'react';
import {workoutYear} from '../../../lib/workouts/calendar';
import type {Workouts} from '../../../lib/workouts/schema';
import {formatMonth, formatWeekdayLong} from '../../../lib/visual-format';
import './av2-body.css';

/**
 * Session AV lane 2 (body; LEDGER #118, Hevy's yearly calendar): Health → Workouts → Calendar → "Year": the twelve months
 * of a year as small grids (Monday first), each day trained a filled square, today ringed, each month with its days
 * trained; earlier years by the arrows. Every cell says its day and workouts to a screen reader; no figure is shown
 * smaller than 14 px (the squares carry no number). Its own chunk.
 */
export default function WorkoutYearView({w, today}: {w: Workouts; today: string}) {
  const thisYear = Number(today.slice(0, 4)), [year, setYear] = useState(thisYear), y = useMemo(() => workoutYear(w, year, today), [w, year, today]);
  return <div className="av2-year">
    <div className="workout-calendar-nav" role="group" aria-label="Year">
      <button type="button" className="quiet" aria-label="Previous year" onClick={() => setYear(year - 1)}>‹</button>
      <h4 aria-live="polite">{year}</h4>
      <button type="button" className="quiet" aria-label="Next year" disabled={year >= thisYear} onClick={() => setYear(year + 1)}>›</button>
    </div>
    <p className="fine">{y.days ? `${y.days} ${y.days === 1 ? 'day' : 'days'} with a workout in ${year}${y.sessions > y.days ? ` (${y.sessions} workouts)` : ''}.` : `No finished workout in ${year}.`}</p>
    <ul className="av2-year-grid">{y.months.map(m => <li key={m.month}>
      <table className="av2-year-month"><caption><strong>{formatMonth(`${m.month}-01`, {year: false})}</strong> <span>{m.days ? `${m.days} ${m.days === 1 ? 'day' : 'days'}` : '—'}</span></caption>
        <thead><tr>{m.weeks[0]!.map((d, i) => <th key={i} scope="col" abbr={formatWeekdayLong(d.date)}><span className="sr-only">{formatWeekdayLong(d.date)}</span></th>)}</tr></thead>
        <tbody>{m.weeks.map(week => <tr key={week[0]!.date}>{week.map(d => d.inMonth ? <td key={d.date} aria-label={d.words} className={`${d.names.length ? 'is-trained' : ''}${d.today ? ' is-today' : ''}`.trim() || undefined}><span aria-hidden="true"/></td> : <td key={d.date} className="is-out" aria-hidden="true"/>)}</tr>)}</tbody>
      </table>
    </li>)}</ul>
    <p className="fine"><span className="av2-year-key is-trained" aria-hidden="true"/> a day with a workout · open “Month” to read a day&rsquo;s workouts.</p>
  </div>;
}
