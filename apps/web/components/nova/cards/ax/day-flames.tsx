'use client';
import type {CSSProperties} from 'react';
import {axIndex} from './kit';
import './day.css';

/**
 * Session AS (ADR-042 Part 2, family: flames): a streak as a flame — its height is the streak against the tallest one
 * shown, its figure stands over it and its name under it. A streak that is not running is an unlit ember (a small dashed
 * ring), never a missing column. `ghost` draws a dashed outline behind the flame: the longest streak ever, where the
 * flame is the one running now. Arrives: each flame kindles from its foot, one after another. Alive: the flames' cores
 * flicker. The drawing is decoration: the widget's table says every streak in words.
 */
export type FlameMark = {key: string; label: string; figure: string; /** 0–1 of the well; 0: no run going. */ share: number; /** The outline behind the flame, 0–1. */ ghost?: number; title?: string};
const height = (share: number) => ({'--axd-h': `${Math.max(16, Math.min(100, Math.round(share * 100)))}%`} as CSSProperties);
export function AxdFlames({flames, more}: {flames: readonly FlameMark[]; more?: string | null}) {
  return <div className="axd-inst axd-flames" data-n={flames.length} aria-hidden="true">
    <ol className="axd-flame-row">{flames.map((f, i) => <li key={f.key} className="axd-flame" data-out={f.share > 0 ? undefined : ''} style={axIndex(i)} title={f.title}>
      <span className="axd-flame-fig">{f.figure}</span>
      <span className="axd-flame-well">
        {f.ghost !== undefined && f.ghost > 0 && <i className="axd-flame-ghost" style={height(f.ghost)}/>}
        <i className="axd-flame-body" style={f.share > 0 ? height(f.share) : undefined}><b/></i>
      </span>
      <span className="axd-flame-name" title={f.label}>{f.label}</span>
    </li>)}</ol>
    {more ? <p className="axd-more">{more}</p> : null}
  </div>;
}
