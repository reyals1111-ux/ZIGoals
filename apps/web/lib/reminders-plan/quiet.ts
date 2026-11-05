import {formatClock} from '../visual-format';

/**
 * Session AL (MO-038, P-MO-80): whether a reminder's clock time ("HH:MM") falls inside the quiet hours, which may run past
 * midnight (22:00 → 08:00). Same rule as lib/habits-extras/bell.ts inQuietHours: from is inside, until is not.
 */
export function clockInQuiet(time: string, quiet: {from: string; to: string}): boolean {
  const m = (t: string) => { const [h, mm] = t.split(':').map(Number); return Number.isFinite(h) && Number.isFinite(mm) ? h! * 60 + mm! : NaN; };
  const at = m(time), f = m(quiet.from), t = m(quiet.to);
  if ([at, f, t].some(Number.isNaN) || f === t) return false;
  return f < t ? at >= f && at < t : at >= f || at < t;
}
/** The plain note under a time that waits: null when it is outside the quiet hours (or there is no time). */
export function quietNote(time: string | null | undefined, quiet: {from: string; to: string}): string | null {
  return time && clockInQuiet(time, quiet) ? `Inside your quiet hours: it waits until ${formatClock(quiet.to)}.` : null;
}
