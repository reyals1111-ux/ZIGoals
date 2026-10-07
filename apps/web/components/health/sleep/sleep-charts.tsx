'use client';
import {useState, type ReactNode} from 'react';
import {useChartWidth} from '../../charts/use-chart-width';
import type {DayPoint} from '../../../lib/sleep/engine';
import {clockFromNoon, clockFromMidnight} from '../../../lib/sleep/engine';
import {formatMinutes} from '../../../lib/zone-time';

/**
 * Sleep charts (Session W Part 4), hand-built SVG: one series each, so the title names it; a key under the title names
 * the reference marks (the goal's dashed line, the bedtime window, lighter estimated bars), so no label sits on the data.
 * A missing night is an empty slot (never a zero bar); an estimated night is a lighter, outlined bar and says so in the
 * tip and the table. Hover shows a day's details; the table under each chart holds every value for keyboard and
 * screen-reader readers. Colours validated on the dark surface (bars #6f7ff5, goal #c45bb0).
 */
// Drawn at the width it is shown (measured), so labels keep their real 14 px on every screen.
const H = 180, PAD = {top: 14, right: 10, bottom: 26, left: 44};
const plotH = H - PAD.top - PAD.bottom;
const dayLabel = (date: string, count: number, i: number) => count <= 7 ? new Date(`${date}T12:00:00Z`).toLocaleDateString('en', {weekday: 'short', timeZone: 'UTC'}).slice(0, 2) : i % 5 === 0 || i === count - 1 ? date.slice(8) : '';
const longDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en', {weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC'});
/** A bar with its data end rounded (4 px) and its base square on the baseline. */
const bar = (x: number, w: number, top: number, base: number, r = 4) => { const rr = Math.min(r, w / 2, (base - top) / 2); return `M${x},${base}V${top + rr}Q${x},${top} ${x + rr},${top}H${x + w - rr}Q${x + w},${top} ${x + w},${top + rr}V${base}Z`; };
const capsule = (x: number, w: number, top: number, bottom: number) => { const r = Math.min(4, w / 2, (bottom - top) / 2); return `M${x},${bottom - r}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${bottom - r}Q${x + w},${bottom} ${x + w - r},${bottom}H${x + r}Q${x},${bottom} ${x},${bottom - r}Z`; };

type Key = {kind: 'goal' | 'window' | 'estimated'; label: string};
function Frame({title, summary, children, table, tip, plot, width, keys = []}: {title: string; summary: string; children: ReactNode; table: ReactNode; tip: string | null; plot: React.RefObject<HTMLDivElement | null>; width: number; keys?: Key[]}) {
  return <figure className="sleep-chart">
    <figcaption>{title}</figcaption>
    {keys.length > 0 && <ul className="sleep-key">{keys.map(k => <li key={k.kind}><i className={`sleep-key-${k.kind}`} aria-hidden="true"/>{k.label}</li>)}</ul>}
    <div className="sleep-chart-plot" ref={plot}>
      <svg viewBox={`0 0 ${width} ${H}`} width={width} height={H} role="img" aria-label={summary}>{children}</svg>
      {/* A visual aid for pointer readers; the table holds the same details for everyone. */}
      {tip && <p className="sleep-chart-tip" aria-hidden="true">{tip}</p>}
    </div>
    <details className="sleep-chart-table"><summary>Show as a table</summary>{table}</details>
  </figure>;
}
const tipFor = (p: DayPoint) => p.asleep === null ? `${longDate(p.date)}: no night logged` : `${longDate(p.date)}: ${formatMinutes(p.asleep)} asleep${p.estimated ? ' (estimated)' : ''} · in bed ${formatMinutes(p.inBed!)} · ${clockFromNoon(p.bed!)}–${clockFromMidnight(p.wake!)}${p.quality !== null ? ` · quality ${p.quality}/5` : ''}`;
function Table({points}: {points: DayPoint[]}) {
  return <div className="sleep-table-wrap"><table>
    <thead><tr><th scope="col">Night ending</th><th scope="col">Asleep</th><th scope="col">In bed</th><th scope="col">Bed → wake</th><th scope="col">Quality</th></tr></thead>
    <tbody>{points.map(p => <tr key={p.date}><th scope="row">{longDate(p.date)}</th>{p.asleep === null ? <td colSpan={4}>No night logged</td> : <><td>{formatMinutes(p.asleep)}{p.estimated ? ' (estimated)' : ''}</td><td>{formatMinutes(p.inBed!)}</td><td>{clockFromNoon(p.bed!)} → {clockFromMidnight(p.wake!)}</td><td>{p.quality !== null ? `${p.quality} of 5` : 'Not rated'}</td></>}</tr>)}</tbody>
  </table></div>;
}

/** Time asleep per night, with the goal as a dashed line. */
export function SleepDurationChart({points, goal}: {points: DayPoint[]; goal: number | null}) {
  const [hover, setHover] = useState<number | null>(null), [plot, W] = useChartWidth(), plotW = W - PAD.left - PAD.right;
  const top = Math.max(9 * 60, goal ?? 0, ...points.map(p => p.asleep ?? 0)), max = Math.ceil(top / 120) * 120;
  const y = (m: number) => PAD.top + plotH - m / max * plotH, step = plotW / points.length, w = Math.max(2, step - 2);
  const logged = points.filter(p => p.asleep !== null);
  const summary = logged.length ? `Time asleep, ${points.length} days: ${logged.length} nights logged, from ${formatMinutes(Math.min(...logged.map(p => p.asleep!)))} to ${formatMinutes(Math.max(...logged.map(p => p.asleep!)))}${goal ? `; goal ${formatMinutes(goal)}` : ''}.` : `Time asleep, ${points.length} days: no nights logged yet.`;
  const keys: Key[] = [...(goal !== null ? [{kind: 'goal' as const, label: `Goal ${formatMinutes(goal)}`}] : []), ...(logged.some(p => p.estimated) ? [{kind: 'estimated' as const, label: 'Lighter bar: estimated from time in bed'}] : [])];
  return <Frame title={`Time asleep · last ${points.length} days`} summary={summary} tip={hover === null ? null : tipFor(points[hover]!)} table={<Table points={points}/>} plot={plot} width={W} keys={keys}>
    {Array.from({length: max / 120 + 1}, (_, i) => i * 120).map(m => <g key={m} className="sleep-grid"><line x1={PAD.left} x2={W - PAD.right} y1={y(m)} y2={y(m)}/><text x={PAD.left - 4} y={y(m) + 5} textAnchor="end">{m / 60} h</text></g>)}
    {points.map((p, i) => <g key={p.date}>
      {p.asleep !== null && <path className={p.estimated ? 'sleep-bar estimated' : 'sleep-bar'} d={bar(PAD.left + i * step + 1, w, y(p.asleep), y(0))}/>}
      <text className="sleep-axis" x={PAD.left + i * step + step / 2} y={H - 6} textAnchor="middle">{dayLabel(p.date, points.length, i)}</text>
      <rect className="sleep-hit" x={PAD.left + i * step} y={PAD.top} width={step} height={plotH} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(h => h === i ? null : h)}/>
    </g>)}
    {goal !== null && <g className="sleep-goal"><line x1={PAD.left} x2={W - PAD.right} y1={y(goal)} y2={y(goal)}/></g>}
  </Frame>;
}

/** Bedtime to wake time per night, with the bedtime window (if one is set) as a band. */
export function SleepTimesChart({points, window}: {points: DayPoint[]; window: {from: string; to: string} | null}) {
  const [hover, setHover] = useState<number | null>(null), [plot, W] = useChartWidth(), plotW = W - PAD.left - PAD.right;
  const logged = points.filter(p => p.bed !== null), toNoon = (clock: string) => { const [h, m] = clock.split(':').map(Number); return (h! * 60 + m! + 720) % 1440; };
  const wakes = logged.map(p => p.wake! + 720), beds = logged.map(p => p.bed!), band = window ? [toNoon(window.from), toNoon(window.to)] as const : null;
  const lo = Math.max(0, Math.floor((Math.min(...beds, band?.[0] ?? 1440, 600) - 60) / 60) * 60), hi = Math.min(1440 * 1.5, Math.ceil((Math.max(...wakes, band?.[1] ?? 0, 1140) + 60) / 60) * 60);
  const y = (m: number) => PAD.top + (m - lo) / (hi - lo) * plotH, step = plotW / points.length, w = Math.max(2, Math.min(14, step - 4));
  const summary = logged.length ? `Bedtimes and wake times, ${points.length} days: ${logged.length} nights logged.${window ? ` Bedtime window ${window.from} to ${window.to}.` : ''}` : `Bedtimes and wake times: no nights logged yet.`;
  return <Frame title={`Bed and wake times · last ${points.length} days`} summary={summary} tip={hover === null ? null : tipFor(points[hover]!)} table={<Table points={points}/>} plot={plot} width={W} keys={window ? [{kind: 'window', label: `Bedtime window ${window.from}–${window.to}`}] : []}>
    {Array.from({length: Math.floor((hi - lo) / 180) + 1}, (_, i) => lo + i * 180).map(m => <g key={m} className="sleep-grid"><line x1={PAD.left} x2={W - PAD.right} y1={y(m)} y2={y(m)}/><text x={PAD.left - 4} y={y(m) + 5} textAnchor="end">{clockFromNoon(m % 1440)}</text></g>)}
    {band && band[1] > band[0] && <g className="sleep-window"><rect x={PAD.left} width={plotW} y={y(band[0])} height={y(band[1]) - y(band[0])}/></g>}
    {points.map((p, i) => <g key={p.date}>
      {p.bed !== null && <path className="sleep-bar" d={capsule(PAD.left + i * step + (step - w) / 2, w, y(p.bed), y(p.wake! + 720))}/>}
      <text className="sleep-axis" x={PAD.left + i * step + step / 2} y={H - 6} textAnchor="middle">{dayLabel(p.date, points.length, i)}</text>
      <rect className="sleep-hit" x={PAD.left + i * step} y={PAD.top} width={step} height={plotH} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(h => h === i ? null : h)}/>
    </g>)}
  </Frame>;
}

/** Your own quality ratings (1–5); a night without a rating breaks the line. */
export function SleepQualityChart({points}: {points: DayPoint[]}) {
  const [hover, setHover] = useState<number | null>(null), [plot, W] = useChartWidth(), plotW = W - PAD.left - PAD.right;
  const rated = points.map((p, i) => ({p, i})).filter(({p}) => p.quality !== null);
  const y = (q: number) => PAD.top + plotH - (q - 1) / 4 * plotH, step = plotW / points.length, x = (i: number) => PAD.left + i * step + step / 2;
  const segments: string[] = [];
  rated.forEach(({p, i}, k) => { const prev = rated[k - 1]; segments.push(`${prev && prev.i === i - 1 ? 'L' : 'M'}${x(i)},${y(p.quality!)}`); });
  const summary = rated.length ? `Your sleep quality ratings, ${points.length} days: ${rated.length} nights rated, from ${Math.min(...rated.map(r => r.p.quality!))} to ${Math.max(...rated.map(r => r.p.quality!))} of 5.` : 'Sleep quality: no nights rated yet.';
  return <Frame title={`Your quality ratings · last ${points.length} days`} summary={summary} tip={hover === null ? null : tipFor(points[hover]!)} table={<Table points={points}/>} plot={plot} width={W}>
    {[1, 2, 3, 4, 5].map(q => <g key={q} className="sleep-grid"><line x1={PAD.left} x2={W - PAD.right} y1={y(q)} y2={y(q)}/><text x={PAD.left - 4} y={y(q) + 5} textAnchor="end">{q}</text></g>)}
    {segments.length > 0 && <path className="sleep-line" d={segments.join('')}/>}
    {rated.map(({p, i}) => <circle key={p.date} className="sleep-dot" cx={x(i)} cy={y(p.quality!)} r="4"/>)}
    {points.map((p, i) => <g key={p.date}><text className="sleep-axis" x={x(i)} y={H - 6} textAnchor="middle">{dayLabel(p.date, points.length, i)}</text><rect className="sleep-hit" x={PAD.left + i * step} y={PAD.top} width={step} height={plotH} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(h => h === i ? null : h)}/></g>)}
  </Frame>;
}
