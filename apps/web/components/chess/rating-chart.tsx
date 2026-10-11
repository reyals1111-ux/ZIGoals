'use client';
import {useState} from 'react';
import {useChartWidth} from '../charts/use-chart-width';
import {formatNumber} from '../../lib/visual-format';

/**
 * One rating over time (Session W Part 14): the day's last known rating per day, from the site's own history and the
 * snapshots each refresh keeps here; a line, a dot per day with its value on hover or focus, and the same numbers as a
 * table. No trend line, no prediction.
 */
const PAD = {top: 14, right: 12, bottom: 26, left: 48}, H = 168, plotH = H - PAD.top - PAD.bottom;
export function RatingChart({title, points}: {title: string; points: {day: string; rating: number}[]}) {
  const [hover, setHover] = useState<number | null>(null), [plot, W] = useChartWidth(), plotW = W - PAD.left - PAD.right;
  if (points.length < 2) return null;
  const min = Math.min(...points.map(p => p.rating)), max = Math.max(...points.map(p => p.rating)), lo = Math.floor((min - 10) / 10) * 10, hi = Math.ceil((max + 10) / 10) * 10;
  const x = (i: number) => PAD.left + (points.length === 1 ? plotW / 2 : i / (points.length - 1) * plotW), y = (r: number) => PAD.top + plotH - (r - lo) / (hi - lo) * plotH;
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`).join('');
  const tip = hover === null ? null : `${points[hover]!.day} · ${formatNumber(points[hover]!.rating)}`;
  return <figure className="chess-chart">
    <figcaption>{title}</figcaption>
    <p className="sr-only">{`${title}: ${points.length} days, from ${points[0]!.day} (${points[0]!.rating}) to ${points.at(-1)!.day} (${points.at(-1)!.rating}); lowest ${min}, highest ${max}.`}</p>
    <div className="chess-chart-plot" ref={plot}>
      {tip && <p className="chess-chart-tip" aria-hidden="true">{tip}</p>}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {[lo, hi].map(v => <g key={v} className="chess-grid"><line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} /><text x={PAD.left - 6} y={y(v) + 5} textAnchor="end">{v}</text></g>)}
        <path className="chess-line" d={d} />
        {points.map((p, i) => <circle key={p.day} className="chess-dot" cx={x(i)} cy={y(p.rating)} r={hover === i || i === points.length - 1 ? 4 : 0} />)}
        <text className="chess-axis" x={PAD.left} y={H - 6}>{points[0]!.day}</text><text className="chess-axis" x={W - PAD.right} y={H - 6} textAnchor="end">{points.at(-1)!.day}</text>
        {points.map((p, i) => { const w = plotW / points.length; return <rect key={`hit-${p.day}`} className="chess-hit" x={x(i) - w / 2} y={PAD.top} width={w} height={plotH} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} />; })}
      </svg>
    </div>
    <details className="chess-chart-table"><summary>Show the numbers</summary><table><thead><tr><th scope="col">Day</th><th scope="col">Rating</th></tr></thead><tbody>{points.map(p => <tr key={p.day}><th scope="row">{p.day}</th><td>{p.rating}</td></tr>)}</tbody></table></details>
  </figure>;
}
