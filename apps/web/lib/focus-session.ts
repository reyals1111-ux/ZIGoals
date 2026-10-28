/**
 * Session AI (B3 competitor gap: a focus session tied to a goal): the note a finished focus session adds to its goal's
 * notes, on the person's tap ("Focus session: 25 min, 28 Oct"). The goal keeps its notes as they are; nothing new is
 * stored, and a session shorter than a minute is never noted.
 */
export const FOCUS_LENGTHS = [15, 25, 50] as const;
export const MAX_NOTES_CHARS = 2000;
export function focusNote(minutes: number, day: string): string | null {
  const whole = Math.floor(minutes);
  return whole >= 1 ? `Focus session: ${whole} min (${day})` : null;
}
/** The goal's notes with the session's line appended (cut to the notes' limit from the start, never the new line). */
export function withFocusNote(notes: string | undefined, line: string): string {
  const next = notes ? `${notes}\n${line}` : line;
  return next.length <= MAX_NOTES_CHARS ? next : next.slice(next.length - MAX_NOTES_CHARS);
}
