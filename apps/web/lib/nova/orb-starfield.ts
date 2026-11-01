/**
 * Session AK (owner follow-up 2, N2 and M2; lane NA): NOVA's starfield and nebula backdrop, as pure data the canvas
 * draws (components/nova/starfield.tsx). It drifts very slowly sideways, never follows the pointer, pauses while the tab
 * is hidden, and does not run at all under reduced motion, Motion Off, a low-end device or Save-Data (a still frame, or
 * the page's own CSS sky, shows instead).
 */
export type Star = {x: number; y: number; r: number; a: number; layer: 0 | 1 | 2; twinkle: number; tint: 0 | 1 | 2};
/** A small, fast, seeded generator (mulberry32), so the sky is the same on every visit and in tests. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const MAX_STARS = 420;
/** How many stars a canvas of this size carries: about one per 3,600 css px², at most 420, at least 60. */
export const starCount = (width: number, height: number) => Math.max(60, Math.min(MAX_STARS, Math.round(Math.max(0, width) * Math.max(0, height) / 3600)));
/** The stars, in 0–1 coordinates: most small and dim (far layer), a few larger and brighter (near layer). */
export function makeStars(count: number, seed = 20261101): Star[] {
  const rand = seeded(seed), out: Star[] = [];
  for (let i = 0; i < Math.max(0, Math.min(MAX_STARS, count)); i++) {
    const roll = rand(), layer: Star['layer'] = roll < 0.7 ? 0 : roll < 0.94 ? 1 : 2;
    out.push({x: rand(), y: rand(), r: layer === 0 ? 0.45 + rand() * 0.45 : layer === 1 ? 0.8 + rand() * 0.6 : 1.2 + rand() * 0.8, a: layer === 0 ? 0.25 + rand() * 0.35 : 0.45 + rand() * 0.45, layer, twinkle: rand() * Math.PI * 2, tint: (rand() < 0.75 ? 0 : rand() < 0.5 ? 1 : 2) as Star['tint']});
  }
  return out;
}
/** Drift speeds per layer, in canvas widths per second: very slow (the far layer crosses the screen in about 40 minutes). */
export const DRIFT = [0.0004, 0.0007, 0.0011] as const;
/** A star's horizontal place after `seconds` of drift, wrapped into 0–1. */
export const driftX = (star: Pick<Star, 'x' | 'layer'>, seconds: number) => { const x = (star.x + DRIFT[star.layer] * Math.max(0, seconds)) % 1; return x < 0 ? x + 1 : x; };
/** A star's brightness at `seconds`: a gentle twinkle around its own level (±25 %), within 0–1. */
export const twinkleAt = (star: Pick<Star, 'a' | 'twinkle' | 'layer'>, seconds: number) => Math.max(0, Math.min(1, star.a * (1 + 0.25 * Math.sin(star.twinkle + seconds * (0.4 + star.layer * 0.2)))));

/** What the device tells about itself (each optional: a browser that does not say counts as able). */
export type DeviceHints = {hardwareConcurrency?: number; deviceMemory?: number; saveData?: boolean; lowBattery?: boolean};
/** A low-end device, Save-Data or a low battery that is not charging: no running sky. */
export function lowEnd(h: DeviceHints): boolean {
  return (typeof h.hardwareConcurrency === 'number' && h.hardwareConcurrency > 0 && h.hardwareConcurrency <= 4)
    || (typeof h.deviceMemory === 'number' && h.deviceMemory > 0 && h.deviceMemory <= 4)
    || h.saveData === true || h.lowBattery === true;
}
export function deviceHints(nav: Navigator | undefined = typeof navigator === 'undefined' ? undefined : navigator): DeviceHints {
  if (!nav) return {};
  const n = nav as Navigator & {deviceMemory?: number; connection?: {saveData?: boolean}};
  return {hardwareConcurrency: n.hardwareConcurrency, deviceMemory: n.deviceMemory, saveData: n.connection?.saveData};
}
/** How the backdrop shows: a running sky, one still frame (reduced motion, Motion Off), or none (low-end: CSS only). */
export type SkyMode = 'running' | 'still' | 'none';
export function skyMode({motion, hints}: {motion: boolean; hints: DeviceHints}): SkyMode {
  if (lowEnd(hints)) return 'none';
  return motion ? 'running' : 'still';
}
/** Frames per second the running sky asks for (30 is plenty for a drift this slow and halves the work). */
export const SKY_FPS = 30;
/** The nebula band's clouds: soft blobs along a diagonal, in 0–1 coordinates, each with one of three tints. */
export function nebulaClouds(seed = 7): {x: number; y: number; r: number; tint: 0 | 1 | 2; a: number}[] {
  const rand = seeded(seed), out: {x: number; y: number; r: number; tint: 0 | 1 | 2; a: number}[] = [];
  for (let i = 0; i < 14; i++) {
    const t = i / 13, x = -0.05 + t * 1.1, y = 0.92 - t * 0.78 + (rand() - 0.5) * 0.16;
    out.push({x, y, r: 0.12 + rand() * 0.16, tint: (i % 3) as 0 | 1 | 2, a: 0.08 + rand() * 0.1});
  }
  return out;
}
