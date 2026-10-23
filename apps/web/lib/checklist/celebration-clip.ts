/**
 * Session AG Polish 2 (ADR-031 K13; owner Part 7): the day's celebration is the owner's own video — ZIGi with the day's
 * planets orbiting (Grok Imagine, owner-owned; 720 × 1280, 24 fps, 7.6 s, silent, no text). The clip lives in this one
 * constant, so a future video is a one-line swap. WebM (VP9) first, then MP4 (H.264 High 4.0); the first frame is the
 * poster, the last frame the still it rests on (and the whole moment under reduced motion, Motion Off and Save-Data).
 *
 * The video is never part of the first load: `primeCelebrationVideo` starts fetching it only when the day is one item from
 * complete (and not yet celebrated today), and `takeCelebrationVideo` hands that element to the celebration — or makes one
 * when the celebration opens without it. Every "no" in `decideCelebration` means no request at all: the still shows.
 */
export const CELEBRATION_CLIP = {
  sources: [
    {src: '/art/checklist/celebration/13-celebration-clean.webm', type: 'video/webm; codecs="vp9"'},
    {src: '/art/checklist/celebration/13-celebration-clean.mp4', type: 'video/mp4; codecs="avc1.640028"'},
  ],
  poster: '/art/checklist/celebration/13-celebration-first-frame.webp',
  still: '/art/checklist/celebration/13-celebration-last-frame.webp',
  width: 720, height: 1280,
  /** Its length, and the moment our own words fade in over it (the original's rhythm, owner reference 14). */
  seconds: 7.625, uiAt: 7.3,
} as const;
/** Not ready to play within this time: the still and the words at once, and the clip never starts late. */
export const READY_MS = 1500;

export type AutoplayPolicy = 'allowed' | 'allowed-muted' | 'disallowed' | 'unknown';
export type CelebrationEnvironment = {reducedMotion: boolean; motionOff: boolean; saveData: boolean; autoplay: AutoplayPolicy; canPlay: (type: string) => boolean};
export type CelebrationDecision = {play: true} | {play: false; reason: 'reduced-motion' | 'motion-off' | 'save-data' | 'autoplay-blocked' | 'unplayable'};

/** Pure: whether this moment plays the clip or shows its last frame. */
export function decideCelebration(env: CelebrationEnvironment): CelebrationDecision {
  if (env.reducedMotion) return {play: false, reason: 'reduced-motion'};
  if (env.motionOff) return {play: false, reason: 'motion-off'};
  if (env.saveData) return {play: false, reason: 'save-data'};
  if (env.autoplay === 'disallowed') return {play: false, reason: 'autoplay-blocked'};
  return CELEBRATION_CLIP.sources.some(s => env.canPlay(s.type)) ? {play: true} : {play: false, reason: 'unplayable'};
}
