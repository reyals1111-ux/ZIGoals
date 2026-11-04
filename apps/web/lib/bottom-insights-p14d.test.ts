import {describe, expect, it} from 'vitest';
import {careRows, healthWeek, loggedDaysOfWeek} from './bottom-insights';
import {createEmptyHealth, saveActivity, saveWeight, type HealthData} from './health';
import {emptySleep} from './sleep/schema';
import {saveNight} from './sleep/engine';

/** Session AL (MO-150, lane P14-D): "Seven days of care" also reads steps, active minutes, sleep and weight. */
const today = '2026-09-23';
function week() {
  let health = createEmptyHealth();
  health = saveActivity(health, {id: 'health_activity-00000001', date: '2026-09-22', name: 'Walk', steps: 6400, minutes: 0}, '2026-09-22T18:00:00.000Z');
  health = saveActivity(health, {id: 'health_activity-00000002', date: '2026-09-22', name: 'Run', steps: 3100, minutes: 25}, '2026-09-22T19:00:00.000Z');
  health = saveWeight(health, {id: 'health_weight-00000001', date: '2026-09-21', grams: 72_450}, '2026-09-21T07:00:00.000Z');
  // A night that ended on the 23rd: 23:00 → 06:30 in Brussels, 7 h 30 min.
  const sleep = saveNight(emptySleep(), {kind: 'night', start: Date.parse('2026-09-22T21:00:00Z'), end: Date.parse('2026-09-23T04:30:00Z'), timeZone: 'Europe/Brussels'}, new Date('2026-09-23T08:00:00Z'));
  return {...health, sleep} as HealthData;
}

describe('MO-150: the week of care', () => {
  it('holds steps, active minutes, sleep and weight per day, null without a record (never zero)', () => {
    const w = healthWeek(week(), today), byDate = Object.fromEntries(w.map(d => [d.date, d]));
    expect(byDate['2026-09-22']).toMatchObject({steps: 9500, activeMinutes: 25, sleepMinutes: null, weightGrams: null});
    expect(byDate['2026-09-23']).toMatchObject({steps: null, activeMinutes: null, sleepMinutes: 450, weightGrams: null});
    expect(byDate['2026-09-21']).toMatchObject({steps: null, weightGrams: 72_450});
    expect(byDate['2026-09-17']).toMatchObject({steps: null, activeMinutes: null, sleepMinutes: null, weightGrams: null});
  });
  it('a walk with steps but no minutes leaves minutes unknown, not zero', () => {
    let health = createEmptyHealth();
    health = saveActivity(health, {id: 'health_activity-00000003', date: today, name: 'Walk', steps: 2000, minutes: 0}, `${today}T10:00:00.000Z`);
    expect(healthWeek(health, today).at(-1)).toMatchObject({steps: 2000, activeMinutes: null});
  });
  it('careRows: one row per kind that has a record this week, in hours and the chosen weight unit', () => {
    const rows = careRows(healthWeek(week(), today));
    expect(rows.map(r => r.label)).toEqual(['Steps', 'Active minutes', 'Sleep · hours', 'Weight · kg']);
    expect(rows.find(r => r.key === 'sleep')!.values.at(-1)).toEqual([today, 7.5, false]);
    expect(rows.find(r => r.key === 'weight')!.values.find(([d]) => d === '2026-09-21')).toEqual(['2026-09-21', 72.5, false]);
    expect(careRows(healthWeek(week(), today), 'lb').find(r => r.key === 'weight')!.values.find(([d]) => d === '2026-09-21')![1]).toBe(159.7);
    expect(careRows(healthWeek(createEmptyHealth(), today))).toEqual([]);
  });
  it('a day with only steps, a night or a weight counts as a logged day', () => {
    expect(loggedDaysOfWeek(healthWeek(week(), today))).toBe(3);
    expect(loggedDaysOfWeek(healthWeek(createEmptyHealth(), today))).toBe(0);
  });
});
