/**
 * Zone arithmetic for the notification plan (Session AK Part 2): the same rules as the push Workers' clock.mjs
 * (workers/push-reminders/clock.mjs), so the page and the Worker agree on every instant. Intl.DateTimeFormat is the
 * only zone source. A time skipped by a forward clock change moves an hour later; a repeated time takes its later
 * occurrence.
 */
const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(zone: string) {
  let f = formatters.get(zone);
  if (!f) { f = new Intl.DateTimeFormat('en-US', {timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short'}); formatters.set(zone, f); }
  return f;
}
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export type Wall = {year: number; month: number; day: number; hour: number; minute: number; second: number; weekday: number; date: string; time: string};
export function wallClock(ms: number, zone: string): Wall {
  const parts: Record<string, string> = {};
  for (const part of formatter(zone).formatToParts(new Date(ms))) if (part.type !== 'literal') parts[part.type] = part.value;
  const hour = Number(parts.hour) % 24, minute = Number(parts.minute), second = Number(parts.second);
  return {year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hour, minute, second, weekday: WEEKDAYS.indexOf(parts.weekday ?? ''), date: `${parts.year}-${parts.month}-${parts.day}`, time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`};
}
function offsetMinutes(ms: number, zone: string) { const w = wallClock(ms, zone); return Math.round((Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - ms) / 60000); }
/** The instant of a wall-clock date ("YYYY-MM-DD") and time ("HH:MM") in a zone. */
export function zonedInstant(date: string, time: string, zone: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number], [hh, mm] = time.split(':').map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, hh, mm), first = offsetMinutes(guess, zone), candidate = guess - first * 60000, second = offsetMinutes(candidate, zone);
  if (second === first) return candidate;
  const alternative = guess - second * 60000;
  return offsetMinutes(alternative, zone) === second ? alternative : Math.max(candidate, alternative);
}
/** A calendar date plus n days (UTC arithmetic on the date only). */
export function addDays(date: string, n: number): string { const [y, m, d] = date.split('-').map(Number) as [number, number, number]; return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); }
/** 0 = Sunday … 6 = Saturday, of a calendar date. */
export const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
/** The mask bit of a weekday (0 = Sunday): Monday = 1 … Sunday = 64, as the push Workers count. */
export const weekdayBit = (weekday: number) => 1 << ((weekday + 6) % 7);
export const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
/** Whether "HH:MM" lies in [from, to), which may wrap midnight; from = to means none. */
export function inQuiet(time: string, quiet: {from: string; to: string}): boolean { if (quiet.from === quiet.to) return false; return quiet.from < quiet.to ? time >= quiet.from && time < quiet.to : time >= quiet.from || time < quiet.to; }
