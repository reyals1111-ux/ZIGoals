'use client';
import {polar} from '../../../../lib/nova/holo/geometry';
import {WholeRows} from '../whole-rows';
import {axIndex} from './kit';
import './day.css';

/**
 * Session AS (ADR-042 Part 2, family: radar and scanner; addition A3: facts and the person's own past, never a score).
 * - `AxdRadar`: four spokes, each one count from the records. This period is the lit shape, the period before the dim
 *   dashed one. A spoke with nothing recorded is a dashed axis with no point on it (unknown, never zero); the shape then
 *   joins the spokes that are known. Each spoke is named beside the plot with its figure.
 * - `AxdScan`: today, lane by lane — a label, a row of pips (lit: done; hollow: open; slashed: overdue) and the lane's
 *   figures in words. The lanes that fit show, then "+N more" (cards/whole-rows.tsx).
 * Arrives: the radar's shapes unfold from the centre; the scanner's lanes slide in from the right. Alive: the radar's
 * sweep turns; one beam crosses the scanner from the top. Both are decoration: the widget's table says every figure.
 */
export type RadarSpoke = {key: string; label: string; text: string; now: number | null; before: number | null};
const ANGLES = [315, 45, 135, 225], REACH = 40;
const shape = (shares: readonly (number | null)[]): {d: string; points: {x: number; y: number}[]} => {
  const points = shares.flatMap((s, i) => s === null ? [] : [polar(0, 0, Math.max(2.5, Math.min(1, s) * REACH), ANGLES[i]!)]);
  return {points, d: points.length > 1 ? `${points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join('')}${points.length > 2 ? 'Z' : ''}` : ''};
};
export function AxdRadar({spokes}: {spokes: readonly RadarSpoke[]}) {
  const four = spokes.slice(0, 4), now = shape(four.map(s => s.now)), before = shape(four.map(s => s.before));
  const name = (i: number) => four[i] ? <p className="axd-radar-name" title={`${four[i]!.label}: ${four[i]!.text}`}><b>{four[i]!.label}</b><span>{four[i]!.text}</span></p> : null;
  return <div className="axd-inst axd-radar" aria-hidden="true">
    <div className="axd-radar-side" data-side="left">{name(0)}{name(3)}</div>
    <div className="axd-radar-plot">
      <span className="axd-radar-sweep"/>
      <svg viewBox="-50 -50 100 100" focusable="false">
        {[10, 20, 30, 40].map(r => <circle key={r} className="axd-radar-ring" r={r}/>)}
        {four.map((s, i) => { const end = polar(0, 0, REACH + 4, ANGLES[i]!); return <path key={s.key} className="axd-radar-axis" data-unknown={s.now === null ? '' : undefined} d={`M0 0L${end.x} ${end.y}`}/>; })}
        <g className="axd-radar-live">
          {before.d && <path className="axd-radar-before" d={before.d}/>}
          {now.d && <path className="axd-radar-now" d={now.d}/>}
          {now.points.map((p, i) => <circle key={i} className="axd-radar-dot" cx={p.x} cy={p.y} r="2.2"/>)}
        </g>
      </svg>
    </div>
    <div className="axd-radar-side" data-side="right">{name(1)}{name(2)}</div>
  </div>;
}
export type ScanRow = {key: string; label: string; text: string; pips: readonly string[]; more: number};
export function AxdScan({lanes, more}: {lanes: readonly ScanRow[]; more?: (hidden: number, shown: number) => string}) {
  return <div className="axd-inst axd-scan" aria-hidden="true">
    <WholeRows as="div" inline className="axd-scan-lanes" min={1} more={more}>
      {lanes.map((l, i) => <div key={l.key} className="axd-scan-lane" style={axIndex(i)}>
        <span className="axd-scan-label">{l.label}</span>
        <span className="axd-scan-pips" data-none={l.pips.length ? undefined : ''}>{l.pips.map((p, k) => <i key={k} data-pip={p}/>)}{l.more > 0 ? <b>+{l.more}</b> : null}</span>
        <span className="axd-scan-text">{l.text}</span>
      </div>)}
    </WholeRows>
    <span className="axd-scan-beam"/>
  </div>;
}
