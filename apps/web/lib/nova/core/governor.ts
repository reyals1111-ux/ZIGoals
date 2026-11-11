import type {HudMotionState} from '../holo/motion';
import type {NovaOrbState} from '../orb';
import type {DeviceHints} from '../orb-starfield';

/**
 * Session AM (ADR-038 D11, A7; art direction §9): how hard NOVA's star may work. Pure rules; the component
 * (components/nova/core/star-system.tsx) follows them.
 *
 * - `starRender`: whether the star is drawn at all, as a running picture, one still frame, or not (the SVG orb shows).
 *   No WebGL, a context that could not be restored, Save-Data and a low battery fall back to the SVG orb; Motion Off and
 *   reduced motion, a hidden tab, a very small device and a browser that draws WebGL in software get one still frame per state.
 * - `starPace`: frames per second and resolution for a running star. Active (the person just pressed a key, tapped,
 *   asked, or NOVA is listening, thinking or speaking) is 30 fps; resting (the window is not focused, or 60 s passed
 *   without a key, tap or request) is 6 fps at the same resolution; Calm is 12 fps. Activity is never read from pointer
 *   movement. Phones are lighter.
 * - The governor: when frames arrive late for a while, quality steps down a tier (resolution, then noise octaves); the
 *   last tier is one still frame. It never steps up during a visit.
 */
export type StarRender = 'running' | 'still' | 'orb';
export function starRender({hud, webgl, hints, failed, software = false}: {hud: HudMotionState; webgl: boolean; hints: DeviceHints; failed: boolean;
  /** The browser draws WebGL without the graphics hardware (it reports a major performance caveat): every frame is the processor's work. */
  software?: boolean}): StarRender {
  if (!webgl || failed || hints.saveData === true || hints.lowBattery === true) return 'orb';
  if (hud === 'still' || hud === 'paused') return 'still';
  // A7: without graphics hardware a running star would take the processor from the page (measured: 67 ms a frame at
  // CPU 4×), so it is one composed frame per state, like Motion Off's.
  if (software) return 'still';
  if ((typeof hints.hardwareConcurrency === 'number' && hints.hardwareConcurrency > 0 && hints.hardwareConcurrency <= 2) || (typeof hints.deviceMemory === 'number' && hints.deviceMemory > 0 && hints.deviceMemory <= 2)) return 'still';
  return 'running';
}
export const REST_AFTER_MS = 60_000;
export type StarPace = {mode: 'active' | 'resting' | 'calm'; fps: number; scale: number; speed: number};
export function starPace({hud, state, focused, idleMs, phone}: {hud: HudMotionState; state: NovaOrbState; focused: boolean; idleMs: number; phone: boolean}): StarPace {
  if (hud === 'calm') return {mode: 'calm', fps: 12, scale: phone ? 0.7 : 1, speed: 1 / 3};
  const busy = state !== 'idle';
  // Design review AM-D16: rest is a matter of frames per second, never of sharpness: the star keeps its resolution.
  if (!busy && (!focused || idleMs >= REST_AFTER_MS)) return {mode: 'resting', fps: 6, scale: phone ? 0.7 : 1, speed: 1};
  return {mode: 'active', fps: phone ? 24 : 30, scale: phone ? 0.7 : 1, speed: 1};
}
/** Quality tiers, best first: the noise octaves step down before the resolution does; the last is one still frame, drawn at full quality (one frame costs nothing). */
export const STAR_TIERS: readonly {scale: number; detail: number; still?: true}[] = [{scale: 1, detail: 5}, {scale: 1, detail: 4}, {scale: 0.75, detail: 3}, {scale: 1, detail: 5, still: true}];
export const SLOW_FRAMES = 12;
/**
 * The governor's step: `late` counts consecutive frames that arrived later than one and a half times their slot. After
 * `SLOW_FRAMES` in a row the tier goes down one (and the count starts again); a frame on time resets the count.
 * A very late frame counts as four.
 */
export function governorStep(tier: number, late: number, frameMs: number, fps: number): {tier: number; late: number} {
  const slot = 1000 / Math.max(1, fps);
  if (!(frameMs > slot * 1.5)) return {tier, late: 0};
  // A frame that took more than four slots (a device that cannot keep up at all: software rendering, a throttled CPU)
  // counts as four, so the star reaches a tier it can afford within about a second and a half instead of six.
  const count = late + (frameMs > slot * VERY_LATE_SLOTS ? VERY_LATE_WEIGHT : 1);
  if (count < SLOW_FRAMES) return {tier, late: count};
  return {tier: Math.min(STAR_TIERS.length - 1, tier + 1), late: 0};
}
export const VERY_LATE_SLOTS = 4, VERY_LATE_WEIGHT = 4;
/** The governor starts watching this long after the star starts or wakes: a page that is still loading is not a slow device. */
export const GOVERNOR_GRACE_MS = 2000;
/** The canvas's backing size for a box of `css` pixels: the device's pixel ratio capped at 1.5, times the pace and the tier. */
export function starPixels(css: number, dpr: number, paceScale: number, tier: number): number {
  const t = STAR_TIERS[Math.max(0, Math.min(STAR_TIERS.length - 1, tier))]!;
  return Math.max(96, Math.min(1024, Math.round(css * Math.min(1.5, Math.max(1, dpr || 1)) * paceScale * t.scale)));
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
