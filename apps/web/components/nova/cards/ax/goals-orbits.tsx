'use client';
import type {Planet} from '../../../../lib/nova/cards/ax/goals-views';
import {arcPath} from '../../../../lib/nova/holo/geometry';
import {axmVar} from './money-kit';
import './money.css';

/**
 * Session AS (ADR-042 Part 2, family: orbits): each active goal a planet on its own ring around a small star, the
 * innermost ring the first goal. A planet starts at the top of its ring and its place on the ring is its progress (a
 * quarter of the way round at 25%, back at the top at 100%); the stretch it has travelled is lit. A goal whose progress
 * is unknown is an unlit dashed planet resting at the top, never one at zero. Names and percents are in the list.
 * Arrives: the rings open from the star and each planet swings out to its place. Alive: the planets drift a little along
 * their rings (a degree or two, so the place still reads as the progress).
 */
export function AxmOrbits({planets}: {planets: readonly Planet[]}) {
  const n = planets.length, inner = 26, outer = 90, radius = (i: number) => n <= 1 ? 58 : inner + (outer - inner) * i / (n - 1);
  return <div className="axm-orbits axm-inst" aria-hidden="true">
    <svg viewBox="-100 -100 200 200" focusable="false">
      <circle className="axm-orbit-glow" r="15"/><circle className="axm-orbit-star" r="6.5"/>
      {planets.map((p, i) => { const r = radius(i), deg = p.pct === null ? 0 : Math.max(0, Math.min(100, p.pct)) * 3.6; return <g key={p.key} className="axm-orbit" data-none={p.pct === null ? '' : undefined} style={{...axmVar('--ax-i', i), ...axmVar('--axm-a', `${deg.toFixed(1)}deg`)}}>
        <circle className="axm-orbit-ring" r={r}/>
        {deg > 0.5 && <path className="axm-orbit-way" d={arcPath(0, 0, r, 0, Math.min(deg, 359.99))}/>}
        <g className="axm-orbit-planet"><g className="axm-orbit-drift"><circle className="axm-orbit-halo" cy={-r} r="8"/><circle className="axm-orbit-body" cy={-r} r="4.6"/></g></g>
      </g>; })}
    </svg>
  </div>;
}
