import {wallClock} from '../zone-time';
import type {JournalDisplay} from '../on-this-day/store';

/**
 * Session AV lane 2 (r6-notes; LEDGER #409, Diarium's sunrise, sunset and moon): a day's sunrise and sunset for a place,
 * and the moon's phase on the day — computed here in code with the usual formulas (the sunrise equation with the
 * sun's equation of centre, refraction and the sun's disc taken as −0.833°; the moon's age from a known new moon and the
 * mean synodic month), so nothing is looked up and no package is used. The place is a city from a short built-in list,
 * or a latitude and longitude typed in; with none chosen, the city of this device's time zone when the list has one.
 * Times are good to a few minutes, the phase to about a day: said as such. Weather is not here (it needs an outside
 * service). Pure.
 */
export type SkyCity = {id: string; name: string; lat: number; lon: number; zone: string};
export const SKY_CITIES: readonly SkyCity[] = [
  {id: 'amsterdam', name: 'Amsterdam', lat: 52.37, lon: 4.9, zone: 'Europe/Amsterdam'},
  {id: 'brussels', name: 'Brussels', lat: 50.85, lon: 4.35, zone: 'Europe/Brussels'},
  {id: 'london', name: 'London', lat: 51.51, lon: -0.13, zone: 'Europe/London'},
  {id: 'dublin', name: 'Dublin', lat: 53.35, lon: -6.26, zone: 'Europe/Dublin'},
  {id: 'paris', name: 'Paris', lat: 48.86, lon: 2.35, zone: 'Europe/Paris'},
  {id: 'berlin', name: 'Berlin', lat: 52.52, lon: 13.4, zone: 'Europe/Berlin'},
  {id: 'madrid', name: 'Madrid', lat: 40.42, lon: -3.7, zone: 'Europe/Madrid'},
  {id: 'lisbon', name: 'Lisbon', lat: 38.72, lon: -9.14, zone: 'Europe/Lisbon'},
  {id: 'rome', name: 'Rome', lat: 41.9, lon: 12.5, zone: 'Europe/Rome'},
  {id: 'vienna', name: 'Vienna', lat: 48.21, lon: 16.37, zone: 'Europe/Vienna'},
  {id: 'zurich', name: 'Zurich', lat: 47.38, lon: 8.54, zone: 'Europe/Zurich'},
  {id: 'copenhagen', name: 'Copenhagen', lat: 55.68, lon: 12.57, zone: 'Europe/Copenhagen'},
  {id: 'stockholm', name: 'Stockholm', lat: 59.33, lon: 18.07, zone: 'Europe/Stockholm'},
  {id: 'oslo', name: 'Oslo', lat: 59.91, lon: 10.75, zone: 'Europe/Oslo'},
  {id: 'helsinki', name: 'Helsinki', lat: 60.17, lon: 24.94, zone: 'Europe/Helsinki'},
  {id: 'warsaw', name: 'Warsaw', lat: 52.23, lon: 21.01, zone: 'Europe/Warsaw'},
  {id: 'prague', name: 'Prague', lat: 50.08, lon: 14.44, zone: 'Europe/Prague'},
  {id: 'athens', name: 'Athens', lat: 37.98, lon: 23.73, zone: 'Europe/Athens'},
  {id: 'istanbul', name: 'Istanbul', lat: 41.01, lon: 28.98, zone: 'Europe/Istanbul'},
  {id: 'paramaribo', name: 'Paramaribo', lat: 5.85, lon: -55.2, zone: 'America/Paramaribo'},
  {id: 'willemstad', name: 'Willemstad', lat: 12.11, lon: -68.93, zone: 'America/Curacao'},
  {id: 'new-york', name: 'New York', lat: 40.71, lon: -74.01, zone: 'America/New_York'},
  {id: 'chicago', name: 'Chicago', lat: 41.88, lon: -87.63, zone: 'America/Chicago'},
  {id: 'denver', name: 'Denver', lat: 39.74, lon: -104.99, zone: 'America/Denver'},
  {id: 'los-angeles', name: 'Los Angeles', lat: 34.05, lon: -118.24, zone: 'America/Los_Angeles'},
  {id: 'toronto', name: 'Toronto', lat: 43.65, lon: -79.38, zone: 'America/Toronto'},
  {id: 'mexico-city', name: 'Mexico City', lat: 19.43, lon: -99.13, zone: 'America/Mexico_City'},
  {id: 'sao-paulo', name: 'São Paulo', lat: -23.55, lon: -46.63, zone: 'America/Sao_Paulo'},
  {id: 'buenos-aires', name: 'Buenos Aires', lat: -34.6, lon: -58.38, zone: 'America/Argentina/Buenos_Aires'},
  {id: 'cape-town', name: 'Cape Town', lat: -33.92, lon: 18.42, zone: 'Africa/Johannesburg'},
  {id: 'lagos', name: 'Lagos', lat: 6.52, lon: 3.38, zone: 'Africa/Lagos'},
  {id: 'nairobi', name: 'Nairobi', lat: -1.29, lon: 36.82, zone: 'Africa/Nairobi'},
  {id: 'cairo', name: 'Cairo', lat: 30.04, lon: 31.24, zone: 'Africa/Cairo'},
  {id: 'dubai', name: 'Dubai', lat: 25.2, lon: 55.27, zone: 'Asia/Dubai'},
  {id: 'mumbai', name: 'Mumbai', lat: 19.08, lon: 72.88, zone: 'Asia/Kolkata'},
  {id: 'singapore', name: 'Singapore', lat: 1.35, lon: 103.82, zone: 'Asia/Singapore'},
  {id: 'jakarta', name: 'Jakarta', lat: -6.21, lon: 106.85, zone: 'Asia/Jakarta'},
  {id: 'tokyo', name: 'Tokyo', lat: 35.68, lon: 139.69, zone: 'Asia/Tokyo'},
  {id: 'sydney', name: 'Sydney', lat: -33.87, lon: 151.21, zone: 'Australia/Sydney'},
  {id: 'auckland', name: 'Auckland', lat: -36.85, lon: 174.76, zone: 'Pacific/Auckland'},
];
export type SkyPlace = {name: string; lat: number; lon: number; zone: string; from: 'city' | 'typed' | 'zone'};
/** The place the Journal reckons for: the chosen city, the typed place, else this device's time zone's city; null when off or none. */
export function skyPlace(sky: JournalDisplay['sky'], deviceZone: string): SkyPlace | null {
  if (sky?.off) return null;
  if (sky?.city) { const c = SKY_CITIES.find(x => x.id === sky.city); if (c) return {name: c.name, lat: c.lat, lon: c.lon, zone: c.zone, from: 'city'}; }
  if (typeof sky?.lat === 'number' && typeof sky?.lon === 'number') return {name: sky.name ?? `${sky.lat.toFixed(2)}, ${sky.lon.toFixed(2)}`, lat: sky.lat, lon: sky.lon, zone: deviceZone, from: 'typed'};
  const c = SKY_CITIES.find(x => x.zone === deviceZone);
  return c ? {name: c.name, lat: c.lat, lon: c.lon, zone: c.zone, from: 'zone'} : null;
}
const RAD = Math.PI / 180, J2000 = 2451545, UNIX_JD = 2440587.5, DAY_MS = 86_400_000;
const julian = (ms: number) => ms / DAY_MS + UNIX_JD, fromJulian = (j: number) => (j - UNIX_JD) * DAY_MS;
export type SunDay = {kind: 'normal'; rise: number; set: number} | {kind: 'up'} | {kind: 'down'};
/** Sunrise and sunset (ms) on a calendar day at a place; or the sun up all day (midnight sun) or down all day (polar night). */
export function sunOn(day: string, lat: number, lon: number): SunDay {
  const noon = Date.parse(`${day}T12:00:00Z`);
  const n = Math.round(julian(noon) - J2000 - 0.0009), jStar = n + 0.0009 - lon / 360;
  const M = ((357.5291 + 0.98560028 * jStar) % 360 + 360) % 360;
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const L = ((M + C + 180 + 102.9372) % 360 + 360) % 360;
  const transit = J2000 + jStar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * L * RAD);
  const dec = Math.asin(Math.sin(L * RAD) * Math.sin(23.4397 * RAD));
  const cosW = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(dec)) / (Math.cos(lat * RAD) * Math.cos(dec));
  if (cosW < -1) return {kind: 'up'};
  if (cosW > 1) return {kind: 'down'};
  const w = Math.acos(cosW) / RAD / 360;
  return {kind: 'normal', rise: fromJulian(transit - w), set: fromJulian(transit + w)};
}
export const SYNODIC_MONTH = 29.530588853;
/** A new moon (6 January 2000, 18:14 UTC) the moon's age is counted from. */
const NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);
export const MOON_PHASES = ['new', 'waxing-crescent', 'first-quarter', 'waxing-gibbous', 'full', 'waning-gibbous', 'last-quarter', 'waning-crescent'] as const;
export type MoonPhase = (typeof MOON_PHASES)[number];
export const MOON_WORDS: Record<MoonPhase, {en: string; nl: string}> = {
  'new': {en: 'New moon', nl: 'Nieuwe maan'}, 'waxing-crescent': {en: 'Waxing crescent', nl: 'Wassende sikkel'}, 'first-quarter': {en: 'First quarter', nl: 'Eerste kwartier'},
  'waxing-gibbous': {en: 'Waxing gibbous', nl: 'Wassende maan'}, 'full': {en: 'Full moon', nl: 'Volle maan'}, 'waning-gibbous': {en: 'Waning gibbous', nl: 'Afnemende maan'},
  'last-quarter': {en: 'Last quarter', nl: 'Laatste kwartier'}, 'waning-crescent': {en: 'Waning crescent', nl: 'Afnemende sikkel'}};
/** The moon on a day (at noon UTC): its age in days, the share lit, and the phase's name. */
export function moonOn(day: string): {age: number; lit: number; phase: MoonPhase} {
  const age = (((Date.parse(`${day}T12:00:00Z`) - NEW_MOON_MS) / DAY_MS) % SYNODIC_MONTH + SYNODIC_MONTH) % SYNODIC_MONTH;
  const lit = (1 - Math.cos(2 * Math.PI * age / SYNODIC_MONTH)) / 2;
  const phase = MOON_PHASES[Math.floor((age / SYNODIC_MONTH) * 8 + 0.5) % 8]!;
  return {age: Math.round(age * 10) / 10, lit: Math.round(lit * 100) / 100, phase};
}
export const MOON_MARK: Record<MoonPhase, string> = {'new': '🌑', 'waxing-crescent': '🌒', 'first-quarter': '🌓', 'waxing-gibbous': '🌔', 'full': '🌕', 'waning-gibbous': '🌖', 'last-quarter': '🌗', 'waning-crescent': '🌘'};
/** The day's sky as one line in words ("Sunrise 08:21 · sunset 16:41 in Amsterdam · Waxing crescent, 12% lit"). */
export function skyLine(day: string, place: SkyPlace | null): string {
  const moon = moonOn(day), moonWords = `${MOON_WORDS[moon.phase].en}, ${Math.round(moon.lit * 100)}% lit`;
  if (!place) return moonWords;
  const sun = sunOn(day, place.lat, place.lon);
  const at = (ms: number) => wallClock(ms, place.zone).clock;
  const sunWords = sun.kind === 'up' ? `The sun stays up all day in ${place.name}` : sun.kind === 'down' ? `The sun stays down all day in ${place.name}` : `Sunrise ${at(sun.rise)} · sunset ${at(sun.set)} in ${place.name}`;
  return `${sunWords} · ${moonWords}`;
}
/** A latitude and longitude as typed ("52.37, 4.90"), or the sentence that says why not. */
export function readCoordinates(lat: string, lon: string): {lat: number; lon: number} | string {
  const a = Number(lat.trim().replace(',', '.')), b = Number(lon.trim().replace(',', '.'));
  if (!lat.trim() || !lon.trim() || !Number.isFinite(a) || !Number.isFinite(b)) return 'Type a latitude and a longitude as numbers, for example 52.37 and 4.90.';
  if (a < -90 || a > 90) return 'A latitude is between −90 (south) and 90 (north).';
  if (b < -180 || b > 180) return 'A longitude is between −180 (west) and 180 (east).';
  return {lat: Math.round(a * 1000) / 1000, lon: Math.round(b * 1000) / 1000};
}
