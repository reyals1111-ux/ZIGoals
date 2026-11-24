/**
 * Session AV lane 2 (r5-plan, LEDGER #357; Akiflow's secondary time zone): a second zone chosen once (the UI prefs'
 * `secondZone`; TIER 3 stored format), whose hours the Agenda's hour grid and the Day Timeline show beside the device's own.
 * Only the device's clock and the browser's own zone tables are used; nothing is looked up. Pure.
 */
/** Zones offered when the browser cannot list its own (a short list of well-known cities). */
export const COMMON_ZONES = ['Europe/London', 'Europe/Amsterdam', 'Europe/Berlin', 'Europe/Paris', 'Europe/Madrid', 'Europe/Athens', 'Europe/Istanbul', 'Africa/Lagos', 'Africa/Johannesburg', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland', 'America/Sao_Paulo', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu', 'UTC'] as const;
/** Every zone this browser knows (its own list where it has one, with UTC), each one that works. */
export function zoneChoices(): string[] {
  let all: string[] = [];
  try { const list = (Intl as unknown as {supportedValuesOf?: (k: string) => string[]}).supportedValuesOf?.('timeZone'); if (Array.isArray(list) && list.length) all = list; } catch { all = []; }
  // Session AV lane 2 (fixb5): a browser's own list holds its region zones only (Chrome's has no "UTC"), so UTC, which the
  // short list offers, is added at its end when missing.
  const zones = all.length ? (all.includes('UTC') ? all : [...all, 'UTC']) : [...COMMON_ZONES];
  return zones.filter(validZone);
}
export function validZone(zone: string): boolean {
  try { new Intl.DateTimeFormat('en-GB', {timeZone: zone}); return true; } catch { return false; }
}
/** "New York" from "America/New_York"; "UTC" stays. */
export const zoneName = (zone: string): string => (zone.split('/').pop() ?? zone).replace(/_/g, ' ');
/** The device's own instant of a wall clock on a day (`date` "YYYY-MM-DD", `clock` "HH:MM"), in the device's zone. */
const localInstant = (date: string, clock: string): Date => new Date(`${date}T${clock}:00`);
/** The second zone's wall clock ("HH:MM") at the device's `clock` on `date`, and its day when that differs. */
export function zoneClock(date: string, clock: string, zone: string): {clock: string; date: string} | null {
  try {
    const at = localInstant(date, clock);
    if (!Number.isFinite(at.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(at);
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
    return {clock: `${get('hour')}:${get('minute')}`, date: `${get('year')}-${get('month')}-${get('day')}`};
  } catch { return null; }
}
/** The difference at midday ("5 hours behind", "5 h 30 min ahead", "the same time"). */
export function zoneDifference(date: string, zone: string): string {
  const there = zoneClock(date, '12:00', zone);
  if (!there) return '';
  const mins = (Number(there.clock.slice(0, 2)) * 60 + Number(there.clock.slice(3))) + (there.date > date ? 1440 : there.date < date ? -1440 : 0) - 720;
  if (!mins) return 'the same time';
  const abs = Math.abs(mins), h = Math.floor(abs / 60), m = abs % 60, words = m ? `${h ? `${h} h ` : ''}${m} min` : `${h} ${h === 1 ? 'hour' : 'hours'}`;
  return `${words} ${mins > 0 ? 'ahead' : 'behind'}`;
}
/** Review B5L-11: an instant's wall clock and day in a zone (for "what time is it there now", read from the instant itself). */
export function zoneNow(at: Date | number, zone: string): {clock: string; date: string} | null {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(typeof at === 'number' ? new Date(at) : at);
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
    return {clock: `${get('hour')}:${get('minute')}`, date: `${get('year')}-${get('month')}-${get('day')}`};
  } catch { return null; }
}
