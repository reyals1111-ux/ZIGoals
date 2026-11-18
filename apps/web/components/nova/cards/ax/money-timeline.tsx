'use client';
import {axmVar} from './money-kit';
import './money.css';

/**
 * Session AS (ADR-042 Part 2, family: timelines): dates on one time axis that starts at today — each a numbered node at
 * its place between today and the last date shown, alternately above and below the line so that near dates do not
 * cover each other. A date that has passed stands at today's edge and is said so in the list's words. The numbers are
 * the list's own: the list beside the axis names each one.
 * Arrives: the line runs out from today and the nodes drop onto it in date order. Alive: one small light travels the line.
 */
export type TimeMark = {key: string; n: number; at: number; past?: boolean; title: string};
export function AxmTimeline({marks, start = 'Today', end}: {marks: readonly TimeMark[]; start?: string; end: string | null}) {
  return <div className="axm-time axm-inst" aria-hidden="true">
    <div className="axm-time-track">
      <span className="axm-time-rail"><i className="axm-time-run"/></span>
      <i className="axm-time-now"/>
      {marks.map((m, i) => <i key={m.key} className="axm-time-node" data-row={i % 2 ? 'down' : 'up'} data-past={m.past ? '' : undefined} style={{...axmVar('--axm-at', m.at.toFixed(4)), ...axmVar('--ax-i', i)}} title={m.title}><b>{m.n}</b></i>)}
    </div>
    <p className="axm-time-axis"><span>{start}</span>{end ? <span>{end}</span> : null}</p>
  </div>;
}
