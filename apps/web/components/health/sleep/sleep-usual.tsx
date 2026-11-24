'use client';
import {useMemo} from 'react';
import {NebulaFlow} from '../../nebula-flow';
import {useChartWidth} from '../../charts/use-chart-width';
import {clockFromMidnight, clockFromNoon, type DayPoint} from '../../../lib/sleep/engine';
import {groupSleep, lastMonths} from '../../../lib/sleep/longer';
import type {Sleep} from '../../../lib/sleep/schema';
import {groupLatency, latencySeries, usualSleep, weekVsUsual, USUAL_MIN_NIGHTS} from '../../../lib/sleep/usual';
import {formatClock, formatDate, formatMonth, formatWeekday} from '../../../lib/visual-format';
import {formatMinutes} from '../../../lib/zone-time';
import './av2-sleep.css';

/**
 * Session AV lane 2 (body; LEDGER #123, #124; Sleep Cycle's statistics and weekly report): Health → Sleep —
 * - "Your week beside your usual": the last 7 days' time asleep, bedtime, wake time, time to fall asleep and quality
 *   beside "your usual", the median of your own nights in the 90 days before this week (never outside figures);
 * - "Time to fall asleep": per night (7 and 30 days) or by week or month (90 days, a year), with your usual as a dotted
 *   line, and a table;
 * - "Your quality ratings" by week or month for 90 days and a year, as a line, and a table.
 * A night without a value stays empty, never zero. Its own chunk.
 */
const H = 170, PAD = {top: 14, right: 10, bottom: 26, left: 44}, plotH = H - PAD.top - PAD.bottom;
const delta = (now: number | null, usual: number | null, words: (n: number) => string, more: string, less: string) => now === null || usual === null ? null : Math.round(now - usual) === 0 ? 'the same as usual' : `${words(Math.abs(Math.round(now - usual)))} ${now > usual ? more : less} than usual`;

export default function SleepUsual({sleep, today}: {sleep: Sleep; today: string}) {
  const v = useMemo(() => weekVsUsual(sleep, today), [sleep, today]), usual = useMemo(() => usualSleep(sleep, today), [sleep, today]);
  return <section className="panel sleep-usual-card" aria-labelledby="sleep-usual-title">
    <h2 id="sleep-usual-title"><NebulaFlow identity="sleep-usual-title">Your week beside your usual</NebulaFlow></h2>
    {!usual ? <p className="fine">Your usual is worked out from your own nights: the middle value of the nights you logged in the 90 days before this week. It needs at least {USUAL_MIN_NIGHTS} of them; keep logging and it shows here.</p>
      : !v ? <p className="fine">No night logged in the last 7 days. Your usual: {usual.asleep === null ? '—' : formatMinutes(Math.round(usual.asleep))} asleep, from {usual.nights} nights.</p>
      : <><dl className="sleep-usual-stats">
        <Row label="Asleep" now={v.asleep === null ? '—' : formatMinutes(Math.round(v.asleep))} usual={usual.asleep === null ? '—' : formatMinutes(Math.round(usual.asleep))} note={delta(v.asleep, usual.asleep, formatMinutes, 'more', 'less')}/>
        <Row label="Bedtime" now={v.bed === null ? '—' : formatClock(clockFromNoon(Math.round(v.bed)))} usual={usual.bed === null ? '—' : formatClock(clockFromNoon(Math.round(usual.bed)))} note={delta(v.bed, usual.bed, n => `${n} min`, 'later', 'earlier')}/>
        <Row label="Wake time" now={v.wake === null ? '—' : formatClock(clockFromMidnight(Math.round(v.wake)))} usual={usual.wake === null ? '—' : formatClock(clockFromMidnight(Math.round(usual.wake)))} note={delta(v.wake, usual.wake, n => `${n} min`, 'later', 'earlier')}/>
        <Row label="Time to fall asleep" now={v.latency === null ? 'not logged' : `${v.latency} min`} usual={usual.latency === null ? 'not enough nights' : `${usual.latency} min`} note={delta(v.latency, usual.latency, n => `${n} min`, 'longer', 'shorter')}/>
        <Row label="Your quality rating" now={v.quality === null ? 'not rated' : `${v.quality} of 5`} usual={usual.quality === null ? '—' : `${usual.quality} of 5`} note={v.quality === null || usual.quality === null ? null : Math.abs(v.quality - usual.quality) < 0.1 ? 'the same as usual' : `${Math.abs(Math.round((v.quality - usual.quality) * 10) / 10)} ${v.quality > usual.quality ? 'higher' : 'lower'} than usual`}/>
      </dl>
      <p className="fine">This week: {v.nights} {v.nights === 1 ? 'night' : 'nights'} logged. Your usual is the middle value of your own {usual.nights} nights from {formatDate(usual.from, {year: false})} to {formatDate(usual.to, {year: false})}: a line to compare with, not a target and not anyone else&rsquo;s.</p></>}
  </section>;
}
function Row({label, now, usual, note}: {label: string; now: string; usual: string; note: string | null}) {
  return <div><dt>{label}</dt><dd><strong>{now}</strong> <span className="sleep-usual-was">usual {usual}</span></dd>{note && <dd className="dd-note"><small>{note}</small></dd>}</div>;
}

/** Time to fall asleep: per night for 7 and 30 days, by week or month beyond; your usual dotted. */
export function SleepLatencyChart({sleep, today, days}: {sleep: Sleep; today: string; days: 7 | 30 | 90 | 365}) {
  const by = days === 365 ? 'month' : days === 90 ? 'week' : 'day';
  const series = useMemo(() => latencySeries(sleep, today, days), [sleep, today, days]), usual = useMemo(() => usualSleep(sleep, today)?.latency ?? null, [sleep, today]);
  // A year is the last 12 whole calendar months, as the time-asleep chart counts it (lib/sleep/longer.ts lastMonths).
  const firstMonth = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 12, 1)).toISOString().slice(0, 7);
  const bars = useMemo(() => by === 'day' ? series.map(p => ({key: p.date, start: p.date, latency: p.latency})) : groupLatency(by === 'month' ? series.filter(p => p.date.slice(0, 7) >= firstMonth) : series, by), [series, by, firstMonth]);
  const [plot, W] = useChartWidth(), plotW = W - PAD.left - PAD.right, logged = bars.filter(b => b.latency !== null);
  const top = Math.max(30, usual ?? 0, ...logged.map(b => b.latency!)), max = Math.ceil(top / 15) * 15, y = (m: number) => PAD.top + plotH - m / max * plotH, step = plotW / Math.max(1, bars.length), w = Math.max(2, step - 3);
  const every = Math.max(1, Math.ceil((by === 'month' ? 30 : by === 'week' ? 46 : 22) / Math.max(1, step)));
  const label = (b: (typeof bars)[number], i: number) => (bars.length - 1 - i) % every !== 0 ? '' : by === 'month' ? formatMonth(`${b.key}-01`, {year: false}) : by === 'week' ? formatDate(b.start, {year: false}) : bars.length <= 7 ? formatWeekday(b.start).slice(0, 2) : b.start.slice(8);
  const span = days === 365 ? 'last 12 months, by month' : days === 90 ? 'last 90 days, by week' : `last ${days} days`;
  const summary = logged.length ? `Time to fall asleep, ${span}: ${logged.length} ${by === 'day' ? 'nights' : by === 'week' ? 'weeks' : 'months'} with a value, from ${Math.min(...logged.map(b => b.latency!))} to ${Math.max(...logged.map(b => b.latency!))} minutes${usual !== null ? `; your usual ${usual} minutes` : ''}.` : `Time to fall asleep, ${span}: none logged yet.`;
  return <figure className="sleep-chart sleep-latency-chart">
    <figcaption>Time to fall asleep · {span}</figcaption>
    {logged.length === 0 ? <p className="fine">Add “time to fall asleep” when you log a night (or import it) and it is drawn here.</p> : <>
    {usual !== null && <ul className="sleep-key"><li><i className="sleep-key-usual" aria-hidden="true"/>Your usual {usual} min (your own nights)</li></ul>}
    <div className="sleep-chart-plot" ref={plot}>
      <svg className="zg-chart" data-pillar="health" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={summary}>
        {Array.from({length: max / 15 + 1}, (_, i) => i * 15).filter((m, i, all) => all.length <= 6 || i % 2 === 0).map(m => <g key={m} className="sleep-grid"><line x1={PAD.left} x2={W - PAD.right} y1={y(m)} y2={y(m)}/><text x={PAD.left - 4} y={y(m) + 5} textAnchor="end">{m}′</text></g>)}
        {bars.map((b, i) => <g key={b.key}>
          {b.latency !== null ? <rect className="sleep-bar latency" x={PAD.left + i * step + 1.5} y={y(b.latency)} width={w} height={Math.max(1, y(0) - y(b.latency))} rx={3}/> : <line className="sleep-missing" x1={PAD.left + i * step + step / 2 - 4} x2={PAD.left + i * step + step / 2 + 4} y1={y(0) - 3} y2={y(0) - 3}/>}
          <text className="sleep-axis" x={PAD.left + i * step + step / 2} y={H - 6} textAnchor="middle">{label(b, i)}</text>
        </g>)}
        {usual !== null && <g className="sleep-usual"><line x1={PAD.left} x2={W - PAD.right} y1={y(usual)} y2={y(usual)}/></g>}
      </svg>
    </div></>}
    <details className="sleep-chart-table"><summary>Show as a table</summary><div className="sleep-table-wrap" tabIndex={0} role="region" aria-label="Time to fall asleep, as a table"><table>
      <thead><tr><th scope="col">{by === 'month' ? 'Month' : by === 'week' ? 'Week of' : 'Night ending'}</th><th scope="col">Time to fall asleep</th></tr></thead>
      <tbody>{[...bars].reverse().map(b => <tr key={b.key}><th scope="row">{by === 'month' ? formatMonth(`${b.key}-01`) : formatDate(b.start, {weekday: by === 'day', year: false})}</th><td>{b.latency === null ? 'Not logged' : `${b.latency} min`}</td></tr>)}</tbody>
    </table></div></details>
  </figure>;
}

/** Your quality ratings by week (90 days) or month (a year), as a line; a group without a rating breaks it. */
export function SleepQualityTrend({points, by}: {points: DayPoint[]; by: 'week' | 'month'}) {
  const groups = useMemo(() => groupSleep(by === 'month' ? lastMonths(points) : points, by), [points, by]);
  const [plot, W] = useChartWidth(), plotW = W - PAD.left - PAD.right, step = plotW / Math.max(1, groups.length), x = (i: number) => PAD.left + i * step + step / 2, y = (q: number) => PAD.top + plotH - (q - 1) / 4 * plotH;
  const rated = groups.map((g, i) => ({g, i})).filter(({g}) => g.quality !== null);
  const d = rated.map(({g, i}, k) => `${k && rated[k - 1]!.i === i - 1 ? 'L' : 'M'}${x(i).toFixed(1)},${y(g.quality!).toFixed(1)}`).join('');
  const every = Math.max(1, Math.ceil((by === 'month' ? 30 : 46) / Math.max(1, step)));
  const span = by === 'month' ? 'last 12 months, by month' : 'last 90 days, by week';
  const summary = rated.length ? `Your quality ratings, ${span}: ${rated.length} ${by === 'month' ? 'months' : 'weeks'} rated, from ${Math.min(...rated.map(r => r.g.quality!))} to ${Math.max(...rated.map(r => r.g.quality!))} of 5.` : `Your quality ratings, ${span}: none rated yet.`;
  return <figure className="sleep-chart sleep-quality-trend">
    <figcaption>Your quality ratings · {span}</figcaption>
    {rated.length === 0 ? <p className="fine">Rate a night from 1 to 5 when you log it and the average of each {by} is drawn here.</p> :
    <div className="sleep-chart-plot" ref={plot}>
      <svg className="zg-chart" data-pillar="health" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={summary}>
        {[1, 2, 3, 4, 5].map(q => <g key={q} className="sleep-grid"><line x1={PAD.left} x2={W - PAD.right} y1={y(q)} y2={y(q)}/><text x={PAD.left - 4} y={y(q) + 5} textAnchor="end">{q}</text></g>)}
        {d && <path className="sleep-line" d={d}/>}
        {rated.map(({g, i}) => <circle key={g.key} className="sleep-dot" cx={x(i)} cy={y(g.quality!)} r="4"/>)}
        {groups.map((g, i) => <text key={g.key} className="sleep-axis" x={x(i)} y={H - 6} textAnchor="middle">{(groups.length - 1 - i) % every !== 0 ? '' : by === 'month' ? formatMonth(`${g.key}-01`, {year: false}) : formatDate(g.start, {year: false})}</text>)}
      </svg>
    </div>}
  </figure>;
}
