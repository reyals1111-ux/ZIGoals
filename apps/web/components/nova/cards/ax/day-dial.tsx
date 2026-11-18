'use client';
import type {CSSProperties, ReactNode} from 'react';
import {arcPath, clamp01, polar, tickPath} from '../../../../lib/nova/holo/geometry';
import './day.css';

/**
 * Session AS (ADR-042 Part 2, family: dials). Both open at the foot (a 270° sweep from the lower left).
 * - `AxdGauge`: one period as the lit outer arc beside the period before as a dimmer inner arc, on one scale. A side with
 *   nothing recorded is an unlit dashed track, never a zero-length arc.
 * - `AxdSplit`: a ring split into parts of one whole (open tasks: overdue, today, ahead, no day), each part drawn in its
 *   own way (bright, lit, dim, dashed), with small gaps between them. No parts at all is an unlit dashed ring.
 * Arrives: the arcs draw themselves once, one after another. Alive: a small seeker runs along the bezel and back (an
 * ornament, never a reading). The drawing is decoration: the widget's words and table say every figure.
 */
const START = 225, SWEEP = 270;
function Face({children, figure, unit}: {children: ReactNode; figure: string; unit?: string}) {
  return <div className="axd-inst axd-dial" aria-hidden="true">
    <div className="axd-dial-face">
      <svg viewBox="-50 -50 100 100" focusable="false">
        <path className="axd-dial-ticks" d={tickPath(0, 0, 46.5, 49.5, 28, START, SWEEP)}/>
        {children}
      </svg>
      <span className="axd-dial-seek"/>
      <p className="axd-dial-centre"><b>{figure}</b>{unit ? <small>{unit}</small> : null}</p>
    </div>
  </div>;
}
const width = (w: number): CSSProperties => ({strokeWidth: w});
export function AxdGauge({now, before, figure, unit}: {now: number | null; before: number | null; figure: string; unit?: string}) {
  const a = now === null ? 0 : clamp01(now), b = before === null ? 0 : clamp01(before), end = polar(0, 0, 39, START + SWEEP * a);
  return <Face figure={figure} unit={unit}>
    <path className="axd-dial-track" data-unknown={now === null ? '' : undefined} style={now === null ? undefined : width(7)} d={arcPath(0, 0, 39, START, START + SWEEP)}/>
    <path className="axd-dial-track" data-unknown={before === null ? '' : undefined} style={before === null ? undefined : width(4)} d={arcPath(0, 0, 29, START, START + SWEEP)}/>
    {b > 0.004 && <path className="axd-dial-arc" data-mark="before" data-draw="" pathLength={1} style={width(4)} d={arcPath(0, 0, 29, START, START + SWEEP * b)}/>}
    {a > 0.004 && <>
      <path className="axd-dial-glow" style={width(9)} d={arcPath(0, 0, 39, START, START + SWEEP * a)}/>
      <path className="axd-dial-arc" data-mark="lit" data-draw="" pathLength={1} style={{...width(7), '--ax-i': 1} as CSSProperties} d={arcPath(0, 0, 39, START, START + SWEEP * a)}/>
      <circle className="axd-dial-lead" cx={end.x} cy={end.y} r="2.6"/>
    </>}
  </Face>;
}
export type DialPart = {key: string; mark: 'late' | 'now' | 'ahead' | 'none'; value: number};
export function AxdSplit({parts, figure, unit}: {parts: readonly DialPart[]; figure: string; unit?: string}) {
  const live = parts.filter(p => p.value > 0), total = live.reduce((n, p) => n + p.value, 0), gap = live.length > 1 ? 5 : 0, room = SWEEP - gap * (live.length - 1);
  // Each part's start: the parts before it, with a gap after each.
  const from = (i: number) => START + live.slice(0, i).reduce((n, p) => n + room * p.value / total + gap, 0);
  return <Face figure={figure} unit={unit}>
    <path className="axd-dial-track" data-unknown={total ? undefined : ''} style={total ? width(9) : undefined} d={arcPath(0, 0, 38, START, START + SWEEP)}/>
    {live.map((p, i) => <path key={p.key} className="axd-dial-arc" data-mark={p.mark} data-draw={p.mark === 'none' ? undefined : ''} pathLength={p.mark === 'none' ? undefined : 1}
      style={{...(p.mark === 'none' ? {} : width(9)), '--ax-i': i} as CSSProperties} d={arcPath(0, 0, 38, from(i), from(i) + room * p.value / total)}/>)}
  </Face>;
}
