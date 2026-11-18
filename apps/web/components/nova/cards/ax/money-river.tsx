'use client';
import {useId} from 'react';
import {smoothPath} from '../../../../lib/nova/holo/geometry';
import './money.css';

/**
 * Session AS (ADR-042 Part 2, family: rivers): amounts over time as flowing bands on one time axis — one band above the
 * line and, where there are two, one below it (income above, spending below). A band's width is the share it is given
 * (0–1); the words under and beside it carry the figures. With `breaks`, a point that was not recorded is a gap in the
 * river (the line shows through, dashed), never a width of zero; without, a bucket with nothing logged pinches to the line.
 * Arrives: the line runs out from the left and the bands open from it. Alive: two thin glints drift downstream.
 */
const W = 320, H = 44, PERIOD = 80;
/** The glints: short strokes every 80 units along two lanes, one period wider than the river, so their drift loops without a seam. */
const GLINTS = Array.from({length: Math.ceil(W / PERIOD) + 1}, (_, i) => `M${i * PERIOD - PERIOD} -7h13M${i * PERIOD - PERIOD / 2} 6h9`).join('');
type Point = {x: number; y: number};
export function AxmRiver({upper, lower, breaks = false, start, end, caption}: {upper: readonly (number | null)[]; lower?: readonly (number | null)[]; breaks?: boolean; start: string; end: string; caption?: string}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''), n = upper.length, step = n > 1 ? W / (n - 1) : W, x = (i: number) => n > 1 ? i * step : W / 2;
  const runs = (values: readonly (number | null)[]): Point[][] => {
    if (!breaks) return [values.map((v, i) => ({x: x(i), y: Math.max(0, Math.min(1, v ?? 0)) * H}))];
    const out: Point[][] = [];
    let run: Point[] = [];
    values.forEach((v, i) => { if (v === null) { if (run.length) out.push(run); run = []; } else run.push({x: x(i), y: Math.max(0.04, Math.min(1, v)) * H}); });
    if (run.length) out.push(run);
    return out;
  };
  const half = Math.min(step / 2, 14);
  const area = (run: Point[], sign: 1 | -1): string => {
    if (run.length === 1) { const p = run[0]!; return `M${(p.x - half).toFixed(1)} 0V${(sign * p.y).toFixed(1)}H${(p.x + half).toFixed(1)}V0Z`; }
    return `${smoothPath(run.map(p => ({x: p.x, y: sign * p.y})))}L${run.at(-1)!.x} 0L${run[0]!.x} 0Z`;
  };
  const up = runs(upper), down = lower ? runs(lower) : breaks ? up : [];
  return <div className="axm-river axm-inst" aria-hidden="true">
    <svg viewBox={`0 -50 ${W} 100`} preserveAspectRatio="none" focusable="false">
      <defs>
        <linearGradient id={`${id}u`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" className="axm-stop-soft"/><stop offset="1" className="axm-stop-a"/></linearGradient>
        <linearGradient id={`${id}d`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="axm-stop-soft"/><stop offset="1" className={lower ? 'axm-stop-b' : 'axm-stop-a'}/></linearGradient>
      </defs>
      <path className="axm-river-bed" d={`M0 0H${W}`}/>
      <g className="axm-river-band" data-side="up">{up.map((run, i) => <path key={i} d={area(run, -1)} fill={`url(#${id}u)`}/>)}</g>
      <g className="axm-river-band" data-side="down">{down.map((run, i) => <path key={i} d={area(run, 1)} fill={`url(#${id}d)`}/>)}</g>
      {lower ? <path className="axm-river-line" d={`M0 0H${W}`}/> : null}
      <g className="axm-river-drift"><path d={GLINTS}/></g>
    </svg>
    <p className="axm-river-axis"><span>{start}</span>{caption ? <span className="axm-river-cap">{caption}</span> : null}<span>{end}</span></p>
  </div>;
}
