import type {HudMotionState} from '../holo/motion';
import type {NovaOrbState} from '../orb';
import type {DeviceHints} from '../orb-starfield';

/**
 * Session AM (ADR-038 D11, A7; art direction §9), rewritten in Session AM-2 (ADR-038 "AM-2", E1–E4): how hard NOVA's star
 * may work. Pure rules; the component (components/nova/core/star-system.tsx) follows them.
 *
 * AM-2 replaces D39 and the fallbacks of D11. On the owner's computer with graphics hardware the star did not appear, and
 * nothing on screen said why. The rules now are:
 * - `starRender`: the star **runs** wherever WebGL draws it. It is **one still frame** only where motion is not wanted or
 *   not seen (Motion Off, reduced motion, a hidden tab). It is the **still picture** (the same galaxy, drawn before; the
 *   SVG orb only if that picture cannot load) only where WebGL cannot draw it: no WebGL, a shader that does not compile,
 *   a driver that draws an empty frame, a lost context that does not come back.
 * - Everything else only makes it **slower or coarser**, never still and never hidden (`starPace`): software rendering,
 *   a low battery, a light device, frames that arrive late (the governor's tiers), Calm, and rest (the window not
 *   focused, or 30 s without a key, tap or request). Save-Data is about the network and no longer changes the star.
 *   Activity is never read from pointer movement. Phones are lighter.
 * - `starWhy`: one honest line for the stage whenever the star is still, slower than usual or a picture, so the person
 *   can tell which rule is at work.
 */
export type StarRender = 'running' | 'still' | 'picture';
/** Why WebGL cannot draw the star here (null: it can). */
export type StarFailure = 'no-webgl' | 'compile' | 'empty' | 'lost';
export function starRender({hud, webgl, failure}: {hud: HudMotionState; webgl: boolean; failure: StarFailure | null}): StarRender {
  if (!webgl || failure) return 'picture';
  if (hud === 'still' || hud === 'paused') return 'still';
  return 'running';
}
/**
 * Whether a WebGL renderer's own name says it draws on the processor (SwiftShader, llvmpipe, softpipe, Microsoft's basic
 * render driver, "software"). Some browsers grant a context without reporting a performance caveat (headless Chromium
 * does); the name is the second witness. A name that is not given says nothing.
 */
export const softwareRenderer = (name: string | null | undefined): boolean => !!name && /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
/** A light device: two cores or fewer, or 2 GB or less (a browser that says nothing counts as able). */
export const lightDevice = (h: DeviceHints): boolean => (typeof h.hardwareConcurrency === 'number' && h.hardwareConcurrency > 0 && h.hardwareConcurrency <= 2) || (typeof h.deviceMemory === 'number' && h.deviceMemory > 0 && h.deviceMemory <= 2);
/** Rest begins this long after the last key, tap or request (AM-2, B2: "idle, no request for 30 s, shows near-zero animation work"; it was a minute). */
export const REST_AFTER_MS = 30_000;
export type StarPace = {mode: 'active' | 'resting' | 'calm'; fps: number; scale: number; speed: number; detail: number};
/**
 * Quality tiers, best first: the noise octaves step down before the resolution does. The last tier is slow and coarse,
 * and still a running star (AM-2 E2: the governor never freezes it).
 */
export const STAR_TIERS: readonly {scale: number; detail: number; fps?: number}[] = [{scale: 1, detail: 5}, {scale: 1, detail: 4}, {scale: 0.75, detail: 3}, {scale: 0.5, detail: 3, fps: 12}];
/** What software rendering, a low battery and a light device may ask of the pace (each only lowers it). */
export const SOFTWARE_PACE = {fps: 8, restFps: 4, scale: 0.5, detail: 3} as const, BATTERY_FPS = 15, LIGHT_PACE = {fps: 15, scale: 0.75, detail: 4} as const;
export function starPace({hud, state, focused, idleMs, phone, software = false, hints = {}, tier = 0}: {hud: HudMotionState; state: NovaOrbState; focused: boolean; idleMs: number; phone: boolean;
  /** The browser draws WebGL without graphics hardware: every frame is the processor's work. */
  software?: boolean; hints?: DeviceHints;
  /** The governor's tier (STAR_TIERS). */
  tier?: number}): StarPace {
  const t = STAR_TIERS[Math.max(0, Math.min(STAR_TIERS.length - 1, tier))]!, busy = state !== 'idle';
  // Design review AM-D16: rest is a matter of frames per second, never of sharpness: the star keeps its resolution.
  const resting = hud !== 'calm' && !busy && (!focused || idleMs >= REST_AFTER_MS);
  let fps = hud === 'calm' ? 12 : resting ? 6 : phone ? 24 : 30, scale = (phone ? 0.7 : 1) * t.scale, detail = phone ? Math.min(3, t.detail) : t.detail;
  if (t.fps) fps = Math.min(fps, t.fps);
  if (software) { fps = Math.min(fps, resting ? SOFTWARE_PACE.restFps : SOFTWARE_PACE.fps); scale = Math.min(scale, SOFTWARE_PACE.scale); detail = Math.min(detail, SOFTWARE_PACE.detail); }
  if (hints.lowBattery === true) fps = Math.min(fps, BATTERY_FPS);
  if (lightDevice(hints)) { fps = Math.min(fps, LIGHT_PACE.fps); scale = Math.min(scale, LIGHT_PACE.scale); detail = Math.min(detail, LIGHT_PACE.detail); }
  return {mode: hud === 'calm' ? 'calm' : resting ? 'resting' : 'active', fps, scale, speed: hud === 'calm' ? 1 / 3 : 1, detail};
}
export const SLOW_FRAMES = 12;
/**
 * The governor's step: `late` counts consecutive frames that arrived later than one and a half times their slot. After
 * `SLOW_FRAMES` in a row the tier goes down one (and the count starts again); a frame on time resets the count.
 * A very late frame counts as four. It never steps up during a visit and never past the last tier.
 */
export function governorStep(tier: number, late: number, frameMs: number, fps: number): {tier: number; late: number} {
  const slot = 1000 / Math.max(1, fps);
  if (!(frameMs > slot * 1.5)) return {tier, late: 0};
  // A frame that took more than four slots (a device that cannot keep up at all) counts as four, so the star reaches a
  // tier it can afford within about a second and a half instead of six.
  const count = late + (frameMs > slot * VERY_LATE_SLOTS ? VERY_LATE_WEIGHT : 1);
  if (count < SLOW_FRAMES) return {tier, late: count};
  return {tier: Math.min(STAR_TIERS.length - 1, tier + 1), late: 0};
}
export const VERY_LATE_SLOTS = 4, VERY_LATE_WEIGHT = 4;
/** The governor starts watching this long after the star starts or wakes: a page that is still loading is not a slow device. */
export const GOVERNOR_GRACE_MS = 2000;
/** The canvas's backing size for a box of `css` pixels: the device's pixel ratio capped at 1.5, times the pace's scale (which carries the tier's). */
export function starPixels(css: number, dpr: number, paceScale: number): number {
  return Math.max(96, Math.min(1024, Math.round(css * Math.min(1.5, Math.max(1, dpr || 1)) * paceScale)));
}
/**
 * The honest line (AM-2 E4): why the star is still, slower than usual or a picture; null while it runs at its full pace
 * (rest is not said: the person is not looking). One sentence each, the cause after the colon.
 */
export type StarWhy = {kind: 'still' | 'slow' | 'picture'; code: 'no-webgl' | 'compile' | 'empty' | 'lost' | 'motion-off' | 'reduced-motion' | 'calm' | 'software' | 'battery' | 'device' | 'late'; text: string};
export const STAR_WHY: Readonly<Record<StarWhy['code'], string>> = {
  'no-webgl': 'Still picture: this browser has no WebGL',
  compile: 'Still picture: the star’s shader did not start in this browser',
  empty: 'Still picture: the graphics driver drew an empty frame',
  lost: 'Still picture: the graphics context was lost',
  'motion-off': 'Still star: Motion is Off in ZIGoals',
  'reduced-motion': 'Still star: your device asks for reduced motion',
  calm: 'Slow star: Calm motion is on',
  software: 'Slow star: this browser draws it without graphics hardware',
  battery: 'Slow star: battery below 20 %',
  device: 'Slow star: a light device',
  late: 'Slow star: frames arrived late on this device',
};
export function starWhy({render, webgl, failure, hud, reducedMotion, software, hints, tier}: {render: StarRender; webgl: boolean; failure: StarFailure | null; hud: HudMotionState;
  /** The device asks for reduced motion (the app's own Motion Off is told apart from it). */
  reducedMotion: boolean; software: boolean; hints: DeviceHints; tier: number}): StarWhy | null {
  const why = (kind: StarWhy['kind'], code: StarWhy['code']): StarWhy => ({kind, code, text: STAR_WHY[code]});
  if (render === 'picture') return why('picture', !webgl ? 'no-webgl' : failure ?? 'compile');
  if (render === 'still') return hud === 'still' ? why('still', reducedMotion ? 'reduced-motion' : 'motion-off') : null; // a hidden tab needs no line
  if (hud === 'calm') return why('slow', 'calm');
  if (software) return why('slow', 'software');
  if (hints.lowBattery === true) return why('slow', 'battery');
  if (lightDevice(hints)) return why('slow', 'device');
  if (tier >= STAR_TIERS.length - 1) return why('slow', 'late');
  return null;
}
/** What each state asks of the shader (the component eases toward these) and how fast the disc turns (turns of uSpin per second). */
export const STAR_STATE: Readonly<Record<NovaOrbState, {listen: number; think: number; speak: number; spin: number}>> = {
  idle: {listen: 0, think: 0, speak: 0, spin: 0.06},
  listening: {listen: 1, think: 0, speak: 0, spin: 0.03},
  thinking: {listen: 0, think: 1, speak: 0, spin: 0.24},
  speaking: {listen: 0, think: 0, speak: 1, spin: 0.09},
};
/** A speech-like envelope for the speaking pulse (0–1): no audio is read; it only has to feel like a voice. */
export const speakPulse = (t: number): number => Math.max(0, Math.min(1, 0.5 + 0.5 * Math.sin(t * 9.1) * Math.sin(t * 2.3 + 1) + 0.25 * Math.sin(t * 17)));
/** A colour "#rrggbb" as three 0–1 numbers (an unreadable colour reads as the fallback). */
export function rgb(hex: string, fallback: readonly [number, number, number]): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [...fallback];
  const n = parseInt(m[1]!, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
/** The star's three colours per accent (the same pairs nova.css maps to --nova-a/b/c). */
export const STAR_ACCENT: Readonly<Record<string, readonly [string, string, string]>> = {
  violet: ['#9273ff', '#23eaff', '#f06dff'], cyan: ['#23eaff', '#9273ff', '#459dff'], magenta: ['#f06dff', '#9273ff', '#63e7ff'], teal: ['#86f0d6', '#459dff', '#9273ff'], gold: ['#ffd27a', '#f06dff', '#9273ff'],
};
/** Whether a few pixels read back from the star's core (RGBA bytes) show that something was drawn: any pixel with light in it. */
export function drewSomething(pixels: ArrayLike<number>): boolean {
  for (let i = 0; i + 3 < pixels.length; i += 4) if (pixels[i + 3]! > 8 && pixels[i]! + pixels[i + 1]! + pixels[i + 2]! > 24) return true;
  return false;
}
