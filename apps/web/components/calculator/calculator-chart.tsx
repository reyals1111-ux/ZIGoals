'use client';
import {useId, useState, type KeyboardEvent, type PointerEvent} from 'react';
import {useChartWidth} from '../charts/use-chart-width';
import {ChartGrid, ChartLegend, ChartXAxis} from '../charts/chart-kit';
import {formatMoney, formatNumber} from '../../lib/visual-format';
import type {CompoundResult, Milestone} from '../../lib/compound/engine';

/**
 * The calculator's chart (Session AA-Cloud Part 3, owner edit 5): what was put in and what it grew by, stacked year by
 * year, with the 10k / 100k / 1M markers where the plan passes them and the chosen "what if" plans as lines over it,
 * each in its own nebula tone and dash. Pointer, touch and keyboard (arrows, Home, End) pick a year; the tooltip says
 * that year's figures. The numbers are also in the year-by-year table under the chart. Nothing moves on its own.
 */
export type ChartLine = {id: string; label: string; tone: string; dash: string; offset: number; result: CompoundResult};
type Point = {x: number; balance: number; contributed: number};

const series = (result: CompoundResult, start: number, offset = 0): Point[] =>
  [{x: offset, balance: start, contributed: start}, ...result.rows.map(r => ({x: r.year + offset, balance: Number(r.balance), contributed: Number(r.contributed)}))];
const compact = (n: number, currency: string) => formatNumber(n, {style: 'currency', currency, currencyDisplay: 'narrowSymbol', notation: 'compact', maximumFractionDigits: n >= 1000 ? 1 : 0});
const shortThreshold = (n: number) => n >= 1_000_000 ? `${n / 1_000_000}M` : `${n / 1000}k`;

export function CalculatorChart({result, start, currency, lines}: {result: CompoundResult; start: string; currency: 'USD' | 'EUR'; lines: readonly ChartLine[]}) {
  const [box, width] = useChartWidth(720, 280), id = useId();
  const phone = width < 520, W = width, H = phone ? 250 : 320, padL = phone ? 58 : 68, padR = 14, padT = 30, padB = 34;
  const main = series(result, Number(start)), others = lines.map(l => ({...l, points: series(l.result, Number(start), l.offset)}));
  const minX = Math.min(0, ...others.map(l => l.offset)), maxX = Math.max(result.rows.length, ...others.map(l => l.result.rows.length + l.offset));
  const values = [...main.map(p => p.balance), ...main.map(p => p.contributed), ...others.flatMap(l => l.points.map(p => p.balance))];
  const top = niceCeil(Math.max(1, ...values)), bottom = Math.min(0, ...values);
  const x = (v: number) => padL + ((v - minX) / Math.max(1, maxX - minX)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - bottom) / (top - bottom || 1)) * (H - padT - padB);
  const [picked, setPicked] = useState<number | null>(null);
  const year = picked === null ? null : Math.max(minX, Math.min(maxX, picked));

  const lower = main.map(p => `${x(p.x).toFixed(1)},${y(Math.min(p.contributed, p.balance)).toFixed(1)}`);
  const upper = main.map(p => `${x(p.x).toFixed(1)},${y(Math.max(p.balance, p.contributed)).toFixed(1)}`);
  const base = `${x(0).toFixed(1)},${y(Math.max(0, bottom)).toFixed(1)}`, end = `${x(main.at(-1)!.x).toFixed(1)},${y(Math.max(0, bottom)).toFixed(1)}`;
  const contributedArea = `${base} ${lower.join(' ')} ${end}`;
  const growthArea = `${upper.join(' ')} ${[...lower].reverse().join(' ')}`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => bottom + f * (top - bottom));
  const step = maxX - minX <= 12 ? (maxX - minX <= 6 ? 1 : 2) : maxX - minX <= 30 ? 5 : 10;
  const xTicks: number[] = [];
  for (let t = Math.ceil(minX / step) * step; t <= maxX; t += step) xTicks.push(t);

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect(), px = ((e.clientX - rect.left) / rect.width) * W;
    setPicked(Math.round(minX + ((px - padL) / (W - padL - padR)) * (maxX - minX)));
  };
  const keys = (e: KeyboardEvent<HTMLElement>) => {
    const now = year ?? maxX;
    const next = e.key === 'ArrowLeft' ? now - 1 : e.key === 'ArrowRight' ? now + 1 : e.key === 'Home' ? minX : e.key === 'End' ? maxX : e.key === 'Escape' ? null : undefined;
    if (next === undefined) return;
    e.preventDefault();
    setPicked(next === null ? null : Math.max(minX, Math.min(maxX, next)));
  };
  const at = (points: readonly Point[], t: number) => points.find(p => p.x === t);
  const here = year === null ? undefined : at(main, year);
  const tipLeft = year === null ? 0 : Math.min(Math.max(x(year) - 110, 4), W - 224);
  const label = `An estimate: ${formatMoney(start, currency)} growing to ${formatMoney(result.final, currency)} after ${result.rows.length} ${result.rows.length === 1 ? 'year' : 'years'}, of which ${formatMoney(result.contributed, currency)} put in.${others.length ? ` Compared with ${others.map(l => `${l.label}, ${formatMoney(l.result.final, currency)}`).join('; ')}.` : ''} The year-by-year table below has every figure.`;

  return <figure className="calc-chart" ref={box} tabIndex={0} role="group" aria-label="Growth chart. Use the left and right arrow keys to read a year." onKeyDown={keys} onBlur={() => setPicked(null)}>
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label} onPointerMove={pick} onPointerDown={pick} onPointerLeave={e => { if (e.pointerType === 'mouse') setPicked(null); }}>
      <defs>
        <linearGradient id={`${id}-in`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#58c7e0" stopOpacity=".75" /><stop offset="1" stopColor="#2b6f9a" stopOpacity=".45" /></linearGradient>
        <linearGradient id={`${id}-growth`} x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#8fa6ff" stopOpacity=".7" /><stop offset=".6" stopColor="#b388f5" stopOpacity=".75" /><stop offset="1" stopColor="#f08bd6" stopOpacity=".8" /></linearGradient>
      </defs>
      <ChartGrid ticks={ticks.map(t => ({y: y(t), label: compact(t, currency)}))} left={padL} right={W - padR} />
      <ChartXAxis ticks={xTicks.map(t => ({x: x(t), label: t === 0 ? 'Now' : t < 0 ? `${t}` : `${t}y`}))} y={H - 10} edge={false} />
      <polygon points={contributedArea} fill={`url(#${id}-in)`} />
      <polygon points={growthArea} fill={`url(#${id}-growth)`} />
      <polyline className="calc-balance" points={upper.join(' ')} />
      {result.milestones.map(m => <MilestoneMark key={m.threshold} m={m} x={x} top={padT} bottom={H - padB} />)}
      {others.map(l => <polyline key={l.id} className="calc-whatif" points={l.points.map(p => `${x(p.x).toFixed(1)},${y(p.balance).toFixed(1)}`).join(' ')} stroke={l.tone} strokeDasharray={l.dash} />)}
      {year !== null && <g className="calc-cursor"><line x1={x(year)} x2={x(year)} y1={padT - 6} y2={H - padB} />{here && <circle cx={x(year)} cy={y(here.balance)} r="5" />}{others.map(l => { const p = at(l.points, year); return p ? <circle key={l.id} cx={x(year)} cy={y(p.balance)} r="4" fill={l.tone} /> : null; })}</g>}
    </svg>
    {year !== null && <div className="calc-tip" style={{left: tipLeft}} aria-live="polite">
      <strong>{year === 0 ? 'At the start' : year < 0 ? `${-year} ${year === -1 ? 'year' : 'years'} before now` : `After year ${year}`}</strong>
      {here ? <dl>
        <div><dt>Balance</dt><dd>{formatMoney(here.balance.toFixed(2), currency)}</dd></div>
        <div><dt><i className="calc-swatch is-in" />Put in</dt><dd>{formatMoney(here.contributed.toFixed(2), currency)}</dd></div>
        <div><dt><i className="calc-swatch is-growth" />Growth</dt><dd>{formatMoney((here.balance - here.contributed).toFixed(2), currency)}</dd></div>
      </dl> : <p>Before this plan starts.</p>}
      {others.map(l => { const p = at(l.points, year); return p ? <p key={l.id} className="calc-tip-line"><i style={{background: l.tone}} />{l.label}: {formatMoney(p.balance.toFixed(2), currency)}</p> : null; })}
    </div>}
    <figcaption>
      <ChartLegend className="calc-legend" items={[
        {label: 'Put in', swatch: <i className="calc-swatch is-in" />},
        {label: 'Growth', swatch: <i className="calc-swatch is-growth" />},
        ...others.map(l => ({label: l.label, swatch: <svg width="26" height="10" aria-hidden="true"><line x1="1" x2="25" y1="5" y2="5" stroke={l.tone} strokeWidth="3" strokeDasharray={l.dash} /></svg>})),
        ...(result.milestones.length > 0 ? [{label: 'Milestones', swatch: <svg width="14" height="14" aria-hidden="true"><line x1="7" x2="7" y1="0" y2="14" className="calc-milestone-line" /></svg>}] : []),
      ]} />
    </figcaption>
  </figure>;
}

function MilestoneMark({m, x, top, bottom}: {m: Milestone; x: (v: number) => number; top: number; bottom: number}) {
  const at = x(m.year - 1 + (m.period - (m.year - 1) * m.periodsPerYear) / m.periodsPerYear);
  return <g className="calc-milestone"><line className="calc-milestone-line" x1={at} x2={at} y1={top} y2={bottom} /><rect x={at - 20} y={top - 24} width="40" height="22" rx="11" /><text x={at} y={top - 8} textAnchor="middle">{shortThreshold(m.threshold)}</text></g>;
}

/** A round top for the axis (1, 2, 2.5 or 5 times a power of ten). */
function niceCeil(n: number) {
  const p = 10 ** Math.floor(Math.log10(n)), f = n / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}
