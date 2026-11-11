import * as z from 'zod';
import type {DeviceRecordSpec} from '../../device-record';

/**
 * Session AM (ADR-038 D12–D15, D17, A2): NOVA's outside-data record, `zigoals:nova-world:v1`. Device only. It holds the
 * person's own switch ("Weather (outside data)", off unless turned on), the place they chose (a name of their own and a
 * position rounded to two decimals, about 1 km) and the last reading MET Norway gave for it, kept until the service's
 * own `Expires` time. Nothing here is read by NOVA's chat or sent to a model.
 *
 * A loose object, version 1, every field optional (absent: off, no place, no reading), every list bounded. Exported,
 * restored, erased; never synced (the switch is a choice per device).
 */
export const NOVA_WORLD_KEY = 'zigoals:nova-world:v1';
export const MAX_PLACE_NAME = 60, MAX_HOURS = 24, MAX_DAYS = 6, MAX_SYMBOL = 48;
const plain = (max: number) => z.string().max(max).refine(s => !/[\u0000-\u001f\u007f]/.test(s), 'Plain text.');
const iso = z.string().min(10).max(40).refine(s => !Number.isNaN(Date.parse(s)), 'A time.');
const num = (min: number, max: number) => z.number().finite().min(min).max(max);
/** A position as it is stored and sent: two decimals (about 1 km), never more (MET Norway refuses more than four). */
export const round2 = (n: number): number => Math.round(n * 100) / 100;
export const placeSchema = z.looseObject({name: plain(MAX_PLACE_NAME).min(1), lat: num(-90, 90), lon: num(-180, 180)});
export type WorldPlace = {name: string; lat: number; lon: number};
/** MET Norway's symbol code ("partlycloudy_night", "rain"): letters and underscores only. */
const symbol = z.string().max(MAX_SYMBOL).regex(/^[a-z_]*$/);
export const readingSchema = z.looseObject({
  lat: num(-90, 90), lon: num(-180, 180),
  fetchedAt: iso, expires: iso,
  /** The service's own Last-Modified header, sent back as If-Modified-Since. */
  lastModified: plain(64).optional(),
  /** When the service's model last updated this forecast. */
  updatedAt: iso.optional(),
  now: z.looseObject({at: iso, t: num(-90, 70), symbol, wind: num(0, 150).optional(), humidity: num(0, 100).optional(), uv: num(0, 20).optional(), precip: num(0, 500).optional(), cloud: num(0, 100).optional()}),
  hours: z.array(z.looseObject({at: iso, t: num(-90, 70), symbol, precip: num(0, 500).optional()})).max(MAX_HOURS),
  days: z.array(z.looseObject({date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), min: num(-90, 70), max: num(-90, 70), symbol, precip: num(0, 2000).optional()})).max(MAX_DAYS),
  sun: z.looseObject({rise: iso.optional(), set: iso.optional()}).optional(),
});
export type WorldReading = z.infer<typeof readingSchema>;
export const novaWorldSchema = z.looseObject({
  version: z.literal(1),
  on: z.boolean().optional(),
  place: placeSchema.optional().catch(undefined),
  reading: readingSchema.optional().catch(undefined),
  /** When the service was last asked for this place (the 10-minute rule counts from here, also after an error). */
  askedAt: iso.optional().catch(undefined),
});
export type NovaWorld = z.infer<typeof novaWorldSchema>;
export const emptyWorld = (): NovaWorld => ({version: 1});
export const NOVA_WORLD: DeviceRecordSpec<NovaWorld> = {key: NOVA_WORLD_KEY, schema: novaWorldSchema, empty: emptyWorld};

export const worldOn = (r: NovaWorld): boolean => r.on === true;
export const placeOf = (r: NovaWorld): WorldPlace | null => r.place ? {name: r.place.name, lat: r.place.lat, lon: r.place.lon} : null;
/** The reading for the chosen place (a reading of another place is not this place's). */
export const readingOf = (r: NovaWorld): WorldReading | null => r.reading && r.place && r.reading.lat === r.place.lat && r.reading.lon === r.place.lon ? r.reading : null;
export const setWorldOn = (r: NovaWorld, on: boolean): NovaWorld => { const next = {...r}; if (on) next.on = true; else { delete next.on; } return novaWorldSchema.parse(next); };
export function setPlace(r: NovaWorld, place: WorldPlace | null): NovaWorld {
  const next = {...r};
  delete next.reading; delete next.askedAt;
  if (!place) { delete next.place; return novaWorldSchema.parse(next); }
  const name = place.name.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_PLACE_NAME);
  if (!name) throw Error('Give the place a name.');
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lon) || Math.abs(place.lat) > 90 || Math.abs(place.lon) > 180) throw Error('Use a latitude between -90 and 90 and a longitude between -180 and 180.');
  return novaWorldSchema.parse({...next, place: {name, lat: round2(place.lat), lon: round2(place.lon)}});
}
export const setReading = (r: NovaWorld, reading: WorldReading, askedAt: Date): NovaWorld => novaWorldSchema.parse({...r, reading, askedAt: askedAt.toISOString()});
export const markAsked = (r: NovaWorld, askedAt: Date): NovaWorld => novaWorldSchema.parse({...r, askedAt: askedAt.toISOString()});
