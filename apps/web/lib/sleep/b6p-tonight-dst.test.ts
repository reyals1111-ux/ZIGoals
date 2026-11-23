import {afterEach, describe, expect, test} from 'vitest';
import {tonight} from './tonight';
import {sleepSchema, type Sleep, type SleepNight} from './schema';
import {addDays, instantAt} from '../zone-time';

/**
 * Review B6P-3 (Session AV lane 2, r6-body; LEDGER #419): tonight's bedtime on a daylight-saving night, worked out from
 * real instants in the zone. Four usual 06:45 wakes in Amsterdam and a goal of 7 h 30. Fictional nights.
 */
const AMS = 'Europe/Amsterdam', AT = '2026-03-01T09:00:00.000Z', deviceZone = process.env.TZ;
afterEach(() => { if (deviceZone === undefined) delete process.env.TZ; else process.env.TZ = deviceZone; });
const night = (wakeDay: string, i: number): SleepNight => ({id: `health_sleep-b6p-${wakeDay}-${i}`, kind: 'night', start: new Date(instantAt(addDays(wakeDay, -1), '23:00', AMS)).toISOString(), end: new Date(instantAt(wakeDay, '06:45', AMS)).toISOString(), timeZone: AMS, source: 'manual', createdAt: AT, updatedAt: AT});
const sleepBefore = (today: string): Sleep => sleepSchema.parse({version: 1, nights: [0, 1, 2, 3].map(i => night(addDays(today, -i), i)), goal: {minutes: 450, updatedAt: AT}});
const bed = (today: string, zone?: string) => { const t = tonight(sleepBefore(today), today, null, zone); return t.kind === 'bedtime' ? [t.bed, t.wake] : t.kind; };

describe('B6P-3: tonight’s bedtime across a daylight-saving change', () => {
  test('24 to 25 October 2026, the clocks go back: 23:15 to 06:45 is 8 h 30 that night, so bed by 00:15', () => {
    expect(bed('2026-10-24', AMS)).toEqual(['00:15', '06:45']);
  });
  test('28 to 29 March 2026, the clocks go forward: bed by 22:15 for a full 7 h 30', () => {
    expect(bed('2026-03-28', AMS)).toEqual(['22:15', '06:45']);
  });
  test('an ordinary night is the plain wall-clock sum, as before', () => {
    expect(bed('2026-10-17', AMS)).toEqual(['23:15', '06:45']);
    expect(bed('2026-11-21', AMS)).toEqual(['23:15', '06:45']);
  });
  test('with no zone given, this device’s zone (TZ) is the one', () => {
    process.env.TZ = AMS;
    expect(bed('2026-10-24')).toEqual(['00:15', '06:45']);
    expect(bed('2026-03-28')).toEqual(['22:15', '06:45']);
  });
});
