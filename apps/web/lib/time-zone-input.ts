import {timeZoneSchema} from './time-zone-schema';

/**
 * Session AH Part 5 (VA10, C8; B-067, B-068, B-069, B-175, B-176, N-131, BUG-035): what a typed time zone means. A name is
 * matched to the browser's own list whatever its case ("europe/brussels" saves as "Europe/Brussels"); a fixed offset
 * ("UTC+13") is explained, with places that have that offset today; anything else ("Foo/Bar") is refused with an example.
 */
const zones = (): string[] => { try { return [...Intl.supportedValuesOf('timeZone'), 'UTC']; } catch { return ['UTC']; } };
function offsetMinutes(zone: string, at: Date): number | null {
  try {
    const part = new Intl.DateTimeFormat('en-US', {timeZone: zone, timeZoneName: 'longOffset'}).formatToParts(at).find(p => p.type === 'timeZoneName')?.value ?? '';
    if (part === 'GMT') return 0;
    const m = /^GMT([+-])(\d{2}):(\d{2})$/.exec(part);
    return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : null;
  } catch { return null; }
}
export function readZoneInput(raw: string, at = new Date()): {zone: string} | {error: string} {
  const text = raw.trim();
  if (!text) return {error: 'Choose a time zone, for example Europe/Brussels.'};
  const offset = /^(?:UTC|GMT)?\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i.exec(text);
  if (offset) {
    const minutes = (offset[1] === '-' ? -1 : 1) * (Number(offset[2]) * 60 + Number(offset[3] ?? 0));
    const places = zones().filter(z => z.includes('/') && !z.startsWith('Etc/') && offsetMinutes(z, at) === minutes).slice(0, 3);
    return {error: `${text} is a fixed offset, with no daylight-saving rules. Choose the place instead${places.length ? `, such as ${places.join(' or ')}` : ', for example Europe/Brussels'}.`};
  }
  const match = zones().find(z => z.toLowerCase() === text.toLowerCase());
  if (match && timeZoneSchema.safeParse(match).success) return {zone: match};
  return {error: `“${text.slice(0, 60)}” is not a time zone name. Pick one from the list, for example Europe/Brussels.`};
}
