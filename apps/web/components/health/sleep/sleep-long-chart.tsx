'use client';
import {useMemo} from 'react';
import {useChartWidth} from '../../charts/use-chart-width';
import type {DayPoint} from '../../../lib/sleep/engine';
import {groupSleep, rangeAverage} from '../../../lib/sleep/longer';
import {formatMinutes} from '../../../lib/zone-time';
import {formatDate, formatMonth} from '../../../lib/visual-format';

/**
 * Session AV (owner follow-up 1, F-SLEEP-LONG; Sleep Cycle's long-range trends): Sleep → Over time at 90 days (by week)
 * or a year (by month) — the average time asleep of the nights logged in each, with the goal as a dashed line, an
 * empty group marked on the baseline (never a zero bar), and a table with the averages, the quality and the nights
 * logged. Hand-built SVG in the daily charts' look; its own chunk.
 */
const H = 180, PAD = {top: 14, right: 10, bottom: 26, left: 44}, plotH = H - PAD.top - PAD.bottom;
export default function SleepLongChart({points, goal, by}: {points: DayPoint[]; goal: number | null; by: 'week' | 'month'}) {
  const groups = useMemo(() => groupSleep(points, by), [points, by]), all = useMemo(() => rangeAverage(points), [points]);
  const [plot, W] = useChartWidth(), plotW = W - PAD.left - PAD.right;
  const top = Math.max(9 * 60, goal ?? 0, ...groups.map(g => g.asleep ?? 0)), max = Math.ceil(top / 120) * 120;
  const y = (m: number) => PAD.top + plotH - m / max * plotH, step = plotW / Math.max(1, groups.length), w = Math.max(2, step - 4);
  const name = (g: (typeof groups)[number]) => by === 'month' ? formatMonth(`${g.key}-01`) : `Week of ${formatDate(g.start, {year: false})}`;
  const label = (g: (typeof groups)[number], i: number) => by === 'month' ? formatMonth(`${g.key}-01`, {year: false}) : i % 3 === 0 || i === groups.length - 1 ? formatDate(g.start, {year: false}) : '';
  const span = by === 'month' ? 'a year, by month' : '90 days, by week';
  const summary = all ? `Average time asleep, ${span}: ${formatMinutes(all.asleep)} a night over the ${all.nights} nights logged${goal ? `; goal ${formatMinutes(goal)}` : ''}.` : `Average time asleep, ${span}: no night logged yet.`;
  return <figure className="sleep-chart sleep-long-chart">
    <figcaption>Time asleep · {by === 'month' ? 'last 12 months, average a night' : 'last 90 days, average a night by week'}</figcaption>
    <p className="fine">{all ? `On average ${formatMinutes(all.asleep)} a night over the ${all.nights} nights logged.` : 'No night logged in this range yet.'}</p>
    <div className="sleep-chart-plot" ref={plot}>
      <svg className="zg-chart" data-pillar="health" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={summary}>
        {Array.from({length: max / 120 + 1}, (_, i) => i * 120).map(m => <g key={m} className="sleep-grid"><line x1={PAD.left} x2={W - PAD.right} y1={y(m)} y2={y(m)}/><text x={PAD.left - 4} y={y(m) + 5} textAnchor="end">{m / 60} h</text></g>)}
        {groups.map((g, i) => <g key={g.key}>
          {g.asleep !== null ? <rect className="sleep-bar" x={PAD.left + i * step + 2} y={y(g.asleep)} width={w} height={y(0) - y(g.asleep)} rx={3}/> : <line className="sleep-missing" x1={PAD.left + i * step + step / 2 - 4} x2={PAD.left + i * step + step / 2 + 4} y1={y(0) - 3} y2={y(0) - 3}/>}
          <text className="sleep-axis" x={PAD.left + i * step + step / 2} y={H - 6} textAnchor="middle">{label(g, i)}</text>
        </g>)}
        {goal !== null && <g className="sleep-goal"><line x1={PAD.left} x2={W - PAD.right} y1={y(goal)} y2={y(goal)}/></g>}
      </svg>
    </div>
    <details className="sleep-chart-table"><summary>Show as a table</summary><div className="sleep-table-wrap"><table>
      <thead><tr><th scope="col">{by === 'month' ? 'Month' : 'Week'}</th><th scope="col">Average asleep</th><th scope="col">Average quality</th><th scope="col">Nights logged</th></tr></thead>
      <tbody>{[...groups].reverse().map(g => <tr key={g.key}><th scope="row">{name(g)}</th><td>{g.asleep === null ? '—' : formatMinutes(g.asleep)}</td><td>{g.quality === null ? '—' : `${g.quality} of 5`}</td><td>{g.nights} of {g.days}</td></tr>)}</tbody>
    </table></div></details>
  </figure>;
}
