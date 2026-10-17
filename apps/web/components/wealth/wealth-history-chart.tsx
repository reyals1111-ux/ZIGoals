'use client';
import {useId, useMemo, useState} from 'react';
import type {WealthHistory} from '../../lib/wealth';
import {wealthMoney} from '../platform/wealth-money';
import {formatDate, formatDateTime, formatNumber} from '../../lib/visual-format';
import {useEntrance} from '../use-entrance';
import {useChartWidth} from '../charts/use-chart-width';
import {ChartGrid, ChartLegend, ChartXAxis} from '../charts/chart-kit';
import './wealth-history-chart.css';
import {ShowcaseTag} from '../ui/showcase-tag';

const CLASS_COLORS: Record<string, string> = {Crypto: '#23eaff', Stablecoins: '#5effd4', Stocks: '#459dff', ETFs: '#9273ff', 'Precious Metals': '#ffd27a', Cash: '#7bddff', Property: '#f06dff', Custom: '#ff74be', Other: '#a9c9ff'};
const RANGES = [['1M', 31], ['3M', 92], ['1Y', 366], ['All', Infinity]] as const;
const H = 240, L = 64, R = 16, T = 14, B = 34;
/** An axis value without its currency and cents, grouped (the readout and the table carry the exact figures). */
const compactMoney = (v: bigint) => formatNumber(Number(v) / 100, {notation: 'compact', maximumFractionDigits: 1});
// Session AB-Design Phase 2 closing pass: the readout writes money as the rest of Wealth does ($559,423.20, not 559,423.2 USD).
const money = (value: string, currency: string) => wealthMoney(BigInt(value), currency);

/**
 * Session AB-Design (owner request 26): "Your wealth over time" as a detailed, interactive chart — the recorded total
 * as a line, the same total split by asset class as stacked areas in the palette, a tooltip on hover, touch or keyboard
 * (every point is focusable), range chips, a legend, and the exact table. Values are the recorded observations; the
 * lines and areas are visual guides between them, never added data. The draw plays once (reduced motion: none).
 */
export function WealthHistoryChart({history, showcase}: {history: WealthHistory; showcase: boolean}) {
  const id = useId(), [range, setRange] = useState<(typeof RANGES)[number][0]>('All'), [active, setActive] = useState<number | null>(null);
  const ref = useEntrance<HTMLElement>(`wealth-history:${history.currency}`, history.points.length > 1);
  // Phase 2, Part 4: drawn at its measured width, so the axis labels stay a real 14 px on every screen (chart-kit).
  const [plot, W] = useChartWidth(640, 280);
  const all = useMemo(() => history.points.filter(p => Number.isFinite(Date.parse(p.at)) && /^-?\d+$/.test(p.value)).sort((a, b) => Date.parse(a.at) - Date.parse(b.at)), [history.points]);
  const days = RANGES.find(r => r[0] === range)![1];
  const end = all.length ? Date.parse(all.at(-1)!.at) : 0;
  const points = days === Infinity ? all : all.filter(p => end - Date.parse(p.at) <= days * 86400000);
  const classes = useMemo(() => { const seen = new Map<string, bigint>(); for (const p of points) for (const [c, v] of Object.entries(p.classes ?? {})) seen.set(c, (seen.get(c) ?? 0n) + BigInt(v)); return [...seen.entries()].sort((a, b) => Number(b[1] - a[1])).map(([c]) => c); }, [points]);
  if (points.length < 2) return <p className="fine">{showcase && <ShowcaseTag/>}{showcase ? 'Fictional dated portfolio observations; two on different days draw the chart.' : 'Two valid observations on different days draw the chart.'}</p>;
  const times = points.map(p => Date.parse(p.at)), start = times[0]!, last = times.at(-1)!;
  const values = points.map(p => BigInt(p.value)), lo = values.reduce((a, b) => a < b ? a : b), hi = values.reduce((a, b) => a > b ? a : b);
  const min = lo < 0n ? lo : 0n, pad = (hi - min) / 12n || 1n, max = hi + pad, span = max - min || 1n;
  const x = (t: number) => L + (last === start ? (W - L - R) / 2 : (t - start) / (last - start) * (W - L - R));
  const y = (v: bigint) => T + (H - T - B) - Number((v - min) * 10000n / span) / 10000 * (H - T - B);
  const stacked = classes.map((c, ci) => { const upper = points.map(p => { const own = BigInt(p.classes?.[c] ?? '0'); return [p, own] as const; }); return {c, color: CLASS_COLORS[c] ?? '#a9c9ff', ci, upper}; });
  // Areas: for each class, the band between the sum of the classes below it and that sum plus its own value.
  const bands = (() => { const below = points.map(() => 0n); return stacked.map(s => { const top: bigint[] = [], bottom: bigint[] = []; s.upper.forEach(([, own], i) => { bottom.push(below[i]!); below[i] = below[i]! + own; top.push(below[i]!); }); return {...s, top, bottom}; }); })();
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(times[i]!).toFixed(1)} ${y(BigInt(p.value)).toFixed(1)}`).join(' ');
  const ticks = [0, .25, .5, .75, 1].map(f => { const v = min + (max - min) * BigInt(Math.round(f * 100)) / 100n; return {v, yy: y(v)}; });
  const dates = [start, start + (last - start) / 2, last];
  const shown = active ?? points.length - 1, p = points[shown]!;
  const change = BigInt(points.at(-1)!.value) - BigInt(points[0]!.value);
  return <figure ref={ref} className="wealth-history-chart" aria-label={`${history.currency} recorded tracked wealth`}>
    <div className="wealth-history-tools" role="group" aria-label="Range">{RANGES.map(([label]) => <button key={label} type="button" className="quiet" aria-pressed={range === label} onClick={() => { setRange(label); setActive(null); }}>{label}</button>)}</div>
    <div className="wealth-history-readout" aria-live="polite"><strong>{money(p.value, history.currency)}</strong><span>{formatDateTime(p.at)}{active === null ? ' · latest' : ''}</span><span className="wealth-history-change" data-direction={change > 0n ? 'up' : change < 0n ? 'down' : undefined}>{change >= 0n ? '+' : ''}{money(change.toString(), history.currency)} over this range</span></div>
    <div className="wealth-history-plot" ref={plot}><svg className="wealth-history-svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`${points.length} recorded values from ${formatDateTime(points[0]!.at)} to ${formatDateTime(points.at(-1)!.at)}`} onMouseLeave={() => setActive(null)}>
      <defs>{bands.map(b => <linearGradient key={b.c} id={`${id}-${b.ci}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={b.color} stopOpacity=".55"/><stop offset="1" stopColor={b.color} stopOpacity=".06"/></linearGradient>)}<linearGradient id={`${id}-line`} x1="0" x2="1"><stop offset="0" stopColor="#23eaff"/><stop offset=".5" stopColor="#9273ff"/><stop offset="1" stopColor="#f06dff"/></linearGradient></defs>
      <ChartGrid ticks={ticks.map(t => ({y: t.yy, label: compactMoney(t.v)}))} left={L} right={W - R}/>
      {bands.map(b => <path key={b.c} className="wealth-history-area" fill={`url(#${id}-${b.ci})`} d={`${points.map((_, i) => `${i ? 'L' : 'M'}${x(times[i]!).toFixed(1)} ${y(b.top[i]!).toFixed(1)}`).join(' ')} ${[...points.keys()].reverse().map(i => `L${x(times[i]!).toFixed(1)} ${y(b.bottom[i]!).toFixed(1)}`).join(' ')} Z`}/>)}
      <path className="wealth-history-line" d={line} fill="none" stroke={`url(#${id}-line)`} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" pathLength={1}/>
      {points.map((pt, i) => <g key={pt.at} className="wealth-history-point" data-active={i === shown || undefined} tabIndex={0} role="button" aria-label={`${formatDateTime(pt.at)}: ${money(pt.value, history.currency)}`} onFocus={() => setActive(i)} onMouseEnter={() => setActive(i)} onClick={() => setActive(i)}><circle cx={x(times[i]!)} cy={y(BigInt(pt.value))} r={i === shown ? 6 : 3.5}/><rect className="wealth-history-hit" x={x(times[i]!) - 14} y={T} width="28" height={H - T - B} fill="transparent"/></g>)}
      {active !== null && <line className="wealth-history-cursor" x1={x(times[shown]!)} x2={x(times[shown]!)} y1={T} y2={H - B}/>}
      <ChartXAxis ticks={(W < 420 ? [dates[0]!, dates[2]!] : dates).map(d => ({x: x(d), label: formatDate(d)}))} y={H - 10}/>
    </svg></div>
    <ChartLegend className="wealth-history-legend" items={[{label: 'Recorded total'}, ...bands.map(b => ({label: b.c, kind: 'area' as const, color: b.color}))]}/>
    <details><summary>View exact history</summary><div className="evidence-table-wrap"><table><caption>Original recorded values · {history.currency}</caption><thead><tr><th>Date</th><th>Amount ({history.currency})</th>{classes.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{points.map(pt => <tr key={pt.at}><td><time dateTime={pt.at}>{formatDateTime(pt.at)}</time></td><td>{money(pt.value, history.currency)}</td>{classes.map(c => <td key={c}>{pt.classes?.[c] ? money(pt.classes[c]!, history.currency) : '—'}</td>)}</tr>)}</tbody></table></div></details>
  </figure>;
}
