'use client';
import {lazy, Suspense, useMemo, useState} from 'react';
import type {Workouts} from '../../../lib/workouts/schema';
import {shiftMonthKey, weekStreak, workoutMonth} from '../../../lib/workouts/calendar';
import {formatDate, formatMonth, formatWeekdayLong} from '../../../lib/visual-format';
import './workout-calendar.css';

/**
 * Session AV (owner follow-up 1, F-WORKOUT-CALENDAR; Hevy's calendar): Health → Workouts → "Calendar": a month of finished
 * workouts as weeks (Monday first), today ringed, each day trained lit with its workout's name; earlier months by the
 * arrows. Each cell says its day and workouts to a screen reader. Opened on demand; its own chunk.
 * Session AV (q3 #41): a day with a workout is a button; the chosen day's workouts are listed under the grid at 14 px. On a
 * phone the cells show a dot instead of a cut-off name ("Pu…"), so the names are read in the list, never in the cell.
 */
// Session AV lane 2 (body; LEDGER #118, Hevy's yearly calendar): the year view, its own chunk, loaded when chosen.
const WorkoutYearView = lazy(() => import('./workout-year'));
const NO_PAUSES: readonly {from: string; to: string}[] = [];
// Session AV lane 2, round 5 (LEDGER #374): `pauses`, the days a workout status covered, are passed over by the streak.
export default function WorkoutCalendar({w, today, pauses = NO_PAUSES}: {w: Workouts; today: string; pauses?: readonly {from: string; to: string}[]}) {
  const [mode, setMode] = useState<'month' | 'year'>('month'), streak = useMemo(() => weekStreak(w, today, pauses), [w, today, pauses]);
  return <>
    <div className="workouts-weeks-pick workout-calendar-mode" role="group" aria-label="Calendar view">{(['month', 'year'] as const).map(m => <button key={m} type="button" className="quiet" aria-pressed={mode === m} onClick={() => setMode(m)}>{m === 'month' ? 'Month' : 'Year'}</button>)}</div>
    <p className="fine workout-streak">{streak.current ? `${streak.current} ${streak.current === 1 ? 'week' : 'weeks'} in a row with a workout${streak.thisWeek ? '' : ' (this week still open)'}` : 'No week in a row yet: a workout this week starts one'}{streak.best > streak.current ? ` · longest ${streak.best} weeks` : ''}.</p>
    {mode === 'month' ? <MonthView w={w} today={today}/> : <Suspense fallback={<p className="fine" role="status">Opening the year…</p>}><WorkoutYearView w={w} today={today}/></Suspense>}
  </>;
}
function MonthView({w, today}: {w: Workouts; today: string}) {
  const thisMonth = today.slice(0, 7), [month, setMonth] = useState(thisMonth);
  const m = useMemo(() => workoutMonth(w, month, today), [w, month, today]);
  const trained = useMemo(() => m.weeks.flat().filter(d => d.inMonth && d.names.length > 0), [m]);
  const [picked, setPicked] = useState<string | null>(null);
  // The chosen day, else today when trained, else the month's latest day with a workout.
  const chosen = trained.find(d => d.date === picked) ?? trained.find(d => d.today) ?? trained.at(-1) ?? null;
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
        {d.inMonth && d.names.length > 0 ? <button type="button" className="workout-calendar-pick" aria-label={d.words} aria-pressed={chosen?.date === d.date} onClick={() => setPicked(d.date)}>
          <span className="workout-calendar-day" aria-hidden="true">{d.day}</span>
          <span className="workout-calendar-dot" aria-hidden="true"/>
          <span className="workout-calendar-names" aria-hidden="true"><small>{d.names[0]}</small>{d.names.length > 1 && <small>+{d.names.length - 1}</small>}</span>
        </button> : <span className="workout-calendar-day" aria-hidden="true">{d.day}</span>}
      </td>)}</tr>)}</tbody>
    </table>
    {chosen && <div className="workout-calendar-chosen" aria-live="polite">
      <h5>{formatDate(chosen.date, {weekday: true, year: false})}</h5>
      <ul>{chosen.names.map((n, i) => <li key={`${n}-${i}`}>{n}</li>)}</ul>
    </div>}
  </div>;
}
