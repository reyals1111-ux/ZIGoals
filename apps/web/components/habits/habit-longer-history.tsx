'use client';
import {useId, useMemo, useState, type CSSProperties} from 'react';
import type {Habit} from '../../lib/habits';
import {strengthByWeek, totalsBy, weekdayByMonth, HISTORY_WEEKS, type PeriodUnit} from '../../lib/habits-v2/history';
import {WEEKDAY_NAMES, WEEKDAY_ORDER} from '../../lib/habits-v2/stats';
import {formatDate, formatMonth} from '../../lib/visual-format';
import './habit-longer-history.css';

/**
 * Session AV lane 2 (habits pillar; LEDGER #187, #190 — Loop's score chart, history and frequency charts): inside a
 * habit's "Consistency & trends", loaded when its fold opens. The strength as a weekly line over the past year (one 0–100
 * axis, each point titled, the whole series in the chart's name and "As a table"); days done of days scheduled by month,
 * quarter or year since the habit began; and the days done on each weekday, month by month (numbers in every cell).
 */
// Session AV lane 2 (polish4): the axis words are HTML beside and under the chart (14 px at every width; SVG text
// shrank with the chart to about 6 px on a phone), so the plot keeps only small margins.
const W = 520, H = 140, L = 6, R = 8, T = 10, B = 10;
const periodText = (p: string, unit: PeriodUnit) => unit === 'month' ? formatMonth(p) : unit === 'quarter' ? `${p.slice(5)} ${p.slice(0, 4)}` : p;
export default function HabitHistory({habit, today}: {habit: Habit; today: string}) {
  const [unit, setUnit] = useState<PeriodUnit>('month'), id = useId();
  const weeks = useMemo(() => strengthByWeek(habit, today), [habit, today]);
  const totals = useMemo(() => totalsBy(habit, today, unit), [habit, today, unit]);
  const grid = useMemo(() => weekdayByMonth(habit, today), [habit, today]);
  const known = weeks.filter(w => w.score !== null), x = (i: number) => L + i / (HISTORY_WEEKS - 1) * (W - L - R), y = (v: number) => T + (100 - v) / 100 * (H - T - B);
  let d = '', open = false;
  weeks.forEach((w, i) => { if (w.score === null) { open = false; return; } d += `${open ? 'L' : 'M'}${x(i).toFixed(1)},${y(w.score).toFixed(1)}`; open = true; });
  const most = Math.max(1, ...grid.flatMap(g => g.days));
  return <div className="habit-longer">
    <h4>Strength, week by week · last {HISTORY_WEEKS} weeks</h4>
    {known.length ? <>
      <div className="habit-longer-plot">
      <span className="habit-longer-y" aria-hidden="true">{[100, 50, 0].map(v => <span key={v} style={{top: `${y(v) / H * 100}%`}}>{v}</span>)}</span>
      <svg className="habit-longer-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Strength at the end of each week, 0 to 100: ${known.length} weeks with a figure, from ${known[0]!.score} on ${formatDate(known[0]!.weekEnd, {year: false})} to ${known.at(-1)!.score} on ${formatDate(known.at(-1)!.weekEnd, {year: false})}, highest ${Math.max(...known.map(k => k.score!))}, lowest ${Math.min(...known.map(k => k.score!))}.`}>
        {[0, 50, 100].map(v => <line key={v} className="habit-longer-grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)}/>)}
        <path className="habit-longer-line" d={d}/>
        {weeks.map((w, i) => w.score === null ? null : <circle key={w.weekEnd} className="habit-longer-dot" cx={x(i)} cy={y(w.score)} r={2.2}><title>{`Week to ${formatDate(w.weekEnd, {year: false})}: ${w.score}`}</title></circle>)}
      </svg>
      <p className="habit-longer-x" aria-hidden="true"><span>{formatDate(weeks[0]!.weekEnd, {year: false})}</span><span>{formatDate(today, {year: false})}</span></p>
      </div>
      <details className="habit-longer-table"><summary>As a table</summary><table><caption>Strength at the end of each week</caption><thead><tr><th scope="col">Week to</th><th scope="col">Strength</th></tr></thead>
        <tbody>{[...known].reverse().map(w => <tr key={w.weekEnd}><th scope="row">{formatDate(w.weekEnd, {year: false})}</th><td>{w.score}</td></tr>)}</tbody></table></details>
    </> : <p className="fine">The weekly line starts once the habit has seven scheduled days behind it.</p>}
    <h4>Days done, by {unit}</h4>
    <fieldset className="habit-longer-units"><legend className="sr-only">Count by</legend>{(['month', 'quarter', 'year'] as const).map(u => <label key={u} className="checkbox"><input type="radio" name={`${id}-unit`} checked={unit === u} onChange={() => setUnit(u)}/><span>By {u}</span></label>)}</fieldset>
    {totals.length ? <table className="habit-longer-totals"><caption className="sr-only">Days done of days scheduled, by {unit}, newest first</caption><thead><tr><th scope="col">{unit === 'month' ? 'Month' : unit === 'quarter' ? 'Quarter' : 'Year'}</th><th scope="col">Done</th><th scope="col">Scheduled</th><th scope="col">Share</th></tr></thead>
      <tbody>{totals.map(t => <tr key={t.period}><th scope="row">{periodText(t.period, unit)}</th><td>{t.done}</td><td>{t.scheduled}</td><td>{t.scheduled ? `${Math.round(t.done / t.scheduled * 100)}%` : '—'}</td></tr>)}</tbody></table> : <p className="fine">No scheduled day yet.</p>}
    <h4>Days done on each weekday, month by month</h4>
    {grid.length ? <div className="habit-longer-scroll" role="region" tabIndex={0} aria-label="Days done on each weekday, month by month"><table className="habit-longer-weekdays"><caption className="sr-only">Days done on each weekday, by month, newest first</caption>
      <thead><tr><th scope="col">Month</th>{WEEKDAY_ORDER.map(w => <th key={w} scope="col"><abbr title={WEEKDAY_NAMES[w]}>{WEEKDAY_NAMES[w]!.slice(0, 2)}</abbr></th>)}</tr></thead>
      <tbody>{grid.map(g => <tr key={g.month}><th scope="row">{formatMonth(g.month)}</th>{g.days.map((n, i) => <td key={i} style={{'--share': n / most} as CSSProperties} data-empty={n === 0 || undefined}>{n}</td>)}</tr>)}</tbody></table></div>
      : <p className="fine">Nothing done in the last twelve months yet.</p>}
  </div>;
}
