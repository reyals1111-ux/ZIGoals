import type {WorldPlace} from './record';

/**
 * Session AM-2 (owner's step 4a): sunrise and sunset worked out on the device, for a build that asks the weather through
 * the proxy (the proxy has one route, the forecast; lib/nova/world/proxy.ts). Nothing is asked from any service. The
 * standard sunrise equation (the sun's mean anomaly, the equation of the centre, the ecliptic longitude, the declination
 * and the hour angle at which the sun's upper edge meets the horizon with average refraction, −0.833°), at sea level:
 * within about two minutes of MET Norway's own times at ordinary latitudes (lib/nova/world/sun-calc.test.ts compares it
 * with a recorded answer). Where the sun does not rise or does not set that day, both are left out, as MET Norway does.
 */
const DAY_MS = 86_400_000, RAD = Math.PI / 180;
const J2000 = 2451545, UNIX_EPOCH_JD = 2440587.5;
const sin = (deg: number) => Math.sin(deg * RAD), cos = (deg: number) => Math.cos(deg * RAD);
const mod360 = (deg: number) => ((deg % 360) + 360) % 360;
const fromJulian = (jd: number) => (jd - UNIX_EPOCH_JD) * DAY_MS;
type Sun = {transit: number; rise?: number; set?: number};
/** The sun's transit, rise and set (ms since the epoch) for day `n` (days since 1 Jan 2000, 12:00 UT) at a place. */
function sunOf(n: number, lat: number, lon: number): Sun {
  const mean = n + 0.0008 - lon / 360;
  const anomaly = mod360(357.5291 + 0.98560028 * mean);
  const centre = 1.9148 * sin(anomaly) + 0.02 * sin(2 * anomaly) + 0.0003 * sin(3 * anomaly);
  const ecliptic = mod360(anomaly + centre + 180 + 102.9372);
  const transit = J2000 + mean + 0.0053 * sin(anomaly) - 0.0069 * sin(2 * ecliptic);
  const sinDecl = sin(ecliptic) * sin(23.4397), cosDecl = Math.sqrt(1 - sinDecl * sinDecl);
  const cosHour = (sin(-0.833) - sin(lat) * sinDecl) / (cos(lat) * cosDecl);
  if (!Number.isFinite(cosHour) || cosHour > 1 || cosHour < -1) return {transit: fromJulian(transit)};
  const hour = Math.acos(cosHour) / RAD / 360;
  return {transit: fromJulian(transit), rise: fromJulian(transit - hour), set: fromJulian(transit + hour)};
}
const minute = (ms: number): string => new Date(Math.round(ms / 60_000) * 60_000).toISOString();
/**
 * The sun's rise and set (UTC ISO strings, to the minute) on the day `date` (YYYY-MM-DD) as the clock that is `offset`
 * minutes east of UTC counts days, at a place. `{}` in the polar night and under the midnight sun, and for a date or a
 * place that is not one.
 */
export function sunTimes(place: Pick<WorldPlace, 'lat' | 'lon'>, date: string, offset: number): {rise?: string; set?: string} {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m || !Number.isFinite(place.lat) || !Number.isFinite(place.lon) || Math.abs(place.lat) > 90 || Math.abs(place.lon) > 180 || !Number.isFinite(offset)) return {};
  const midnight = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(midnight)) return {};
  const n = Math.round(midnight / DAY_MS + UNIX_EPOCH_JD + 0.5 - J2000);
  // The day whose solar noon falls on `date` on that clock (a time zone far from its own meridian is a day off otherwise).
  const dayOf = (ms: number) => Math.floor((ms + offset * 60_000) / DAY_MS), want = Math.floor(midnight / DAY_MS);
  let sun = sunOf(n, place.lat, place.lon);
  const off = want - dayOf(sun.transit);
  if (off !== 0 && Math.abs(off) <= 1) sun = sunOf(n + off, place.lat, place.lon);
  return sun.rise === undefined || sun.set === undefined ? {} : {rise: minute(sun.rise), set: minute(sun.set)};
}
