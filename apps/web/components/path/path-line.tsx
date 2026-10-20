'use client';
import {useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties} from 'react';
import {PATH_NEON_STOPS} from '../../lib/path/colours';
import type {PathSegment} from '../../lib/path/model';
import {entranceAllowed} from '../use-entrance';
import {curve, type PathGeometry} from './use-path-geometry';
import {labelBox} from './path-zigi';

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

/** Session AF (L3b, rounds 3–7): the orbit look's comets fly from the rim of the planet just ticked to the rim of the next
 *  one. Round 7: on one smooth circular arc (a quadratic with its control point far out read as a hook), bowing out by
 *  75 % of the distance between the planets (90 px at most) on whichever side crosses less — names, ZIGi, chests, other
 *  planets — measured as it starts; it passes behind everything on the path, as the line does (path-orbit.css). Round 8:
 *  names count from 12 px around them, and flatter arcs are tried too, so the comet keeps 12 px from names (round 9: in fine
 *  steps, flattening only as much as the names require).
 *  Round 9: never one that bows toward ZIGi. An 18 px white-hot head in a
 *  halo of the planet's colour and a tail of about 110 px drawn (at most 85 % of the arc; round 9: was 78 %), animated with each comet's own
 *  lengths (the Web Animations API: a CSS keyframe reading a custom property stepped instead of gliding); the head fades
 *  at the rim and the next planet's ring flashes (PathDot `arrive`). Drawn only while a segment is in `comets`;
 *  decorative; never under reduced motion or Motion Off (CSS hides the layer). */
type Arc = {d: string; tail: number; pts: [number, number][]};
const arc = (geo: PathGeometry, s: PathSegment, bow: 1 | -1, round = .75): Arc | null => {
  const a = geo.points[s.from], b = geo.points[s.to]; if (!a || !b) return null;
  const dx = b.x - a.x, dy = b.y - a.y, c = Math.max(1, Math.hypot(dx, dy)), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const ux = -dy / c * bow, uy = dx / c * bow, h = Math.min(c * round, 90), R = (c * c / 4 + h * h) / (2 * h);
  // (The circle through both planets' centres with its farthest point h out; the arc runs through that point.)
  const ox = mx + ux * (h - R), oy = my + uy * (h - R), ta = Math.atan2(a.y - oy, a.x - ox), tb = Math.atan2(b.y - oy, b.x - ox);
  const tm = Math.atan2(my + uy * h - oy, mx + ux * h - ox), norm = (t: number) => ((t % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  // (Which way round: the way from a that meets the farthest point before b.)
  const dir = norm(tm - ta) < norm(tb - ta) ? 1 : -1, sweep = dir > 0 ? norm(tb - ta) : norm(ta - tb);
  // (From rim to rim: the next planet is drawn a size larger than its own radius.)
  const cut = (r: number) => 2 * Math.asin(Math.min(1, r / (2 * R))), t0 = ta + dir * cut((a.r ?? 0) + 2), t1 = tb - dir * cut((b.r ?? 0) * 1.15 + 2);
  const span = sweep - cut((a.r ?? 0) + 2) - cut((b.r ?? 0) * 1.15 + 2); if (span <= .05) return null;
  const at = (t: number): [number, number] => [ox + R * Math.cos(t), oy + R * Math.sin(t)], st = at(t0), en = at(t1), f = (n: number) => n.toFixed(1), length = R * span;
  const count = Math.max(2, Math.ceil(length / 3)), pts = Array.from({length: count}, (_, n): [number, number] => at(t0 + dir * span * n / (count - 1)));
  return {d: `M${f(st[0])} ${f(st[1])} A${f(R)} ${f(R)} 0 ${span > Math.PI ? 1 : 0} ${dir > 0 ? 1 : 0} ${f(en[0])} ${f(en[1])}`, tail: Math.min(.85, 112 / Math.max(1, length)), pts};
};
const COMET = {duration: 1100, delay: 140, easing: 'cubic-bezier(.4, .08, .45, 1)', fill: 'both' as const};
/** How far an arc may bow, as a share of the distance between its planets: the roundest that keeps clear of the names wins
 *  (round 9: in fine steps, so it flattens only as much as the names require — a phone's tick keeps a 60–80 px tail). */
const ROUNDS = [.75, .7, .65, .6, .55, .5, .4, .3, .2, .12, .06];
/** How much of an arc runs over something on the path (names shown, ZIGi, chests, planets other than its own two), or off it. */
/** Whether an arc bows toward ZIGi where it stands (its laid-out place, never through a move). */
function towardZigi(svg: SVGSVGElement): (arc: Arc) => boolean {
  const stage = svg.closest('.path-stage'), z = stage?.querySelector<HTMLElement>('.path-zigi'); if (!stage || !z) return () => false;
  const sb = stage.getBoundingClientRect(), p = z.parentElement!.getBoundingClientRect(), zx = p.left + z.offsetLeft + z.offsetWidth / 2 - sb.left, zy = p.top + z.offsetTop + z.offsetHeight / 2 - sb.top;
  return arc => { const a = arc.pts[0]!, b = arc.pts.at(-1)!, m = arc.pts[Math.floor(arc.pts.length / 2)]!, side = (x: number, y: number) => Math.sign((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0])); return side(m[0], m[1]) === side(zx, zy); };
}
const labelRect = (l: Element) => { const b = labelBox(l); return new DOMRect(b.left, b.top, b.right - b.left, b.bottom - b.top); };
function crossings(svg: SVGSVGElement, arc: Arc, ends: string[]): number {
  const stage = svg.closest('.path-stage'); if (!stage) return 0;
  const sb = stage.getBoundingClientRect();
  // (ZIGi where it is placed — its box as laid out, with room for its hops — never through a move still running.)
  const placed = (z: HTMLElement) => { const p = z.parentElement!.getBoundingClientRect(); return new DOMRect(p.left + z.offsetLeft, p.top + z.offsetTop - 24, z.offsetWidth, z.offsetHeight + 24); };
  const boxes = [...stage.querySelectorAll<HTMLElement>('.path-label, .path-zigi, .path-chest-art, .path-dot, .path-next-tag')]
    .filter(o => !(o.classList.contains('path-dot') && ends.includes(o.dataset.pathPoint ?? '')) && (o.classList.contains('path-zigi') || Number(getComputedStyle(o).opacity) > .5))
    // (A name counts from 12.5 px around it — 12, and a little for the arc between the points sampled, 3 px apart — and two thousand times
    // what passing behind ZIGi, a chest or a planet does (counted from 6 px): beside a name a comet reads as touching it, behind
    // the rest it is only hidden for a moment — round 9: so the arc flattens only for names.)
    // (A name where it comes to rest: the ticked planet's steps back in, the next one's out, while the comet flies.)
    .map(o => ({r: o.classList.contains('path-zigi') ? placed(o) : o.classList.contains('path-label') ? labelRect(o) : o.getBoundingClientRect(), name: o.classList.contains('path-label')})).filter(({r}) => r.width > 2 && r.height > 2)
    .map(({r, name}) => { const grow = name ? 12.5 : 6; return {left: r.left - sb.left - grow, top: r.top - sb.top - grow, right: r.right - sb.left + grow, bottom: r.bottom - sb.top + grow, weight: name ? 100 : .05}; });
  return arc.pts.reduce((sum, [x, y]) => sum + (x < 4 || x > sb.width - 4 ? 1 : Math.max(0, ...boxes.filter(b => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom).map(b => b.weight))), 0);
}
function Comet({id, ends, arcs, tone}: {id: string; ends: string[]; arcs: Arc[]; tone?: string}) {
  const g = useRef<SVGGElement>(null), [pick, setPick] = useState<number | null>(null);
  // (Which way it bows is read from the page once, as it starts — once ZIGi has taken its place for the cheer.)
  useLayoutEffect(() => {
    if (pick !== null) return;
    if (!entranceAllowed() || arcs.length < 2) { setPick(0); return; }
    // (The arc crossing least, a flatter one counting a little more — it is shorter, its tail with it: arcs come rounder first.)
    // (Round 9: and never one that bows toward ZIGi — its middle on ZIGi's side of the line between its ends.)
    const frame = requestAnimationFrame(() => {
      const svg = g.current?.ownerSVGElement; if (!svg) { setPick(0); return; }
      const toward = towardZigi(svg), n = arcs.map((a, i) => crossings(svg, a, ends) + Math.floor(i / 2) * 3 + (toward(a) ? 1e6 : 0));
      setPick(n.indexOf(Math.min(...n)));
    });
    return () => cancelAnimationFrame(frame);
  }, [pick, arcs, ends]);
  const chosen = pick === null ? null : arcs[pick] ?? null, d = chosen?.d ?? '', tail = chosen?.tail ?? 0;
  useLayoutEffect(() => {
    // (Never under reduced motion or Motion Off: there the layer is hidden, and nothing on the path may run.)
    if (!d || !entranceAllowed()) return;
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
  return <g ref={g} className="path-comet" data-segment={id} data-bow={pick ?? undefined} style={tone ? {'--seg': tone} as CSSProperties : undefined}>
    {d && <>
      <path className="path-comet-tail" d={d} fill="none" pathLength={1} strokeDasharray={`${tail.toFixed(3)} 2`}/>
      <path className="path-comet-tail path-comet-tail-near" d={d} fill="none" pathLength={1} strokeDasharray={`${(tail * .55).toFixed(3)} 2`}/>
      <path className="path-comet-halo" d={d} fill="none" pathLength={1}/>
      <path className="path-comet-head" d={d} fill="none" pathLength={1}/>
    </>}
  </g>;
}
export function PathComets({geo, segments, comets, tones}: {geo: PathGeometry; segments: PathSegment[]; comets: Set<string>; tones?: Record<string, string>}) {
  const drawn = useMemo(() => segments.filter(s => comets.has(s.id)).flatMap(s => { const arcs = ROUNDS.flatMap(round => ([1, -1] as const).map(bow => arc(geo, s, bow, round))).filter((x): x is Arc => x !== null); return arcs.length ? [{...s, arcs, ends: [s.from, s.to]}] : []; }), [geo, segments, comets]);
  if (!drawn.length) return null;
  return <svg className="path-line path-comets" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} aria-hidden="true" focusable="false">
    {drawn.map(s => <Comet key={s.id} id={s.id} ends={s.ends} arcs={s.arcs} tone={tones?.[s.id]}/>)}
  </svg>;
}
