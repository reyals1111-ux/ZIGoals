/**
 * Session AK (owner follow-up 2, N2 and M3; lane NA): the NOVA orb's states and the motion rules NOVA's page follows.
 * The orb is drawn by components/nova/orb.tsx (hand-made SVG in the nebula palette); NB's chat drives its state through
 * props. Every state is also said in words, so nothing depends on seeing it move.
 */
import {loopLevel, loopRuns} from '../motion-loops/loops';
import type {MotionLevel} from '../motion/level';
export const ORB_STATES = ['idle', 'listening', 'thinking', 'speaking'] as const;
export type NovaOrbState = (typeof ORB_STATES)[number];
export const ORB_STATE_LABEL: Record<NovaOrbState, string> = {idle: 'Standby', listening: 'Listening', thinking: 'Thinking', speaking: 'Speaking'};
export const isOrbState = (value: unknown): value is NovaOrbState => typeof value === 'string' && (ORB_STATES as readonly string[]).includes(value);

/** What decides whether NOVA may move: the device's reduced motion, the app's Motion setting (`html[data-app-motion]`). */
export type MotionSignals = {reducedMotion: boolean; appMotion: string | undefined};
/** Session AK (FU): the Motion level these signals make (Full / Calm / Off; lib/motion/level.ts). */
export const novaMotionLevel = (s: MotionSignals): MotionLevel => loopLevel(s.appMotion, s.reducedMotion);
/**
 * Motion (the starfield's drift, the opening sequence) is allowed only at Full: not when the device asks for less, the
 * app's Motion is Off, or (Session AK FU) the app's Motion is Calm — then the starfield draws one still frame and the
 * finished dashboard shows.
 */
export const motionAllowedBy = (s: MotionSignals): boolean => loopRuns(novaMotionLevel(s));
/** Reads the signals from the page (false everywhere outside a browser). */
export function motionSignals(win: Window | undefined = typeof window === 'undefined' ? undefined : window): MotionSignals {
  if (!win) return {reducedMotion: true, appMotion: 'off'};
  let reducedMotion = false;
  try { reducedMotion = !!win.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { reducedMotion = false; }
  return {reducedMotion, appMotion: win.document?.documentElement?.dataset.appMotion};
}
export const novaMotionAllowed = (win?: Window) => motionAllowedBy(motionSignals(win));
export const novaMotionLevelNow = (win?: Window): MotionLevel => novaMotionLevel(motionSignals(win));
/** What Customize says when the opening is asked to replay and motion does not allow it. */
export const openingSkippedNote = (level: MotionLevel): string => level === 'calm'
  ? 'Motion is calm on this device, so the opening does not play. Everything is already in place.'
  : 'Motion is off on this device, so the opening does not play. Everything is already in place.';

/** The opening sequence's beats (ms from the start); the whole sequence is about two seconds. */
export const OPENING = {ignite: 0, rings: 280, widgets: 820, widgetStep: 110, greeting: 1150, typeStep: 26, end: 2100} as const;
/** How long one widget takes to settle (components/nova/nova.css, `nova-settle`). */
export const SETTLE_MS = 520;
/**
 * When widget `index` (of `count`) starts to settle: one by one, the whole set inside the sequence's end. Session AK P3
 * (ND-11): the room is measured with the settle's own length, so the last widget has come to rest when the sequence ends
 * (it used to start at 1680 ms and was cut off at 2100 ms, snapping the last 100 ms).
 */
export function settleDelay(index: number, count: number): number {
  if (count <= 0 || index < 0) return OPENING.widgets;
  const room = OPENING.end - SETTLE_MS - OPENING.widgets, step = Math.min(OPENING.widgetStep, count > 1 ? room / (count - 1) : room);
  return Math.round(OPENING.widgets + Math.min(index, count - 1) * step);
}
/** How many characters of the greeting show at `elapsed` ms into the sequence (all of it once the sequence ends). */
export function typedLength(text: string, elapsed: number): number {
  if (elapsed >= OPENING.end) return text.length;
  return Math.max(0, Math.min(text.length, Math.floor((elapsed - OPENING.greeting) / OPENING.typeStep)));
}

/** The greeting for the hour (0–23), in NOVA's voice; calm, no exclamation marks. */
export function greetingFor(hour: number, persona: string): string {
  const part = hour >= 5 && hour < 12 ? 'Good morning.' : hour >= 12 && hour < 18 ? 'Good afternoon.' : hour >= 18 && hour < 23 ? 'Good evening.' : 'Still up?';
  return `${part} ${persona} is online.`;
}
