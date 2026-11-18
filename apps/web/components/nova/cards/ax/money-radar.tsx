'use client';
import {useId} from 'react';
import type {RadarSpoke} from '../../../../lib/nova/cards/ax/money-spend';
import {polar} from '../../../../lib/nova/holo/geometry';
import './money.css';

/**
 * Session AS (ADR-042 Part 2, family: radar): categories as spokes — this period as the lit polygon, the period before
 * as a dim dashed one (drawn only when something was logged in it: unknown is never a zero polygon). A spoke's length is
 * on a square-root scale, so a small category still shows beside a large one; the figures are in the words, not the
 * drawing. Arrives: the web fades up and the lit polygon opens from the centre. Alive: one thin sweep turns, as on a scope.
 */
const R = 64;
export function AxmRadar({spokes, max, before}: {spokes: readonly RadarSpoke[]; max: number; before: boolean}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''), n = Math.max(3, spokes.length), deg = (i: number) => 360 / n * i;
  const reach = (value: number) => max > 0 && value > 0 ? Math.max(0.08, Math.sqrt(value / max)) * R : 0;
  const shape = (pick: (s: RadarSpoke) => number) => Array.from({length: n}, (_, i) => { const p = polar(0, 0, spokes[i] ? reach(pick(spokes[i]!)) : 0, deg(i)); return `${p.x},${p.y}`; }).join(' ');
  const web = (share: number) => Array.from({length: n}, (_, i) => { const p = polar(0, 0, R * share, deg(i)); return `${p.x},${p.y}`; }).join(' ');
  return <div className="axm-radar axm-inst" aria-hidden="true">
    <div className="axm-radar-plot">
      <svg viewBox="-100 -100 200 200" focusable="false">
        <defs>
          <radialGradient id={`${id}f`}><stop offset="0" className="axm-stop-clear"/><stop offset="1" className="axm-stop-soft"/></radialGradient>
          <linearGradient id={`${id}s`} gradientUnits="userSpaceOnUse" x1={-R} y1={R} x2={R} y2={-R}><stop offset="0" className="axm-stop-a"/><stop offset="1" className="axm-stop-b"/></linearGradient>
        </defs>
        <g className="axm-radar-web">
          {[1 / 3, 2 / 3, 1].map(share => <polygon key={share} points={web(share)}/>)}
          {Array.from({length: n}, (_, i) => { const p = polar(0, 0, R, deg(i)); return <path key={i} d={`M0 0L${p.x} ${p.y}`}/>; })}
        </g>
        <g className="axm-radar-sweep"><path className="axm-radar-wedge" d={`M0 0L0 ${-R}A${R} ${R} 0 0 0 ${polar(0, 0, R, -26).x} ${polar(0, 0, R, -26).y}Z`} fill={`url(#${id}f)`}/><path className="axm-radar-hand" d={`M0 0V${-R}`}/></g>
        {before && <polygon className="axm-radar-before" points={shape(s => s.before ?? 0)}/>}
        <g className="axm-radar-now">
          <polygon className="axm-radar-fill" points={shape(s => s.now)} fill={`url(#${id}f)`}/>
          <polygon className="axm-radar-line" points={shape(s => s.now)} stroke={`url(#${id}s)`}/>
          {spokes.map((s, i) => { const p = polar(0, 0, reach(s.now), deg(i)); return s.now > 0 ? <circle key={s.key} className="axm-radar-dot" cx={p.x} cy={p.y} r="3"/> : null; })}
        </g>
      </svg>
      {spokes.map((s, i) => { const p = polar(50, 50, 41, deg(i)); return <span key={s.key} className="axm-radar-label" data-side={p.x > 53 ? 'r' : p.x < 47 ? 'l' : 'c'} style={{left: `${p.x}%`, top: `${p.y}%`}} title={`${s.label}: ${s.nowText}`}>{s.label}</span>; })}
    </div>
  </div>;
}
