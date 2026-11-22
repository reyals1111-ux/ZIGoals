'use client';
import {useMemo, useState, type CSSProperties} from 'react';
import {monthFigures, muscleWeeks, nextMonth, previousMonth, type MonthFigures} from '../../../lib/workouts/analytics';
import {categoryLookup} from '../../../lib/workouts/depth';
import type {LibraryExercise} from '../../../lib/workouts/library';
import type {Workouts} from '../../../lib/workouts/schema';
import {formatDate, formatMonth, formatNumber} from '../../../lib/visual-format';
import {weightShown} from './units';
import './av2-body.css';

/**
 * Session AV lane 2 (body; LEDGER #117, Hevy's monthly report and sets per muscle): Health → Workouts → "Progress": a
 * month's report beside the month before (earlier months by the arrows), and the working sets per muscle group over the
 * last 8 weeks as a table with each cell shaded by its count. From the person's own log; warm-ups left out; no calorie
 * figure. Its own chunk.
 */
const change = (now: number, before: number, words: (n: number) => string) => before === now ? 'the same as the month before' : `${now > before ? '+' : '−'}${words(Math.abs(now - before))} on the month before`;
export default function WorkoutsProgress({w, unit, library, today}: {w: Workouts; unit: 'kg' | 'lb'; library: LibraryExercise[]; today: string}) {
  const lookup = useMemo(() => categoryLookup(library), [library]), thisMonth = today.slice(0, 7), [month, setMonth] = useState(thisMonth);
  const now = useMemo(() => monthFigures(w, month, lookup, today), [w, month, lookup, today]), before = useMemo(() => monthFigures(w, previousMonth(month), lookup, today), [w, month, lookup, today]);
  const weeks = useMemo(() => muscleWeeks(w, lookup, today), [w, lookup, today]), most = Math.max(1, ...weeks.rows.flatMap(r => r.sets));
  return <div className="av2-progress">
    <section className="av2-month" aria-labelledby="av2-month-title">
      <div className="workout-calendar-nav av2-month-nav" role="group" aria-label="Month of the report">
        <button type="button" className="quiet" aria-label="Previous month" onClick={() => setMonth(previousMonth(month))}>‹</button>
        <h3 id="av2-month-title" aria-live="polite">{formatMonth(`${month}-01`)}{month === thisMonth ? ' so far' : ''}</h3>
        <button type="button" className="quiet" aria-label="Next month" disabled={month >= thisMonth} onClick={() => setMonth(nextMonth(month))}>›</button>
      </div>
      {now.workouts ? <MonthReport now={now} before={before} unit={unit}/> : <p className="fine">No finished workout in {formatMonth(`${month}-01`)}.{before.workouts ? ` The month before had ${before.workouts}.` : ''}</p>}
    </section>
    <section aria-labelledby="av2-muscle-weeks-title">
      <h3 id="av2-muscle-weeks-title">Sets per muscle group, last 8 weeks</h3>
      <div className="av2-scroll" role="region" tabIndex={0} aria-label="Table: working sets per muscle group per week">
        <table className="av2-heat"><caption className="sr-only">Working sets per muscle group, by week (Monday first), oldest first</caption>
          <thead><tr><th scope="col">Muscle group</th>{weeks.weeks.map((s, i) => <th key={s} scope="col">{i === weeks.weeks.length - 1 ? 'This week' : formatDate(s, {year: false})}</th>)}<th scope="col">In all</th></tr></thead>
          <tbody>{weeks.rows.map(r => <tr key={r.muscle}><th scope="row">{r.muscle}</th>{r.sets.map((n, i) => <td key={i} style={{'--heat': String(Math.round(n / most * 100) / 100)} as CSSProperties} data-zero={n === 0 || undefined}>{n}</td>)}<td><strong>{r.total}</strong></td></tr>)}</tbody>
        </table>
      </div>
      <p className="fine">Working sets of strength exercises, warm-ups left out; a full-body exercise counts for legs, back, shoulders and core. A darker cell has more sets. How many is yours to choose.</p>
    </section>
  </div>;
}
function MonthReport({now, before, unit}: {now: MonthFigures; before: MonthFigures; unit: 'kg' | 'lb'}) {
  const rows: [string, string, string | null][] = [
    ['Workouts', formatNumber(now.workouts), change(now.workouts, before.workouts, n => formatNumber(n))],
    ['Days trained', formatNumber(now.days), change(now.days, before.days, n => formatNumber(n))],
    ['Time', `${formatNumber(Math.round(now.minutes / 6) / 10, {maximumFractionDigits: 1})} h`, change(now.minutes, before.minutes, n => `${formatNumber(Math.round(n / 6) / 10, {maximumFractionDigits: 1})} h`)],
    ['Working sets', formatNumber(now.sets), change(now.sets, before.sets, n => formatNumber(n))],
    ...(now.volumeKg || before.volumeKg ? [['Weight lifted', weightShown(now.volumeKg, unit), change(now.volumeKg, before.volumeKg, n => weightShown(n, unit))] as [string, string, string]] : []),
    ...(now.distanceKm || before.distanceKm ? [['Distance', `${formatNumber(now.distanceKm, {maximumFractionDigits: 1})} km`, change(now.distanceKm, before.distanceKm, n => `${formatNumber(n, {maximumFractionDigits: 1})} km`)] as [string, string, string]] : []),
    ['New personal bests', formatNumber(now.bests), null],
  ];
  return <>
    <dl className="workouts-stats av2-month-stats">{rows.map(([dt, dd, note]) => <div key={dt}><dt>{dt}</dt><dd>{dd}</dd>{note && <dd className="dd-note"><small>{note}</small></dd>}</div>)}</dl>
    {(now.topMuscle || now.topExercise) && <p className="fine">{[now.topMuscle ? `Most trained: ${now.topMuscle.toLowerCase()}` : null, now.topExercise ? `most sets: ${now.topExercise}` : null].filter(Boolean).join(' · ')}.</p>}
  </>;
}
