'use client';
import {useId, useMemo} from 'react';
import {bandWords, movementBand, type ActivityMinutes} from '../../../lib/workouts/movement';
import type {Workouts} from '../../../lib/workouts/schema';
import {formatDate, formatNumber, formatWeekday} from '../../../lib/visual-format';
import '../r5/gym-r5.css';

/**
 * Session AV lane 2, round 5 (gym; LEDGER #375, Gentler Streak's Activity Path): Health → Workouts → "Distance goals and
 * training load" → "Your movement band". The usual weekly range from your last six weeks shaded on a bar, this week's
 * minutes filling it, each day of the week, and the last 30 days as bars and a table. Workouts and Health activity minutes
 * (walks, chores, everyday movement) together. Facts only: no calorie figure, no "you must rest". Its own chunk.
 */
const min = (n: number) => `${formatNumber(n)} min`;
export default function MovementBand({w, activity, today, pauses}: {w: Workouts; activity: readonly ActivityMinutes[]; today: string; pauses: readonly {from: string; to: string}[]}) {
  const b = useMemo(() => movementBand(w, activity, today, pauses), [w, activity, today, pauses]), id = useId();
  const top = Math.max(1, b.weekTotal, Math.round((b.high ?? 0) * 1.25)), pct = (n: number) => `${Math.min(100, Math.round(n / top * 1000) / 10)}%`;
  const top30 = Math.max(1, ...b.last30.map(d => d.minutes));
  const summary = `This week so far: ${min(b.weekTotal)}${b.weekTotal ? ` (${min(b.weekWorkouts)} of workouts, ${min(b.weekOther)} of other movement)` : ''}.`;
  return <section className="r5-band" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Your movement band</h3>
    <p className="fine">Your usual week, read from your last six weeks of workouts and Health activity (walks, chores, everyday movement). Weeks with a status set are left out. Only your own minutes: no calories.</p>
    <p><strong>{summary}</strong> {bandWords(b)}</p>
    <div className="r5-band-bar" role="img" aria-label={`${summary} ${b.low !== null ? `Your usual range is ${b.low} to ${b.high} minutes a week.` : 'No usual range yet.'}`}>
      {b.low !== null && b.high !== null && <span className="r5-band-range" style={{left: pct(b.low), width: `calc(${pct(b.high)} - ${pct(b.low)})`}}/>}
      <span className="r5-band-fill" style={{width: pct(b.weekTotal)}}/>
    </div>
    <p className="r5-band-key" aria-hidden="true"><span>▮ this week</span>{b.low !== null && <span>░ your usual range, {b.low}–{b.high} min</span>}</p>
    <ol className="r5-band-days" aria-label="This week, day by day">{b.week.map(d => <li key={d.date} data-today={d.date === today || undefined}>
      <span>{formatWeekday(d.date)}</span><span>{d.future ? '—' : min(d.minutes)}</span><span className="sr-only">{d.future ? ', still to come' : `, ${min(d.total)} this week by then`}</span>
    </li>)}</ol>
    <details>
      <summary>The last 30 days</summary>
      <svg className="r5-band-30" viewBox="0 0 300 64" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        {b.last30.map((d, i) => { const h = d.minutes ? Math.max(3, Math.round(58 * d.minutes / top30)) : 1; return <rect key={d.date} x={i * 10 + 1} y={62 - h} width={8} height={h} rx={2} className={d.date === today ? 'is-today' : undefined}/>; })}
      </svg>
      <p className="fine">In the last 30 days: {min(b.last30.reduce((t, d) => t + d.minutes, 0))} on {b.last30.filter(d => d.minutes > 0).length} days. Your last six weeks: {b.weeks.map(k => `${formatDate(k.start, {year: false})} ${k.paused ? '(status set)' : min(k.minutes)}`).join(' · ')}.</p>
      <div className="r5-band-scroll" role="region" tabIndex={0} aria-label="Table: movement minutes per day, the last 30 days"><table><caption className="sr-only">Movement minutes per day, the last 30 days</caption>
        <thead><tr><th scope="col">Day</th><th scope="col">Workouts</th><th scope="col">Other movement</th><th scope="col">In all</th></tr></thead>
        <tbody>{[...b.last30].reverse().map(d => <tr key={d.date}><th scope="row">{formatDate(d.date, {weekday: true, year: false})}</th><td>{min(d.workouts)}</td><td>{min(d.other)}</td><td>{min(d.minutes)}</td></tr>)}</tbody></table></div>
    </details>
  </section>;
}
