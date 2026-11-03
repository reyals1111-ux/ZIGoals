'use client';
import {useState} from 'react';
import {useChartWidth} from '../charts/use-chart-width';
import {ChartGrid, ChartXAxis} from '../charts/chart-kit';
import {ChartLookDefs, useChartLook} from '../charts/chart-defs';
import {useDeviceRecord} from '../ai/use-device-record';
import {MEASUREMENTS_CUSTOM} from '../../lib/health-aa/measurements-custom';
import {trendRows, type TrendPoint, type TrendRow} from '../../lib/measurement-trends/trends';
import type {HealthData} from '../../lib/health';
import {dailyData} from '../../lib/health-daily';
import {formatDate, formatNumber} from '../../lib/visual-format';
import './measurement-trends.css';
import {ArtNote} from '../illustrations/art-note';

/**
 * Session AK (F5b): trends over the existing body measurements (Health → Measurements, the "Trends and weekly change"
 * fold): each kind's latest reading, its change over the last week (from the latest reading at least seven days before),
 * the average change per week over eight weeks, and a chart of the chosen kind. Units follow Journal settings (kg with cm,
 * lb with in). A description of the readings, not a forecast and not advice. Nothing new is stored.
 */
const one = (v: number) => formatNumber(v, {maximumFractionDigits: 1});
const signed = (v: number) => { const r = Math.round(v * 10) / 10; return r === 0 ? '0' : `${r > 0 ? '+' : '−'}${one(Math.abs(r))}`; };
const H = 150, PAD = {top: 12, right: 10, bottom: 24, left: 44};
function TrendChart({row}: {row: TrendRow}) {
  const [plot, width] = useChartWidth(320, 240), look = useChartLook(), points: TrendPoint[] = row.points;
  if (points.length < 2) return <div ref={plot}><p className="fine">One reading of {row.title.toLowerCase()} so far; a second draws the line.</p></div>;
  const vals = points.map(p => p.value), lo = Math.min(...vals), hi = Math.max(...vals), span = Math.max(hi - lo, 0.5);
  const t0 = Date.parse(`${points[0]!.date}T12:00:00Z`), t1 = Date.parse(`${points.at(-1)!.date}T12:00:00Z`), tSpan = Math.max(t1 - t0, 1);
  const x = (p: TrendPoint) => PAD.left + (Date.parse(`${p.date}T12:00:00Z`) - t0) / tSpan * (width - PAD.left - PAD.right), y = (v: number) => PAD.top + (1 - (v - lo) / span) * (H - PAD.top - PAD.bottom);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(p).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  return <div className="measure-trend-chart" ref={plot}>
    <svg className="zg-chart" data-pillar="health" viewBox={`0 0 ${width} ${H}`} width={width} height={H} role="img" aria-label={`${row.title}: ${points.length} readings from ${one(points[0]!.value)} ${row.unit} on ${formatDate(points[0]!.date)} to ${one(points.at(-1)!.value)} ${row.unit} on ${formatDate(points.at(-1)!.date)}`}>
      <ChartLookDefs id={look.id} width={width} height={H} />
      <ChartGrid ticks={[{y: y(hi), label: one(hi)}, {y: y(lo), label: one(lo)}]} left={PAD.left} right={width - PAD.right} />
      <path className="chart-ink zgc-line" d={d} style={{stroke: look.stroke('a')}} filter={look.glow} />
      {points.map(p => <circle key={p.date} className="chart-dot" cx={x(p)} cy={y(p.value)} r="3.5" />)}
      <ChartXAxis ticks={[{x: x(points[0]!), label: formatDate(points[0]!.date, {year: false})}, {x: x(points.at(-1)!), label: formatDate(points.at(-1)!.date, {year: false})}]} y={H - 6} />
    </svg>
    <details className="health-trend-table"><summary>Show as a table</summary><table><caption>{row.title} readings ({row.unit})</caption><tbody>{points.map(p => <tr key={p.date}><td>{formatDate(p.date)}</td><td>{one(p.value)} {row.unit}</td></tr>)}</tbody></table></details>
  </div>;
}
function weekText(row: TrendRow) {
  if (!row.week) return 'Week: not known yet (needs a reading a week apart)';
  if (row.week.days <= 10) return `This week: ${signed(row.week.change)} ${row.unit}`;
  return `About ${signed(row.week.perWeek)} ${row.unit} a week since ${formatDate(row.week.from, {year: false})}`;
}
export function MeasurementTrends({data}: {data: HealthData}) {
  const custom = useDeviceRecord(MEASUREMENTS_CUSTOM), weight = dailyData(data).preferences.weightUnit === 'lb' ? 'lb' : 'kg';
  const rows = trendRows(data, custom.loaded && !custom.unreadable ? custom.data : null, weight);
  const [picked, setPicked] = useState(''), row = rows.find(r => r.id === picked) ?? rows.find(r => r.id !== 'weight') ?? rows[0];
  if (!rows.length) return <div className="measure-trends measure-trends-empty"><ArtNote pillar="health"><p className="health-empty-inline">No measurements yet. Add a waist, hips, chest, arms or thigh reading above (or your own kind, such as neck) once a week, at the same time of day. After a week you see the change; after a few weeks, the trend.</p></ArtNote></div>;
  return <div className="measure-trends">
    <p className="fine">In {weight === 'lb' ? 'pounds and inches' : 'kilograms and centimetres'}, as in Journal settings. <span className="health-estimate-tag">a description of your readings, not a forecast</span></p>
    <ul className="measure-trend-list">{rows.map(r => <li key={r.id}>
      <div><strong>{r.title}</strong><small>{r.latest ? `${one(r.latest.value)} ${r.unit} · ${formatDate(r.latest.date)}` : ''}</small></div>
      <div><small>{weekText(r)}</small><small>{r.perWeek === null ? 'Trend: needs three readings over two weeks' : `8-week trend: ${signed(r.perWeek)} ${r.unit} a week`}</small></div>
    </li>)}</ul>
    {row && <>
      <label className="field"><span>Chart</span><select value={row.id} onChange={e => setPicked(e.target.value)}>{rows.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
      <TrendChart row={row} />
    </>}
    <p className="fine">Weight here is the timed readings of this page; daily weigh-ins have their own trend in Weight. A day with no reading is unknown, never zero.</p>
  </div>;
}
