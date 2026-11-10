import {GRAMS_PER_LB} from '../../../lib/health-units';
import {formatNumber} from '../../../lib/visual-format';
import {roundHalfUp} from '../../../lib/numbers/round';
import type {Measure, WorkoutSet} from '../../../lib/workouts/schema';

/** Weights are kept in kilograms; the page reads and writes the Health weight unit. */
export const KG_PER_LB = GRAMS_PER_LB / 1000;
export const toUnit = (kg: number, unit: 'kg' | 'lb') => unit === 'lb' ? kg / KG_PER_LB : kg;
export const fromUnit = (value: number, unit: 'kg' | 'lb') => Math.round((unit === 'lb' ? value * KG_PER_LB : value) * 1000) / 1000;
/** Session AL (P-MO-48; MO-165, N-MO-15): rounded half up at the shown precision (a 135 lb set never reads 134.9 lb). */
export const weightShown = (kg: number, unit: 'kg' | 'lb') => { const d = unit === 'lb' ? 1 : 2; return `${formatNumber(roundHalfUp(toUnit(kg, unit), d), {maximumFractionDigits: d})} ${unit}`; };
/** Session AL (P-MO-48, MO-165): a field's prefill is the value shown beside it ("133.4" in lb, never "133.38"). */
export const weightPrefillText = (kg: number, unit: 'kg' | 'lb') => String(roundHalfUp(toUnit(kg, unit), unit === 'lb' ? 1 : 2));
/** An estimate (one-rep max) at the precision it deserves: tenths of a kilogram, whole pounds ("102 kg", not "101.97 kg"). */
export const estimateShown = (kg: number, unit: 'kg' | 'lb') => { const d = unit === 'lb' ? 0 : 1; return `${formatNumber(roundHalfUp(toUnit(kg, unit), d), {maximumFractionDigits: d})} ${unit}`; };
/** "1:30" or "90" (seconds) or "2:05:00"; null when it cannot be read. */
export function readClock(text: string): number | null {
  const t = text.trim(); if (!t) return null;
  if (/^\d{1,5}$/.test(t)) return Number(t);
  const m = /^(?:(\d{1,2}):)?(\d{1,3}):(\d{2})$/.exec(t); if (!m) return null;
  const s = Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]); return Number(m[3]) < 60 ? s : null;
}
export const clock = (seconds: number) => { const h = Math.floor(seconds / 3600), m = Math.floor(seconds % 3600 / 60), s = seconds % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`; };
/** A set in words: "60 kg × 8", "12 reps", "1:30", "5 km in 25:00". */
export function setText(measure: Measure, s: Partial<WorkoutSet>, unit: 'kg' | 'lb'): string {
  if (measure === 'weight-reps') return s.weightKg !== undefined && s.reps ? `${weightShown(s.weightKg, unit)} × ${s.reps}` : '—';
  if (measure === 'reps') return s.reps ? `${s.reps} ${s.reps === 1 ? 'rep' : 'reps'}` : '—';
  if (measure === 'time') return s.seconds ? clock(s.seconds) : '—';
  return [s.distanceKm ? `${formatNumber(s.distanceKm, {maximumFractionDigits: 2})} km` : '', s.seconds ? `in ${clock(s.seconds)}` : ''].filter(Boolean).join(' ') || '—';
}
