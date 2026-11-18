'use client';
import type {CSSProperties} from 'react';
import './day.css';

/**
 * Session AS (ADR-042 Part 2, family: the constellation): groups of stars — a star for a thing kept (a note), each group
 * in its own patch of sky with its count and name under it, a thin line linking a group's stars. A group with nothing is
 * an empty dashed ring. Only counts are drawn: a star carries no name and no text.
 * Arrives: the stars condense from a blur of light into points, one after another. Alive: a glint on every third star
 * twinkles. The drawing is decoration: the widget's table says each count in words.
 */
export type StarField = {key: string; label: string; count: number; stars: readonly {x: number; y: number; r: number}[]};
export function AxdStars({groups}: {groups: readonly StarField[]}) {
  // A star's number across the groups (its turn to arrive and to twinkle).
  const before = (at: number) => groups.slice(0, at).reduce((n, g) => n + g.stars.length, 0);
  return <div className="axd-inst axd-stars" aria-hidden="true">{groups.map((g, at) => <div key={g.key} className="axd-sky" data-none={g.count ? undefined : ''}>
    <div className="axd-sky-field">
      {g.stars.length > 1 && <svg viewBox="0 0 100 100" focusable="false"><polyline className="axd-sky-links" points={g.stars.map(s => `${s.x},${s.y}`).join(' ')}/></svg>}
      {g.stars.map((s, i) => <i key={i} className="axd-star" style={{left: `${s.x}%`, top: `${s.y}%`, '--axd-r': s.r, '--ax-i': before(at) + i} as CSSProperties}>{i % 3 === 0 ? <b/> : null}</i>)}
    </div>
    <p className="axd-sky-name"><b>{g.count}</b> {g.label}</p>
  </div>)}</div>;
}
