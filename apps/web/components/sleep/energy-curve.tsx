'use client';
import {useMemo} from 'react';
import {useChartWidth} from '../charts/use-chart-width';
import {SPAN, curveSummary, curveWhy, energyCurve, nowOn} from '../../lib/energy-curve/curve';
import {clockFromMidnight} from '../../lib/sleep/engine';
import type {Sleep} from '../../lib/sleep/schema';
import {formatMinutes, wallClock} from '../../lib/zone-time';
import {formatClock} from '../../lib/visual-format';
import './energy-curve.css';

/**
 * Session AK (lane S, item 9): Health → Sleep → "Your energy today", an estimated alertness curve from the person's sleep
 * times (lib/energy-curve/curve.ts). One line up top (the good focus window), one curve with the focus window, the likely
 * dip and the bedtime window marked and named in a key, the same three in words under it, and a Why?. Nothing stored.
 */
const H = 190, PAD = {top: 22, right: 12, bottom: 28, left: 12};
const clock = (m: number) => formatClock(clockFromMidnight(Math.round(m)));
export default function EnergyCurve({sleep, today, now, zone}: {sleep: Sleep; today: string; now: number; zone: string}) {
  const curve = useMemo(() => energyCurve(sleep, today), [sleep, today]), [plot, W] = useChartWidth();
  if (!curve) return <p className="energy-curve-empty">Log a night, or tap &ldquo;I&rsquo;m going to bed&rdquo; tonight, and an estimated energy curve for your day shows here, with a good focus window and a likely dip.</p>;
  const plotW = W - PAD.left - PAD.right, plotH = H - PAD.top - PAD.bottom, start = curve.wake;
  const x = (m: number) => PAD.left + (Math.min(Math.max(m, start), start + SPAN) - start) / SPAN * plotW, y = (level: number) => PAD.top + (1 - level) * plotH;
  const line = curve.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.at).toFixed(1)},${y(p.level).toFixed(1)}`).join('');
  const area = `${line}L${x(start + SPAN).toFixed(1)},${PAD.top + plotH}L${x(start).toFixed(1)},${PAD.top + plotH}Z`;
  const here = nowOn(curve, wallClock(now, zone).minutes);
  const bands = [{kind: 'focus', label: 'Focus', ...curve.focus}, {kind: 'dip', label: 'Dip', ...curve.dip}, {kind: 'bed', label: 'Bedtime', ...curve.bedtime}].filter(b => b.to > start && b.from < start + SPAN);
  const ticks = Array.from({length: 7}, (_, i) => start + i * 180);
  const summary = curveSummary(curve, clock);
  return <div className="energy-curve">
    <p className="energy-curve-lead"><span className="eyebrow">A good focus window</span><strong>{clock(curve.focus.from)}–{clock(curve.focus.to)}</strong></p>
    <p className="energy-curve-meaning">An estimate from your sleep times, not a measurement.{curve.short ? ' After a shorter night the window is an hour shorter.' : ''}</p>
    <ul className="energy-curve-key" aria-hidden="true"><li><i className="is-focus"/>Good focus window</li><li><i className="is-dip"/>Likely dip</li><li><i className="is-bed"/>Suggested bedtime</li>{here !== null && <li><i className="is-now"/>Now</li>}</ul>
    <div className="energy-curve-plot" ref={plot}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={summary}>
        {bands.map(b => <g key={b.kind} className={`energy-curve-band is-${b.kind}`}><rect x={x(b.from)} y={PAD.top} width={Math.max(2, x(b.to) - x(b.from))} height={plotH} rx={6}/><text x={x(b.from) + 4} y={PAD.top - 6}>{b.label}</text></g>)}
        <path className="energy-curve-area" d={area}/>
        <path className="energy-curve-line" d={line}/>
        {here !== null && <line className="energy-curve-now" x1={x(here)} x2={x(here)} y1={PAD.top} y2={PAD.top + plotH}/>}
        <line className="energy-curve-base" x1={PAD.left} x2={PAD.left + plotW} y1={PAD.top + plotH} y2={PAD.top + plotH}/>
        {ticks.map((t, i) => <text key={t} className="energy-curve-tick" x={x(t)} y={H - 8} textAnchor={i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'}>{i % 2 === 0 || W > 420 ? clock(t) : ''}</text>)}
      </svg>
    </div>
    <dl className="energy-curve-list">
      <div><dt>Good focus window</dt><dd>{clock(curve.focus.from)}–{clock(curve.focus.to)}</dd></div>
      <div><dt>Likely dip</dt><dd>{clock(curve.dip.from)}–{clock(curve.dip.to)}</dd></div>
      <div><dt>Suggested bedtime</dt><dd>{clock(curve.bedtime.from)}–{clock(curve.bedtime.to)}</dd><small>For {formatMinutes(curve.need)} of sleep{curve.needFrom === 'default' ? ' (a common figure; set your own goal below)' : ', your goal'} before your usual wake time.</small></div>
    </dl>
    <details className="energy-curve-why"><summary>Why?</summary><p className="fine">{curveWhy(curve, clock, formatMinutes)}</p></details>
  </div>;
}
