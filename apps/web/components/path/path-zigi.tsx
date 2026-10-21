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
 * Rounds 4–7 (the critiques: the celebrate frame reads as hands clutching the head, the greeting frames as a salute or a
 * hand at the brow, and a 96 px clip frame drawn at 130–230 px is soft): on the Checklist's path, at the day's trophy and
 * in the day's celebration ZIGi is drawn from a delivered still at its large size (480 × 632), never upscaled:
 * F006-presenting — the arm held out with an open hand, away from the face, as one presents something: the next planet at
 * rest, the planet just ticked during a cheer, the trophy at the day's end. Round 7: on the path the still is cropped to
 * the figure itself (`/brand/checklist/zigi-present.webp`, 435 × 519, the same pixels without the empty margin; and
 * `zigi-idle.webp`, F001-idle cropped alike), so its box is what is seen and every size here is the figure's own. At rest
 * it points at the next planet — its arm (at 31 % of its height) level with the planet's ring — and where no free place
 * allows that it stands in the idle still instead, arms down, facing the planet. A cheer adds two hops with squash and
 * stretch, a star burst behind and sparkles; the figure faces its planet (mirrored on the planet's left). The figures have
 * no arms-up pose; that needs new art.
 *
 * `fit` (a key that changes whenever the path's layout does): ZIGi measures the planets (the next one with its ring and
 * moon), names, banners, chests, the NEXT tag and an open panel, each grown by 12 px, and takes the nearest place beside
 * its planet where its drawn box touches none of them — preferring the place it already stands, so it does not jump —
 * either side, a little further out, higher or lower, smaller only where nothing else is free, never past the screen.
 * Placed before paint, again once a tick's motion has settled; a move from one place to the next glides (480 ms) — or,
 * where a glide would cross a name, a banner, a planet or a chest, shrinks away and grows again at the new place (560 ms)
 * — and nothing else on the path moves for it.
 */
const CHEER_SPARKS = 12, CLEAR = 13; // (12 px, and one more so rounding never brings it under)
/** How far ZIGi stays from the screen's edges (round 7: never pressed against them). */
const EDGE = 16;
/** How high a cheer hops at most (round 8: as high as the room above its place allows, 12 px clear, so it never reaches
 *  anything — and it starts where ZIGi already stands; round 9: 15 px at most). */
const HOP = 15;
/** How far a cheer's squash and stretch reach (round 9: 4 % — CSS `path-zigi-hop`): a cheer's place keeps them clear too. */
const SQUASH = .04;
/** A cheer's sparkles: their angles and how far they fly (the CSS `path-zigi-spark` path, from 14 px out). */
const SPARKS = Array.from({length: CHEER_SPARKS}, (_, n) => ({a: n * 360 / CHEER_SPARKS, d: 52 + (n * 29) % 38}));
type Side = 'left' | 'right';
type Box = {left: number; top: number; right: number; bottom: number};
const FULL = '/brand/figures/zigi/origami-nebula/F006-presenting-large.webp', FULL_STILL = {src: FULL, srcSet: `${FULL} 1x`};
const PRESENT = '/brand/checklist/zigi-present.webp', PRESENT_STILL = {src: PRESENT, srcSet: `${PRESENT} 1x`};
const IDLE = '/brand/checklist/zigi-idle.webp', IDLE_STILL = {src: IDLE, srcSet: `${IDLE} 1x`};
const TRIM = {width: 435, height: 519};
/** Where ZIGi last stood on each path (in the stage's own coordinates), so its next place can prefer it and glide from it. */
const lastSeen = new WeakMap<Element, {x: number; y: number; w: number; h: number; side: Side; at: number}>();
const RECENT_MS = 5000;
/** A planet's box with its orbit ring and moon (the next planet's), at rest: its centre as drawn, its size from its layout
 *  and its resting scale (round 7: never read through a tick's bounce, which moved ZIGi's cheer half way through it). */
/** A dot's ring as drawn: its orbit ring where it has one (Session AF), an orbit node's 6 px dark halo (Session AG). */
export function ringBox(dot: Element): Box {
  const r = dot.getBoundingClientRect(), ring = dot.querySelector<HTMLElement>(':scope > .path-dot-orbit'), own = (dot as HTMLElement).offsetWidth || r.width;
  if (!dot.classList.contains('path-dot')) return {left: r.left, top: r.top, right: r.right, bottom: r.bottom};
  const stage = dot.closest('.path-stage'), k = dot.hasAttribute('data-next') && stage ? parseFloat(getComputedStyle(stage).getPropertyValue('--next-scale')) || 1 : 1;
  const half = own / 2 * k + (ring ? ((ring.offsetWidth - own) / 2 + 6) * k : dot.classList.contains('orbit-node') ? 6 * k : 0), cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
  return {left: cx - half, top: cy - half, right: cx + half, bottom: cy + half};
}
/** A name's box where it comes to rest: a next planet's name steps out by `translate` (round 6), so while that glides it is
 *  read to the end of its step (round 8: a cheer placed against a name half way out moved again once it arrived) — round 9:
 *  the whole stretch it glides across. */
export function labelBox(l: Element): Box {
  const r = l.getBoundingClientRect(), now = parseFloat(getComputedStyle(l).translate) || 0;
  const glide = l.getAnimations().find(a => (a as CSSTransition).transitionProperty === 'translate'), end = glide ? parseFloat(String((glide.effect as KeyframeEffect | null)?.getKeyframes().at(-1)?.translate ?? '')) : NaN;
  // (Round 9: and wherever it passes on the way there — the whole of its glide.)
  const shift = (Number.isFinite(end) ? end : now) - now;
  return {left: r.left + Math.min(0, shift), top: r.top, right: r.right + Math.max(0, shift), bottom: r.bottom};
}
/** What ZIGi must stay clear of on the path (its own parts aside). */
export function zigiObstacles(stage: Element, except: Element[]): Box[] {
  return [...stage.querySelectorAll('.path-dot, .path-label, .path-banner, .path-chest-art, .path-chest-text, .path-next-tag, .path-panel')]
    .filter(o => !except.some(e => e === o || e.contains(o)))
    .map(o => o.classList.contains('path-dot') ? ringBox(o) : o.classList.contains('path-label') ? labelBox(o) : o.getBoundingClientRect())
    .filter(r => r.right - r.left > 2 && r.bottom - r.top > 2);
}
const overlap = (a: Box, b: Box, grow: number) => Math.max(0, Math.min(a.right, b.right + grow) - Math.max(a.left, b.left - grow)) * Math.max(0, Math.min(a.bottom, b.bottom + grow) - Math.max(a.top, b.top - grow));
const GAPS = [13, 15, 18, 21, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 65, 70, 76, 82, 88, 94, 100, 110, 120, 145, 175], SHIFTS = Array.from({length: 107}, (_, i) => (i % 2 ? -1 : 1) * Math.ceil(i / 2) * 3), SCALES = [1, .985, .96, .92, .88, .85, .82, .8, .75, .7, .65, .6], SIZE = 500, NEAR = 60, STAY = 40, ARM = .31;
/** What a place costs where ZIGi's arm would not point at its planet: at a planet already done, at one still to come, at nothing. */
const AIM = {done: 600, later: 220, none: 150, next: 0} as const;
const SMALL = 260;
export function PathZigi({state, side, say, alive = false, centred = false, cheer = false, fit}: {state: string; side: Side; say?: string; alive?: boolean; centred?: boolean; cheer?: boolean; fit?: string}) {
  const frames = useZigiFrames(), frame = frames?.[state] ?? frames?.idle;
  const poster = frame ? {src: frame.poster.x1, srcSet: `${frame.poster.x1} 1x, ${frame.poster.x2} 2x`} : {src: SHELL_FRAME.x1, srcSet: `${SHELL_FRAME.x1} 1x, ${SHELL_FRAME.x2} 2x`};
  const ref = useRef<HTMLSpanElement>(null), [place, setPlace] = useState<{left: number; top: number; side: Side; scale: number; idle: boolean; hop: number; sparks: number[]} | null>(null), scaled = useRef(1);
  useLayoutEffect(() => {
    const el = ref.current, node = el?.parentElement, stage = el?.closest('.path-stage');
    if (!alive || fit === undefined || !el || !node || !stage) return;
    let again = false;
    const measure = () => {
    // (Its planet; at the day's end, the trophy. Its full size: the box it has now, undone by the scale it was last given.)
    // (`--zigi-min`: the least it rests at — a place any smaller costs SMALL more.)
    const least = parseFloat(getComputedStyle(el).getPropertyValue('--zigi-min')) || 0;
    const w0 = el.offsetWidth / scaled.current, h0 = el.offsetHeight / scaled.current, dot = node.querySelector(':scope > .path-dot') ?? node.querySelector(':scope > .path-chest-art');
    if (!w0 || !h0 || !dot) return;
    const n = node.getBoundingClientRect(), sb = stage.getBoundingClientRect(), ring = ringBox(dot), cy = (ring.top + ring.bottom) / 2, right = document.documentElement.clientWidth - EDGE;
    // (Pointing at it: the arm's line through the middle of the planet's own body — half its radius either side of its
    // centre, 14 px at least — never along the edge of its ring, which reads as pointing at the planet beyond.)
    const body = dot.classList.contains('path-dot') ? (dot as HTMLElement).offsetWidth / 2 * (dot.hasAttribute('data-next') ? parseFloat(getComputedStyle(stage).getPropertyValue('--next-scale')) || 1 : 1) : (ring.bottom - ring.top) / 2;
    const aimBand = Math.max(14, body * .5);
    const seen = lastSeen.get(stage), prev = seen && performance.now() - seen.at < RECENT_MS ? seen : null;
    // (Round 8: a cheer keeps clear of its own planet's name too — no name is ever hidden for it.)
    const others = zigiObstacles(stage, [el]);
    // (A cheer's figure as it hops: wider and taller by its squash and stretch — round 9: the iteration-8 hop met a name.)
    const swept = (b: Box): Box => cheer ? {left: b.left - (b.right - b.left) * SQUASH / 2, right: b.right + (b.right - b.left) * SQUASH / 2, top: b.top - (b.bottom - b.top) * SQUASH, bottom: b.bottom} : b;
    // (At rest its arm — held out at 31 % of its height — must point at this planet, through its body. Where it passes above
    // or below, and on to another planet within 260 px, ZIGi would seem to point at that one; such places cost AIM.)
    const planets = cheer ? [] : [...stage.querySelectorAll<HTMLElement>('.path-dot')].filter(d => d !== dot).map(d => ({...ringBox(d), done: d.dataset.state === 'done'}));
    const pointsAt = (box: Box, s: Side): 'next' | 'done' | 'later' | 'none' => {
      const arm = box.top + (box.bottom - box.top) * ARM;
      if (Math.abs(arm - cy) <= aimBand) return 'next';
      const from = s === 'right' ? box.left - 260 : box.right, to = s === 'right' ? box.left : box.right + 260;
      const on = planets.filter(o => o.top <= arm && o.bottom >= arm && o.right >= from && o.left <= to);
      return on.some(o => o.done) ? 'done' : on.length ? 'later' : 'none';
    };
    const aim = (box: Box, s: Side) => cheer ? 0 : AIM[pointsAt(box, s)];
    let best = null as {box: Box; side: Side; scale: number; cost: number} | null;
    for (const [k, scale] of SCALES.entries()) {
      const w = w0 * scale, h = h0 * scale;
      // (Heights to try: a fine grid, and every place that just clears something above or below.)
      const dys = [...SHIFTS, ...others.flatMap(o => [o.bottom + CLEAR + .5 + h / 2 - cy, o.top - CLEAR - .5 - h / 2 - cy]).filter(d => Math.abs(d) <= 170)];
      // (Round 8: and every distance out that just clears something beside it, so it stands as near its planet as it may.)
      const near = others.filter(o => o.bottom > cy - 220 && o.top < cy + 220);
      const gapsFor = (side: Side) => [...GAPS, ...near.map(o => side === 'left' ? ring.left - o.left + CLEAR + .5 : o.right + CLEAR + .5 - ring.right).filter(g => g >= 13 && g <= 175)];
      for (const s of [side, side === 'left' ? 'right' : 'left'] as Side[]) for (const gap of gapsFor(s)) for (const dy of dys) {
        const left = s === 'right' ? ring.right + gap : ring.left - gap - w, top = cy + dy - h / 2, box = {left, top, right: left + w, bottom: top + h};
        const hit = others.reduce((sum, o) => sum + overlap(swept(box), o, CLEAR), 0), out = Math.max(0, EDGE - box.left) + Math.max(0, box.right - right);
        // (Near and level with its planet, then full size, then the open side of the wave, and pointing at it.)
        const cost = (hit > 0 || out > 0 ? 1e6 + hit + out * 1000 : 0) + gap * 1.4 + Math.abs(dy) * 1 + (s === side ? 0 : 24) + (1 - scale) * SIZE + aim(box, s) + (h < least - .5 ? SMALL : 0);
        if (!best || cost < best.cost) best = {box, side: s, scale, cost};
      }
      // (A smaller ZIGi near its planet may beat a full-size one far off: stop only once no smaller size could.)
      if (best && best.cost < 1e6 && best.cost <= (1 - (SCALES[k + 1] ?? 0)) * SIZE) break;
    }
    if (!best) return;
    // Where it stood a moment ago (its cheer, or this place before a re-measure) it stays, so long as that place is clear,
    // beside this planet (within NEAR px of its ring, level with it), as large and nearly as good: it never needs to jump.
    // A cheer measured again (round 7) stays wherever it is while that place is clear: it never moves mid-cheer; and (round 8)
    // a cheer starts where ZIGi stood beside its planet, when that place is clear with room for the hops — it hops in place.
    if (prev) {
      const box = {left: sb.left + prev.x, top: sb.top + prev.y, right: sb.left + prev.x + prev.w, bottom: sb.top + prev.y + prev.h}, scale = prev.h / h0;
      const s: Side | null = box.left >= ring.right ? 'right' : box.right <= ring.left ? 'left' : null, gap = s === 'right' ? box.left - ring.right : ring.left - box.right;
      const hit = others.reduce((sum, o) => sum + overlap(swept(box), o, CLEAR), 0), out = Math.max(0, EDGE - box.left) + Math.max(0, box.right - right);
      const clear = !!s && hit === 0 && out === 0, keep = clear && cheer && (again || (gap <= 140 && box.top < ring.bottom && box.bottom > ring.top));
      if (keep || (clear && gap <= NEAR && box.top < ring.bottom && box.bottom > ring.top && scale <= 1.001 && scale >= best.scale - .02)) {
        const cost = gap * 1.4 + Math.abs((box.top + box.bottom) / 2 - cy) + (s === side ? 0 : 24) + (1 - scale) * SIZE + aim(box, s) + (prev.h < least - .5 ? SMALL : 0);
        if (keep || cost <= best.cost + STAY) best = {box, side: s ?? best.side, scale: Math.min(1, scale), cost};
      }
    }
    // (Where no free place lets it point at this planet, it stands idle instead.)
    const idle = !cheer && pointsAt(best.box, best.side) !== 'next';
    // (A cheer hops as high as the room above it allows: 12 px clear of whatever is above, 22 px at most.)
    const b = best.box, sb2 = swept(b), room = others.filter(o => o.right > sb2.left - CLEAR && o.left < sb2.right + CLEAR && o.bottom <= sb2.top + 1).reduce((m, o) => Math.min(m, sb2.top - o.bottom - CLEAR), HOP);
    const hop = cheer ? Math.max(0, Math.min(HOP, Math.floor(room))) : 0;
    // (Round 9: each sparkle flies only as far as it stays off every name — 2 px clear of its own 7 px half — or not at all.)
    const names = cheer ? [...stage.querySelectorAll('.path-label')].map(labelBox) : [];
    const ox = b.left + (b.right - b.left) / 2, oy = b.top + (b.bottom - b.top) * .34;
    const sparks = SPARKS.map(({a, d}) => { const sx = Math.sin(a * Math.PI / 180), sy = -Math.cos(a * Math.PI / 180); let far = 0; for (let r = 14; r <= d; r += 3) { const x = ox + sx * r, y = oy + sy * r; if (names.some(o => x > o.left - 9 && x < o.right + 9 && y > o.top - 9 && y < o.bottom + 9)) break; far = r; } return far >= 24 ? far : 0; });
    const next = {left: Math.round(b.left - n.left), top: Math.round(b.top - n.top), side: best.side, scale: best.scale, idle, hop, sparks};
    scaled.current = best.scale;
    setPlace(p => p && p.left === next.left && p.top === next.top && p.side === next.side && p.scale === next.scale && p.idle === next.idle && p.hop === next.hop && p.sparks.join() === next.sparks.join() ? p : next);
    again = true;
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
    const sb = stage.getBoundingClientRect(), n = node.getBoundingClientRect(), now = {x: n.left + place.left - sb.left, y: n.top + place.top - sb.top, w: el.offsetWidth, h: el.offsetHeight, side: place.side, at: performance.now()};
    const seen = lastSeen.get(stage), from = seen && now.at - seen.at < RECENT_MS ? seen : null;
    if (from && entranceAllowed() && typeof el.animate === 'function' && Math.hypot(from.x - now.x, from.y - now.y) > 3) {
      el.getAnimations().forEach(a => a.cancel());
      const dx = from.x - now.x, dy = from.y - now.y, k = from.h / now.h, w = now.w, h = now.h;
      // (Would the glide cross anything on the way — a name, a banner, a planet, a chest?)
      // (Round 9: a name counts from 12 px around it.)
      const others = [...stage.querySelectorAll<HTMLElement>('.path-dot, .path-label, .path-banner, .path-chest-art, .path-next-tag')]
        .filter(o => !el.contains(o) && Number(getComputedStyle(o).opacity) > .5).map(o => { if (o.classList.contains('path-dot')) return ringBox(o); if (!o.classList.contains('path-label')) return o.getBoundingClientRect(); const b = labelBox(o); return {left: b.left - CLEAR, top: b.top - CLEAR, right: b.right + CLEAR, bottom: b.bottom + CLEAR}; });
      // (A cheer hops as it goes, as high as its place allows.)
      const lift = cheer ? place.hop + h * SQUASH : 0, wide = cheer ? w * SQUASH / 2 : 0, at = (t: number): Box => { const x = sb.left + now.x + dx * (1 - t), y = sb.top + now.y + dy * (1 - t), m = k + (1 - k) * t; return {left: x - wide, top: y - lift, right: x + w * m + wide, bottom: y + h * m}; };
      // (Round 8: a move to the other side of a planet always hops — and while it shrinks away it keeps the way it faced.)
      const turns = from.side !== now.side, crosses = turns || [.08, .16, .24, .32, .4, .48, .56, .64, .72, .8, .88, .96].some(t => others.some(o => overlap(at(t), o, 0) > 0));
      const T = (x: number, y: number, m: number) => `translate(${x}px, ${y}px) scale(${m})`, small = .5;
      // (The figure as it faced before: its box mirrored about its own middle.)
      const F = (x: number, y: number, m: number) => turns ? `translate(${x + w * m}px, ${y}px) scale(${-m}, ${m})` : T(x, y, m);
      // (A cheer's sparkles start once it has arrived.)
      if (cheer) el.style.setProperty('--spark-delay', `${crosses ? 560 : 480}ms`);
      el.animate(crosses
        // Shrinking away at its old place and growing again at the new one, never seen over anything.
        ? [{transform: F(dx, dy, k), opacity: 1, transformOrigin: '0 0'}, {offset: .4, transform: F(dx + w * k * (1 - small) / 2, dy + h * k * (1 - small), k * small), opacity: 0, transformOrigin: '0 0'}, {offset: .55, transform: T(w * (1 - small) / 2, h * (1 - small), small), opacity: 0, transformOrigin: '0 0'}, {transform: 'none', opacity: 1, transformOrigin: '0 0'}]
        : [{transform: T(dx, dy, k), transformOrigin: '0 0'}, {transform: 'none', transformOrigin: '0 0'}],
        crosses ? {duration: 560, easing: 'ease-in-out'} : {duration: 480, easing: 'cubic-bezier(.3, .7, .25, 1)'});
    }
    lastSeen.set(stage, now);
    // (Round 8: where it stands stays fresh for as long as it stands there — a tick after a long rest still glides from it.)
    return () => { const seen = lastSeen.get(stage); if (seen) lastSeen.set(stage, {...seen, at: performance.now()}); };
  }, [alive, place, cheer]);
  const shownSide = place?.side ?? side, cheering = alive && (cheer || state === 'celebrate');
  const placed = alive && place ? {left: place.left, top: place.top, right: 'auto', bottom: 'auto', translate: 'none', '--hop': `${place.hop}px`, ...(place.scale !== 1 ? {height: `calc(var(--zigi-h) * ${place.scale})`, width: `calc(var(--zw) * ${place.scale})`} : {})} as CSSProperties : undefined;
  return <span ref={ref} className="path-zigi" data-side={shownSide} data-placed={place && alive ? '' : undefined} data-zigi-state={cheering ? 'cheer' : state} data-alive={alive || undefined} data-centred={centred || undefined} data-cheer={alive && cheer ? '' : undefined} aria-hidden="true" style={placed}>
    {alive && cheer && <span className="path-zigi-burst"/>}
    {alive ? <span key={cheer ? 'cheer' : 'rest'} className="path-zigi-figure"><span className={`zigi zigi-figure zigi-${place?.idle && !cheer ? 'idle' : 'present'}`}><ZigiImage poster={place?.idle && !cheer ? IDLE_STILL : PRESENT_STILL} width={TRIM.width} height={TRIM.height} alt="" decorative/></span></span>
      : <span key={state} className={`zigi zigi-${state} path-zigi-figure`} data-state={state}><ZigiImage poster={poster} width={SHELL_FRAME.width} height={SHELL_FRAME.height} alt="" decorative/></span>}
    {alive ? <span className="path-zigi-ground"/> : <span className="path-zigi-arrow"/>}
    {alive && cheer && <span className="path-zigi-cheer">{SPARKS.map(({a, d}, n) => { const far = place?.sparks[n] ?? d; return far ? <i key={n} data-tone={n % 3} style={{'--a': `${Math.round(a)}deg`, '--d': `${far}px`} as CSSProperties}/> : null; })}</span>}
    {say && <span className="path-zigi-say">{say}</span>}
  </span>;
}

/** ZIGi presenting, outside the path (the day's celebration: it presents the trophy). */
export function ZigiCheer() {
  return <span className="zigi zigi-figure zigi-present"><ZigiImage poster={FULL_STILL} width={SHELL_FRAME.width} height={SHELL_FRAME.height} alt="" decorative/></span>;
}
