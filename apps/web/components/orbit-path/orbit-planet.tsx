'use client';
import {useEffect, useId, useRef, type CSSProperties} from 'react';
import {entranceAllowed} from '../use-entrance';
import type {PlanetDesign, PlanetEllipse, PlanetRing} from '../../lib/path/planet-designs';
import {orbitPoint} from '../../lib/path/planet-orbit';
import './orbit-planet.css';

/**
 * Session AG Polish (ADR-030 J12; owner Part 4, pointers 5–8, references 03–10): an orbit's planet — the owner's own art,
 * one of seven designs — standing on the path's line at its orbit's banner. Layers, back to front: a soft mist and glow in
 * the planet's hue (CSS), the far half of its rings and orbits (SVG), the far side of its moons, the sphere (a cut-out
 * WebP, lazily, the small file on phones), the near half of its rings, the near side of its moons. So a moon passing
 * behind is hidden by the sphere and a ring's far half is never drawn over it — correct occlusion, no fake circles.
 *
 * Matte and dim until its orbit is complete (like a node not yet reached); lit once it is. `just`: the orbit has just been
 * completed here — the one-time completion (about 3 s, then still): the glow blooms and the mist breathes out and settles,
 * a light travels once along each ring (far half, then near half: along the ellipse, never a spin of a flat ring), the
 * neon orbits trace once, and the moons and bodies travel along their tilted orbits, through the far side (smaller,
 * dimmer, clipped by the sphere) and out on the near side. Under reduced motion and Motion Off: lit and still. A day that
 * opens with its orbit already complete shows it lit and still (no replay). Decorative (aria-hidden): the banner carries
 * the orbit's name and count. The sphere's box carries `data-path-point`, so the line meets its rim.
 */
const MS = 3000;
const half = (e: PlanetEllipse, far: boolean, grow = 0) => {
  const rx = e.rx + grow, ry = e.ry * (rx / e.rx);
  return far ? `M${e.cx - rx} ${e.cy}A${rx} ${ry} 0 0 1 ${e.cx + rx} ${e.cy}` : `M${e.cx + rx} ${e.cy}A${rx} ${ry} 0 0 1 ${e.cx - rx} ${e.cy}`;
};
const ease = (k: number) => k < .5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;

function Ring({ring, far, filter, just, index}: {ring: PlanetRing; far: boolean; filter: string; just: boolean; index: number}) {
  const d = half(ring, far), wide = ring.kind === 'band' ? ring.width * 2.1 : ring.kind === 'rubble' ? ring.width * 1.4 : 3.2;
  return <g transform={`rotate(${ring.tilt} ${ring.cx} ${ring.cy})`} opacity={ring.opacity} className="orbit-planet-ring" data-kind={ring.kind}>
    <path d={d} stroke={ring.glow} strokeWidth={wide} opacity={ring.kind === 'neon' ? .75 : .45} filter={`url(#${filter})`}/>
    {ring.kind === 'rubble'
      ? <><path d={d} stroke={ring.colour} strokeWidth={ring.width * .8} opacity=".28"/><path d={d} stroke={ring.colour} strokeWidth={1.6} strokeDasharray="0.01 2.3" strokeLinecap="round" opacity=".95"/><path d={d} stroke="#ffe6fb" strokeWidth={0.9} strokeDasharray="0.01 3.7" strokeDashoffset="1.4" strokeLinecap="round" opacity=".7"/></>
      : <path d={d} stroke={ring.colour} strokeWidth={ring.width} opacity={ring.kind === 'band' ? .62 : 1}/>}
    {ring.kind === 'neon' && <path d={d} stroke="#ffffff" strokeWidth={ring.width * .38} opacity=".85"/>}
    {ring.strands?.map(off => <path key={off} d={half(ring, far, off)} stroke={ring.colour} strokeWidth={ring.kind === 'band' ? .7 : .55} opacity=".7"/>)}
    {/* The one-time light along the ring: the far half first, then the near half, as one light going round. */}
    {just && <path className="orbit-planet-light" d={d} pathLength={1} stroke="#ffffff" strokeWidth={ring.kind === 'band' ? ring.width * .7 : 1.6} style={{animationDelay: `${(far ? 500 : 1350) + index * 160}ms`}}/>}
    {just && ring.kind === 'neon' && <path className="orbit-planet-trace" d={d} pathLength={1} stroke={ring.colour} strokeWidth={ring.width * 1.6} style={{animationDelay: `${(far ? 300 : 1000) + index * 220}ms`}}/>}
  </g>;
}

export function OrbitPlanet({design, lit, just, point}: {design: PlanetDesign; lit: boolean; just: boolean; point: string}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, ''), filter = `orbit-planet-blur-${uid}`, root = useRef<HTMLSpanElement>(null);
  const {x: ex, y: ey} = design.extent, view = `${-ex} ${-ey} ${ex * 2} ${ey * 2}`;
  // The travellers: moons (their own art) and the small bodies on the neon orbits, each in a far copy and a near copy.
  const travellers = [
    ...design.moons.map((m, i) => ({key: `m${i}`, orbit: m.orbit, from: m.from, to: m.to, size: m.size, src: m.src as string | null, colour: null as string | null})),
    ...design.bodies.map((b, i) => ({key: `b${i}`, orbit: design.rings[b.ring]!, from: b.from, to: b.to, size: b.size, src: null, colour: b.colour})),
  ];
  // At rest: where the art has them before the orbit is complete, where the travel ends once it is.
  const rest = (tr: typeof travellers[number]) => orbitPoint(tr.orbit, lit ? tr.to : tr.from);
  useEffect(() => {
    if (!just || !entranceAllowed() || !travellers.length) return;
    const host = root.current; if (!host) return;
    const els = travellers.map(tr => ({tr, back: host.querySelector<SVGGElement>(`[data-traveller="${tr.key}"][data-layer=back]`), front: host.querySelector<SVGGElement>(`[data-traveller="${tr.key}"][data-layer=front]`)}));
    const t0 = performance.now(); let frame = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0 - 250) / MS), e = ease(Math.max(0, k));
      for (const {tr, back, front} of els) {
        const p = orbitPoint(tr.orbit, tr.from + (tr.to - tr.from) * e), near = Math.min(1, Math.max(0, (p.near + .1) / .2)), s = 1 + .08 * p.near;
        const tf = `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${s.toFixed(3)})`;
        back?.setAttribute('transform', tf); front?.setAttribute('transform', tf);
        back?.setAttribute('opacity', ((1 - near) * (.72 + .28 * (1 + p.near))).toFixed(3)); front?.setAttribute('opacity', near.toFixed(3));
      }
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // one run per completion; the design does not change under a mounted planet
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [just]);
  const traveller = (tr: typeof travellers[number], layer: 'back' | 'front') => {
    const p = rest(tr), near = p.near > 0, show = layer === 'front' ? near : !near, s = 1 + .08 * p.near;
    return <g key={`${tr.key}-${layer}`} data-traveller={tr.key} data-layer={layer} transform={`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${s.toFixed(3)})`} opacity={show ? (layer === 'back' ? .8 : 1) : 0}>
      {tr.src ? <image href={tr.src} x={-tr.size / 2} y={-tr.size / 2} width={tr.size} height={tr.size}/>
        : <><circle r={tr.size * 1.6} fill={tr.colour ?? '#ffffff'} opacity=".35" filter={`url(#${filter})`}/><circle r={tr.size / 2} fill="#ffffff"/></>}
    </g>;
  };
  return <span ref={root} className="orbit-planet" data-planet={design.id} data-lit={lit ? '' : undefined} data-just={just ? '' : undefined} aria-hidden="true"
    style={{'--ex': ex / 50, '--ey': ey / 50, '--planet-glow': design.glow, '--mist-a': design.mist[0], '--mist-b': design.mist[1]} as CSSProperties}>
    <span className="orbit-planet-mist"/>
    <span className="orbit-planet-glow"/>
    <svg className="orbit-planet-back" viewBox={view} fill="none" focusable="false">
      <defs><filter id={filter} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter></defs>
      {design.rings.map((r, i) => <Ring key={i} ring={r} far filter={filter} just={just} index={i}/>)}
      {travellers.map(tr => traveller(tr, 'back'))}
    </svg>
    <span className="orbit-planet-sphere" data-path-point={point}>
      {/* eslint-disable-next-line @next/next/no-img-element -- the owner's own art, a small cut-out, lazily */}
      <img src={design.sphere.src} srcSet={`${design.sphere.srcSm} 128w, ${design.sphere.src} 256w`} sizes="(max-width: 640px) 64px, 128px" width={256} height={256} alt="" loading="lazy" decoding="async"/>
    </span>
    <svg className="orbit-planet-front" viewBox={view} fill="none" focusable="false">
      {design.rings.map((r, i) => <Ring key={i} ring={r} far={false} filter={filter} just={just} index={i}/>)}
      {travellers.map(tr => traveller(tr, 'front'))}
    </svg>
  </span>;
}
