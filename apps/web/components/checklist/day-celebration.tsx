'use client';
import {useLayoutEffect, useRef, useState, type CSSProperties} from 'react';
import {useEscapeLayer} from './escape-layers';
import {pushToastLayer} from '../ui/undo-toast';
import {FlameMark} from './checklist-marks';
import {ChecklistSky} from './checklist-sky';
import {OrbitPlanet} from '../orbit-path/orbit-planet';
import {CELEBRATION_ZIGI} from './celebration-zigi';
import type {PlanetDesign} from '../../lib/path/planet-designs';
import './day-celebration.css';

/**
 * Session AG Polish (ADR-030; owner Part 6b, references 17–20): the day's celebration, rebuilt. A full-screen moment on
 * the Checklist's own sky in the current theme (Nebula's starfield, Light's mist, Dark's black sky): nebula mists bloom
 * into view; the day's orbit planets (the owner's art, as on the path) rise from their places on the path, orbit each
 * other in pairs and settle into one ring, joined by a small glowing orb for every item done today in its node's colour —
 * so the headline's number is there in the ring — everything depth-sorted (what is behind passes behind, smaller); ZIGi
 * cheers with its animated clip and comes to rest on the same pose's sharp still; "All 9 planets lit!", the line, a glass
 * streak chip whose flame ignites once when the streak has just grown, and a nebula "Continue". One orchestrated
 * sequence of about 4.5 s (transform and opacity only), then a still, readable composition; under reduced motion and
 * Motion Off the final composition at once. A modal dialog: focus is held inside, Escape and Continue close it and focus
 * returns to the path; the last tick's Undo stays reachable. Its own chunk, loaded when it plays.
 */
const SEQUENCE = 4500;
const still = () => { try { return document.documentElement.dataset.appMotion === 'off' || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return true; } };
const ease = (k: number) => k < .5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;

/** The ring's slots: angles around a tilted ellipse, planets spread among the orbs, the first planet at the front. */
export function ringSlots(planets: number, orbs: number): {planet: boolean; index: number; angle: number}[] {
  const n = planets + orbs, out: {planet: boolean; index: number; angle: number}[] = [];
  const planetAt = new Set(Array.from({length: planets}, (_, i) => Math.round(i * n / Math.max(1, planets))));
  let p = 0, o = 0;
  for (let k = 0; k < n; k++) { const planet = planetAt.has(k) && p < planets; out.push({planet, index: planet ? p++ : o++, angle: Math.PI / 2 + k * 2 * Math.PI / n}); }
  return out;
}

export default function DayCelebration({streak, grew = false, perfect, total, colours = [], planets = [], onClose}: {streak: number; grew?: boolean; perfect: boolean; total: number; colours?: string[]; planets?: PlanetDesign[]; onClose: () => void}) {
  const ref = useRef<HTMLDialogElement>(null), button = useRef<HTMLButtonElement>(null), toastSlot = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null);
  const [rest, setRest] = useState(false), [motion] = useState(() => !still());
  useEscapeLayer(true, onClose);
  // (Opened before the sequence below measures the stage: a closed dialog has no size.)
  useLayoutEffect(() => {
    const d = ref.current; if (!d) return;
    const back = document.activeElement as HTMLElement | null;
    try { d.showModal(); } catch { /* shown in place */ }
    button.current?.focus({preventScroll: true});
    // The last tick's Undo stays in reach over the celebration (the toast moves into it while it is open).
    const releaseToast = toastSlot.current ? pushToastLayer(toastSlot.current) : () => undefined;
    return () => { releaseToast(); try { if (d.open) d.close(); } catch { /* gone */ } if (back?.isConnected) back.focus({preventScroll: true}); };
  }, []);
  const slots = ringSlots(planets.length, colours.length), many = colours.length + planets.length;
  // The one orchestrated sequence: each body's path through time, sampled into keyframes (transform, opacity, depth).
  useLayoutEffect(() => {
    const host = stage.current; if (!host) return;
    if (!motion) { setRest(true); return; }
    const box = host.getBoundingClientRect(), cx = box.left + box.width / 2, cy = box.top + box.height / 2, rx = box.width * .42, ry = box.width * .16;
    const anims: Animation[] = [];
    // (Where each planet stands on the path behind, as drawn; one off the screen rises from the nearest edge.)
    const onPath = [...document.querySelectorAll<HTMLElement>('.path-stage .orbit-planet .orbit-planet-sphere')].map(el => { const r = el.getBoundingClientRect(); return {x: r.left + r.width / 2, y: Math.max(-r.height, Math.min(innerHeight + r.height, r.top + r.height / 2)), w: r.width}; });
    for (const el of host.querySelectorAll<HTMLElement>('[data-slot]')) {
      const slot = slots[Number(el.dataset.slot)]!, endX = Math.cos(slot.angle) * rx, endY = Math.sin(slot.angle) * ry, endS = .78 + .3 * (Math.sin(slot.angle) + 1) / 2;
      const frames: Keyframe[] = [];
      if (slot.planet) {
        const from = onPath[slot.index] ?? null, sx = from ? from.x - cx : (slot.index % 2 ? 1 : -1) * box.width * .9, sy = from ? from.y - cy : box.height * 1.2, s0 = from ? Math.max(.4, Math.min(1.6, from.w / Math.max(1, el.offsetWidth))) : .6;
        // Pairs orbit each other (reference 18): the pair's centre, a radius and a start angle of their own.
        const pair = Math.floor(slot.index / 2), partner = slot.index % 2, pcx = (pair - (Math.ceil(planets.length / 2) - 1) / 2) * box.width * .36, pcy = -box.height * .06, pr = box.width * .14;
        for (let i = 0; i <= 40; i++) {
          const t = i / 40, ms = t * SEQUENCE; let x: number, y: number, s: number, z: number, o = 1;
          if (ms < 1300) { const k = ease(ms / 1300), a0 = partner * Math.PI; x = sx + (pcx + Math.cos(a0) * pr - sx) * k; y = sy + (pcy + Math.sin(a0) * pr * .45 - sy) * k; s = s0 + (1 - s0) * k; z = 120; o = Math.min(1, ms / 250); }
          else if (ms < 2900) { const k = (ms - 1300) / 1600, a = partner * Math.PI + k * Math.PI * 1.5; x = pcx + Math.cos(a) * pr; y = pcy + Math.sin(a) * pr * .45; s = .92 + .12 * Math.sin(a); z = Math.round(110 + 20 * Math.sin(a)); }
          else if (ms < 4100) { const k = ease((ms - 2900) / 1200), a = partner * Math.PI + Math.PI * 1.5, ax = pcx + Math.cos(a) * pr, ay = pcy + Math.sin(a) * pr * .45; x = ax + (endX - ax) * k; y = ay + (endY - ay) * k - Math.sin(k * Math.PI) * box.height * .05; s = (.92 + .12 * Math.sin(a)) * (1 - k) + endS * k; z = Math.round(100 + 50 * Math.sin(slot.angle)); }
          else { x = endX; y = endY; s = endS; z = Math.round(100 + 50 * Math.sin(slot.angle)); }
          frames.push({offset: t, transform: `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(3)})`, opacity: o, zIndex: z});
        }
      } else {
        // Orbs: born at the ring's heart once the planets turn, flying out to their places, one after another.
        const start = 2500 + slot.index * Math.min(60, 900 / Math.max(1, colours.length));
        for (let i = 0; i <= 30; i++) {
          const t = i / 30, ms = t * SEQUENCE, k = ease(Math.max(0, Math.min(1, (ms - start) / 1100)));
          frames.push({offset: t, transform: `translate(-50%, -50%) translate(${(endX * k).toFixed(1)}px, ${(endY * k).toFixed(1)}px) scale(${(.3 + (endS - .3) * k).toFixed(3)})`, opacity: ms < start ? 0 : Math.min(1, (ms - start) / 300), zIndex: Math.round(100 + 50 * Math.sin(slot.angle))});
        }
      }
      anims.push(el.animate(frames, {duration: SEQUENCE, easing: 'linear', fill: 'both'}));
    }
    const t = window.setTimeout(() => setRest(true), SEQUENCE);
    return () => { window.clearTimeout(t); anims.forEach(a => a.cancel()); };
    // one sequence per opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const word = total === 1 ? 'planet' : 'planets', size = Math.max(10, Math.min(18, 210 / Math.max(1, many)));
  return <dialog ref={ref} className="checklist-celebration" data-rest={rest || undefined} data-motion={motion || undefined} aria-labelledby="checklist-celebration-title" aria-describedby="checklist-celebration-line" onCancel={e => e.preventDefault()}>
    <div className="checklist-celebration-sky" aria-hidden="true"><ChecklistSky/></div>
    <div className="checklist-celebration-mists" aria-hidden="true"><i data-m="a"/><i data-m="b"/><i data-m="c"/><i data-m="d"/></div>
    <section className="checklist-celebration-card">
      <div ref={stage} className="checklist-celebration-stage" aria-hidden="true" style={{'--orb': `${size}px`} as CSSProperties}>
        <svg className="checklist-celebration-ring" viewBox="-100 -40 200 80" preserveAspectRatio="none"><ellipse cx="0" cy="0" rx="84" ry="32"/><ellipse cx="0" cy="0" rx="94" ry="37" opacity=".5"/></svg>
        {slots.map((slot, k) => {
          const x = `calc(${Math.cos(slot.angle).toFixed(4)} * var(--rx))`, y = `calc(${Math.sin(slot.angle).toFixed(4)} * var(--ry))`, s = (.78 + .3 * (Math.sin(slot.angle) + 1) / 2).toFixed(3), z = Math.round(100 + 50 * Math.sin(slot.angle));
          const style = {transform: `translate(-50%, -50%) translate(${x}, ${y}) scale(${s})`, zIndex: z} as CSSProperties;
          return slot.planet
            ? <span key={k} className="checklist-celebration-planet" data-slot={k} style={style}><OrbitPlanet design={planets[slot.index]!} lit just={false} point={`celebration:${k}`}/></span>
            : <span key={k} className="checklist-celebration-orb" data-slot={k} style={{...style, '--c': colours[slot.index]} as CSSProperties}/>;
        })}
        <span className="checklist-celebration-zigi" data-rest={rest || undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ZIGi's own figures: the clip while it cheers, the sharp still at rest */}
          {motion && !rest && <img className="checklist-celebration-zigi-clip" src={CELEBRATION_ZIGI.clip} alt="" width={96} height={126} decoding="async"/>}
          {/* eslint-disable-next-line @next/next/no-img-element -- as above */}
          <img className="checklist-celebration-zigi-still" src={CELEBRATION_ZIGI.still} alt="" width={480} height={632} decoding="async"/>
        </span>
      </div>
      <h2 id="checklist-celebration-title" className="checklist-celebration-title">All {total} {word} <span className="checklist-celebration-lit">lit!</span></h2>
      <p id="checklist-celebration-line" className="checklist-celebration-line">{perfect ? 'Every planet today, in path order — a Perfect orbit!' : 'Every planet today, in your own order.'}</p>
      <p className="checklist-celebration-streak" data-grew={grew && motion ? '' : undefined}><span className="checklist-celebration-flame"><FlameMark lit/></span><span className="checklist-celebration-streak-rule" aria-hidden="true"/><strong>{streak} day streak</strong></p>
      <button ref={button} type="button" className="checklist-celebration-go" onClick={onClose}>Continue</button>
      <div ref={toastSlot} className="checklist-toast-slot checklist-celebration-undo"/>
    </section>
  </dialog>;
}
