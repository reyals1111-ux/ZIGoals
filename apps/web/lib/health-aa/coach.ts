import {addLocalDays, localWeekday} from '../local-date';
import type {HealthData} from '../health';
import {weightTrend} from './trend';
import {energyEstimate, suggestedTarget} from './energy';
import type {HealthCoach} from './coach-schema';

/**
 * N3: the weekly coach check-in: "This week: −0.4 kg/week; keep your target, or adjust?" from the trend's weekly rate,
 * with keep/adjust. The adjust suggestion comes from the energy estimate when it is ready (the person's chosen pace),
 * else from the current target. Plain words, an estimate, never medical advice; answered once per week on this device.
 */
export const weekStartOf = (day: string) => addLocalDays(day, -((localWeekday(day) + 6) % 7));
export type CoachCheckIn = {weekStart: string; answered: 'keep' | 'adjust' | null; rateGrams: number | null; readings: number; sentence: string; suggestion: {kcal: number; paceKg: number} | null; currentKcal: number | null};
export function coachCheckIn(data: HealthData, coach: HealthCoach, today: string, unit: 'kg' | 'lb' = 'kg'): CoachCheckIn {
  const weekStart = weekStartOf(today), trend = weightTrend(data, today, 14), answered = coach.answers?.[weekStart]?.answer ?? null;
  const rate = trend.weeklyRate;
  const shown = rate === null ? null : unit === 'lb' ? `${(rate / 453.59237).toFixed(1)} lb` : `${(rate / 1000).toFixed(1)} kg`;
  const sign = rate === null ? '' : rate < 0 ? '−' : rate > 0 ? '+' : '';
  const sentence = rate === null ? (trend.readings ? 'Not enough readings yet for a weekly rate; two in the last week will do.' : 'Log a weight or two and the coach can read your week.') : `This week: ${sign}${shown!.replace('-', '')}/week.`;
  const estimate = energyEstimate(data, today), goal = data.targets.weightGrams, latest = trend.latestTrend;
  const paceKg = goal !== null && latest !== null ? (goal < latest ? -0.4 : goal > latest ? 0.25 : 0) : 0;
  const kcal = suggestedTarget(estimate, paceKg);
  return {weekStart, answered, rateGrams: rate, readings: trend.readings, sentence, suggestion: kcal !== null ? {kcal, paceKg} : null, currentKcal: data.targets.kcal};
}
