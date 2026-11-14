import {afterEach, describe, expect, test} from 'vitest';
import {createEmptyHealth, type HealthData} from '../health';
import {addLocalDays} from '../local-date';
import {saveNight} from '../sleep/engine';
import {emptySleep, type Sleep} from '../sleep/schema';
import {instantAt} from '../zone-time';
import {DIRECTION_WORDS, healthTrends, TREND_MIN} from './trends';

// Session AP (feature 4): the last 90 days against the last 365, from the person's own records. Fictional readings.
const TODAY = '2026-11-14', AT = '2026-11-01T07:00:00.000Z';
const deviceZone = process.env.TZ;
afterEach(() => { if (deviceZone === undefined) delete process.env.TZ; else process.env.TZ = deviceZone; });
const back = (i: number) => addLocalDays(TODAY, -i);
const pad = (i: number) => String(i).padStart(4, '0');
const withSteps = (days: number[], value: (i: number) => number): HealthData => ({...createEmptyHealth(), activity: days.map(i => ({id: `health_activity-${pad(i)}`, date: back(i), name: 'Walk', steps: value(i), minutes: 10, createdAt: AT, updatedAt: AT}))});
const range = (from: number, to: number) => Array.from({length: to - from + 1}, (_, k) => from + k);

describe('trends: the last 90 days against the last 365', () => {
  test('steps up: the 90 days average above the year, with the days on each side', () => {
    const h = withSteps(range(0, 364), i => i < 90 ? 10_000 : 6_000);
    const {ready, pending} = healthTrends(h, TODAY);
    expect(pending).toEqual([]);
    expect(ready).toEqual([{id: 'steps', label: 'Steps a day', recent: {days: 90, value: 10_000}, year: {days: 365, value: (90 * 10_000 + 275 * 6_000) / 365}, direction: 'up', unit: 'steps'}]);
    expect(DIRECTION_WORDS.up).toEqual({arrow: '↑', words: 'Up'});
  });
  test('an unrecorded day is never a zero; too few days on a side waits and says how many', () => {
    const h = withSteps([...range(0, 19), ...range(200, 299)], () => 8_000);
    expect(healthTrends(h, TODAY)).toEqual({ready: [], pending: [{id: 'steps', label: 'Steps a day', recentDays: 20, yearDays: 120, needRecent: TREND_MIN.steps.recent, needYear: TREND_MIN.steps.year}]});
  });
  test('a measure the person does not record is not listed; within 5 % is "about the same"', () => {
    const h = withSteps(range(0, 364), i => i < 90 ? 8_100 : 8_000);
    const {ready} = healthTrends(h, TODAY);
    expect(ready.map(t => [t.id, t.direction])).toEqual([['steps', 'same']]);
  });
  test('weight down and resting heart rate (several sources a day averaged), from their own records', () => {
    const weights = range(0, 51).map(w => ({id: `health_weight-${pad(w)}`, date: back(w * 7), grams: w < 13 ? 80_000 : 82_000, createdAt: AT, updatedAt: AT}));
    const vitals = range(0, 199).flatMap(i => (['garmin', 'oura'] as const).map(source => ({id: `health_vital-${source}-${back(i)}`, date: back(i), source, restingHr: i < 90 ? (source === 'garmin' ? 56 : 58) : 62, updatedAt: AT})));
    const h: HealthData = {...createEmptyHealth(), schemaVersion: 4, weights, vitals: {version: 1, days: vitals}};
    const {ready} = healthTrends(h, TODAY);
    expect(ready.find(t => t.id === 'weight')).toMatchObject({direction: 'down', recent: {days: 13, value: 80_000}, year: {days: 53 - 1}});
    expect(ready.find(t => t.id === 'restingHr')).toMatchObject({direction: 'down', recent: {days: 90, value: 57}, year: {days: 200}});
  });
  test('sleep: nights by the day they end; about the same within 10 minutes', () => {
    process.env.TZ = 'UTC';
    let sleep: Sleep = emptySleep();
    for (const i of range(0, 149)) sleep = saveNight(sleep, {kind: 'night', start: instantAt(back(i + 1), '23:00', 'UTC'), end: instantAt(back(i), i < 90 ? '06:00' : '06:05', 'UTC'), timeZone: 'UTC'}, new Date('2026-11-30T00:00:00Z'));
    const {ready} = healthTrends({...createEmptyHealth(), schemaVersion: 4, sleep}, TODAY);
    expect(ready).toEqual([expect.objectContaining({id: 'sleep', direction: 'same', recent: expect.objectContaining({days: 90}), year: expect.objectContaining({days: 150})})]);
  });
});
