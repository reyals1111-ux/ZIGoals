import {seeded} from '../orb-starfield';

/**
 * Session AL Part 11 (lane L8): the HUD's floating motes, drawn on NOVA's one sky canvas (components/nova/starfield.tsx,
 * no second canvas): a few dozen faint points of light in the pillar colours rising very slowly and fading at the top and
 * bottom. Ornament only (never data), computers only, Full motion only; the sky's own loop pauses them with the tab.
 */
export type Mote = {x: number; y: number; r: number; speed: number; sway: number; phase: number; tint: 0 | 1 | 2 | 3};
export const MOTE_COUNT = 36;
export const MOTE_TINTS = ['#ff7ac8', '#5ff2ff', '#b59bff', '#ffd27a'] as const;
export function makeMotes(count = MOTE_COUNT, seed = 20261104): Mote[] {
  const rnd = seeded(seed);
  return Array.from({length: Math.max(0, Math.min(120, Math.floor(count)))}, () => ({
    x: rnd(), y: rnd(), r: 0.6 + rnd() * 1.4, speed: 0.004 + rnd() * 0.008, sway: 0.004 + rnd() * 0.01, phase: rnd() * Math.PI * 2, tint: Math.floor(rnd() * 4) as Mote['tint'],
  }));
}
/** Where a mote is after `seconds` (0–1 of the box) and how bright (it fades in at the bottom and out at the top). */
export function moteAt(m: Mote, seconds: number): {x: number; y: number; a: number} {
  const s = Math.max(0, seconds), y = ((m.y - m.speed * s) % 1 + 1) % 1;
  const x = m.x + Math.sin(m.phase + s * 0.2) * m.sway;
  const edge = Math.min(y, 1 - y) / 0.15;
  return {x, y, a: Math.max(0, Math.min(1, edge)) * 0.55};
}
