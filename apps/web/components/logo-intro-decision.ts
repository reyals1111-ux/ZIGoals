/**
 * Logo fold intro (Session I): whether this page load may play the owner's brand film over the static Z, and where the
 * clip sits so its last frame lands exactly on the static logo. Pure functions, so the rules are unit-tested
 * (lib/logo-intro.test.ts); logo-intro.tsx reads the browser and drives the clip.
 */
export const LOGO_INTRO_KEY = "zigoals:logo-intro:v1";
/** WebM (VP9) first, then MP4 (H.264 High 3.1). Both are 588×432, 24 fps, 12.5 s, silent. */
export const FOLD_SOURCES = [
  { src: "/brand/logo-fold/logo-fold.webm", type: 'video/webm; codecs="vp9"' },
  { src: "/brand/logo-fold/logo-fold.mp4", type: 'video/mp4; codecs="avc1.64001F"' },
] as const;
export type FoldSource = (typeof FOLD_SOURCES)[number];
/**
 * The clip's frame in its own pixels: the Z of the final frame (it settles there), and the widest any folded figure gets
 * (the swan, heart and bull reach x 16–571). Measured with a luma threshold over all 300 frames.
 */
export const FOLD = { w: 588, h: 432, z: { x: 136, y: 38, w: 316, h: 355 }, figure: { left: 16, right: 571 } } as const;
/** The Z inside the static logo image, as fractions of the image box (measured on the 422×480 file; every density matches). */
export const LOGO_Z = { x: 11 / 422, y: 16 / 480, w: 399 / 422, h: 448 / 480 } as const;
/** No frame within this time: the static Z stays (slow network, blocked autoplay that never rejects). */
export const READY_MS = 1500;
/** The final crossfade into the static Z. */
export const CROSSFADE_MS = 240;
/** From here the bull has folded back to under 441 px of frame width, so the clip can ease to its exact size. */
export const SETTLE_AT_S = 11.25;

export type AutoplayPolicy = "allowed" | "allowed-muted" | "disallowed" | "unknown";
export type IntroEnvironment = {
  /** The static Z this host would cover is rendered (the sidebar on desktop and tablets, the top bar on phones). */
  hostVisible: boolean;
  reducedMotion: boolean;
  /** The in-app Motion Off setting, or storage that cannot be read (treated as off, like entranceAllowed). */
  motionOff: boolean;
  /** The once-per-browser-session flag; "unavailable" when sessionStorage throws. */
  session: "unplayed" | "played" | "unavailable";
  /** The browser's data saver. */
  saveData: boolean;
  /** navigator.getAutoplayPolicy where the browser exposes it, otherwise "unknown". */
  autoplay: AutoplayPolicy;
  /** Asked only once every cheaper rule passed, so a blocked intro never even probes a media element. */
  canPlay: (type: string) => boolean;
};
export type IntroSkip = "hidden" | "reduced-motion" | "motion-off" | "played" | "no-session" | "save-data" | "autoplay-blocked" | "unplayable";
export type IntroDecision = { play: true; sources: FoldSource[] } | { play: false; reason: IntroSkip };

/**
 * Every "no" means no <video> element and no request: the static Z simply stays. A "yes" always offers both sources,
 * WebM first, and the browser takes the first it can play (the sandbox Chromium has VP9 but no H.264).
 */
export function decideLogoIntro(env: IntroEnvironment): IntroDecision {
  if (!env.hostVisible) return { play: false, reason: "hidden" };
  if (env.reducedMotion) return { play: false, reason: "reduced-motion" };
  if (env.motionOff) return { play: false, reason: "motion-off" };
  if (env.session === "unavailable") return { play: false, reason: "no-session" };
  if (env.session === "played") return { play: false, reason: "played" };
  if (env.saveData) return { play: false, reason: "save-data" };
  if (env.autoplay === "disallowed") return { play: false, reason: "autoplay-blocked" };
  return FOLD_SOURCES.some(source => env.canPlay(source.type)) ? { play: true, sources: [...FOLD_SOURCES] } : { play: false, reason: "unplayable" };
}

export type Box = { left: number; top: number; width: number; height: number };
export type FoldPlacement = { box: Box; origin: { x: number; y: number }; startScale: number };
/**
 * The clip's box (in the same coordinates as `logo`) that puts the final frame's Z exactly on the static Z, the point the
 * clip scales around (that Z's centre, in the clip's own coordinates), and the scale it starts at so the widest folded
 * figure stays inside `[clipLeft, clipRight]` with a 4 px margin. It eases to scale 1 once the figure is the Z again.
 */
export function foldPlacement(logo: Box, clipLeft: number, clipRight: number): FoldPlacement {
  const k = (LOGO_Z.w * logo.width / FOLD.z.w + LOGO_Z.h * logo.height / FOLD.z.h) / 2;
  const box = { left: logo.left + LOGO_Z.x * logo.width - FOLD.z.x * k, top: logo.top + LOGO_Z.y * logo.height - FOLD.z.y * k, width: FOLD.w * k, height: FOLD.h * k };
  const zx = FOLD.z.x + FOLD.z.w / 2, origin = { x: zx * k, y: (FOLD.z.y + FOLD.z.h / 2) * k };
  const centre = box.left + origin.x, room = Math.min(centre - clipLeft, clipRight - centre) - 4;
  const figure = Math.max(zx - FOLD.figure.left, FOLD.figure.right - zx) * k;
  return { box, origin, startScale: Math.max(.5, Math.min(1, room / figure)) };
}
