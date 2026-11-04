import {describe, expect, it} from 'vitest';
import {createEmptyHealth, healthSchema, type HealthData} from '../health';
import {saveMeasurement} from '../body-measurements';
import {measureCharts} from './measure-charts';

// Session AL (MO-140, P-MO-72): a waist logged in cm and then in inches is charted in ONE unit.
const AT = '2026-11-04T10:00:00.000Z';
function waist(data: HealthData, id: string, observedAt: string, quantityMilli: number, unit: 'cm' | 'in'): HealthData {
  return saveMeasurement(data, {id, kind: 'waist', unit, quantityMilli, observedAt, timezone: 'Europe/Brussels', sourceLabel: 'Manual measurement'}, AT);
}
const mixed = () => {
  let data = healthSchema.parse(createEmptyHealth());
  data = waist(data, 'health_waist-0000001', '2026-10-30T08:00:00.000Z', 91_500, 'cm');
  data = waist(data, 'health_waist-0000002', '2026-11-04T08:00:00.000Z', 35_400, 'in'); // 89.9 cm
  return data;
};

describe('MO-140: measurement charts in one unit', () => {
  it('a kg journal charts the inch reading in cm (89.9 cm, −1.6 since Oct 30), never 35.4 "cm"', () => {
    const chart = measureCharts(mixed(), null, 'kg').find(c => c.id === 'waist')!;
    expect(chart.unit).toBe('cm');
    expect(chart.points).toEqual([{date: '2026-10-30', value: 91.5}, {date: '2026-11-04', value: 89.9}]);
  });
  it('a lb journal charts both in inches', () => {
    const chart = measureCharts(mixed(), null, 'lb').find(c => c.id === 'waist')!;
    expect(chart.unit).toBe('in');
    expect(chart.points).toEqual([{date: '2026-10-30', value: 36}, {date: '2026-11-04', value: 35.4}]);
  });
  it('your own kinds convert from their own unit too', () => {
    const custom = {version: 1 as const, kinds: [{id: 'neck', label: 'Neck', unit: 'in' as const}], readings: [{id: 'c1', kind: 'neck', date: '2026-11-01', valueMilli: 15_000, at: AT}]};
    expect(measureCharts(createEmptyHealth(), custom, 'kg').find(c => c.id === 'neck')).toEqual({id: 'neck', title: 'Neck', unit: 'cm', points: [{date: '2026-11-01', value: 38.1}]});
  });
});
