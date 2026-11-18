'use client';
import type {CSSProperties} from 'react';
import './day.css';

/**
 * Session AS (ADR-042 Part 2, family: timelines): marks on a time axis — a day's hours, or the days from the oldest
 * overdue task to a week ahead. A mark stands at its time, stacked when several share it; `ticks` are small strokes under
 * the axis (finished tasks); now is a hairline with a ring at its foot. Kinds are told apart by shape, not colour alone:
 * overdue is a ringed lit core, today and done are filled, ahead and open are hollow, an open item whose time has passed
 * is hollow with a dot, skipped is dashed.
 * Arrives: the axis draws itself once, then the marks drop onto it. Alive: the ring at now breathes.
 * The drawing is decoration: the widget's table says every mark in words.
 */
export type TimelineDot = {key: string; at: number; lane?: number; kind: string; title?: string};
const left = (at: number): CSSProperties => ({left: `${Math.round(Math.max(0, Math.min(1, at)) * 1000) / 10}%`});
export function AxdTimeline({marks, ticks = [], labels, now, grid = []}: {
  marks: readonly TimelineDot[]; ticks?: readonly {key: string; at: number; title?: string}[];
  labels: readonly {at: number; label: string; now?: boolean}[]; now: number | null; grid?: readonly number[];
}) {
  return <div className="axd-inst axd-tl" aria-hidden="true">
    <div className="axd-tl-field">
      {now !== null && <span className="axd-tl-now" style={left(now)}><b/></span>}
      <svg className="axd-tl-axis" viewBox="0 0 100 3" preserveAspectRatio="none" focusable="false"><path d="M0 1.5H100" pathLength={1}/></svg>
      {grid.map(at => <i key={at} className="axd-tl-grid" style={left(at)}/>)}
      {marks.map((m, i) => <i key={m.key} className="axd-tl-mark" data-kind={m.kind} style={{...left(m.at), '--axd-lane': m.lane ?? 0, '--ax-i': i} as CSSProperties} title={m.title}/>)}
      {ticks.map(t => <i key={t.key} className="axd-tl-tick" style={left(t.at)} title={t.title}/>)}
    </div>
    <div className="axd-tl-labels">{labels.map(l => <span key={`${l.at}-${l.label}`} style={left(l.at)} data-edge={l.at <= 0.04 ? 'start' : l.at >= 0.96 ? 'end' : undefined} data-now={l.now ? '' : undefined}>{l.label}</span>)}</div>
  </div>;
}
