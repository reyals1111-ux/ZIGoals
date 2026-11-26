'use client';
import {firstSeries, firstStat, seriesSummary, vizDate, vizNumber, vizUnit, type Series, type Stat, type VizLang} from '../../lib/ai/viz';
import type {ToolResult} from '../../lib/ai/tools/types';
import {formatDate, formatNumber} from '../../lib/visual-format';
import {ChartLookDefs, useChartLook} from '../charts/chart-defs';
import './chat-polish.css';

/**
 * A stat card and a small chart under an answer (Session V Part 10), made by ZIGoals from the records a tool returned
 * on this device, never from numbers in an AI's words. The chart is an SVG (attributes only, no style attribute, no
 * HTML): bars for amounts per day, a line for readings such as weight with its lowest and highest values written on it,
 * so a small change is not made to look large. A caption says the same in words; the exact figures are in a table.
 */
const W = 240, H = 64, GAP = 2;
const fmt = (n: number) => formatNumber(Number(n.toFixed(1)), {maximumFractionDigits: 1}); // fr-recheck (FR-TJ-4): the display locale, as the caption (lib/ai/viz.ts)
function Bars({series}: {series: Series}) {
  const max = Math.max(...series.points.map(p => p.value), 1), width = (W - GAP * (series.points.length - 1)) / series.points.length;
  return <>{series.points.map((p, i) => { const h = Math.max(p.value > 0 ? 2 : 0, Math.round((p.value / max) * (H - 4))); return <rect key={p.date} x={Math.round(i * (width + GAP) * 10) / 10} y={H - h} width={Math.max(1, Math.round(width * 10) / 10)} height={h} rx={1.5} className="ai-viz-bar"/>; })}</>;
}
/** Session AK (G3): the one chart look — the line in its gradient with one soft glow (none by day), and its two labels a true
 * 14 px (the chart is drawn at its own size), with room left of the line for the longer of them. */
function Line({series, look}: {series: Series; look: ReturnType<typeof useChartLook>}) {
  const values = series.points.map(p => p.value), low = Math.min(...values), high = Math.max(...values), span = high - low || 1;
  const LABEL = Math.min(96, Math.max(34, Math.max(fmt(high).length, fmt(low).length) * 8.5 + 8));
  const x = (i: number) => LABEL + Math.round((i / Math.max(1, series.points.length - 1)) * (W - LABEL - 4) * 10) / 10;
  const y = (v: number) => Math.round((H - 6 - ((v - low) / span) * (H - 12)) * 10) / 10;
  return <>
    <ChartLookDefs id={look.id} width={W} height={H}/>
    <text x={0} y={13} className="ai-viz-label">{fmt(high)}</text>
    <text x={0} y={H - 2} className="ai-viz-label">{fmt(low)}</text>
    <polyline points={series.points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')} fill="none" className="ai-viz-line zgc-line" stroke={look.stroke('a')} filter={look.glow}/>
    {series.points.map((p, i) => <circle key={p.date} cx={x(i)} cy={y(p.value)} r={2} className="ai-viz-dot"/>)}
  </>;
}
/** Session AW (fr-answers, FR-AW-10): `lang`, the conversation's language: the caption and the figures' table in Dutch for a Dutch question. */
export function MiniChart({series, lang = 'en'}: {series: Series; lang?: VizLang}) {
  const summary = seriesSummary(series, lang), look = useChartLook(), nl = lang === 'nl';
  return <figure className="ai-viz">
    <svg className="zg-chart" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={summary} focusable="false">
      {series.shape === 'line' ? <Line series={series} look={look}/> : <Bars series={series}/>}
    </svg>
    <figcaption className="ai-note">{summary}</figcaption>
    <details className="ai-viz-table"><summary>{nl ? 'Toon de cijfers' : 'Show the figures'}</summary><table><thead><tr><th scope="col">{nl ? 'Dag' : 'Day'}</th><th scope="col">{vizUnit(series.unit, lang) || (nl ? 'Waarde' : 'Value')}</th></tr></thead><tbody>{series.points.map(p => <tr key={p.date}><td>{nl ? vizDate(p.date, 'nl') : formatDate(p.date)}</td><td>{nl ? vizNumber(p.value, 'nl') : formatNumber(p.value)}</td></tr>)}</tbody></table></details>
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
export function DataViz({results, lang = 'en'}: {results: readonly ToolResult[] | undefined; lang?: VizLang}) {
  const stat = results ? firstStat(results, lang) : null, series = results ? firstSeries(results) : null;
  if (!stat && !series) return null;
  return <div className="ai-data-viz">{stat && <StatCard stat={stat}/>}{series && <MiniChart series={series} lang={lang}/>}</div>;
}
