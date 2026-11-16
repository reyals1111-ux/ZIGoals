import {describe, expect, test} from 'vitest';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {TODAY_ORBITS, TODAY_ORBITS_KEY, emptyTodayOrbits, orbitsShown, setOrbitsShown} from './record';

// Session AR (6b; TIER 3 stored format): "Your orbits" on Today, its own loose device record, off by default.
const store = (initial?: string) => {
  const m = new Map<string, string>(initial === undefined ? [] : [[TODAY_ORBITS_KEY, initial]]);
  let writes = 0;
  return {m, get writes() { return writes; }, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { writes++; m.set(k, v); }};
};

describe('zigoals:today-orbits:v1', () => {
  test('off by default: a missing record, one without `shown` and one set to false read as off', () => {
    expect(orbitsShown(readDeviceRecord(store(), TODAY_ORBITS).data)).toBe(false);
    expect(orbitsShown(readDeviceRecord(store('{"version":1}'), TODAY_ORBITS).data)).toBe(false);
    expect(orbitsShown(readDeviceRecord(store('{"version":1,"shown":false}'), TODAY_ORBITS).data)).toBe(false);
    expect(orbitsShown(readDeviceRecord(store('{"version":1,"shown":true}'), TODAY_ORBITS).data)).toBe(true);
    expect(emptyTodayOrbits()).toEqual({version: 1});
  });
  test('a tolerant reader that never writes: bad bytes, another version or a wrong type read as off and stay as they were', () => {
    for (const raw of ['not json', '{"version":2,"shown":true}', '{"version":1,"shown":"yes"}', '[]', 'null']) {
      const s = store(raw), read = readDeviceRecord(s, TODAY_ORBITS);
      expect(orbitsShown(read.data), raw).toBe(false);
      expect(read.unreadable, raw).toBe(true);
      expect(s.writes, raw).toBe(0);
      expect(s.m.get(TODAY_ORBITS_KEY), raw).toBe(raw);
    }
  });
  test('loose: a field from a newer build is kept when the person turns the card on or off', () => {
    const s = store('{"version":1,"size":"S"}');
    updateDeviceRecord(s, TODAY_ORBITS, r => setOrbitsShown(r, true));
    expect(JSON.parse(s.m.get(TODAY_ORBITS_KEY)!)).toEqual({version: 1, size: 'S', shown: true});
    updateDeviceRecord(s, TODAY_ORBITS, r => setOrbitsShown(r, false));
    expect(JSON.parse(s.m.get(TODAY_ORBITS_KEY)!)).toEqual({version: 1, size: 'S', shown: false});
  });
});
