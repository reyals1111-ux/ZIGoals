import {afterEach, describe, expect, it} from 'vitest';
import {setJournalTimeZone} from '../journal-zone';
import {zoneNow} from './zone-now';

// Session AK F0 (M4): a weekly reminder's day, weekday and clock come from the journal's zone, all three together.
afterEach(() => { setJournalTimeZone(null, false); });
describe('zoneNow', () => {
  it('reads the day, weekday and clock in the zone given', () => {
    // Sunday 20 Sep 2026, 19:00 UTC: still Sunday 21:00 in Brussels (summer time), already Monday 04:00 in Tokyo.
    const at = new Date('2026-09-20T19:00:00Z');
    expect(zoneNow(at, 'UTC')).toEqual({day: '2026-09-20', weekday: 0, clock: '19:00'});
    expect(zoneNow(at, 'Europe/Brussels')).toEqual({day: '2026-09-20', weekday: 0, clock: '21:00'});
    expect(zoneNow(at, 'Asia/Tokyo')).toEqual({day: '2026-09-21', weekday: 1, clock: '04:00'});
    expect(zoneNow(at, 'America/Los_Angeles')).toEqual({day: '2026-09-20', weekday: 0, clock: '12:00'});
  });
  it('follows the journal zone when none is passed, and the device when the journal has none', () => {
    const at = new Date('2026-09-20T19:00:00Z');
    setJournalTimeZone('Asia/Tokyo', true);
    expect(zoneNow(at)).toEqual({day: '2026-09-21', weekday: 1, clock: '04:00'});
    setJournalTimeZone(null, true);
    const device = zoneNow(at);
    expect(device.weekday).toBe(at.getDay());
    expect(device.clock).toBe(`${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`);
  });
  it('an unknown zone falls back to the device, never to UTC and never throws', () => {
    const at = new Date('2026-09-20T19:00:00Z');
    expect(zoneNow(at, 'Not/AZone')).toEqual(zoneNow(at, null));
  });
  it('across the DST change: the wall clock in the zone, not a fixed offset', () => {
    // Brussels leaves summer time on Sun 25 Oct 2026 at 03:00 local (01:00 UTC).
    expect(zoneNow(new Date('2026-10-25T00:30:00Z'), 'Europe/Brussels')).toEqual({day: '2026-10-25', weekday: 0, clock: '02:30'});
    expect(zoneNow(new Date('2026-10-25T01:30:00Z'), 'Europe/Brussels')).toEqual({day: '2026-10-25', weekday: 0, clock: '02:30'});
    expect(zoneNow(new Date('2026-10-25T17:00:00Z'), 'Europe/Brussels')).toEqual({day: '2026-10-25', weekday: 0, clock: '18:00'});
    // New York springs forward on Sun 8 Mar 2026 at 02:00 local.
    expect(zoneNow(new Date('2026-03-08T07:30:00Z'), 'America/New_York')).toEqual({day: '2026-03-08', weekday: 0, clock: '03:30'});
  });
  it('across month and year ends', () => {
    expect(zoneNow(new Date('2026-12-31T15:30:00Z'), 'Asia/Tokyo')).toEqual({day: '2027-01-01', weekday: 5, clock: '00:30'});
    expect(zoneNow(new Date('2026-03-01T03:00:00Z'), 'America/Los_Angeles')).toEqual({day: '2026-02-28', weekday: 6, clock: '19:00'});
  });
});
