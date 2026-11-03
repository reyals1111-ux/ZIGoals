import {effectiveMotion, movementAllowed, parseMotionChoice, type MotionLevel} from '../motion/level';

/**
 * Session AK (lane FU, owner follow-up 2 / M4): the Motion level for loops drawn by JavaScript (the sidebar sky's drift,
 * the Checklist's ambient sky, NOVA's starfield and opening, the notes graph's turning rings). CSS loops follow
 * `html[data-app-motion]` through motion-2026.css; a script reads the same attribute (MotionPreferenceSync mirrors the
 * stored choice onto it) with the device's reduced motion, through lib/motion/level.ts, so every loop agrees:
 * - Full: the loop runs as before.
 * - Calm: one still frame (or nothing extra drawn) and no loop: no drift, no sparkle, no turning.
 * - Off, or reduced motion on the device: nothing moves, exactly as before this change.
 * No attribute yet (before the app's sync has run) reads as Full, as before; an unknown word reads as Calm.
 */
export const loopLevel = (appMotion: string | null | undefined, reducedMotion: boolean): MotionLevel =>
  effectiveMotion(parseMotionChoice(appMotion ?? null), reducedMotion);
/** Whether a JavaScript loop may run at this level (Full only). */
export const loopRuns = (level: MotionLevel): boolean => movementAllowed(level);

/** Reads the level from the page; outside a browser (or if reading fails) Off, the still state. */
export function readLoopLevel(): MotionLevel {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 'off';
  let reduced = false;
  try { reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { reduced = true; }
  return loopLevel(document.documentElement.dataset.appMotion, reduced);
}
/** Calls `change` whenever the app's Motion setting or the device's reduced motion changes; returns the unsubscribe. */
export function watchLoopLevel(change: () => void): () => void {
  const observer = new MutationObserver(change), query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  observer.observe(document.documentElement, {attributes: true, attributeFilter: ['data-app-motion']});
  query?.addEventListener?.('change', change);
  return () => { observer.disconnect(); query?.removeEventListener?.('change', change); };
}

/**
 * The Checklist's ambient sky (components/checklist/ambient-sky.tsx): `off` under Off and reduced motion (nothing drawn,
 * as before), `still` under Calm (nothing drawn and no timers: the page's own CSS sky stays, still), else `paused` while
 * something asks it to rest or the tab is hidden, and `running` otherwise.
 */
export type AmbientSkyState = 'off' | 'still' | 'paused' | 'running';
export function ambientSkyState({level, paused, hidden}: {level: MotionLevel; paused: boolean; hidden: boolean}): AmbientSkyState {
  if (level === 'off') return 'off';
  if (!loopRuns(level)) return 'still';
  return paused || hidden ? 'paused' : 'running';
}

/**
 * The notes graph (components/notes/graph-view.tsx): its rings turn only in Full; under Calm the star system shows still;
 * under Off and reduced motion it is still and the list opens first, as before.
 */
export const graphMotion = (level: MotionLevel): {turn: boolean; listFirst: boolean} => ({turn: loopRuns(level), listFirst: level === 'off'});
