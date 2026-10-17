import {addLocalDays} from './local-date';
import {instantAt, zoneOffsetMinutes} from './zone-time';

/**
 * Session AD item 8 (ADR-026): the moment a fictional Showcase record was made. A record a person makes at a moment (a
 * check-in, a meal, a walk, a weigh-in, water, a contribution, an edit) gets a time in its part of the day, picked from
 * the record's own key, so the same record always reads the same time and the day's records spread over it. Today's
 * records keep the day's start, which reads as date-only (no time is shown): a time later today could lie ahead of the
 * viewer's clock, and what counts "as of now" would change through the day. Records that hold a day, not a moment
 * (valuations, plan days, a goal's start), keep the day's start too.
 */
export type DayPart = 'morning' | 'afternoon' | 'evening';
const PARTS: Record<DayPart, [start: number, minutes: number]> = {morning: [7 * 60, 4 * 60], afternoon: [12 * 60, 5 * 60], evening: [18 * 60, 4 * 60]};
const PART_ORDER: DayPart[] = ['morning', 'afternoon', 'evening'];
// FNV-1a: a small stable hash, the same on every runtime.
function hash(key: string) { let h = 0x811c9dc5; for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; }
const pad = (n: number) => String(n).padStart(2, '0');
/** "HH:MM" in the part of the day, from the key: morning 07:00–10:59, afternoon 12:00–16:59, evening 18:00–21:59. */
export function showcaseClock(key: string, part: DayPart): string {
  const [start, span] = PARTS[part], minute = start + hash(key) % span;
  return `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;
}
/** A part of the day picked from the key, for records that happen at any time (contributions, edits). */
export const showcasePart = (key: string): DayPart => PART_ORDER[hash(`part:${key}`) % 3]!;
// The zone's offset at a day's noon, kept per day: clocks change in the small hours, so every time from 07:00 on uses it.
const noonOffsets = new Map<string, number>();
function noonOffset(date: string, zone: string) {
  const key = `${date}|${zone}`;
  let offset = noonOffsets.get(key);
  if (offset === undefined) { offset = zoneOffsetMinutes(instantAt(date, '12:00', zone), zone); if (noonOffsets.size > 5000) noonOffsets.clear(); noonOffsets.set(key, offset); }
  return offset;
}
/** The instant of a record `offset` days from the Showcase `day`, in `zone`: its moment on a past day, the day's start today or later. */
export function showcaseMoment(day: string, offset: number, zone: string, key: string, part: DayPart = showcasePart(key)): string {
  const date = addLocalDays(day, offset);
  if (offset >= 0) return new Date(instantAt(date, '00:00', zone)).toISOString();
  const [y, m, d] = date.split('-').map(Number), [h, mi] = showcaseClock(key, part).split(':').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, h!, mi!) - noonOffset(date, zone) * 60_000).toISOString();
}
