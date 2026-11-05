'use client';
import {useEffect, useRef, useState} from 'react';
import {deviceHints} from '../../../lib/nova/orb-starfield';
import {MOTES_FPS, MOTE_TINTS, countHudFrame, makeMotes, moteAt, motesAllowed, motesPlan} from '../../../lib/nova/holo/motes';
import {useTabHidden} from './use-hud-motion';

/** Review m3 (lane L8d): one soft 12 px sprite per tint, painted once — a bright core in a glow — so a mote reads as light. */
function moteSprites(): HTMLCanvasElement[] {
  return MOTE_TINTS.map(tint => {
    const c = document.createElement('canvas'), g = c.getContext('2d');
    c.width = c.height = 12;
    if (g) { const grad = g.createRadialGradient(6, 6, 0, 6, 6, 6); grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.28, tint); grad.addColorStop(1, `${tint}00`); g.fillStyle = grad; g.fillRect(0, 0, 12, 12); }
    return c;
  });
}

/**
 * Session AL lane L8e: the HUD's floating motes, on a small canvas of their own that fills the star's column (behind the
 * star, in the open sky between the panel columns). They used to ride the full-window sky canvas, under every glass
 * panel: each frame changed the panels' backdrop, so every panel's blur ran again (20 fps at CPU 4× on a 4-core laptop).
 * Here no glass lies over them and the sky canvas stays one still picture. Full motion only (`on`), on a device that
 * allows them (motesAllowed); blank in Calm, Off, reduced motion, a hidden tab or while a local model replies.
 * Decorative: hidden from assistive technology, no pointer events.
 */
export function HoloMotes({on}: {on: boolean}) {
  const canvas = useRef<HTMLCanvasElement>(null), [allowed, setAllowed] = useState(false), hidden = useTabHidden();
  // Their drift goes on from where it was when they come back (a hidden tab, a reply): one clock for the panel's life.
  const start = useRef(0);
  useEffect(() => {
    let cancelled = false;
    setAllowed(motesAllowed(deviceHints()));
    // Battery saver where the browser tells: a low battery that is not charging keeps them off.
    const nav = navigator as Navigator & {getBattery?: () => Promise<{level: number; charging: boolean}>};
    nav.getBattery?.().then(b => { if (!cancelled && b.level <= 0.2 && !b.charging) setAllowed(false); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  const run = motesPlan({on, allowed, hidden}) === 'run';
  useEffect(() => {
    const el = canvas.current, g = el?.getContext('2d');
    if (!el || !g || !run) return;
    if (!start.current) start.current = performance.now();
    const motes = makeMotes(), sprites = moteSprites();
    let w = 0, h = 0, frame = 0, wait = 0, stopped = false;
    const size = () => {
      const rect = el.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      w = Math.max(1, Math.round(rect.width)); h = Math.max(1, Math.round(rect.height));
      el.width = Math.round(w * dpr); el.height = Math.round(h * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const paint = (seconds: number) => {
      g.clearRect(0, 0, w, h);
      for (const m of motes) {
        const p = moteAt(m, seconds);
        if (p.a <= 0) continue;
        const d = m.r * 2.6;
        g.globalAlpha = p.a; g.drawImage(sprites[m.tint]!, p.x * w - d / 2, p.y * h - d / 2, d, d);
      }
      g.globalAlpha = 1;
    };
    // CI15: one redraw every 1/MOTES_FPS s, in an animation frame; in between a timer waits, so the page asks for no
    // frame (a rAF loop that skipped frames still ran the page's frame work at every display refresh).
    const loop = (now: number) => {
      if (stopped) return;
      paint((now - start.current) / 1000); countHudFrame();
      wait = window.setTimeout(() => { if (!stopped) frame = requestAnimationFrame(loop); }, 1000 / MOTES_FPS);
    };
    size();
    frame = requestAnimationFrame(loop);
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(size);
    resize?.observe(el);
    return () => { stopped = true; cancelAnimationFrame(frame); window.clearTimeout(wait); resize?.disconnect(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, el.width, el.height); };
  }, [run]);
  return <canvas ref={canvas} className="holo-motes" data-motes={run ? 'on' : 'off'} aria-hidden="true"/>;
}
export default HoloMotes;
