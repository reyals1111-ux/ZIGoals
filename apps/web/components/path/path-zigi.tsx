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
 * Round 4 (the critique: the celebrate frame reads as hands clutching the head, and its clip starts on the idle frame):
 * every cheer — a tick, an orbit, the day's end — shows ZIGi's waving greeting as a still from the first frame (its large
 * art where the skin has it), never the celebrate frame. The figures have no arms-up pose; that needs new art.
 * `fit` (a key that changes whenever the path's layout does): ZIGi measures the planets, names, banners, chests and the
 * NEXT tag around its planet and takes the first place that touches none — beside the planet on the preferred side, then
 * the other, centred, raised or half a step down — falling back to the place that touches least. Placed before paint.
 */
const CHEER_SPARKS = 12;
type Lean = 'mid' | 'down' | 'up' | 'low';
const LEANS: Lean[] = ['mid', 'down', 'up', 'low'];
/** The waving greeting still, for every cheer: the poster's 2x, and the skin's large art on a dense screen when it has one. */
function cheerStill(frames: ReturnType<typeof useZigiFrames>) {
  const f = frames?.greeting ?? frames?.idle, x2 = f?.poster.x2 ?? SHELL_FRAME.x2, large = x2.endsWith('-2x.webp') ? x2.replace(/-2x\.webp$/, '-large.webp') : x2;
  return {src: x2, srcSet: `${x2} 1x, ${large} 2x`};
}
export function PathZigi({state, side, say, alive = false, centred = false, cheer = false, lean = 'mid', fit}: {state: string; side: 'left' | 'right'; say?: string; alive?: boolean; centred?: boolean; cheer?: boolean; lean?: Lean; fit?: string}) {
  const frames = useZigiFrames(), frame = frames?.[state] ?? frames?.idle;
  const poster = frame ? {src: frame.poster.x1, srcSet: `${frame.poster.x1} 1x, ${frame.poster.x2} 2x`} : {src: SHELL_FRAME.x1, srcSet: `${SHELL_FRAME.x1} 1x, ${SHELL_FRAME.x2} 2x`};
  const ref = useRef<HTMLSpanElement>(null), [place, setPlace] = useState<{side: 'left' | 'right'; lean: Lean} | null>(null);
  useLayoutEffect(() => {
    const el = ref.current, node = el?.parentElement, stage = el?.closest('.path-stage');
    if (!alive || fit === undefined || !el || !node || !stage) return;
    // (Its bounds: the screen, less a small margin — the figure may stand past the path's own box, never past the screen.)
    const n = node.getBoundingClientRect(), z = el.getBoundingClientRect(), box = {left: 6, right: document.documentElement.clientWidth - 6}, w = z.width, h = z.height;
    if (!w || !h) return;
    const gap = node.closest('[data-next]') ? 20 : 14;
    // (While it cheers, its own planet's name may give way: it steps back for that moment, CSS.)
    const own = cheer ? node.querySelector(':scope > .path-label') : null;
    const others = [...stage.querySelectorAll('.path-dot, .path-label, .path-banner, .path-chest-art, .path-next-tag')].filter(o => !el.contains(o) && o !== own).map(o => o.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
    const at = (s: 'left' | 'right', l: Lean) => {
      const left = s === 'right' ? n.right + gap : n.left - gap - w, top = l === 'down' ? n.top - 16 - h * .06 : l === 'up' ? n.bottom + 18 - h : l === 'low' ? n.top + n.height * .55 : n.top + n.height / 2 - h / 2;
      return {left, top, right: left + w, bottom: top + h};
    };
    const cost = (r: {left: number; top: number; right: number; bottom: number}) => {
      // (The figure's art fills about its middle two thirds across and starts below the picture's top: its transparent sides
      // and top may touch.)
      const inset = w * .16, l = r.left + inset, rr = r.right - inset, t = r.top + h * .08;
      const out = Math.max(0, box.left - r.left) + Math.max(0, r.right - box.right);
      return out * 1000 + others.reduce((sum, o) => sum + Math.max(0, Math.min(rr, o.right) - Math.max(l, o.left)) * Math.max(0, Math.min(r.bottom, o.bottom) - Math.max(t, o.top)), 0);
    };
    const sides: ('left' | 'right')[] = [side, side === 'left' ? 'right' : 'left'];
    const order = [lean, ...LEANS.filter(x => x !== lean)];
    let best: {side: 'left' | 'right'; lean: Lean; c: number} | null = null;
    for (const s of sides) for (const l of order) { const c = cost(at(s, l)); if (!best || c < best.c) best = {side: s, lean: l, c}; if (c === 0) break; }
    const choice = best && {side: best.side, lean: best.lean};
    setPlace(p => p && choice && p.side === choice.side && p.lean === choice.lean ? p : choice);
  }, [alive, fit, side, lean, state, cheer]);
  const shownSide = place?.side ?? side, shownLean = place?.lean ?? lean, cheering = alive && (cheer || state === 'celebrate');
  return <span ref={ref} className="path-zigi" data-side={shownSide} data-lean={alive ? shownLean : undefined} data-zigi-state={cheering ? 'cheer' : state} data-alive={alive || undefined} data-centred={centred || undefined} data-cheer={alive && cheer ? '' : undefined} aria-hidden="true">
    {cheering ? <span key={cheer ? 'cheer' : state} className="path-zigi-figure"><span className="zigi zigi-figure zigi-cheer"><ZigiImage poster={cheerStill(frames)} width={SHELL_FRAME.width} height={SHELL_FRAME.height} alt="" decorative/></span></span>
      : alive ? <span key={state} className="path-zigi-figure"><ZigiFigure state={state}/></span>
      : <span key={state} className={`zigi zigi-${state} path-zigi-figure`} data-state={state}><ZigiImage poster={poster} width={SHELL_FRAME.width} height={SHELL_FRAME.height} alt="" decorative/></span>}
    {alive ? <span className="path-zigi-ground"/> : <span className="path-zigi-arrow"/>}
    {alive && cheer && <span className="path-zigi-cheer">{Array.from({length: CHEER_SPARKS}, (_, n) => <i key={n} data-tone={n % 3} style={{'--a': `${Math.round(n * 360 / CHEER_SPARKS)}deg`, '--d': `${52 + (n * 29) % 38}px`} as CSSProperties}/>)}</span>}
    {say && <span className="path-zigi-say">{say}</span>}
  </span>;
}

/** The waving greeting still for a cheer outside the path (the day's celebration): ZIGi's large art where the skin has it. */
export function ZigiCheer() {
  const frames = useZigiFrames(), still = cheerStill(frames);
  return <span className="zigi zigi-figure zigi-cheer"><ZigiImage poster={still} width={SHELL_FRAME.width} height={SHELL_FRAME.height} alt="" decorative/></span>;
}
