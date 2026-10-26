'use client';
import {useState} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {useChartWidth} from '../charts/use-chart-width';
import {ChartDefs, ChartGrid, ChartLegend, ChartTip, ChartXAxis} from '../charts/chart-kit';
import {weightTrend} from '../../lib/health-aa/trend';
import type {HealthData} from '../../lib/health';
import {weightChangeText, weightText, type WeightUnit} from '../../lib/health-units';
import {formatDate} from '../../lib/visual-format';
import './health-aa.css';

const H = 200, PAD = {top: 16, right: 12, bottom: 28, left: 52};
/** A trend reads to 100 g (one decimal in kg): the line is an estimate, and a third decimal would claim more than it knows. */
const tenths = (g: number) => Math.round(g / 100) * 100;
/**
 * N2: the weight trend card: a smoothed line (EWMA) over the daily readings, the weekly rate and the goal line, in the
 * person's unit; a table under the chart for keyboard and screen-reader readers. Readings are dots, never joined, so a
 * day without one shows as nothing.
 */
export function WeightTrendCard({data, today, unit}: {data: HealthData; today: string; unit: WeightUnit}) {
  const t = weightTrend(data, today, 42), [plot, width] = useChartWidth(360), [tip, setTip] = useState<string | null>(null);
  const values = t.points.flatMap(p => [p.grams, p.trend].filter((v): v is number => v !== null)), goal = t.goalGrams;
  const all = goal !== null ? [...values, goal] : values;
  const lo = all.length ? Math.min(...all) - 300 : 0, hi = all.length ? Math.max(...all) + 300 : 1;
  const x = (i: number) => PAD.left + (i / (t.points.length - 1)) * (width - PAD.left - PAD.right), y = (g: number) => PAD.top + (1 - (g - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  const line = t.points.map((p, i) => p.trend === null ? null : `${i === 0 || t.points[i - 1]!.trend === null ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.trend).toFixed(1)}`).filter(Boolean).join(' ');
  const rate = t.weeklyRate === null ? null : weightChangeText(tenths(t.weeklyRate), unit);
  const summary = t.latestTrend === null ? 'No readings in the last six weeks.' : `Trend ${weightText(tenths(t.latestTrend), unit)}${rate ? `, ${rate} a week` : ''}${goal !== null ? `, goal ${weightText(goal, unit)}` : ''}; ${t.readings} readings in 42 days.`;
  return <section id="health-weight-trend" className="panel health-aa-card health-trend-card" aria-labelledby="weight-trend-title">
    <p className="eyebrow">Six weeks</p><h2 id="weight-trend-title"><NebulaFlow identity="weight-trend-title">Weight trend</NebulaFlow></h2>
    {t.latestTrend === null ? <p className="health-empty-inline">Two or three readings a week draw the line; the first one starts it. <span className="health-estimate-tag">an estimate</span></p> : <>
      <p className="health-big">{weightText(tenths(t.latestTrend), unit)}<small>trend today{rate ? ` · ${rate}/week` : ''}</small></p>
      {/* Session AH (TR10): the latest reading beside the smoothed trend, so the two numbers are never mistaken for each other. */}
      {t.latestReading && <p className="fine health-trend-latest">Latest reading {weightText(t.latestReading.grams, unit)} · {formatDate(t.latestReading.date, {year: false})}. The trend smooths day-to-day swings.</p>}
      <div className="health-trend-chart" ref={plot}>
        <svg viewBox={`0 0 ${width} ${H}`} width={width} height={H} role="img" aria-label={summary} onMouseLeave={() => setTip(null)}>
          <ChartDefs id="weight-trend" pillar="health"/>
          <ChartGrid ticks={[0, 0.5, 1].map(f => { const g = lo + f * (hi - lo); return {y: y(g), label: weightText(Math.round(g / 100) * 100, unit).replace(/\s.*$/, '')}; })} left={PAD.left} right={width - PAD.right}/>
          {goal !== null && <line className="chart-guide" x1={PAD.left} x2={width - PAD.right} y1={y(goal)} y2={y(goal)} />}
          <path className="chart-ink" d={line} stroke="url(#weight-trend-ink)" />
          {t.points.map((p, i) => p.grams === null ? null : <circle key={p.date} className="chart-dot" cx={x(i)} cy={y(p.grams)} r="4" fill="#8ab9ff" onMouseEnter={() => setTip(`${formatDate(p.date, {year: false})}: ${weightText(p.grams!, unit)} (trend ${weightText(tenths(p.trend!), unit)})`)} />)}
          <ChartXAxis ticks={t.points.flatMap((p, i) => i % 7 === 0 || i === t.points.length - 1 ? [{x: x(i), label: p.date.slice(5)}] : [])} y={H - 8} edge={false}/>
        </svg>
        {tip && <ChartTip>{tip}</ChartTip>}
        <ChartLegend className="health-trend-key" items={[{label: 'Trend (smoothed)'}, {label: 'A reading', kind: 'dot'}, ...(goal !== null ? [{label: 'Goal', kind: 'dash' as const}] : [])]}/>
      </div>
      <details className="health-trend-table"><summary>Show as a table</summary><table><thead><tr><th>Day</th><th>Reading</th><th>Trend</th></tr></thead><tbody>{t.points.filter(p => p.grams !== null).map(p => <tr key={p.date}><td>{formatDate(p.date)}</td><td>{weightText(p.grams!, unit)}</td><td>{p.trend === null ? '—' : weightText(tenths(p.trend), unit)}</td></tr>)}</tbody></table></details>
      <p className="fine">The line moves a tenth of the way to each new reading, so one unusual morning barely bends it. <span className="health-estimate-tag">an estimate, not medical advice</span></p>
    </>}
  </section>;
}
