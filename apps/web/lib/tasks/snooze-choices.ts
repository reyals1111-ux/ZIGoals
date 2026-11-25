import {formatClock} from '../visual-format';
import {addDays, instantAt, wallClock} from '../zone-time';
import {DAY_ONLY_CLOCK} from './reminders';

/**
 * Session AW (X1, LEDGER #439; Due's own snooze times): up to six snooze choices of the person's own — a length ("2 h"),
 * a time later ("this evening 7:00 PM"), tomorrow at a time, or a weekday at a time — offered in a reminder's snooze row,
 * the first one also on the notification's snooze button ("Snooze 2 h"). Kept as `snoozes` in the loose notification
 * preferences (lib/notify/prefs.ts); with none kept, the usual three (15 min, 1 h, tomorrow 09:00) stay exactly as they
 * were. Pure: the zone and the instant come in.
 */
export const MAX_SNOOZES = 6, SNOOZE_MIN_MINUTES = 5, SNOOZE_MAX_MINUTES = 1440;
/** `day`: "next" is the next time the clock says `at` (today if still ahead), "tomorrow", or a weekday (0 = Sunday). */
export type OwnSnooze = {for: number} | {at: string; day: 'next' | 'tomorrow' | number};
const CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const isOwnSnooze = (v: unknown): v is OwnSnooze => {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if ('for' in o) return Number.isInteger(o.for) && (o.for as number) >= SNOOZE_MIN_MINUTES && (o.for as number) <= SNOOZE_MAX_MINUTES;
  return typeof o.at === 'string' && CLOCK.test(o.at) && (o.day === 'next' || o.day === 'tomorrow' || (Number.isInteger(o.day) && (o.day as number) >= 0 && (o.day as number) <= 6));
};
/** The usual three, as own choices (the same lengths as lib/tasks/reminders.ts SNOOZE_CHOICES). */
export const USUAL_SNOOZES: readonly OwnSnooze[] = [{for: 15}, {for: 60}, {at: DAY_ONLY_CLOCK, day: 'tomorrow'}];
/** The person's own choices that this build can read (at most six), or null when none are kept. */
export function ownSnoozes(stored: unknown): OwnSnooze[] | null {
  if (!Array.isArray(stored)) return null;
  const out: OwnSnooze[] = [], seen = new Set<string>();
  for (const c of stored) { if (!isOwnSnooze(c)) continue; const key = snoozeKey(c); if (seen.has(key)) continue; seen.add(key); out.push('for' in c ? {for: c.for} : {at: c.at, day: c.day}); if (out.length === MAX_SNOOZES) break; }
  return out.length ? out : null;
}
export const snoozeKey = (c: OwnSnooze) => 'for' in c ? `for:${c.for}` : `at:${c.day}:${c.at}`;
function lengthWords(m: number, short: boolean): string {
  const h = Math.floor(m / 60), rest = m % 60;
  if (short) return h ? `${h} h${rest ? ` ${rest} min` : ''}` : `${m} min`;
  return h ? `${h === 1 ? '1 hour' : `${h} hours`}${rest ? ` ${rest} minutes` : ''}` : `${m} minutes`;
}
/** The button's words: "2 h", "This evening 7:00 PM", "Tomorrow 8:00 AM", "Monday 9:00 AM". */
export function snoozeLabel(c: OwnSnooze): string {
  if ('for' in c) return lengthWords(c.for, true);
  const clock = formatClock(c.at);
  if (c.day === 'next') return c.at >= '17:00' ? `This evening ${clock}` : `Later ${clock}`;
  if (c.day === 'tomorrow') return `Tomorrow ${clock}`;
  return `${WEEKDAYS[c.day]} ${clock}`;
}
/** What a screen reader hears after "Snooze “Call mum” …": "for 2 hours", "until tomorrow at 8:00 AM". */
export function snoozeWords(c: OwnSnooze): string {
  if ('for' in c) return `for ${lengthWords(c.for, false)}`;
  const clock = formatClock(c.at);
  if (c.day === 'next') return c.at >= '17:00' ? `until this evening at ${clock}` : `until ${clock}`;
  if (c.day === 'tomorrow') return `until tomorrow at ${clock}`;
  return `until ${WEEKDAYS[c.day]} at ${clock}`;
}
/** When a snooze chosen at `now` ends. */
export function ownSnoozeUntil(c: OwnSnooze, now: number, zone: string): number {
  if ('for' in c) return now + c.for * 60_000;
  const today = wallClock(now, zone);
  if (c.day === 'tomorrow') return instantAt(addDays(today.date, 1), c.at, zone);
  for (let k = 0; k <= 7; k++) {
    const date = addDays(today.date, k), at = instantAt(date, c.at, zone);
    if (at <= now) continue;
    if (c.day === 'next' || wallClock(at, zone).weekday === c.day) return at;
  }
  return now + 3_600_000; // never reached: a weekday comes round within a week
}
/**
 * What the notification's snooze button needs while ZIGoals is closed (the service worker keeps no zone rules): its words,
 * and either the length or, for a choice at a time, the steps of the next `hours` — `[from, until]`: a tap from `from`
 * on (until the next step) snoozes until `until`. The worker takes the last step that has begun.
 */
export type SnoozeButton = {title: string; ms?: number; steps?: [from: number, until: number][]};
export function snoozeButton(c: OwnSnooze, now: number, zone: string, hours = 48): SnoozeButton {
  const title = `Snooze ${snoozeLabel(c)}`.slice(0, 32);
  if ('for' in c) return {title, ms: c.for * 60_000};
  const end = now + hours * 3_600_000, today = wallClock(now, zone).date, edges = new Set<number>();
  for (let k = 0; k <= Math.ceil(hours / 24) + 1; k++) { const date = addDays(today, k); for (const clock of ['00:00', c.at]) { const at = instantAt(date, clock, zone); if (at > now && at <= end) edges.add(at); } }
  const steps: [number, number][] = [];
  for (const from of [now, ...[...edges].sort((a, b) => a - b)]) { const until = ownSnoozeUntil(c, from, zone); if (steps.at(-1)?.[1] !== until) steps.push([from, until]); }
  return {title, steps};
}
