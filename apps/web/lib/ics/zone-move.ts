import {instantAt, wallClock} from '../zone-time';
import type {IcsTime} from './import';

/**
 * Session AK security review Z1B-3: moving a wall time between zones for the .ics import and the Agenda, with exactly
 * the answers of lib/zone-time.ts (`instantAt`, then `wallClock`) but about four times faster, so a file at the 2 MB cap
 * (at most 100,000 conversions) reads in about a second and a view of many zoned events stays quick. Near a change of
 * offset (a day either side) it uses lib/zone-time.ts itself.
 */
const wallOf = (t: IcsTime) => t.clock ? `${t.day}T${t.clock}` : t.day;
/** One short Intl call per offset ("GMT+05:30"), about a quarter of a full date's cost; null where Intl cannot. */
const offsetFormats = new Map<string, Intl.DateTimeFormat | null>();
function offsetSeconds(zone: string, ms: number): number | null {
  let f = offsetFormats.get(zone);
  if (f === undefined) { try { f = new Intl.DateTimeFormat('en-US', {timeZone: zone, timeZoneName: 'longOffset', hour: 'numeric'}); } catch { f = null; } offsetFormats.set(zone, f); }
  const m = f ? /GMT(?:([+-])(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(f.format(ms)) : null;
  if (!m) return null;
  return m[1] ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 3600 + Number(m[3]) * 60 + Number(m[4] ?? 0)) : 0;
}
const DAY_MS = 86_400_000;
/** The same answer as `instantAt` then `wallClock` (lib/zone-time.ts), in four short calls; null near a clock change. */
function quickMove(t: IcsTime, from: string, to: string): string | null {
  const guess = Date.parse(`${t.day}T${t.clock}:00Z`);
  let ms = guess;
  if (from !== 'UTC') {
    // No change of offset within a day either side: the wall time names one instant (instantAt's own first case).
    const before = offsetSeconds(from, guess - DAY_MS), at = offsetSeconds(from, guess), after = offsetSeconds(from, guess + DAY_MS);
    if (before === null || at === null || after === null) return null;
    const minutes = Math.round(at / 60);
    if (Math.round(before / 60) !== minutes || Math.round(after / 60) !== minutes) return null;
    ms = guess - minutes * 60_000;
  }
  const shift = to === 'UTC' ? 0 : offsetSeconds(to, ms);
  if (shift === null) return null;
  const wall = new Date(ms + shift * 1000).toISOString();
  return `${wall.slice(0, 10)}T${wall.slice(11, 16)}`;
}
/**
 * A time moved into another zone's wall time (an EXDATE, RECURRENCE-ID or UNTIL given in UTC or another zone, compared
 * with a zoned start). A day, a floating time or the same zone keeps its wall time.
 */
export function moveWall(x: {t: IcsTime; tz: string | null}, tz: string | null): string {
  if (!x.t.clock || x.tz === tz || !x.tz || !tz) return wallOf(x.t);
  const quick = quickMove(x.t, x.tz, tz);
  if (quick !== null) return quick;
  const ms = x.tz === 'UTC' ? Date.parse(`${x.t.day}T${x.t.clock}:00Z`) : instantAt(x.t.day, x.t.clock, x.tz), w = wallClock(ms, tz);
  return `${w.date}T${w.clock}`;
}
