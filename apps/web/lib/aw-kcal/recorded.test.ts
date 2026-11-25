import {describe, expect, test} from 'vitest';
import {createEmptyHealth, saveActivity, type HealthData} from '../health';
import {withHealthGroup} from '../vault/w-homes';
import {vitalDaySchema, type VitalSource} from '../vitals/schema';
import {emptyActivityExtras, withActivityExtra} from './activity-extras';
import {energySourceOf, energySourceWords, recordedCalories} from './recorded';

/** Session AW (kcal; owner decision 1a): the calories burned a person's own records hold — typed or imported, never worked out. */
const AT = '2026-11-17T09:00:00.000Z';
const vital = (date: string, source: VitalSource, activeKcal: number | undefined, updatedAt = AT) => vitalDaySchema.parse({id: `health_vital-${source}-${date}`, date, source, ...(activeKcal !== undefined ? {activeKcal} : {restingHr: 60}), updatedAt});
const withVitals = (h: HealthData, days: ReturnType<typeof vital>[]) => withHealthGroup(h, 'vitals', {version: 1, days}, false);
let health = createEmptyHealth();
health = saveActivity(health, {id: 'health_walk-aw-0001', date: '2026-11-17', name: 'Walk', steps: 0, minutes: 40}, AT);
health = saveActivity(health, {id: 'health_swim-aw-0001', date: '2026-11-16', name: 'Swimming', steps: 0, minutes: 30}, AT);
health = saveActivity(health, {id: 'health_yoga-aw-0001', date: '2026-11-17', name: 'Yoga', steps: 0, minutes: 20}, AT);
const extras = withActivityExtra(withActivityExtra(withActivityExtra(emptyActivityExtras(), 'health_walk-aw-0001', {kcal: 320, distanceKm: 4}), 'health_swim-aw-0001', {kcal: 250}), 'health_gone-aw-0001', {kcal: 999});

describe('recorded calories', () => {
  test('nothing typed and nothing imported is nothing, never zero', () => {
    expect(recordedCalories(createEmptyHealth(), null, '2026-11-17', '2026-11-17')).toEqual({entered: null, imported: null});
    expect(recordedCalories(health, emptyActivityExtras(), '2026-11-17', '2026-11-17')).toEqual({entered: null, imported: null});
    expect(recordedCalories(null, extras, '2026-11-17', '2026-11-17')).toEqual({entered: null, imported: null});
  });
  test('typed calories of the span’s activities, summed; an entry left behind by a removed activity is never counted', () => {
    expect(recordedCalories(health, extras, '2026-11-17', '2026-11-17').entered).toEqual({kcal: 320, activities: 1, names: ['Walk']});
    expect(recordedCalories(health, extras, '2026-11-16', '2026-11-17').entered).toEqual({kcal: 570, activities: 2, names: ['Walk', 'Swimming']});
  });
  test('imported active energy: one value a day (the newest source), summed apart from the typed calories, with its sources', () => {
    const h = withVitals(health, [vital('2026-11-17', 'apple-health', 450), vital('2026-11-17', 'garmin', 500, '2026-11-17T10:00:00.000Z'), vital('2026-11-16', 'oura', 300), vital('2026-11-15', 'oura', 999), vital('2026-11-16', 'garmin', undefined)]);
    const r = recordedCalories(h, extras, '2026-11-16', '2026-11-17');
    expect(r.imported).toEqual({kcal: 800, days: 2, sources: ['garmin', 'oura']});
    expect(r.entered?.kcal).toBe(570);
  });
  test('the source is named: “from your file” for an export, a linked account apart', () => {
    expect(energySourceOf('apple-health')).toBe('file');
    expect(energySourceOf('oura-link')).toBe('link');
    expect(energySourceOf('bluetooth')).toBe('device');
    expect(energySourceWords(['garmin', 'oura'])).toBe('from your file');
    expect(energySourceWords(['garmin'], 'nl')).toBe('uit je bestand');
    expect(energySourceWords(['garmin', 'withings-link'])).toBe('from your files and linked accounts');
  });
});
