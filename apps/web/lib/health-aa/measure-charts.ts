import {measurementHistory} from '../body-measurements';
import {measurementKinds} from '../body-measurement-schema';
import type {HealthData} from '../health';
import {inOneUnit, type LengthUnit} from '../health-units';
import {calendarDay} from '../visual-format';
import {customHistory, type MeasurementsCustom} from './measurements-custom';

/**
 * Session AL (P-MO-72, MO-140): the Measurement charts' series, every reading in ONE length unit. A waist chart showed
 * "35.4 cm · −56.1 since Oct 30": an inch reading was divided as inches but plotted on a centimetre chart (the chart took
 * the first reading's unit). Every reading now goes through `inOneUnit` to the journal's length unit (cm beside kg, in
 * beside lb, as the trends fold), so a chart, its headline and its change never mix units. Stored readings are unchanged.
 */
export type MeasureChart = {id: string; title: string; unit: LengthUnit; points: {date: string; value: number}[]};
const lengthFor = (weight: 'kg' | 'lb'): LengthUnit => weight === 'lb' ? 'in' : 'cm';
/** One point a day (that day's latest reading), oldest first, rounded to a tenth for the chart's labels. */
function perDay(points: readonly {date: string; value: number}[]): {date: string; value: number}[] {
  const byDay = new Map<string, number>();
  for (const p of [...points].sort((a, b) => a.date.localeCompare(b.date))) byDay.set(p.date, p.value);
  return [...byDay].map(([date, value]) => ({date, value: Math.round(value * 10) / 10}));
}
export function measureCharts(data: HealthData, custom: MeasurementsCustom | null, weight: 'kg' | 'lb'): MeasureChart[] {
  const unit = lengthFor(weight);
  const synced = measurementKinds.filter(k => k !== 'weight').map(kind => {
    // The canonical value is micrometres whatever unit was typed: read as millimetres, then converted once.
    const readings = measurementHistory(data, kind).readings.map(r => {
      let date = r.observedAt.slice(0, 10);
      try { date = calendarDay(r.observedAt, r.timezone) || date; } catch { /* the stored day */ }
      return {date, value: r.canonical / 1000, unit: 'mm' as const};
    });
    return {id: kind, title: kind[0]!.toUpperCase() + kind.slice(1), unit, points: perDay(inOneUnit(readings, unit).map(r => ({date: r.date, value: r.converted})))};
  });
  const own = (custom?.kinds ?? []).map(k => ({id: k.id, title: k.label, unit,
    points: perDay(inOneUnit(customHistory(custom!, k.id).map(r => ({date: r.date, value: r.valueMilli / 1000, unit: k.unit})), unit).map(r => ({date: r.date, value: r.converted})))}));
  return [...synced, ...own];
}
