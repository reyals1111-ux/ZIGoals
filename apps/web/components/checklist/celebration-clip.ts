import {CELEBRATION_CLIP, decideCelebration, type AutoplayPolicy, type CelebrationEnvironment} from '../../lib/checklist/celebration-clip';

/**
 * Session AG Polish 2 (ADR-031 K13; owner Part 7): the browser's side of the celebration's clip (lib/checklist/
 * celebration-clip.ts holds the clip and the pure decision). The video is never part of the first load: `primeCelebrationVideo`
 * starts fetching it only when the day is one item from complete (and not yet celebrated today), and `takeCelebrationVideo`
 * hands that element to the celebration — or makes one when the celebration opens without it.
 */
let probe: HTMLVideoElement | null = null;
/** The browser's side of the decision (read when needed; storage or media queries that throw read as "still"). */
export function celebrationEnvironment(): CelebrationEnvironment {
  const nav = navigator as Navigator & {connection?: {saveData?: boolean}; getAutoplayPolicy?: (type: 'mediaelement') => string};
  let autoplay: AutoplayPolicy = 'unknown';
  try { const p = nav.getAutoplayPolicy?.('mediaelement'); if (p === 'allowed' || p === 'allowed-muted' || p === 'disallowed') autoplay = p; } catch { /* not exposed */ }
  let reducedMotion = true, motionOff = true;
  try { reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; motionOff = document.documentElement.dataset.appMotion === 'off'; } catch { /* still */ }
  return {reducedMotion, motionOff, saveData: nav.connection?.saveData === true, autoplay, canPlay: type => (probe ??= document.createElement('video')).canPlayType(type) !== ''};
}

let primed: HTMLVideoElement | null = null;
function makeVideo(): HTMLVideoElement {
  const v = document.createElement('video');
  v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = 'auto';
  v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true'); v.setAttribute('disablepictureinpicture', ''); v.setAttribute('disableremoteplayback', '');
  v.tabIndex = -1; v.className = 'checklist-celebration-video'; v.poster = CELEBRATION_CLIP.poster; v.width = CELEBRATION_CLIP.width; v.height = CELEBRATION_CLIP.height;
  for (const s of CELEBRATION_CLIP.sources) { const source = document.createElement('source'); source.src = s.src; source.type = s.type; v.appendChild(source); }
  v.load();
  return v;
}
/** Starts fetching the clip ahead of the moment (once), where it would play; otherwise nothing is fetched. */
export function primeCelebrationVideo(): void {
  if (primed || typeof document === 'undefined') return;
  if (!decideCelebration(celebrationEnvironment()).play) return;
  primed = makeVideo();
}
/** The clip for the celebration that is opening: the primed element if there is one, else a new one. */
export function takeCelebrationVideo(): HTMLVideoElement {
  const v = primed ?? makeVideo(); primed = null;
  return v;
}
/** Whether the clip has started loading (the test hook for "never in the first load"). */
export const celebrationPrimed = () => primed !== null;
