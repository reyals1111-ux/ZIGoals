'use client';
import {firstSeries, firstStat, seriesSummary, type Series, type Stat} from '../../lib/ai/viz';
import type {ToolResult} from '../../lib/ai/tools/types';
import './chat-polish.css';

/**
 * A stat card and a small chart under an answer (Session V Part 10), made by ZIGoals from the records a tool returned
 * on this device, never from numbers in an AI's words. The chart is an SVG (attributes only, no style attribute, no
 * HTML): bars for amounts per day, a line for readings such as weight with its lowest and highest values written on it,
 * so a small change is not made to look large. A caption says the same in words; the exact figures are in a table.
 */
const W = 240, H = 64, GAP = 2, LABEL = 34;
const fmt = (n: number) => Number(n.toFixed(1)).toLocaleString('en-US');
function Bars({series}: {series: Series}) {
  const max = Math.max(...series.points.map(p => p.value), 1), width = (W - GAP * (series.points.length - 1)) / series.points.length;
  return <>{series.points.map((p, i) => { const h = Math.max(p.value > 0 ? 2 : 0, Math.round((p.value / max) * (H - 4))); return <rect key={p.date} x={Math.round(i * (width + GAP) * 10) / 10} y={H - h} width={Math.max(1, Math.round(width * 10) / 10)} height={h} rx={1.5} className="ai-viz-bar"/>; })}</>;
}
function Line({series}: {series: Series}) {
  const values = series.points.map(p => p.value), low = Math.min(...values), high = Math.max(...values), span = high - low || 1;
  const x = (i: number) => LABEL + Math.round((i / Math.max(1, series.points.length - 1)) * (W - LABEL - 4) * 10) / 10;
  const y = (v: number) => Math.round((H - 6 - ((v - low) / span) * (H - 12)) * 10) / 10;
  return <>
    <text x={0} y={10} className="ai-viz-label">{fmt(high)}</text>
    <text x={0} y={H - 2} className="ai-viz-label">{fmt(low)}</text>
    <polyline points={series.points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')} fill="none" className="ai-viz-line"/>
    {series.points.map((p, i) => <circle key={p.date} cx={x(i)} cy={y(p.value)} r={2} className="ai-viz-dot"/>)}
  </>;
}
export function MiniChart({series}: {series: Series}) {
  const summary = seriesSummary(series);
  return <figure className="ai-viz">
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={summary} focusable="false">
      {series.shape === 'line' ? <Line series={series}/> : <Bars series={series}/>}
    </svg>
    <figcaption className="ai-note">{summary}</figcaption>
    <details className="ai-viz-table"><summary>Show the figures</summary><table><thead><tr><th scope="col">Day</th><th scope="col">{series.unit || 'Value'}</th></tr></thead><tbody>{series.points.map(p => <tr key={p.date}><td>{p.date}</td><td>{p.value.toLocaleString('en-US')}</td></tr>)}</tbody></table></details>
  </figure>;
}
/** A figure from the records, as a small card: the number, what it counts, and where it comes from. */
export function StatCard({stat}: {stat: Stat}) {
  return <div className="ai-stat" role="group" aria-label={`${stat.label}: ${stat.value}`}>
    <strong className="ai-stat-value">{stat.value}</strong>
    <span className="ai-stat-label">{stat.label}{stat.detail ? ` · ${stat.detail}` : ''}</span>
    <small className="ai-stat-source">{stat.source}</small>
  </div>;
}
export function DataViz({results}: {results: readonly ToolResult[] | undefined}) {
  const stat = results ? firstStat(results) : null, series = results ? firstSeries(results) : null;
  if (!stat && !series) return null;
  return <div className="ai-data-viz">{stat && <StatCard stat={stat}/>}{series && <MiniChart series={series}/>}</div>;
}
