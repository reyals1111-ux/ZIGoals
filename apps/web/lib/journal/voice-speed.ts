import {journalDisplaySchema, type JournalDisplay} from '../on-this-day/store';

/**
 * Session AW (x3; LEDGER #442, Evernote's voice notes played faster): ZIGoals' own player for a journal voice note —
 * 1×, 1.25×, 1.5× or 2×, back 15 seconds and forward 15 seconds, and the time played of the whole. The speed chosen is a
 * display choice of this device, kept in the journal's display record (`voiceSpeed`). A transcript is not made: it needs
 * a model, and a voice note never leaves the device. Pure.
 */
export const VOICE_SPEEDS = [1, 1.25, 1.5, 2] as const;
export type VoiceSpeed = (typeof VOICE_SPEEDS)[number];
export const SKIP_SECONDS = 15;
export const voiceSpeedOf = (display: Pick<JournalDisplay, 'voiceSpeed'>): VoiceSpeed => display.voiceSpeed ?? 1;
/** The display record with the speed changed (1 is the default, so it is kept as no choice at all). */
export function withVoiceSpeed(display: JournalDisplay, speed: VoiceSpeed): JournalDisplay {
  const next = {...display};
  if (speed === 1) delete next.voiceSpeed; else next.voiceSpeed = speed;
  return journalDisplaySchema.parse(next);
}
/** The speed in words for a button ("1.25×") and for a screen reader ("1.25 times"). */
export const speedLabel = (speed: VoiceSpeed) => `${speed}×`;
export const speedWords = (speed: VoiceSpeed) => speed === 1 ? 'normal speed' : `${speed} times as fast`;
/** Where a skip lands: never before the start, never past the end (when the end is known). */
export function skipTo(current: number, by: number, total: number | null): number {
  const at = Math.max(0, (Number.isFinite(current) ? current : 0) + by);
  return total !== null && Number.isFinite(total) && total > 0 ? Math.min(at, total) : at;
}
/** The whole length: the browser's when it knows it (a recording of the browser often says "Infinity"), else the entry's own seconds. */
export const totalOf = (duration: number, seconds: number | undefined): number | null => Number.isFinite(duration) && duration > 0 ? duration : seconds && seconds > 0 ? seconds : null;
/** A time on the clock of a voice note: 0:07, 1:30, 12:05 (whole seconds, rounded down). */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
/** "0:12 of 0:40" — the time played and the whole (unknown while the browser has not read it: "0:12 played"). */
export const timeLine = (current: number, total: number | null) => total === null ? `${clock(current)} played` : `${clock(Math.min(current, total))} of ${clock(total)}`;
