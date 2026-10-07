'use client';
import {useState} from 'react';
import {useChartWidth} from '../../charts/use-chart-width';
import {minutesText, type WeekBar} from '../../../lib/meditation/stats';

/**
 * Minutes a week (Session W Part 5), hand-built SVG like Sleep's charts: one series, so the title names it; the person's
 * own weekly goal is a dashed line named in a key under the title; a week without a session is an empty slot labelled
 * in the table, never a bar of zero. Hover shows a week's details; the table holds every value. Bars #6f7ff5 and the goal
 * #c45bb0, validated on the dark surface.
 */
const H = 170, PAD = {top: 12, right: 10, bottom: 26, left: 48}, plotH = H - PAD.top - PAD.bottom;
const weekLabel = (start: string) => new Date(`${start}T12:00:00Z`).toLocaleDateString('en', {day: 'numeric', month: 'short', timeZone: 'UTC'});
/** An axis tick in the same words everywhere: "0", "30 min", "1 h", "1 h 30". */
const tick = (m: number) => m === 0 ? '0' : m % 60 === 0 ? `${m / 60} h` : m > 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m} min`;
const bar = (x: number, w: number, top: number, base: number) => { const r = Math.min(4, w / 2, (base - top) / 2); return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${base}Z`; };

export function MeditationWeeksChart({weeks, goal}: {weeks: WeekBar[]; goal: number | null}) {
  const [hover, setHover] = useState<number | null>(null), [plot, W] = useChartWidth(), plotW = W - PAD.left - PAD.right;
  const top = Math.max(30, goal ?? 0, ...weeks.map(w => w.minutes)), step = top <= 60 ? 15 : top <= 180 ? 30 : 60, max = Math.ceil(top / step) * step;
  const y = (m: number) => PAD.top + plotH - m / max * plotH, slot = plotW / weeks.length, w = Math.max(4, Math.min(48, slot - 8));
  const done = weeks.filter(w => w.sessions > 0);
  const summary = done.length ? `Minutes a week, last ${weeks.length} weeks: ${done.length} weeks with a session, from ${minutesText(Math.min(...done.map(w => w.minutes)))} to ${minutesText(Math.max(...done.map(w => w.minutes)))}${goal ? `; goal ${minutesText(goal)}` : ''}.` : `Minutes a week, last ${weeks.length} weeks: no sessions yet.`;
  const tip = hover === null ? null : weeks[hover]!.sessions ? `Week of ${weekLabel(weeks[hover]!.weekStart)}: ${minutesText(weeks[hover]!.minutes)} over ${weeks[hover]!.sessions} ${weeks[hover]!.sessions === 1 ? 'session' : 'sessions'}` : `Week of ${weekLabel(weeks[hover]!.weekStart)}: no session`;
  return <figure className="sleep-chart meditation-chart">
    <figcaption>Minutes a week · last {weeks.length} weeks</figcaption>
    {goal !== null && <ul className="sleep-key"><li><i className="sleep-key-goal" aria-hidden="true"/>Goal {minutesText(goal)} a week</li></ul>}
    <div className="sleep-chart-plot" ref={plot}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={summary}>
        {Array.from({length: max / step + 1}, (_, i) => i * step).map(m => <g key={m} className="sleep-grid"><line x1={PAD.left} x2={W - PAD.right} y1={y(m)} y2={y(m)}/><text x={PAD.left - 4} y={y(m) + 5} textAnchor="end">{tick(m)}</text></g>)}
        {weeks.map((week, i) => <g key={week.weekStart}>
          {week.sessions > 0 && week.minutes > 0 && <path className="sleep-bar" d={bar(PAD.left + i * slot + (slot - w) / 2, w, y(week.minutes), y(0))}/>}
          <text className="sleep-axis" x={PAD.left + i * slot + slot / 2} y={H - 6} textAnchor="middle">{weeks.length <= 8 || i % 2 === weeks.length % 2 ? weekLabel(week.weekStart) : ''}</text>
          <rect className="sleep-hit" x={PAD.left + i * slot} y={PAD.top} width={slot} height={plotH} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(h => h === i ? null : h)}/>
        </g>)}
        {goal !== null && <g className="sleep-goal"><line x1={PAD.left} x2={W - PAD.right} y1={y(goal)} y2={y(goal)}/></g>}
      </svg>
      {tip && <p className="sleep-chart-tip" aria-hidden="true">{tip}</p>}
    </div>
    <details className="sleep-chart-table"><summary>Show as a table</summary>
      <div className="sleep-table-wrap"><table>
        <thead><tr><th scope="col">Week of</th><th scope="col">Minutes</th><th scope="col">Sessions</th></tr></thead>
        <tbody>{weeks.map(week => <tr key={week.weekStart}><th scope="row">{weekLabel(week.weekStart)}</th>{week.sessions ? <><td>{minutesText(week.minutes)}</td><td>{week.sessions}</td></> : <td colSpan={2}>No session</td>}</tr>)}</tbody>
      </table></div>
    </details>
  </figure>;
}
