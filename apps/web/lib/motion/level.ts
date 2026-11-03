/**
 * Session AK M4 (owner follow-up 2): the app's Motion setting, Full / Calm / Off.
 *
 * Stored format (TIER 3 (stored format), additive): the device key `zigoals:motion:v1` has always held a plain string —
 * "system" (follow the device; the default, shown as Full) or "off". This build adds one value, "calm" (entrances only:
 * short fades, no movement, no loops, no parallax, no overshoot). Every older build reads the key as `=== 'off'` /
 * `!== 'off'`, so a stored "calm" reads there as Full (the old default): nothing breaks, nothing is lost, and this build
 * reads its own value back. Unknown words (a newer build's level) read as Calm — less motion than Full, never more; an
 * empty key, "system" or "full" read as Full; unreadable storage reads as Off (the safe still state).
 *
 * The device's reduced-motion setting always wins: under it every level is Off.
 */
export const MOTION_KEY = 'zigoals:motion:v1';
/** The values written to the key. "system" stays the Full value so older builds keep reading it unchanged. */
export const MOTION_CHOICES = ['system', 'calm', 'off'] as const;
export type MotionChoice = typeof MOTION_CHOICES[number];
/** What the page actually does. */
export type MotionLevel = 'full' | 'calm' | 'off';
/** Fired on the window when the choice changes in this tab (the existing event; other tabs get `storage`). */
export const MOTION_EVENT = 'zigoals-motion';

/** Reads a stored value safely: never throws, every input maps to one of the three choices. */
export function parseMotionChoice(raw: unknown): MotionChoice {
  if (raw === null || raw === undefined) return 'system';
  if (typeof raw !== 'string') return 'calm';
  const word = raw.trim().toLowerCase();
  if (word === '' || word === 'system' || word === 'full') return 'system';
  if (word === 'off') return 'off';
  return 'calm';
}

/** The level in effect: reduced motion on the device → Off, whatever the app says. */
export function effectiveMotion(choice: MotionChoice, reducedMotion: boolean): MotionLevel {
  if (reducedMotion || choice === 'off') return 'off';
  return choice === 'calm' ? 'calm' : 'full';
}

type StorageLike = Pick<Storage, 'getItem'>;
type WindowLike = {localStorage?: StorageLike; matchMedia?: (query: string) => {matches: boolean}};

/** The stored choice; unreadable storage reads as "off" (no motion when we cannot know what the person chose). */
export function readMotionChoice(win: WindowLike | undefined = typeof window === 'undefined' ? undefined : window): MotionChoice {
  if (!win) return 'off';
  try { return parseMotionChoice(win.localStorage?.getItem(MOTION_KEY) ?? null); } catch { return 'off'; }
}

export function prefersReducedMotion(win: WindowLike | undefined = typeof window === 'undefined' ? undefined : window): boolean {
  try { return !!win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return true; }
}

/** The level this page should use right now (no window → Off: the server renders still). */
export function currentMotionLevel(win: WindowLike | undefined = typeof window === 'undefined' ? undefined : window): MotionLevel {
  if (!win) return 'off';
  return effectiveMotion(readMotionChoice(win), prefersReducedMotion(win));
}

/** Movement (rises, springs, loops, parallax, bursts, tickers) only in Full. */
export const movementAllowed = (level: MotionLevel): boolean => level === 'full';
/** Short entrances (fades) in Full and Calm. */
export const entrancesAllowed = (level: MotionLevel): boolean => level !== 'off';

/** The words Settings shows for each choice. */
export const MOTION_LABELS: Record<MotionChoice, string> = {system: 'Full', calm: 'Calm (entrances only)', off: 'Off'};
export const MOTION_SAVED: Record<MotionChoice, string> = {
  system: 'Saved. Motion is full on this device, and follows your device setting.',
  calm: 'Saved. Motion is calm on this device: short fades only, nothing moves around or loops.',
  off: 'Saved. Motion is off on this device.',
};
