import {describe, expect, test} from 'vitest';
import {activityTimeLabel} from './activity-time';
import {getHabitActivities, habitDataSchema, HABITS_KEY} from './habits';
import {getHealthActivities, HEALTH_STORAGE_KEY, healthSchema} from './health';
import {getWaterActivities} from './health-daily';
import {buildShowcase} from './showcase-data';
import {showcaseClock, showcaseMoment} from './showcase-moment';
import {instantAt, wallClock} from './zone-time';
import {PLATFORM_KEY} from './positions';

// Session AD item 8 (ADR-026): the Showcase's records made at a moment carry a realistic time of day, the same on every
// build; today's records and the records that hold a day stay date-only and show no time.
const DAY = '2026-10-12';
describe('a record\'s moment', () => {
  test('is fixed by its key and stays inside its part of the day', () => {
    expect(showcaseClock('health_diary-001-0', 'morning')).toBe(showcaseClock('health_diary-001-0', 'morning'));
    const minutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3));
    for (let n = 0; n < 200; n++) {
      expect(minutes(showcaseClock(`k${n}`, 'morning'))).toBeGreaterThanOrEqual(7 * 60);
      expect(minutes(showcaseClock(`k${n}`, 'morning'))).toBeLessThan(11 * 60);
      expect(minutes(showcaseClock(`k${n}`, 'afternoon'))).toBeGreaterThanOrEqual(12 * 60);
      expect(minutes(showcaseClock(`k${n}`, 'afternoon'))).toBeLessThan(17 * 60);
      expect(minutes(showcaseClock(`k${n}`, 'evening'))).toBeGreaterThanOrEqual(18 * 60);
      expect(minutes(showcaseClock(`k${n}`, 'evening'))).toBeLessThan(22 * 60);
    }
  });
  test('is that wall-clock time in the zone, across clock changes; today and later keep the day\'s start', () => {
    // Brussels and New York fall back in late October and early November, Chatham springs forward in late September.
    for (const zone of ['Europe/Brussels', 'America/New_York', 'Pacific/Chatham', 'UTC'])
      for (const day of ['2026-10-26', '2026-11-02', '2026-09-28'])
        for (let offset = -3; offset < 0; offset++) {
          const at = showcaseMoment(day, offset, zone, `r${offset}`, 'evening'), clock = showcaseClock(`r${offset}`, 'evening');
          expect(wallClock(Date.parse(at), zone).clock, `${zone} ${day} ${offset}`).toBe(clock);
          expect(Date.parse(at)).toBe(instantAt(wallClock(Date.parse(at), zone).date, clock, zone));
        }
    expect(showcaseMoment(DAY, 0, 'Europe/Brussels', 'x', 'evening')).toBe(new Date(instantAt(DAY, '00:00', 'Europe/Brussels')).toISOString());
  });
});
describe('the Showcase\'s Activity', () => {
  const {records} = buildShowcase(DAY, 'UTC');
  const habits = habitDataSchema.parse(JSON.parse(records[HABITS_KEY]!)), health = healthSchema.parse(JSON.parse(records[HEALTH_STORAGE_KEY]!));
  const entries = [...getHabitActivities(habits), ...getHealthActivities(health), ...getWaterActivities(health)];
  test('builds the same instants every time', () => {
    expect(buildShowcase(DAY, 'UTC').records).toEqual(records);
  });
  test('past days\' entries show times spread over morning, afternoon and evening, never midnight', () => {
    // The fictional import's two breakfasts carry only the import's day, as an import without times does (below).
    const past = entries.filter(e => e.at.slice(0, 10) < DAY && !e.id.startsWith('health_import-'));
    expect(past.length).toBeGreaterThan(200);
    const hours = past.map(e => new Date(e.at).getUTCHours());
    for (const e of past) expect(activityTimeLabel(e.at, 'UTC'), `${e.id} ${e.at}`).not.toBeNull();
    expect(hours.filter(h => h >= 7 && h < 12).length).toBeGreaterThan(20);
    expect(hours.filter(h => h >= 12 && h < 17).length).toBeGreaterThan(20);
    expect(hours.filter(h => h >= 18 && h < 22).length).toBeGreaterThan(20);
    // One day holds several times, not one stamp for every record.
    expect(new Set(past.filter(e => e.at.startsWith('2026-10-05')).map(e => e.at.slice(11, 16))).size).toBeGreaterThan(5);
    // A meal reads at its part of the day: breakfast in the morning, dinner in the evening.
    for (const e of past.filter(e => e.title === 'Breakfast logged')) expect(new Date(e.at).getUTCHours()).toBeLessThan(11);
    for (const e of past.filter(e => e.title === 'Dinner logged')) expect(new Date(e.at).getUTCHours()).toBeGreaterThanOrEqual(18);
  });
  test('today\'s entries and the records that hold a day show no invented time', () => {
    const today = entries.filter(e => e.at.slice(0, 10) === DAY);
    expect(today.length).toBeGreaterThan(0);
    for (const e of today) expect(activityTimeLabel(e.at, 'UTC'), e.id).toBeNull();
    const platform = JSON.parse(records[PLATFORM_KEY]!) as {goals: {createdAt: string}[]; valuationSnapshots: {observedAt: string}[]};
    for (const at of [...platform.goals.map(g => g.createdAt), ...platform.valuationSnapshots.map(s => s.observedAt)]) expect(activityTimeLabel(at, 'UTC')).toBeNull();
    const imported = entries.filter(e => e.id.startsWith('health_import-'));
    expect(imported).toHaveLength(2);
    for (const e of imported) expect(activityTimeLabel(e.at, 'UTC'), e.id).toBeNull();
  });
});
