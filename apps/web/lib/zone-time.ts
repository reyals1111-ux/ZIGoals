/**
 * Wall-clock time in a named zone, exact across daylight-saving changes (Session W Part 4; used by Sleep and Meditation).
 * Instants are stored; a wall-clock date and time are only ever shown or typed, always with the zone they belong to.
 */
const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(zone: string): Intl.DateTimeFormat {
  let f = formatters.get(zone);
  if (!f) { f = new Intl.DateTimeFormat('en-US', {timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short'}); formatters.set(zone, f); }
  return f;
}
const pad = (n: number) => String(n).padStart(2, '0');
export type WallClock = {date: string; clock: string; minutes: number; weekday: number};
/** The date ("YYYY-MM-DD"), clock ("HH:MM"), minutes since midnight and weekday (0 = Sunday) of an instant in a zone. */
/** A zone as people read it: IANA's fixed "Etc/GMT+4" is four hours behind UTC, so it reads "UTC−04:00" (Session X P2.1). */
export function zoneLabel(zone: string): string {
  const fixed = /^Etc\/GMT([+-])(\d{1,2})$/.exec(zone);
  return fixed ? `UTC${fixed[1] === '+' ? '−' : '+'}${fixed[2]!.padStart(2, '0')}:00` : zone;
}
export function wallClock(ms: number, zone: string): WallClock {
  const parts = formatter(zone).formatToParts(new Date(ms)), get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const hour = Number(get('hour')) % 24, minute = Number(get('minute'));
  return {date: `${get('year')}-${get('month')}-${get('day')}`, clock: `${pad(hour)}:${pad(minute)}`, minutes: hour * 60 + minute, weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))};
}
/** The zone's offset from UTC at an instant, in minutes (Brussels in summer: 120). */
export function zoneOffsetMinutes(ms: number, zone: string): number {
  const parts = formatter(zone).formatToParts(new Date(ms)), get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60_000);
}
/**
 * The instant a wall-clock date and time name in a zone. A time a daylight-saving change skips moves forward by the gap
 * (02:30 on the spring-forward night is 03:30); a time that happens twice is its first occurrence.
 */
export function instantAt(date: string, clock: string, zone: string): number {
  const [y, m, d] = date.split('-').map(Number), [h, mi] = clock.split(':').map(Number);
  const guess = Date.UTC(y!, m! - 1, d!, h!, mi!);
  // The zone's offsets around that date (two across a daylight-saving change), each giving one candidate instant.
  const offsets = [...new Set([-86_400_000, 0, 86_400_000].map(shift => zoneOffsetMinutes(guess + shift, zone)))];
  const named = offsets.map(o => guess - o * 60_000).filter(t => { const w = wallClock(t, zone); return w.date === date && w.clock === clock; });
  // Happens twice: the earlier. Never happens (the spring gap): the smaller offset's instant, just after the gap.
  return named.length ? Math.min(...named) : guess - Math.min(...offsets) * 60_000;
}
/** "YYYY-MM-DD" plus whole days (calendar arithmetic, no zone). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number), t = new Date(Date.UTC(y!, m! - 1, d! + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}
/** "7 h 05 min", "45 min" (whole minutes; never negative). */
export function formatMinutes(total: number): string {
  const m = Math.max(0, Math.round(total)), h = Math.floor(m / 60), rest = m % 60;
  return h ? `${h} h ${pad(rest)} min` : `${rest} min`;
}
