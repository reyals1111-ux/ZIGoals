import {addLocalDays, localWeekday} from '../local-date';
import type {HealthData} from '../health';
import {weightTrend} from './trend';
import {energyEstimate, suggestedTarget, ENERGY_MIN_LOGGED_DAYS, ENERGY_MIN_WEIGHTS, KCAL_FLOOR, MAX_STEP} from './energy';
import type {HealthCoach} from './coach-schema';

/**
 * N3: the weekly coach check-in: "This week: −0.4 kg/week; keep your target, or adjust?" from the trend's weekly rate,
 * with keep/adjust. The adjust suggestion comes from the energy estimate when it is ready (the person's chosen pace),
 * else from the current target. Plain words, an estimate, never medical advice; answered once per week on this device.
 */
export const weekStartOf = (day: string) => addLocalDays(day, -((localWeekday(day) + 6) % 7));
export type CoachCheckIn = {weekStart: string; answered: 'keep' | 'adjust' | null; rateGrams: number | null; readings: number; sentence: string; suggestion: {kcal: number; paceKg: number} | null; currentKcal: number | null;
  /** Session AK (task 4.5): the estimated maintenance (the energy estimate's expenditure and band) once it is ready. */
  maintenance: {kcal: number; low: number; high: number} | null;
  /** How far the logs are from the weekly card (about two weeks of food and ten weigh-ins in the window). */
  progress: {loggedDays: number; minDays: number; weights: number; minWeights: number; implausible: boolean};
  /** The suggestion against the current target (kcal, signed), or null; 0 means the target already fits. */
  changeKcal: number | null;
  /** The safety rails the suggestion keeps, for the card's words. */
  rails: {floorKcal: number; maxStepPercent: number}};
export function coachCheckIn(data: HealthData, coach: HealthCoach, today: string, unit: 'kg' | 'lb' = 'kg'): CoachCheckIn {
  const weekStart = weekStartOf(today), trend = weightTrend(data, today, 14), answered = coach.answers?.[weekStart]?.answer ?? null;
  const rate = trend.weeklyRate;
  const shown = rate === null ? null : unit === 'lb' ? `${(rate / 453.59237).toFixed(1)} lb` : `${(rate / 1000).toFixed(1)} kg`;
  const sign = rate === null ? '' : rate < 0 ? '−' : rate > 0 ? '+' : '';
  const sentence = rate === null ? (trend.readings ? 'Not enough readings yet for a weekly rate; two in the last week will do.' : 'Log a weight or two and the coach can read your week.') : `This week: ${sign}${shown!.replace('-', '')}/week.`;
  const estimate = energyEstimate(data, today), goal = data.targets.weightGrams, latest = trend.latestTrend;
  const paceKg = goal !== null && latest !== null ? (goal < latest ? -0.4 : goal > latest ? 0.25 : 0) : 0;
  const kcal = suggestedTarget(estimate, paceKg, data.targets.kcal);
  const maintenance = estimate.ready && estimate.expenditure !== null ? {kcal: estimate.expenditure, low: estimate.low ?? estimate.expenditure, high: estimate.high ?? estimate.expenditure} : null;
  return {weekStart, answered, rateGrams: rate, readings: trend.readings, sentence, suggestion: kcal !== null ? {kcal, paceKg} : null, currentKcal: data.targets.kcal,
    maintenance, progress: {loggedDays: estimate.loggedDays, minDays: ENERGY_MIN_LOGGED_DAYS, weights: estimate.weights, minWeights: ENERGY_MIN_WEIGHTS, implausible: !!estimate.implausible},
    changeKcal: kcal !== null && data.targets.kcal !== null ? kcal - data.targets.kcal : null, rails: {floorKcal: KCAL_FLOOR, maxStepPercent: Math.round(MAX_STEP * 100)}};
}
