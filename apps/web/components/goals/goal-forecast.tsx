'use client';
import {useId} from 'react';
import {useChartWidth} from '../charts/use-chart-width';
import {forecastWords, type Forecast, type ForecastPoint, addDays, daysBetween} from '../../lib/goal-forecast';
import {formatDay} from './format';

/**
 * G1 on the goal page: the pace forecast in words ("At this pace: about 14 March", always labelled an estimate) and a
 * small chart: the recorded progress, a dashed line from today to the estimated day, and a soft band from the earliest
 * to the latest day. The numbers behind the chart are in a table under "Show the numbers". Static (no motion).
 */
export function GoalForecastCard({forecast, points, current, target, today, unit, note}: {forecast: Forecast; points: readonly ForecastPoint[]; current: number; target: number; today: string; unit: (value: number) => string; note?: string}) {
  const words = forecastWords(forecast, formatDay);
  return <section className="panel goal-forecast" aria-labelledby="goal-forecast-title" data-state={forecast.state}>
    <p className="eyebrow">Pace forecast · an estimate</p>
    <h2 id="goal-forecast-title">{words.headline}</h2>
    <p className="goal-forecast-detail">{words.detail}</p>
    {note && <p className="fine">{note}</p>}
    {points.length >= 2 && target > 0 && <ForecastChart forecast={forecast} points={points} current={current} target={target} today={today} unit={unit} />}
    {forecast.state === 'estimate' && forecast.perDay !== undefined && <p className="fine">Your recorded pace: about {unit(forecast.perDay * 30)} every 30 days, from {forecast.points} records over {forecast.spanDays} days. Growth is not assumed.</p>}
  </section>;
}

function ForecastChart({forecast, points, current, target, today, unit}: {forecast: Forecast; points: readonly ForecastPoint[]; current: number; target: number; today: string; unit: (value: number) => string}) {
  // Drawn at its measured width, so its 14 px labels stay 14 px on every screen (components/charts/use-chart-width.ts).
  const [box, width] = useChartWidth(600, 260), id = useId(), W = width, H = 200, padL = 8, padR = 8, padT = 22, padB = 26;
  const first = points[0]!.day, end = forecast.state === 'estimate' ? (forecast.latest ?? addDays(forecast.date!, Math.max(14, Math.round(daysBetween(today, forecast.date!) * 0.4)))) : today;
  const span = Math.max(1, daysBetween(first, end));
  const maxY = Math.max(target, current, ...points.map(p => p.value)) * 1.06, minY = Math.min(0, ...points.map(p => p.value));
  const x = (day: string) => padL + (daysBetween(first, day) / span) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - minY) / (maxY - minY || 1)) * (H - padT - padB);
  const recorded = points.map(p => `${x(p.day).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const band = forecast.state === 'estimate' ? `${x(today)},${y(current)} ${x(forecast.earliest!)},${y(target)} ${x(end)},${y(target)} ${forecast.latest ? `${x(forecast.latest)},${y(target)}` : `${x(end)},${y(current + (target - current) * 0.55)}`}` : '';
  const label = forecast.state === 'estimate' ? `Recorded progress from ${formatDay(first)} to today, ${unit(current)} of ${unit(target)}; at this pace about ${formatDay(forecast.date!)}.` : `Recorded progress from ${formatDay(first)} to today, ${unit(current)} of ${unit(target)}.`;
  return <figure className="goal-forecast-chart" ref={box}>
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label}>
      <defs><linearGradient id={`${id}-line`} x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#6fe6f6" /><stop offset=".55" stopColor="#8fa6ff" /><stop offset="1" stopColor="#f08bd6" /></linearGradient></defs>
      <line className="goal-forecast-target" x1={padL} x2={W - padR} y1={y(target)} y2={y(target)} />
      <text className="goal-forecast-axis" x={W - padR} y={y(target) - 5} textAnchor="end">Target {unit(target)}</text>
      {band && <polygon className="goal-forecast-band" points={band} />}
      <polyline className="goal-forecast-recorded" points={recorded} stroke={`url(#${id}-line)`} />
      {forecast.state === 'estimate' && <line className="goal-forecast-projection" x1={x(today)} y1={y(current)} x2={x(forecast.date!)} y2={y(target)} />}
      <circle className="goal-forecast-today" cx={x(today)} cy={y(current)} r="4.5" />
      {forecast.state === 'estimate' && <circle className="goal-forecast-date" cx={x(forecast.date!)} cy={y(target)} r="4.5" />}
      <text className="goal-forecast-axis" x={padL} y={H - 6}>{formatDay(first)}</text>
      {x(today) - padL > 110 && <text className="goal-forecast-axis" x={x(today)} y={H - 6} textAnchor="middle">Today</text>}
      {forecast.state === 'estimate' && x(forecast.date!) - x(today) > 150 && x(today) - padL > 110 && <text className="goal-forecast-axis" x={Math.min(W - padR, x(forecast.date!))} y={H - 6} textAnchor="end">{formatDay(forecast.date!)}</text>}
    </svg>
    <figcaption className="goal-forecast-legend"><span><i className="is-recorded" />Recorded</span>{forecast.state === 'estimate' && <><span><i className="is-projection" />At this pace</span><span><i className="is-band" />Earliest to latest</span></>}</figcaption>
    <details className="goal-forecast-numbers"><summary>Show the numbers</summary>
      <table><caption>Recorded progress</caption><thead><tr><th scope="col">Day</th><th scope="col">Counted</th></tr></thead><tbody>{points.map(p => <tr key={p.day}><td>{formatDay(p.day)}</td><td>{unit(p.value)}</td></tr>)}<tr><td>Today</td><td>{unit(current)}</td></tr></tbody></table>
    </details>
  </figure>;
}
