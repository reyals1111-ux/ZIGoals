'use client';
import {useLayoutEffect, useRef, useState, type CSSProperties} from 'react';
import {SHELL_FRAME} from '../../lib/ai/zigi-look';
import type {ZigiMood} from '../../lib/path/model';
import {useZigiFrames} from '../zigi/bus';
import {ZigiFigure} from '../zigi/zigi-figure';
import {ZigiImage} from '../zigi/zigi-image';
import '../zigi/zigi.css';

/** ZIGi's existing states for each moment of the path (P7.6): encouraging at the first dot, presenting (pointing at) the
 *  next one, proud half way, celebrating when all are lit, a quick success right after a tick. Every one of them is a
 *  one-shot in ZIGi's manifest and its CSS move plays once (zigi.css), so nothing on the path loops. */
export const ZIGI_PATH_STATES: Record<ZigiMood | 'tick', string> = {empty: 'encouraging', start: 'encouraging', going: 'presenting', half: 'proud', done: 'celebrate', tick: 'success'};

/**
 * ZIGi on the path: the state's still frame (never its animated clip, so the path keeps to one-time motion) beside the
 * next dot with a small nebula arrow pointing at it, or beside the end when every dot is lit, and a short line in a bubble
 * when the caller gives one. The figure is keyed by its state, so each change plays its one CSS move once; reduced motion,
 * Motion Off and ZIGi's own animation Off show the still (zigi.css). Decorative: the dots name themselves and the page
 * announces each tick.
 *
 * Session AF (L3b): `alive` (the Checklist's full-screen path, where the owner allowed motion) draws ZIGi as a large
 * figure with its animated clips (ZigiFigure: the clip only while motion is allowed, else the still), standing in the
 * open sky beside the next dot. `cheer` (a tick just landed beside it): two hops and a ring of sparkles, once (CSS).
 *
 * Round 4–5 (the critiques: the celebrate frame reads as hands clutching the head; the greeting's poster as a salute):
 * every cheer — a tick, an orbit, the day's end, the day's celebration — shows one held frame of ZIGi's delivered greeting
 * clip, the open hand raised with a wink (public/brand/checklist/zigi-cheer-wave*.webp: frame 24 of F002-greeting, never
 * redrawn), with two hops, squash and stretch, a star burst behind and sparkles. The figures have no arms-up pose; that
 * needs new art. At rest beside the next planet ZIGi points at it (`presenting`, mirrored when it stands on the left).
 *
 * `fit` (a key that changes whenever the path's layout does): ZIGi measures the planets (with the next one's ring), names,
 * banners, chests, the NEXT tag and an open panel, each grown by 12 px, and takes the nearest place beside its planet where
 * its drawn box touches none of them — either side, a little further out, higher or lower, and, only where nothing else is
 * free, a little smaller — never past the screen. Placed before paint, again whenever the layout changes.
 */
const CHEER_SPARKS = 12, CLEAR = 13; // (12 px, and one more so rounding never brings it under)
type Side = 'left' | 'right';
type Box = {left: number; top: number; right: number; bottom: number};
const CHEER_STILL = {src: '/brand/checklist/zigi-cheer-wave-2x.webp', srcSet: '/brand/checklist/zigi-cheer-wave-2x.webp 1x, /brand/checklist/zigi-cheer-wave-large.webp 2x'};
/** A planet's box with its orbit ring and moon (the next planet's), as drawn: the ring's own box turns, so it is read from
 *  the dot's drawn box and the ring's layout size. */
export function ringBox(dot: Element): Box {
  const r = dot.getBoundingClientRect(), ring = dot.querySelector<HTMLElement>(':scope > .path-dot-orbit'), own = (dot as HTMLElement).offsetWidth || r.width;
  const extra = ring ? ((ring.offsetWidth - own) / 2 + 6) * (r.width / own) : 0;
  return {left: r.left - extra, top: r.top - extra, right: r.right + extra, bottom: r.bottom + extra};
}
/** What ZIGi must stay clear of on the path (its own parts and, while it cheers, its own planet's name aside). */
export function zigiObstacles(stage: Element, except: Element[]): Box[] {
  return [...stage.querySelectorAll('.path-dot, .path-label, .path-banner, .path-chest-art, .path-chest-text, .path-next-tag, .path-panel')]
    .filter(o => !except.some(e => e === o || e.contains(o)))
    .map(o => o.classList.contains('path-dot') ? ringBox(o) : o.getBoundingClientRect())
    .filter(r => r.right - r.left > 2 && r.bottom - r.top > 2);
}
const overlap = (a: Box, b: Box, grow: number) => Math.max(0, Math.min(a.right, b.right + grow) - Math.max(a.left, b.left - grow)) * Math.max(0, Math.min(a.bottom, b.bottom + grow) - Math.max(a.top, b.top - grow));
const GAPS = [13, 15, 18, 21, 24, 28, 32, 38, 44, 52, 60, 70], SHIFTS = Array.from({length: 41}, (_, i) => (i % 2 ? -1 : 1) * Math.ceil(i / 2) * 6), SCALES = [1, .96, .92, .88, .85, .8, .75, .7];
export function PathZigi({state, side, say, alive = false, centred = false, cheer = false, fit}: {state: string; side: Side; say?: string; alive?: boolean; centred?: boolean; cheer?: boolean; fit?: string}) {
  const frames = useZigiFrames(), frame = frames?.[state] ?? frames?.idle;
  const poster = frame ? {src: frame.poster.x1, srcSet: `${frame.poster.x1} 1x, ${frame.poster.x2} 2x`} : {src: SHELL_FRAME.x1, srcSet: `${SHELL_FRAME.x1} 1x, ${SHELL_FRAME.x2} 2x`};
  const ref = useRef<HTMLSpanElement>(null), [place, setPlace] = useState<{left: number; top: number; side: Side; scale: number} | null>(null), scaled = useRef(1);
  useLayoutEffect(() => {
    const el = ref.current, node = el?.parentElement, stage = el?.closest('.path-stage');
    if (!alive || fit === undefined || !el || !node || !stage) return;
    const measure = () => {
    // (Its planet; at the day's end, the trophy.)
    // (Its full size: the box it has now, undone by the scale it was last given.)
    const w0 = el.offsetWidth / scaled.current, h0 = el.offsetHeight / scaled.current, dot = node.querySelector(':scope > .path-dot') ?? node.querySelector(':scope > .path-chest-art');
    if (!w0 || !h0 || !dot) return;
    const n = node.getBoundingClientRect(), ring = ringBox(dot), cy = (ring.top + ring.bottom) / 2, right = document.documentElement.clientWidth - 4;
    // (While it cheers, its own planet's name steps back for that moment, CSS.)
    const own = cheer ? node.querySelector(':scope > .path-label') : null;
    const others = zigiObstacles(stage, [el, ...(own ? [own] : [])]);
    let best = null as {box: Box; side: Side; scale: number; cost: number} | null;
    for (const scale of SCALES) {
      const w = w0 * scale, h = h0 * scale;
      for (const s of [side, side === 'left' ? 'right' : 'left'] as Side[]) for (const gap of GAPS) for (const dy of SHIFTS) {
        const left = s === 'right' ? ring.right + gap : ring.left - gap - w, top = cy + dy - h / 2, box = {left, top, right: left + w, bottom: top + h};
        const hit = others.reduce((sum, o) => sum + overlap(box, o, CLEAR), 0), out = Math.max(0, 4 - box.left) + Math.max(0, box.right - right);
        // (Level with its planet matters more than full size: a figure far above or below reads as another planet's.)
        const cost = (hit > 0 || out > 0 ? 1e6 + hit + out * 1000 : 0) + gap * .7 + Math.abs(dy) * 1.3 + (s === side ? 0 : 24) + (1 - scale) * 500;
        if (!best || cost < best.cost) best = {box, side: s, scale, cost};
      }
      if (best && best.cost < 1e6) break;
    }
    if (!best) return;
    const next = {left: Math.round(best.box.left - n.left), top: Math.round(best.box.top - n.top), side: best.side, scale: best.scale};
    scaled.current = best.scale;
    setPlace(p => p && p.left === next.left && p.top === next.top && p.side === next.side && p.scale === next.scale ? p : next);
    };
    // Now, before paint; and again once a tick's own motion (a planet filling, a chest or the trophy opening) has settled.
    measure();
    const timers = [320, 1300].map(ms => window.setTimeout(measure, ms));
    return () => timers.forEach(t => window.clearTimeout(t));
  }, [alive, fit, side, state, cheer]);
  const shownSide = place?.side ?? side, cheering = alive && (cheer || state === 'celebrate');
  const placed = alive && place ? {left: place.left, top: place.top, right: 'auto', bottom: 'auto', translate: 'none', ...(place.scale !== 1 ? {height: `calc(var(--zigi-h) * ${place.scale})`, width: `calc(var(--zw) * ${place.scale})`} : {})} as CSSProperties : undefined;
  return <span ref={ref} className="path-zigi" data-side={shownSide} data-placed={place && alive ? '' : undefined} data-zigi-state={cheering ? 'cheer' : state} data-alive={alive || undefined} data-centred={centred || undefined} data-cheer={alive && cheer ? '' : undefined} aria-hidden="true" style={placed}>
    {alive && cheer && <span className="path-zigi-burst"/>}
    {cheering ? <span key={cheer ? 'cheer' : state} className="path-zigi-figure"><span className="zigi zigi-figure zigi-cheer"><ZigiImage poster={CHEER_STILL} width={SHELL_FRAME.width} height={SHELL_FRAME.height} alt="" decorative/></span></span>
      : alive ? <span key={state} className="path-zigi-figure"><ZigiFigure state={state}/></span>
      : <span key={state} className={`zigi zigi-${state} path-zigi-figure`} data-state={state}><ZigiImage poster={poster} width={SHELL_FRAME.width} height={SHELL_FRAME.height} alt="" decorative/></span>}
    {alive ? <span className="path-zigi-ground"/> : <span className="path-zigi-arrow"/>}
    {alive && cheer && <span className="path-zigi-cheer">{Array.from({length: CHEER_SPARKS}, (_, n) => <i key={n} data-tone={n % 3} style={{'--a': `${Math.round(n * 360 / CHEER_SPARKS)}deg`, '--d': `${52 + (n * 29) % 38}px`} as CSSProperties}/>)}</span>}
    {say && <span className="path-zigi-say">{say}</span>}
  </span>;
}

/** The cheer still outside the path (the day's celebration). */
export function ZigiCheer() {
  return <span className="zigi zigi-figure zigi-cheer"><ZigiImage poster={CHEER_STILL} width={SHELL_FRAME.width} height={SHELL_FRAME.height} alt="" decorative/></span>;
}
