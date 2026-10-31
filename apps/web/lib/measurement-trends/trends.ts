import {measurementHistory} from '../body-measurements';
import {measurementKinds, type BodyMeasurement} from '../body-measurement-schema';
import type {HealthData} from '../health';
import type {MeasurementsCustom} from '../health-aa/measurements-custom';
import {calendarDay} from '../visual-format';

/**
 * Session AK (F5b): body measurement trends over the existing measurements (the synced kinds in Health `measurements` and
 * the person's own kinds in `zigoals:measurements-custom:v1`); nothing new is stored. Units follow the app: weight in the
 * Health journal's weight unit (kg or lb, Journal settings), lengths in centimetres beside kilograms and inches beside
 * pounds. A week's change compares the latest reading with the latest one at least seven days before it; a trend is a
 * straight line through the last eight weeks: a description of the readings, not a forecast. No readings is unknown,
 * never zero.
 */
export type LengthUnit = 'cm' | 'in';
export type WeightUnit = 'kg' | 'lb';
export type TrendPoint = {date: string; value: number};
export const lengthUnitFor = (weight: WeightUnit): LengthUnit => weight === 'lb' ? 'in' : 'cm';
const MG_PER_KG = 1_000_000, MG_PER_LB = 453_592.37, UM_PER_CM = 10_000, UM_PER_IN = 25_400;
/** A canonical value (milligrams for weight, micrometres for lengths) in the display unit. */
export function displayValue(kind: BodyMeasurement['kind'], canonical: number, unit: WeightUnit | LengthUnit): number {
  if (kind === 'weight') return canonical / (unit === 'lb' ? MG_PER_LB : MG_PER_KG);
  return canonical / (unit === 'in' ? UM_PER_IN : UM_PER_CM);
}
const day = (r: BodyMeasurement) => { try { return calendarDay(r.observedAt, r.timezone) || r.observedAt.slice(0, 10); } catch { return r.observedAt.slice(0, 10); } };
/** One point a day (that day's latest reading), oldest first. */
function perDay(points: readonly TrendPoint[]): TrendPoint[] {
  const byDay = new Map<string, number>();
  for (const p of points) byDay.set(p.date, p.value);
  return [...byDay].map(([date, value]) => ({date, value})).sort((a, b) => a.date.localeCompare(b.date));
}
/** A synced kind's readings in the display unit (weight in `weight`, the rest in its length unit). */
export function syncedSeries(data: HealthData, kind: BodyMeasurement['kind'], weight: WeightUnit): {unit: WeightUnit | LengthUnit; points: TrendPoint[]} {
  const unit = kind === 'weight' ? weight : lengthUnitFor(weight);
  return {unit, points: perDay(measurementHistory(data, kind).readings.map(r => ({date: day(r), value: displayValue(kind, r.canonical, unit)})))};
}
/** One of the person's own kinds, its readings converted from the kind's unit to the display length unit. */
export function customSeries(record: MeasurementsCustom, kindId: string, weight: WeightUnit): {unit: LengthUnit; points: TrendPoint[]} {
  const kind = (record.kinds ?? []).find(k => k.id === kindId), unit = lengthUnitFor(weight);
  if (!kind) return {unit, points: []};
  const factor = kind.unit === unit ? 1 : kind.unit === 'in' ? 2.54 : 1 / 2.54;
  return {unit, points: perDay((record.readings ?? []).filter(r => r.kind === kindId).map(r => ({date: r.date, value: (r.valueMilli / 1000) * factor})))};
}
const dayNumber = (date: string) => Date.parse(`${date}T12:00:00Z`) / 86_400_000;
export type WeekChange = {change: number; from: string; to: string; days: number; perWeek: number};
/**
 * The change from the latest reading at least seven days before the latest one, with the days between and the average per
 * week. Null with fewer than two readings or none a week apart (unknown, not "no change").
 */
export function weeklyChange(points: readonly TrendPoint[]): WeekChange | null {
  const last = points.at(-1); if (!last) return null;
  const base = [...points].reverse().find(p => dayNumber(last.date) - dayNumber(p.date) >= 7);
  if (!base) return null;
  const days = Math.round(dayNumber(last.date) - dayNumber(base.date)), change = last.value - base.value;
  return {change, from: base.date, to: last.date, days, perWeek: change / days * 7};
}
/**
 * The least-squares slope per week of the readings within `windowDays` of the latest one: at least three readings over at
 * least fourteen days, else null.
 */
export function trendPerWeek(points: readonly TrendPoint[], windowDays = 56): number | null {
  const last = points.at(-1); if (!last) return null;
  const inside = points.filter(p => dayNumber(last.date) - dayNumber(p.date) <= windowDays);
  if (inside.length < 3 || dayNumber(last.date) - dayNumber(inside[0]!.date) < 14) return null;
  const xs = inside.map(p => dayNumber(p.date)), ys = inside.map(p => p.value), n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0; for (let i = 0; i < n; i++) { num += (xs[i]! - mx) * (ys[i]! - my); den += (xs[i]! - mx) ** 2; }
  return den ? num / den * 7 : null;
}
export type TrendRow = {id: string; title: string; unit: string; points: TrendPoint[]; latest: TrendPoint | null; week: WeekChange | null; perWeek: number | null; custom: boolean};
const title = (kind: string) => kind === 'arm' ? 'Arms' : kind === 'thigh' ? 'Thighs' : kind[0]!.toUpperCase() + kind.slice(1);
/** Every kind with at least one reading: the synced kinds first (weight, waist, hips, chest, arms, thighs), then the person's own. */
export function trendRows(data: HealthData, custom: MeasurementsCustom | null, weight: WeightUnit): TrendRow[] {
  const rows: TrendRow[] = [];
  const row = (id: string, name: string, unit: string, points: TrendPoint[], isCustom: boolean) => { if (points.length) rows.push({id, title: name, unit, points, latest: points.at(-1) ?? null, week: weeklyChange(points), perWeek: trendPerWeek(points), custom: isCustom}); };
  for (const kind of measurementKinds) { const s = syncedSeries(data, kind, weight); row(kind, title(kind), s.unit, s.points, false); }
  for (const k of custom?.kinds ?? []) { const s = customSeries(custom!, k.id, weight); row(`custom:${k.id}`, k.label, s.unit, s.points, true); }
  return rows;
}
