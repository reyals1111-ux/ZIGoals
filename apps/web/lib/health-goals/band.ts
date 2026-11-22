import type {HealthData} from '../health';
import {weightTrend} from '../health-aa/trend';
import {GRAMS_PER_LB, type WeightUnit} from '../health-units';
import {BAND_MAX_GRAMS, BAND_MIN_GRAMS, BAND_MIN_WIDTH, moreGoalsSchema, type MoreGoals, type WeightBand} from './more';

/**
 * Session AV lane 2, round 4 (health; LEDGER #331, Noom's Maintenance Mode): "Keep my weight between …" — a band the person
 * sets, shaded on the weight trend, with the trend's days inside it in the last 30 counted. The band is the person's own:
 * nothing is suggested, and Noom's Harris-Benedict calorie zone is not added (the owner-approved maintenance estimate stays
 * the one exception). Pure.
 */
export const BAND_DAYS = 30;
const toGrams = (text: string, unit: WeightUnit): number | null => { const t = text.trim(), n = Number(t.replace(',', '.')); return t && Number.isFinite(n) && n > 0 ? Math.round(unit === 'lb' ? n * GRAMS_PER_LB : n * 1000) : null; };
/** Sets the band from the two fields, in the person's unit, or says which field to fix. */
export function setWeightBand(rec: MoreGoals, low: string, high: string, unit: WeightUnit, now: string): {ok: true; value: MoreGoals; band: WeightBand} | {ok: false; field: 'low' | 'high'; message: string} {
  const lo = toGrams(low, unit), hi = toGrams(high, unit), range = unit === 'lb' ? '44 to 1,102 lb' : '20 to 500 kg';
  if (lo === null || lo < BAND_MIN_GRAMS || lo > BAND_MAX_GRAMS) return {ok: false, field: 'low', message: `Enter the lower weight, ${range}.`};
  if (hi === null || hi < BAND_MIN_GRAMS || hi > BAND_MAX_GRAMS) return {ok: false, field: 'high', message: `Enter the upper weight, ${range}.`};
  if (hi - lo < BAND_MIN_WIDTH) return {ok: false, field: 'high', message: `The upper weight is at least ${unit === 'lb' ? '1.1 lb' : '0.5 kg'} above the lower one.`};
  const band = {lowGrams: lo, highGrams: hi, createdAt: now};
  return {ok: true, value: moreGoalsSchema.parse({...rec, weightBand: band}), band};
}
export const clearWeightBand = (rec: MoreGoals): MoreGoals => { const rest: Record<string, unknown> = {...rec}; delete rest.weightBand; return moreGoalsSchema.parse(rest); };
/** The trend's days inside the band in the last 30 (a day before the first reading has no trend and is not counted). */
export function bandDays(data: Pick<HealthData, 'weights' | 'targets'>, band: WeightBand, today: string): {inside: number; days: number; above: number; below: number} {
  const points = weightTrend(data, today, BAND_DAYS).points.filter(p => p.trend !== null);
  const inside = points.filter(p => p.trend! >= band.lowGrams && p.trend! <= band.highGrams).length, above = points.filter(p => p.trend! > band.highGrams).length;
  return {inside, days: points.length, above, below: points.length - inside - above};
}
