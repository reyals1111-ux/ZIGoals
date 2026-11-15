import {describe, expect, test} from 'vitest';
import sunBrussels from './fixtures/sun-brussels.json';
import sunPolarNight from './fixtures/sun-polar-night.json';
import {localTime, parseSun} from './met';
import {sunTimes} from './sun-calc';

// Session AM-2 (owner's step 4a): sunrise and sunset worked out on the device when the weather goes through the proxy.
const MINUTE = 60_000;
describe('the sun, worked out on the device', () => {
  test('Brussels, 11 Nov 2026: within three minutes of MET Norway\'s own recorded answer', () => {
    const met = parseSun(sunBrussels), own = sunTimes({lat: 50.85, lon: 4.35}, '2026-11-11', 60);
    expect(Math.abs(Date.parse(own.rise!) - Date.parse(met.rise!))).toBeLessThanOrEqual(3 * MINUTE);
    expect(Math.abs(Date.parse(own.set!) - Date.parse(met.set!))).toBeLessThanOrEqual(3 * MINUTE);
    expect(own.rise).toMatch(/^2026-11-11T06:5\d:00\.000Z$/);
    expect(own.set).toMatch(/^2026-11-11T16:0\d:00\.000Z$/);
  });
  test('the polar night (Longyearbyen, 21 Dec) and the midnight sun (21 Jun): neither a rise nor a set, as MET Norway answers', () => {
    expect(parseSun(sunPolarNight)).toEqual({});
    expect(sunTimes({lat: 78.22, lon: 15.63}, '2026-12-21', 60)).toEqual({});
    expect(sunTimes({lat: 78.22, lon: 15.63}, '2026-06-21', 120)).toEqual({});
    expect(sunTimes({lat: 90, lon: 0}, '2026-03-01', 0)).toEqual({});
  });
  test('known days elsewhere: the equinox is about twelve hours everywhere; the longest and shortest day at 50.85° N', () => {
    for (const place of [{lat: 0, lon: 0}, {lat: 40.71, lon: -74.01}, {lat: -33.87, lon: 151.21}, {lat: 64.15, lon: -21.94}]) {
      const {rise, set} = sunTimes(place, '2026-03-20', 0);
      expect(Math.abs((Date.parse(set!) - Date.parse(rise!)) / MINUTE - 12 * 60), JSON.stringify(place)).toBeLessThanOrEqual(20);
    }
    const length = (date: string) => { const {rise, set} = sunTimes({lat: 50.85, lon: 4.35}, date, 60); return (Date.parse(set!) - Date.parse(rise!)) / MINUTE; };
    expect(length('2026-06-21')).toBeGreaterThan(16 * 60 + 15); expect(length('2026-06-21')).toBeLessThan(16 * 60 + 45);
    expect(length('2026-12-21')).toBeGreaterThan(7 * 60 + 45); expect(length('2026-12-21')).toBeLessThan(8 * 60 + 15);
  });
  test('the day is the day on the person\'s clock, also far from the zone\'s own meridian and across the date line', () => {
    // [place, zone, the local date]: the rise is before the set, both on that local day (or the rise the evening before in UTC).
    const cases: [number, number, string][] = [[1.87, -157.4, 'Pacific/Kiritimati'], [-33.87, 151.21, 'Australia/Sydney'], [21.31, -157.86, 'Pacific/Honolulu'], [35.68, 139.69, 'Asia/Tokyo'], [39.9, 116.4, 'Asia/Shanghai'], [43.8, 87.6, 'Asia/Urumqi'], [-13.83, -171.77, 'Pacific/Apia']];
    for (const [lat, lon, zone] of cases) {
      const noon = Date.parse('2026-11-15T12:00:00Z'), today = localTime(noon, zone), {rise, set} = sunTimes({lat, lon}, today.date, today.offset);
      expect(rise && set, zone).toBeTruthy();
      expect(Date.parse(rise!), zone).toBeLessThan(Date.parse(set!));
      expect(localTime(Date.parse(rise!), zone).date, zone).toBe(today.date);
      expect(localTime(Date.parse(set!), zone).date, zone).toBe(today.date);
      // A plausible morning and evening on that clock.
      expect(localTime(Date.parse(rise!), zone).minutes, zone).toBeGreaterThan(4 * 60); expect(localTime(Date.parse(rise!), zone).minutes, zone).toBeLessThan(9 * 60);
      expect(localTime(Date.parse(set!), zone).minutes, zone).toBeGreaterThan(16 * 60); expect(localTime(Date.parse(set!), zone).minutes, zone).toBeLessThan(21 * 60);
    }
  });
  test('whole minutes, as ISO times; a date or a place that is not one gives nothing and never throws', () => {
    const {rise, set} = sunTimes({lat: 50.85, lon: 4.35}, '2026-11-11', 60);
    for (const time of [rise, set]) expect(time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/);
    for (const [place, date, offset] of [[{lat: 91, lon: 0}, '2026-11-11', 0], [{lat: 0, lon: 181}, '2026-11-11', 0], [{lat: Number.NaN, lon: 0}, '2026-11-11', 0], [{lat: 50, lon: 4}, 'today', 0], [{lat: 50, lon: 4}, '11-11-2026', 0], [{lat: 50, lon: 4}, '2026-11-11', Number.NaN]] as const) expect(sunTimes(place, date, offset)).toEqual({});
  });
});
