'use client';
import {useId, type CSSProperties} from 'react';
import {PATH_NEON_STOPS} from '../../lib/path/colours';
import type {PathSegment} from '../../lib/path/model';
import {curve, type PathGeometry} from './use-path-geometry';

/**
 * The neon flow line (P7.4): one SVG over the whole stage, a soft S from dot centre to dot centre. Every segment has a
 * quiet base line; a lit segment (both its dots done) carries the footer banner's neon gradient with a blurred glow twin,
 * revealed once along its length when it lights (stroke-dashoffset, CSS only). A line to a locked dot is dashed. Bridges
 * join one orbit's last dot to the next orbit's first, passing behind the orbit's banner. Decorative: the dots carry the
 * meaning.
 *
 * Session AF (L3b), the Checklist's orbit look (`rail`): every segment is a neon ribbon in its arriving planet's colour
 * (`tones`) with a soft halo — at about a third of that colour while unlit (a pastel tint on a white sky), in full with a
 * white core once both planets are done (revealed along its length). `lead` is the way on from the last planet done to
 * the next one: brighter, breathing softly (the owner's loop inside the Checklist; still under reduced motion and Motion
 * Off). A segment in `comets` sends one comet along its whole length: a white-hot head in the planet's colour with a
 * tapering tail (about 70 px), drawn only while the segment is in `comets`, so it plays once; reduced motion and Motion
 * Off never show it.
 */
type Drawn = PathSegment & {d: string; tail: number};
// (A comet's tail is about 70 px whatever the segment's length: a share of the path's own length, from its chord.)
const drawnSegments = (geo: PathGeometry, segments: PathSegment[]): Drawn[] => segments.flatMap(s => { const a = geo.points[s.from], b = geo.points[s.to]; return a && b ? [{...s, d: curve(a, b), tail: Math.min(.85, 70 / Math.max(1, Math.hypot(b.x - a.x, b.y - a.y) * 1.08))}] : []; });

export function PathLine({geo, segments, rail = false, lead, tones}: {geo: PathGeometry; segments: PathSegment[]; rail?: boolean; lead?: string; tones?: Record<string, string>}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''), grad = `path-neon-${id}`, glow = `path-glow-${id}`;
  const drawn = drawnSegments(geo, segments);
  return <svg className="path-line" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={grad} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={Math.max(1, geo.w * .25)} y2={Math.max(1, geo.h)}>
        {PATH_NEON_STOPS.map(s => <stop key={s.offset} offset={s.offset} stopColor={s.hex}/>)}
      </linearGradient>
      <filter id={glow} x="-30%" y="-10%" width="160%" height="120%"><feGaussianBlur stdDeviation="4.5"/></filter>
    </defs>
    {drawn.map(s => <g key={s.id} className="path-segment" data-lit={s.lit || undefined} data-locked={s.locked || undefined} data-bridge={s.bridge || undefined} data-lead={lead === s.id || undefined} data-segment={s.id} style={rail && tones?.[s.id] ? {'--seg': tones[s.id]} as CSSProperties : undefined}>
      {rail ? <>
        <path className="path-segment-halo" d={s.d} fill="none"/>
        <path className="path-segment-base" d={s.d} fill="none"/>
        {lead === s.id && <path className="path-segment-lead" d={s.d} fill="none"/>}
        <path className="path-segment-glow" d={s.d} fill="none" pathLength={1}/>
        <path className="path-segment-lit" d={s.d} fill="none" pathLength={1}/>
        <path className="path-segment-core" d={s.d} fill="none" pathLength={1}/>
      </> : <>
        <path className="path-segment-base" d={s.d} fill="none"/>
        <path className="path-segment-glow" d={s.d} fill="none" stroke={`url(#${grad})`} filter={`url(#${glow})`} pathLength={1}/>
        <path className="path-segment-lit" d={s.d} fill="none" stroke={`url(#${grad})`} pathLength={1}/>
      </>}
    </g>)}
  </svg>;
}

/** Session AF (L3b, round 3): the orbit look's comets fly over the planets (a layer of their own above the path), from the
 *  planet just ticked to the next one's centre: at the path's pitch most of a stretch lies under its two planets, so a
 *  comet on the line itself was all but hidden. Drawn only while a segment is in `comets`; decorative. */
export function PathComets({geo, segments, comets, tones}: {geo: PathGeometry; segments: PathSegment[]; comets: Set<string>; tones?: Record<string, string>}) {
  const drawn = drawnSegments(geo, segments).filter(s => comets.has(s.id));
  if (!drawn.length) return null;
  return <svg className="path-line path-comets" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} aria-hidden="true" focusable="false">
    {drawn.map(s => <g key={s.id} className="path-comet" data-segment={s.id} style={{...(tones?.[s.id] ? {'--seg': tones[s.id]} : {}), '--tail': s.tail.toFixed(3)} as CSSProperties}>
      <path className="path-comet-tail" d={s.d} fill="none" pathLength={1}/>
      <path className="path-comet-tail path-comet-tail-near" d={s.d} fill="none" pathLength={1}/>
      <path className="path-comet-halo" d={s.d} fill="none" pathLength={1}/>
      <path className="path-comet-head" d={s.d} fill="none" pathLength={1}/>
    </g>)}
  </svg>;
}
