'use client';
import {useId, useLayoutEffect, useRef, type CSSProperties} from 'react';
import {PATH_NEON_STOPS} from '../../lib/path/colours';
import type {PathSegment} from '../../lib/path/model';
import {entranceAllowed} from '../use-entrance';
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
        <path className="path-segment-edge" d={s.d} fill="none"/>
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

/** Session AF (L3b, rounds 3–5): the orbit look's comets fly over the planets (a layer of their own above the path), from
 *  the rim of the planet just ticked to the rim of the next one, arcing well out to the side (round 4: at a phone's pitch
 *  the two planets nearly touch, so a comet along the line had nowhere to be seen). Round 5: an 18 px white-hot head in a
 *  halo of the planet's colour and a tail of about 110 px drawn (60–80 px of it bright), animated with each comet's own lengths (the Web Animations API: a CSS
 *  keyframe reading a custom property stepped instead of gliding, so the tail never showed); the head fades at the rim and
 *  the next planet's ring flashes (PathDot `arrive`). Drawn only while a segment is in `comets`; decorative; never under
 *  reduced motion or Motion Off (CSS hides the layer). */
const arc = (geo: PathGeometry, s: PathSegment) => {
  const a = geo.points[s.from], b = geo.points[s.to]; if (!a || !b) return null;
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.max(1, Math.hypot(dx, dy)), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  // Out toward the nearer edge of the stage, where the sky is open (but never past it).
  const sign = mx >= geo.w / 2 ? 1 : -1, nx = -dy / len, ny = dx / len, flip = nx * sign >= 0 ? 1 : -1;
  const room = sign > 0 ? geo.w - mx - 8 : mx - 8, bulge = Math.max(40, Math.min(150, Math.max(110, len * .9), room * 1.6));
  const cx = mx + nx * flip * bulge, cy = my + ny * flip * bulge;
  // (The next planet is drawn a size larger than its own radius: the comet ends at its drawn rim.)
  const rim = (p: {x: number; y: number; r?: number}, k: number) => { const ux = cx - p.x, uy = cy - p.y, ul = Math.max(1, Math.hypot(ux, uy)), r = (p.r ?? 0) * k + 2; return {x: p.x + ux / ul * r, y: p.y + uy / ul * r}; };
  const st = rim(a, 1), en = rim(b, 1.15), f = (n: number) => n.toFixed(1);
  // (A quadratic's length, closely enough: the mean of its chord and its control polygon.)
  const chord = Math.hypot(en.x - st.x, en.y - st.y), poly = Math.hypot(cx - st.x, cy - st.y) + Math.hypot(en.x - cx, en.y - cy), length = (chord + poly) / 2;
  return {d: `M${f(st.x)} ${f(st.y)} Q${f(cx)} ${f(cy)} ${f(en.x)} ${f(en.y)}`, tail: Math.min(.78, 112 / Math.max(1, length))};
};
const COMET = {duration: 1100, delay: 140, easing: 'cubic-bezier(.4, .08, .45, 1)', fill: 'both' as const};
function Comet({id, d, tail, tone}: {id: string; d: string; tail: number; tone?: string}) {
  const g = useRef<SVGGElement>(null);
  useLayoutEffect(() => {
    // (Never under reduced motion or Motion Off: there the layer is hidden, and nothing on the path may run.)
    if (!entranceAllowed()) return;
    const paths = [...(g.current?.querySelectorAll<SVGPathElement>('path') ?? [])];
    const runs = paths.map(p => {
      const near = p.classList.contains('path-comet-tail-near'), isTail = p.classList.contains('path-comet-tail'), l = near ? tail * .55 : tail;
      const peak = isTail ? (near ? .95 : .75) : p.classList.contains('path-comet-halo') ? .75 : 1;
      if (typeof p.animate !== 'function') return null;
      return isTail
        ? p.animate([{strokeDashoffset: l, opacity: 0}, {opacity: peak, offset: .08}, {opacity: peak, offset: .86}, {strokeDashoffset: l - 1, opacity: 0}], COMET)
        : p.animate([{strokeDashoffset: 0, opacity: 0}, {opacity: peak, offset: .08}, {opacity: peak, offset: .86}, {strokeDashoffset: -1, opacity: 0}], COMET);
    });
    return () => runs.forEach(r => r?.cancel());
  }, [d, tail]);
  return <g ref={g} className="path-comet" data-segment={id} style={tone ? {'--seg': tone} as CSSProperties : undefined}>
    <path className="path-comet-tail" d={d} fill="none" pathLength={1} strokeDasharray={`${tail.toFixed(3)} 2`}/>
    <path className="path-comet-tail path-comet-tail-near" d={d} fill="none" pathLength={1} strokeDasharray={`${(tail * .55).toFixed(3)} 2`}/>
    <path className="path-comet-halo" d={d} fill="none" pathLength={1}/>
    <path className="path-comet-head" d={d} fill="none" pathLength={1}/>
  </g>;
}
export function PathComets({geo, segments, comets, tones}: {geo: PathGeometry; segments: PathSegment[]; comets: Set<string>; tones?: Record<string, string>}) {
  const drawn = segments.filter(s => comets.has(s.id)).flatMap(s => { const c = arc(geo, s); return c ? [{...s, ...c}] : []; });
  if (!drawn.length) return null;
  return <svg className="path-line path-comets" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} aria-hidden="true" focusable="false">
    {drawn.map(s => <Comet key={s.id} id={s.id} d={s.d} tail={s.tail} tone={tones?.[s.id]}/>)}
  </svg>;
}
