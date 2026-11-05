import {seeded} from '../orb-starfield';

/**
 * Session AL Part 11 (lane L8): the HUD's floating motes: a few dozen faint points of light in the pillar colours rising
 * very slowly and fading at the top and bottom. Ornament only (never data), computers only, Full motion only; they pause
 * with the tab.
 * Review m3: they no longer wait for a device with more than four cores (only memory ≤ 4 GB, Save-Data or a low battery
 * keep them off): a 4-core laptop draws them over its still sky (motesAllowed).
 * Lane L8e: they float in the open sky around the star, on a small canvas of their own in the star's column
 * (components/nova/holo/motes-canvas.tsx), never under a glass panel. Redrawn under the glass, every frame made each
 * panel's backdrop blur run again: 20 fps at CPU 4× on a 4-core laptop (16.7 ms a frame with them in the star's column).
 */
export type Mote = {x: number; y: number; r: number; speed: number; sway: number; phase: number; tint: 0 | 1 | 2 | 3};
/** Review m3 (lane L8d): fewer, larger and brighter (24 motes of 1–2.4 px, up to .8), so they read as the reference's
 *  floating particles instead of disappearing; drawn as a soft pre-rendered sprite (components/nova/holo/motes-canvas.tsx). */
export const MOTE_COUNT = 24;
/** CI15 (hud-perf, CPU 4×): how often the motes' canvas is redrawn. A mote rises 0.7–2 px a second and sways about as
 *  slowly, so 12 redraws a second move it under a fifth of a pixel each (the same drift as 30); each redraw costs a canvas
 *  upload on the page's main thread and a composite, and between redraws the page asks for no frame at all. */
export const MOTES_FPS = 12;
export const MOTE_TINTS = ['#ff7ac8', '#5ff2ff', '#b59bff', '#ffd27a'] as const;
export function makeMotes(count = MOTE_COUNT, seed = 20261104): Mote[] {
  const rnd = seeded(seed);
  return Array.from({length: Math.max(0, Math.min(120, Math.floor(count)))}, () => ({
    x: rnd(), y: rnd(), r: 1 + rnd() * 1.4, speed: 0.004 + rnd() * 0.008, sway: 0.004 + rnd() * 0.01, phase: rnd() * Math.PI * 2, tint: Math.floor(rnd() * 4) as Mote['tint'],
  }));
}
/** Where a mote is after `seconds` (0–1 of the box) and how bright (it fades in at the bottom and out at the top). */
export function moteAt(m: Mote, seconds: number): {x: number; y: number; a: number} {
  const s = Math.max(0, seconds), y = ((m.y - m.speed * s) % 1 + 1) % 1;
  const x = m.x + Math.sin(m.phase + s * 0.2) * m.sway;
  const edge = Math.min(y, 1 - y) / 0.15;
  return {x, y, a: Math.max(0, Math.min(1, edge)) * 0.8};
}

/** Whether the motes may run on this device (review m3): not with little memory, Save-Data or a low battery that is not
 *  charging; the processor count no longer matters (many ordinary laptops report 4 cores). */
export function motesAllowed(h: {deviceMemory?: number; saveData?: boolean; lowBattery?: boolean}): boolean {
  return !(typeof h.deviceMemory === 'number' && h.deviceMemory > 0 && h.deviceMemory <= 4) && h.saveData !== true && h.lowBattery !== true;
}

/** What the motes' canvas does now (lane L8e): draw while the HUD is in Full motion on a device that allows them, and be
 *  blank otherwise (Calm, Off, reduced motion, a hidden tab, a local model replying: no mote is left frozen on the sky). */
export function motesPlan({on, allowed, hidden}: {on: boolean; allowed: boolean; hidden: boolean}): 'run' | 'blank' {
  return on && allowed && !hidden ? 'run' : 'blank';
}
/** Counts a frame the HUD's canvases drew in this tab (the sky and the motes; a still or paused HUD draws none): the
 *  HUD's motion and performance specs read `window.__zgHudFrames`. */
export function countHudFrame(): void {
  if (typeof window === 'undefined') return;
  const w = window as Window & {__zgHudFrames?: number};
  w.__zgHudFrames = (w.__zgHudFrames ?? 0) + 1;
}
