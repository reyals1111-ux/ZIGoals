import {describe, expect, test} from 'vitest';
import {saveMeasurement} from '../body-measurements';
import {createEmptyHealth, type HealthData} from '../health';
import {addLocalDays} from '../local-date';
import {measurementsCustomSchema} from '../health-aa/measurements-custom';
import {customSeries, displayValue, lengthUnitFor, syncedSeries, trendPerWeek, trendRows, weeklyChange} from './trends';

const TODAY = '2026-10-31';
function withWaist(values: [offset: number, cm: number, unit?: 'cm' | 'in'][]): HealthData {
  let data = createEmptyHealth();
  values.forEach(([offset, value, unit = 'cm'], i) => { const d = addLocalDays(TODAY, offset); data = saveMeasurement(data, {id: `health_trend-test-${i}`, kind: 'waist', quantityMilli: Math.round(value * 1000), unit, observedAt: `${d}T07:00:00+00:00`, timezone: 'UTC', sourceLabel: 'Fictional tape'}, `${d}T08:00:00.000Z`); });
  return data;
}
describe('measurement trends (over the existing measurements; nothing stored)', () => {
  test('units follow the journal: cm beside kg, in beside lb; weight in kg or lb', () => {
    expect(lengthUnitFor('kg')).toBe('cm'); expect(lengthUnitFor('lb')).toBe('in');
    expect(displayValue('waist', 254_000, 'in')).toBe(10); expect(displayValue('waist', 254_000, 'cm')).toBeCloseTo(25.4);
    expect(displayValue('weight', 72_000_000, 'kg')).toBe(72); expect(displayValue('weight', 453_592.37, 'lb')).toBeCloseTo(1);
    const data = withWaist([[-7, 86], [0, 34, 'in']]);
    expect(syncedSeries(data, 'waist', 'kg')).toEqual({unit: 'cm', points: [{date: addLocalDays(TODAY, -7), value: 86}, {date: TODAY, value: 86.36}]});
    expect(syncedSeries(data, 'waist', 'lb').points[1]!.value).toBeCloseTo(34);
  });
  test('one point a day (its latest reading)', () => {
    let data = withWaist([[0, 86]]);
    data = saveMeasurement(data, {id: 'health_trend-test-late', kind: 'waist', quantityMilli: 85_500, unit: 'cm', observedAt: `${TODAY}T19:00:00+00:00`, timezone: 'UTC', sourceLabel: 'Fictional tape'}, `${TODAY}T20:00:00.000Z`);
    expect(syncedSeries(data, 'waist', 'kg').points).toEqual([{date: TODAY, value: 85.5}]);
  });
  test('the week’s change: from the latest reading at least seven days before; unknown otherwise', () => {
    expect(weeklyChange([])).toBeNull();
    expect(weeklyChange([{date: '2026-10-28', value: 86}, {date: TODAY, value: 85}])).toBeNull();
    expect(weeklyChange([{date: '2026-10-10', value: 87}, {date: '2026-10-24', value: 86}, {date: '2026-10-27', value: 85.8}, {date: TODAY, value: 85.6}])).toEqual({change: 85.6 - 86, from: '2026-10-24', to: TODAY, days: 7, perWeek: (85.6 - 86)});
    const sparse = weeklyChange([{date: '2026-10-03', value: 88}, {date: TODAY, value: 86}])!;
    expect(sparse.days).toBe(28); expect(sparse.perWeek).toBeCloseTo(-0.5);
  });
  test('the trend per week needs three readings over two weeks inside eight', () => {
    const pts = [0, 7, 14, 21].map(n => ({date: addLocalDays('2026-10-01', n), value: 90 - n / 7 * 0.5}));
    expect(trendPerWeek(pts)).toBeCloseTo(-0.5);
    expect(trendPerWeek(pts.slice(0, 2))).toBeNull();
    expect(trendPerWeek([{date: '2026-10-01', value: 1}, {date: '2026-10-05', value: 2}, {date: '2026-10-10', value: 3}])).toBeNull();
    expect(trendPerWeek([{date: '2026-01-01', value: 99}, ...pts])).toBeCloseTo(-0.5);
  });
  test('own kinds convert from their unit; rows list only kinds with readings', () => {
    const custom = measurementsCustomSchema.parse({version: 1, kinds: [{id: 'neck', label: 'Neck', unit: 'in'}, {id: 'calf', label: 'Calf', unit: 'cm'}], readings: [{id: 'r1', kind: 'neck', date: '2026-10-01', valueMilli: 15_000, at: '2026-10-01T07:00:00.000Z'}]});
    expect(customSeries(custom, 'neck', 'kg').points[0]!.value).toBeCloseTo(38.1);
    expect(customSeries(custom, 'neck', 'lb').points[0]!.value).toBe(15);
    expect(customSeries(custom, 'gone', 'kg').points).toEqual([]);
    const rows = trendRows(withWaist([[-14, 87], [-7, 86.5], [0, 86]]), custom, 'kg');
    expect(rows.map(r => [r.id, r.title, r.unit, r.custom])).toEqual([['waist', 'Waist', 'cm', false], ['custom:neck', 'Neck', 'cm', true]]);
    expect(rows[0]!.week!.change).toBeCloseTo(-0.5); expect(rows[0]!.perWeek).toBeCloseTo(-0.5);
    expect(trendRows(createEmptyHealth(), null, 'kg')).toEqual([]);
  });
});
