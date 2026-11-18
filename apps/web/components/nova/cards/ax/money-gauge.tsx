'use client';
import {useId, type ReactNode} from 'react';
import {arcPath, polar, tickPath} from '../../../../lib/nova/holo/geometry';
import {axmVar} from './money-kit';
import './money.css';

/**
 * Session AS (ADR-042 Part 2, family: gauges): an arc gauge — a 240° track inside a tick bezel, the lit arc for the share
 * and a needle on it; the figure stands in the arc's mouth. Above the whole (a budget that is over) the arc is full and
 * wears a dashed outer band, and the words beside it say by how much (never colour alone). Unknown is an unlit dashed
 * track with no needle, never a needle at zero. `marks` are small stones on the track (a goal's quarter, half and
 * three quarters), lit once passed.
 * Arrives: the lit arc draws itself once and the needle swings up and settles. Alive: the tick bezel sways a little.
 */
const START = -120, SWEEP = 240, R = 42;
export function AxmArc({share, over = false, figure, marks, size = 'row'}: {share: number | null; over?: boolean; figure: ReactNode; marks?: readonly number[]; size?: 'row' | 'solo'}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''), s = share === null ? null : Math.max(0, Math.min(1, share)), end = START + SWEEP * (s ?? 0);
  return <div className="axm-arc" data-size={size} data-over={over ? '' : undefined} data-none={s === null ? '' : undefined} aria-hidden="true">
    <svg viewBox="-60 -58 120 92" focusable="false">
      <defs><linearGradient id={`${id}g`} gradientUnits="userSpaceOnUse" x1={-R} y1="0" x2={R} y2="0"><stop offset="0" className="axm-stop-mid"/><stop offset="1" className="axm-stop-b"/></linearGradient></defs>
      <path className="axm-arc-bezel" d={tickPath(0, 0, 49.5, 54, 25, START, SWEEP)}/>
      <path className="axm-arc-track" d={arcPath(0, 0, R, START, START + SWEEP)}/>
      {s !== null && s > 0.004 && <path className="axm-arc-value" pathLength={1} stroke={`url(#${id}g)`} d={arcPath(0, 0, R, START, end)}/>}
      {over && <path className="axm-arc-over" d={arcPath(0, 0, R + 5.5, START, START + SWEEP)}/>}
      {marks?.map(m => { const p = polar(0, 0, R, START + SWEEP * m / 100); return <circle key={m} className="axm-arc-stone" data-lit={s !== null && s * 100 >= m ? '' : undefined} cx={p.x} cy={p.y} r="2.2"/>; })}
      {s !== null && <g className="axm-arc-needle" style={axmVar('--axm-a', `${end.toFixed(1)}deg`)}><path d="M0 5V-31"/><circle r="3.4"/></g>}
    </svg>
    <b className="axm-arc-figure">{figure}</b>
  </div>;
}

/** A row of arc gauges, each with its name and its words under it (three in a row; a second row at Large). */
export type GaugeItem = {key: string; name: string; share: number | null; over?: boolean; figure: string; text: string};
export function AxmGauges({items, perRow = 3}: {items: readonly GaugeItem[]; perRow?: number}) {
  return <div className="axm-gauges axm-inst" aria-hidden="true" style={{...axmVar('--axm-n', Math.min(perRow, Math.max(1, items.length))), ...axmVar('--axm-grows', Math.ceil(items.length / perRow) || 1)}}>
    {items.map((item, i) => <div key={item.key} className="axm-gauge" style={axmVar('--ax-i', i)}>
      <AxmArc share={item.share} over={item.over} figure={item.figure}/>
      <span className="axm-gauge-name" title={item.name}>{item.name}</span>
      <span className="axm-gauge-text" data-over={item.over ? '' : undefined}>{item.text}</span>
    </div>)}
  </div>;
}

/**
 * A countdown dial (family: dials): thirty ticks, one a day; the lit arc is the time still left, running up to the mark
 * at the top (the due date), and the hand stands at today. More than thirty days ahead the ring is whole; on the day, or
 * past it, the hand stands on the mark. The days are the figure inside.
 * Arrives: the hand sweeps back from the mark to today and the arc draws once. Alive: the due mark at the top ticks.
 */
export function AxmDial({days, figure, unit}: {days: number; figure: string; unit: string}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''), left = Math.max(0, Math.min(30, days)), angle = -left / 30 * 360, r = 44;
  return <div className="axm-dial axm-inst" data-late={days < 0 ? '' : undefined} aria-hidden="true">
    <svg viewBox="-60 -60 120 120" focusable="false">
      <defs><linearGradient id={`${id}g`} gradientUnits="userSpaceOnUse" x1={-r} y1={r} x2={r} y2={-r}><stop offset="0" className="axm-stop-mid"/><stop offset="1" className="axm-stop-b"/></linearGradient></defs>
      <path className="axm-dial-ticks" d={tickPath(0, 0, 51, 56, 30)}/>
      <circle className="axm-dial-track" r={r}/>
      {left > 0 && <path className="axm-dial-left" pathLength={1} stroke={`url(#${id}g)`} d={left >= 30 ? arcPath(0, 0, r, 0, 360) : arcPath(0, 0, r, 360 + angle, 360)}/>}
      <path className="axm-dial-due" d="M0 -58L-4.5 -50H4.5Z"/>
      <g className="axm-dial-hand" style={axmVar('--axm-a', `${angle.toFixed(1)}deg`)}><path d={`M0 ${-r + 7}V${-r - 6}`}/><circle cy={-r} r="3.6"/></g>
    </svg>
    <span className="axm-dial-words"><b className="axm-dial-figure">{figure}</b><small className="axm-dial-unit">{unit}</small></span>
  </div>;
}
