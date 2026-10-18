'use client';
import {useId} from 'react';
import {PATH_NEON_STOPS} from '../../lib/path/colours';
import type {PathSegment} from '../../lib/path/model';
import {curve, type PathGeometry} from './use-path-geometry';

/**
 * The neon flow line (P7.4): one SVG over the whole stage, a soft S from dot centre to dot centre. Every segment has a
 * quiet base line; a lit segment (both its dots done) carries the footer banner's neon gradient with a blurred glow twin,
 * revealed once along its length when it lights (stroke-dashoffset, CSS only). A line to a locked dot is dashed. Bridges
 * join one orbit's last dot to the next orbit's first, passing behind the orbit's banner. Decorative: the dots carry the
 * meaning.
 */
export function PathLine({geo, segments}: {geo: PathGeometry; segments: PathSegment[]}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''), grad = `path-neon-${id}`, glow = `path-glow-${id}`;
  const drawn = segments.flatMap(s => { const a = geo.points[s.from], b = geo.points[s.to]; return a && b ? [{...s, d: curve(a, b)}] : []; });
  return <svg className="path-line" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={grad} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={Math.max(1, geo.w * .25)} y2={Math.max(1, geo.h)}>
        {PATH_NEON_STOPS.map(s => <stop key={s.offset} offset={s.offset} stopColor={s.hex}/>)}
      </linearGradient>
      <filter id={glow} x="-30%" y="-10%" width="160%" height="120%"><feGaussianBlur stdDeviation="4.5"/></filter>
    </defs>
    {drawn.map(s => <g key={s.id} className="path-segment" data-lit={s.lit || undefined} data-locked={s.locked || undefined} data-bridge={s.bridge || undefined} data-segment={s.id}>
      <path className="path-segment-base" d={s.d} fill="none"/>
      <path className="path-segment-glow" d={s.d} fill="none" stroke={`url(#${grad})`} filter={`url(#${glow})`} pathLength={1}/>
      <path className="path-segment-lit" d={s.d} fill="none" stroke={`url(#${grad})`} pathLength={1}/>
    </g>)}
  </svg>;
}
