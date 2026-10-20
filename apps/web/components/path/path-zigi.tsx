'use client';
import {useLayoutEffect, useRef, useState, type CSSProperties} from 'react';
import {SHELL_FRAME} from '../../lib/ai/zigi-look';
import type {ZigiMood} from '../../lib/path/model';
import {useZigiFrames} from '../zigi/bus';
import {entranceAllowed} from '../use-entrance';
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
 * Rounds 4–6 (the critiques: the celebrate frame reads as hands clutching the head, the greeting frames as a salute or a
 * hand at the brow, and a 96 px clip frame drawn at 130–230 px is soft): on the Checklist's path, at the day's trophy and
 * in the day's celebration ZIGi is drawn from a delivered still at its large size (480 × 632), never upscaled (the largest
 * drawn size, 260 px, needs 520): F006-presenting — the arm held out with an open hand, away from the face, as one presents
 * something: the next planet at rest, the planet just ticked during a cheer, the trophy at the day's end. Only where its
 * place beside the next planet would put that arm's line on a planet already done (so it would seem to point back at the
 * one just ticked) does it rest in F001-idle instead, arms down, facing the next planet. A cheer adds two hops with squash and stretch, a star burst behind and sparkles; the figure faces its planet
 * (mirrored on the planet's left). The figures have no arms-up pose; that needs new art.
 *
 * `fit` (a key that changes whenever the path's layout does): ZIGi measures the planets (the next one with its ring and
 * moon), names, banners, chests, the NEXT tag and an open panel, each grown by 12 px, and takes the nearest place beside
 * its planet where its drawn box touches none of them — preferring the place it already stands, so it does not jump —
 * either side, a little further out, higher or lower, smaller only where nothing else is free, never past the screen.
 * Placed before paint, again once a tick's motion has settled; a move from one place to the next glides (480 ms), and
 * nothing else on the path moves for it.
 */
const CHEER_SPARKS = 12, CLEAR = 13; // (12 px, and one more so rounding never brings it under)
type Side = 'left' | 'right';
type Box = {left: number; top: number; right: number; bottom: number};
const PRESENT = '/brand/figures/zigi/origami-nebula/F006-presenting-large.webp', PRESENT_STILL = {src: PRESENT, srcSet: `${PRESENT} 1x`};
const IDLE = '/brand/figures/zigi/origami-nebula/F001-idle-large.webp', IDLE_STILL = {src: IDLE, srcSet: `${IDLE} 1x`};
/** Where ZIGi last stood on each path (in the stage's own coordinates), so its next place can prefer it and glide from it. */
const lastSeen = new WeakMap<Element, {x: number; y: number; w: number; h: number; at: number}>();
const RECENT_MS = 5000;
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
const GAPS = [13, 15, 18, 21, 24, 28, 32, 38, 44, 52, 60, 70, 84, 100, 120, 145, 175], SHIFTS = Array.from({length: 107}, (_, i) => (i % 2 ? -1 : 1) * Math.ceil(i / 2) * 3), SCALES = [1, .985, .96, .92, .88, .85, .82, .8, .75, .7, .65, .6], SIZE = 500, NEAR = 60, STAY = 40, ARM = .42, AIM = 90, AIM_ON = 30;
export function PathZigi({state, side, say, alive = false, centred = false, cheer = false, fit}: {state: string; side: Side; say?: string; alive?: boolean; centred?: boolean; cheer?: boolean; fit?: string}) {
  const frames = useZigiFrames(), frame = frames?.[state] ?? frames?.idle;
  const poster = frame ? {src: frame.poster.x1, srcSet: `${frame.poster.x1} 1x, ${frame.poster.x2} 2x`} : {src: SHELL_FRAME.x1, srcSet: `${SHELL_FRAME.x1} 1x, ${SHELL_FRAME.x2} 2x`};
  const ref = useRef<HTMLSpanElement>(null), [place, setPlace] = useState<{left: number; top: number; side: Side; scale: number; idle: boolean} | null>(null), scaled = useRef(1);
  useLayoutEffect(() => {
    const el = ref.current, node = el?.parentElement, stage = el?.closest('.path-stage');
    if (!alive || fit === undefined || !el || !node || !stage) return;
    const measure = () => {
    // (Its planet; at the day's end, the trophy. Its full size: the box it has now, undone by the scale it was last given.)
    const w0 = el.offsetWidth / scaled.current, h0 = el.offsetHeight / scaled.current, dot = node.querySelector(':scope > .path-dot') ?? node.querySelector(':scope > .path-chest-art');
    if (!w0 || !h0 || !dot) return;
    const n = node.getBoundingClientRect(), sb = stage.getBoundingClientRect(), ring = ringBox(dot), cy = (ring.top + ring.bottom) / 2, right = document.documentElement.clientWidth - 4;
    const seen = lastSeen.get(stage), prev = seen && performance.now() - seen.at < RECENT_MS ? seen : null;
    // (While it cheers, its own planet's name steps back for that moment, CSS.)
    const own = cheer ? node.querySelector(':scope > .path-label') : null;
    const others = zigiObstacles(stage, [el, ...(own ? [own] : [])]);
    // (At rest its arm — held out at about 42 % of its height — must point at this planet: where it passes above or below
    // it and on to another planet within 260 px, ZIGi would seem to point at that one — a planet already done (the one just
    // ticked) costs AIM more, one still to come AIM_ON.)
    const planets = cheer ? [] : [...stage.querySelectorAll<HTMLElement>('.path-dot')].filter(d => d !== dot).map(d => ({...ringBox(d), done: d.dataset.state === 'done'}));
    const pointsAt = (box: Box, s: Side): 'next' | 'done' | 'later' | 'none' => {
      const arm = box.top + (box.bottom - box.top) * ARM;
      if (arm >= ring.top - 6 && arm <= ring.bottom + 6) return 'next';
      const from = s === 'right' ? box.left - 260 : box.right, to = s === 'right' ? box.left : box.right + 260;
      const on = planets.filter(o => o.top <= arm && o.bottom >= arm && o.right >= from && o.left <= to);
      return on.some(o => o.done) ? 'done' : on.length ? 'later' : 'none';
    };
    const aim = (box: Box, s: Side) => { if (cheer) return 0; const at = pointsAt(box, s); return at === 'done' ? AIM : at === 'later' ? AIM_ON : 0; };
    let best = null as {box: Box; side: Side; scale: number; cost: number} | null;
    for (const [k, scale] of SCALES.entries()) {
      const w = w0 * scale, h = h0 * scale;
      // (Heights to try: a fine grid, and every place that just clears something above or below.)
      const dys = [...SHIFTS, ...others.flatMap(o => [o.bottom + CLEAR + .5 + h / 2 - cy, o.top - CLEAR - .5 - h / 2 - cy]).filter(d => Math.abs(d) <= 170)];
      for (const s of [side, side === 'left' ? 'right' : 'left'] as Side[]) for (const gap of GAPS) for (const dy of dys) {
        const left = s === 'right' ? ring.right + gap : ring.left - gap - w, top = cy + dy - h / 2, box = {left, top, right: left + w, bottom: top + h};
        const hit = others.reduce((sum, o) => sum + overlap(box, o, CLEAR), 0), out = Math.max(0, 4 - box.left) + Math.max(0, box.right - right);
        // (Near and level with its planet, then full size, then the open side of the wave, and pointing at it.)
        const cost = (hit > 0 || out > 0 ? 1e6 + hit + out * 1000 : 0) + gap * 1.4 + Math.abs(dy) * 1 + (s === side ? 0 : 24) + (1 - scale) * SIZE + aim(box, s);
        if (!best || cost < best.cost) best = {box, side: s, scale, cost};
      }
      // (A smaller ZIGi near its planet may beat a full-size one far off: stop only once no smaller size could.)
      if (best && best.cost < 1e6 && best.cost <= (1 - (SCALES[k + 1] ?? 0)) * SIZE) break;
    }
    if (!best) return;
    // Where it stood a moment ago (its cheer, or this place before a re-measure) it stays, so long as that place is clear,
    // beside this planet (within NEAR px of its ring, level with it), as large and nearly as good: it never needs to jump.
    if (prev) {
      const box = {left: sb.left + prev.x, top: sb.top + prev.y, right: sb.left + prev.x + prev.w, bottom: sb.top + prev.y + prev.h}, scale = prev.h / h0;
      const s: Side | null = box.left >= ring.right ? 'right' : box.right <= ring.left ? 'left' : null, gap = s === 'right' ? box.left - ring.right : ring.left - box.right;
      const hit = others.reduce((sum, o) => sum + overlap(box, o, CLEAR), 0), out = Math.max(0, 4 - box.left) + Math.max(0, box.right - right);
      if (s && hit === 0 && out === 0 && gap <= NEAR && box.top < ring.bottom && box.bottom > ring.top && scale <= 1.001 && scale >= best.scale - .02) {
        const cost = gap * 1.4 + Math.abs((box.top + box.bottom) / 2 - cy) + (s === side ? 0 : 24) + (1 - scale) * SIZE + aim(box, s);
        if (cost <= best.cost + STAY) best = {box, side: s, scale: Math.min(1, scale), cost};
      }
    }
    // (Where no place lets it point at this planet without pointing at one already done, it stands idle instead.)
    const idle = !cheer && pointsAt(best.box, best.side) === 'done';
    const next = {left: Math.round(best.box.left - n.left), top: Math.round(best.box.top - n.top), side: best.side, scale: best.scale, idle};
    scaled.current = best.scale;
    setPlace(p => p && p.left === next.left && p.top === next.top && p.side === next.side && p.scale === next.scale && p.idle === next.idle ? p : next);
    };
    // Now, before paint; and again once a tick's own motion (a planet filling, a chest or the trophy opening) has settled.
    measure();
    const timers = [320, 1300].map(ms => window.setTimeout(measure, ms));
    return () => timers.forEach(t => window.clearTimeout(t));
  }, [alive, fit, side, state, cheer]);
  // Once placed: glide from where it stood (unless motion is off), and remember where it stands.
  useLayoutEffect(() => {
    const el = ref.current, node = el?.parentElement, stage = el?.closest('.path-stage');
    if (!alive || !place || !el || !node || !stage) return;
    // (Its place as laid out — never read through a glide still running.)
    const sb = stage.getBoundingClientRect(), n = node.getBoundingClientRect(), now = {x: n.left + place.left - sb.left, y: n.top + place.top - sb.top, w: el.offsetWidth, h: el.offsetHeight, at: performance.now()};
    const seen = lastSeen.get(stage), from = seen && now.at - seen.at < RECENT_MS ? seen : null;
    if (from && entranceAllowed() && typeof el.animate === 'function' && Math.hypot(from.x - now.x, from.y - now.y) > 3) {
      el.getAnimations().forEach(a => a.cancel());
      el.animate([{transform: `translate(${from.x - now.x}px, ${from.y - now.y}px) scale(${from.h / now.h})`, transformOrigin: '0 0'}, {transform: 'none', transformOrigin: '0 0'}], {duration: 480, easing: 'cubic-bezier(.3, .7, .25, 1)'});
    }
    lastSeen.set(stage, now);
  }, [alive, place]);
  const shownSide = place?.side ?? side, cheering = alive && (cheer || state === 'celebrate');
  const placed = alive && place ? {left: place.left, top: place.top, right: 'auto', bottom: 'auto', translate: 'none', ...(place.scale !== 1 ? {height: `calc(var(--zigi-h) * ${place.scale})`, width: `calc(var(--zw) * ${place.scale})`} : {})} as CSSProperties : undefined;
  return <span ref={ref} className="path-zigi" data-side={shownSide} data-placed={place && alive ? '' : undefined} data-zigi-state={cheering ? 'cheer' : state} data-alive={alive || undefined} data-centred={centred || undefined} data-cheer={alive && cheer ? '' : undefined} aria-hidden="true" style={placed}>
    {alive && cheer && <span className="path-zigi-burst"/>}
    {alive ? <span key={cheer ? 'cheer' : 'rest'} className="path-zigi-figure"><span className={`zigi zigi-figure zigi-${place?.idle && !cheer ? 'idle' : 'present'}`}><ZigiImage poster={place?.idle && !cheer ? IDLE_STILL : PRESENT_STILL} width={SHELL_FRAME.width} height={SHELL_FRAME.height} alt="" decorative/></span></span>
      : <span key={state} className={`zigi zigi-${state} path-zigi-figure`} data-state={state}><ZigiImage poster={poster} width={SHELL_FRAME.width} height={SHELL_FRAME.height} alt="" decorative/></span>}
    {alive ? <span className="path-zigi-ground"/> : <span className="path-zigi-arrow"/>}
    {alive && cheer && <span className="path-zigi-cheer">{Array.from({length: CHEER_SPARKS}, (_, n) => <i key={n} data-tone={n % 3} style={{'--a': `${Math.round(n * 360 / CHEER_SPARKS)}deg`, '--d': `${52 + (n * 29) % 38}px`} as CSSProperties}/>)}</span>}
    {say && <span className="path-zigi-say">{say}</span>}
  </span>;
}

/** ZIGi presenting, outside the path (the day's celebration: it presents the trophy). */
export function ZigiCheer() {
  return <span className="zigi zigi-figure zigi-present"><ZigiImage poster={PRESENT_STILL} width={SHELL_FRAME.width} height={SHELL_FRAME.height} alt="" decorative/></span>;
}
