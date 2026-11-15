import {APP_ENVIRONMENT} from '../../app-environment';
import {ORB_STATES, type NovaOrbState} from '../orb';

/**
 * Session AM-2 (ADR-038 "AM-2", E5): looking at the star while building it. The session's sandbox has no graphics
 * hardware, so the star there is drawn by the processor at a few frames a second; these switches let a developer (and a
 * browser spec) see the real shader at its full pace and hold a state for a capture. They change nothing stored, select
 * no policy and reach no data: they only change how fast and in which state a decoration is drawn.
 *
 * - `?star=live` — draw at the full pace even on software rendering, and do not let the governor step down.
 * - `?star=why` — always show the star's line (how it is drawn right now), with the renderer's name.
 * - `?star=listening|thinking|speaking` — hold that state (implies `live`).
 * Several may be joined with commas. The address is read only in a LOCAL_DEMO build. A browser spec on any build sets
 * `window.__zgStarLive = true` (and `window.__zgStarHold`) before the page loads, after the pattern of `__zgHudFrames`.
 */
export type StarDebug = {live: boolean; why: boolean; hold: NovaOrbState | null};
type Flags = {__zgStarLive?: unknown; __zgStarHold?: unknown};
export function parseStarDebug(search: string, flags: Flags = {}, environment: string = APP_ENVIRONMENT): StarDebug {
  const words = environment === 'LOCAL_DEMO' ? (new URLSearchParams(search).get('star') ?? '').split(',').map(w => w.trim().toLowerCase()).filter(Boolean) : [];
  const asState = (v: unknown): NovaOrbState | null => typeof v === 'string' && v !== 'idle' && (ORB_STATES as readonly string[]).includes(v) ? v as NovaOrbState : null;
  const hold = asState(flags.__zgStarHold) ?? words.map(asState).find(Boolean) ?? null;
  return {live: flags.__zgStarLive === true || words.includes('live') || hold !== null, why: words.includes('why'), hold};
}
export function starDebug(): StarDebug {
  if (typeof window === 'undefined') return {live: false, why: false, hold: null};
  return parseStarDebug(window.location.search, window as unknown as Flags);
}
/** Whether this build shows the renderer's details beside the star's line (LOCAL_DEMO only). */
export const STAR_DETAILS = APP_ENVIRONMENT === 'LOCAL_DEMO';
