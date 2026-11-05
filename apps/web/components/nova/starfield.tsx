'use client';
import {useEffect, useRef, useState} from 'react';
import {SKY_FPS, deviceHints, driftX, makeStars, nebulaClouds, skyMode, starCount, twinkleAt, type SkyMode, type Star} from '../../lib/nova/orb-starfield';
import {MOTE_TINTS, makeMotes, moteAt, motesAllowed, type Mote} from '../../lib/nova/holo/motes';

/**
 * Session AK (owner follow-up 2, N2 and M2; lane NA): NOVA's starfield and nebula band on a canvas behind everything. It
 * drifts very slowly sideways at 30 frames a second, pauses while the tab is hidden, never follows the pointer, and does
 * not run under reduced motion, Motion Calm or Motion Off (one still frame; Session AK FU added Calm), on a low-end device
 * or a low battery (one still frame too; Session AK P3, ND-17) or with Save-Data (the page's CSS sky alone). Decorative: hidden from assistive technology, never focusable, no pointer events.
 */
const TINTS = ['#ffffff', '#bdf3ff', '#dcd2ff'] as const;
type Palette = {a: string; b: string; c: string};
function palette(el: Element): Palette {
  const css = getComputedStyle(el), read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {a: read('--nova-a', '#9273ff'), b: read('--nova-b', '#63e7ff'), c: read('--nova-c', '#f06dff')};
}
/** A colour with an alpha, from a hex token (anything else is used as it is, at full strength). */
function alpha(color: string, a: number): string {
  const hex = color.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (!hex) return color;
  return `#${hex}${Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0')}`;
}
function drawNebula(g: CanvasRenderingContext2D, w: number, h: number, colors: Palette) {
  const tints = [colors.a, colors.b, colors.c];
  g.clearRect(0, 0, w, h);
  g.globalCompositeOperation = 'lighter';
  for (const cloud of nebulaClouds()) {
    const x = cloud.x * w, y = cloud.y * h, r = cloud.r * Math.max(w, h);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, alpha(tints[cloud.tint]!, cloud.a)); grad.addColorStop(1, alpha(tints[cloud.tint]!, 0));
    g.fillStyle = grad; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.globalCompositeOperation = 'source-over';
}
function drawStars(g: CanvasRenderingContext2D, stars: readonly Star[], w: number, h: number, seconds: number) {
  for (const s of stars) {
    g.globalAlpha = twinkleAt(s, seconds);
    g.fillStyle = TINTS[s.tint];
    g.beginPath(); g.arc(driftX(s, seconds) * w, s.y * h, s.r, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
}

/** Review m3 (lane L8d): one soft 12 px sprite per tint, painted once — a bright core in a glow — so a mote reads as light. */
function moteSprites(): HTMLCanvasElement[] {
  return MOTE_TINTS.map(tint => {
    const c = document.createElement('canvas'), g = c.getContext('2d');
    c.width = c.height = 12;
    if (g) { const grad = g.createRadialGradient(6, 6, 0, 6, 6, 6); grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.28, tint); grad.addColorStop(1, alpha(tint, 0)); g.fillStyle = grad; g.fillRect(0, 0, 12, 12); }
    return c;
  });
}
/** Session AL Part 11 (lane L8): the HUD's floating motes ride on this one canvas (no second canvas), in its loop. */
function drawMotes(g: CanvasRenderingContext2D, motes: readonly Mote[], sprites: readonly HTMLCanvasElement[], w: number, h: number, seconds: number) {
  for (const m of motes) {
    const p = moteAt(m, seconds);
    if (p.a <= 0) continue;
    const d = m.r * 2.6;
    g.globalAlpha = p.a; g.drawImage(sprites[m.tint]!, p.x * w - d / 2, p.y * h - d / 2, d, d);
  }
  g.globalAlpha = 1;
}
/** Frames the sky has drawn in this tab (a still or paused sky draws none): the HUD's motion specs read it. */
const countFrame = () => { const w = window as Window & {__zgHudFrames?: number}; w.__zgHudFrames = (w.__zgHudFrames ?? 0) + 1; };
export function Starfield({motion, accent, motes = false}: {motion: boolean; accent: string; motes?: boolean}) {
  const canvas = useRef<HTMLCanvasElement>(null), [mode, setMode] = useState<SkyMode>('none'), [dustOk, setDustOk] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const hints = deviceHints();
    setMode(skyMode({motion, hints}));
    // Review m3 (lane L8d): the motes ask less of a device than the drifting sky (a 4-core laptop keeps them over its still sky).
    setDustOk(motion && motesAllowed(hints));
    // Battery saver where the browser tells: a low battery that is not charging stops the sky (and the motes).
    const nav = navigator as Navigator & {getBattery?: () => Promise<{level: number; charging: boolean}>};
    nav.getBattery?.().then(b => { if (!cancelled && b.level <= 0.2 && !b.charging) { setMode(skyMode({motion, hints: {...hints, lowBattery: true}})); setDustOk(false); } }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [motion]);
  const dustOn = motes && dustOk && mode !== 'none';
  useEffect(() => {
    const el = canvas.current;
    if (!el || mode === 'none') return;
    const g = el.getContext('2d');
    if (!g) return;
    const nebula = document.createElement('canvas'), ng = nebula.getContext('2d');
    const start = performance.now();
    let w = 0, h = 0, stars: Star[] = [], frame = 0, last = 0, stopped = false;
    // A still sky with motes over it: the sky is painted once into a cache and each frame draws the cache, then the motes.
    const dust = dustOn ? makeMotes() : [], sprites = dust.length ? moteSprites() : [], animated = mode === 'running' || dust.length > 0;
    const still = mode === 'still' && dust.length ? document.createElement('canvas') : null, sg = still?.getContext('2d') ?? null;
    const size = () => {
      const rect = el.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      w = Math.max(1, Math.round(rect.width)); h = Math.max(1, Math.round(rect.height));
      el.width = Math.round(w * dpr); el.height = Math.round(h * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = makeStars(starCount(w, h));
      // The nebula is painted once per size at half resolution, then drawn each frame with a slow sway.
      nebula.width = Math.max(1, Math.round(w / 2)); nebula.height = Math.max(1, Math.round(h / 2));
      if (ng) drawNebula(ng, nebula.width, nebula.height, palette(el));
      if (still && sg) {
        still.width = el.width; still.height = el.height; sg.setTransform(dpr, 0, 0, dpr, 0, 0);
        sg.globalAlpha = 0.9; sg.drawImage(nebula, 0, 0, w, h); sg.globalAlpha = 1; drawStars(sg, stars, w, h, 0);
      }
    };
    const paint = (seconds: number) => {
      g.clearRect(0, 0, w, h);
      if (still) { g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(still, 0, 0); g.setTransform(el.width / w, 0, 0, el.height / h, 0, 0); }
      else {
        const sway = Math.sin(seconds / 90) * w * 0.015;
        g.globalAlpha = 0.9; g.drawImage(nebula, sway, 0, w, h); g.globalAlpha = 1;
        drawStars(g, stars, w, h, seconds);
      }
      if (dust.length) drawMotes(g, dust, sprites, w, h, seconds);
    };
    const loop = (now: number) => {
      if (stopped) return;
      frame = requestAnimationFrame(loop);
      if (now - last < 1000 / SKY_FPS - 1) return;
      last = now; paint((now - start) / 1000); countFrame();
    };
    size();
    // Review m2 (lane L8d): a loop starts only in a tab that is in front (the effect re-runs as the tab hides, and the
    // sky used to draw a few dozen frames into a hidden tab before the visibility handler stopped it).
    if (!animated) paint(0);
    else if (document.visibilityState !== 'hidden') frame = requestAnimationFrame(loop);
    else { stopped = true; paint(0); }
    const resize = new ResizeObserver(() => { size(); if (!animated) paint(0); });
    resize.observe(el);
    const visible = () => {
      cancelAnimationFrame(frame);
      if (!animated) return;
      if (document.visibilityState === 'hidden') { stopped = true; return; }
      stopped = false; frame = requestAnimationFrame(loop);
    };
    document.addEventListener('visibilitychange', visible);
    return () => { stopped = true; cancelAnimationFrame(frame); resize.disconnect(); document.removeEventListener('visibilitychange', visible); };
  }, [mode, accent, dustOn]);
  return <canvas ref={canvas} className="nova-sky-canvas" data-sky={mode} aria-hidden="true"/>;
}
export default Starfield;
