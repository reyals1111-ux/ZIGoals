'use client';
import {useChartWidth} from '../charts/use-chart-width';
import {ChartGrid, ChartLegend, ChartXAxis} from '../charts/chart-kit';
import {ChartLookDefs, useChartLook} from '../charts/chart-defs';
import {formatDate, formatNumber} from '../../lib/visual-format';

/**
 * Session AK (BUILD list 2 #4): one trend line per marker (or two for blood pressure, told apart by a dash as well as
 * colour), in the app's one chart look. A lab marker's copied range, when there is one, is a soft band; nothing marks a
 * value as good or bad. Dates are spaced by time, so a long gap between sheets looks long. The list beside it carries the
 * same values for screen readers (the svg's label names the first and last).
 */
type Point = {date: string; value: number};
type Series = {label: string; points: Point[]; dashed?: boolean};
const H = 160, PAD = {top: 12, right: 12, bottom: 24, left: 44};
const fmt = (v: number) => formatNumber(v, {maximumFractionDigits: 2});
export default function NumbersChart({series, unit, band, title}: {series: Series[]; unit: string; band?: {low?: number; high?: number} | null; title: string}) {
  const [plot, width] = useChartWidth(320, 240), look = useChartLook();
  const all = series.flatMap(s => s.points);
  if (all.length < 2) return <div ref={plot}><p className="fine">One reading so far; a second draws the line.</p></div>;
  const values = [...all.map(p => p.value), ...(band?.low !== undefined ? [band.low] : []), ...(band?.high !== undefined ? [band.high] : [])];
  let lo = Math.min(...values), hi = Math.max(...values);
  const pad = Math.max((hi - lo) * 0.1, Math.abs(hi) * 0.02, 0.1); lo -= pad; hi += pad;
  const dates = all.map(p => Date.parse(`${p.date}T12:00:00Z`)), t0 = Math.min(...dates), t1 = Math.max(...dates), span = Math.max(t1 - t0, 1);
  const x = (d: string) => PAD.left + (t1 === t0 ? 0.5 : (Date.parse(`${d}T12:00:00Z`) - t0) / span) * (width - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  const first = [...all].sort((a, b) => a.date.localeCompare(b.date))[0]!, last = [...all].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!;
  const bandTop = band?.high !== undefined ? y(band.high) : PAD.top, bandBottom = band?.low !== undefined ? y(band.low) : H - PAD.bottom;
  return <div className="numbers-chart" ref={plot}>
    <svg className="zg-chart" data-pillar="health" viewBox={`0 0 ${width} ${H}`} width={width} height={H} role="img" aria-label={`${title}: ${all.length} readings from ${formatDate(first.date)} to ${formatDate(last.date)}${unit ? `, in ${unit}` : ''}.${band ? ' The shaded band is the range you copied.' : ''}`}>
      <ChartLookDefs id={look.id} width={width} height={H}/>
      {band && (band.low !== undefined || band.high !== undefined) && <rect className="numbers-band" x={PAD.left} width={width - PAD.left - PAD.right} y={bandTop} height={Math.max(1, bandBottom - bandTop)} style={{fill: look.stroke('band')}}/>}
      <ChartGrid ticks={[{y: y(hi - pad), label: fmt(hi - pad)}, {y: y(lo + pad), label: fmt(lo + pad)}]} left={PAD.left} right={width - PAD.right}/>
      {series.map((s, i) => s.points.length > 1 && <path key={s.label} className="chart-ink zgc-line" d={s.points.map((p, j) => `${j ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')} style={{stroke: look.stroke(i === 0 ? 'a' : 'b'), ...(s.dashed ? {strokeDasharray: '6 5'} : {})}} filter={look.glow}/>)}
      {series.flatMap(s => s.points.map(p => <circle key={`${s.label}-${p.date}-${p.value}`} className="chart-dot" cx={x(p.date)} cy={y(p.value)} r="3.5"/>))}
      <ChartXAxis ticks={[{x: x(first.date), label: formatDate(first.date, {year: false})}, {x: x(last.date), label: formatDate(last.date, {year: false})}]} y={H - 6}/>
    </svg>
    {(series.length > 1 || band) && <ChartLegend items={[...series.map(s => ({label: s.label, kind: s.dashed ? 'dash' as const : 'line' as const})), ...(band ? [{label: 'The range you copied', kind: 'area' as const}] : [])]}/>}
  </div>;
}
