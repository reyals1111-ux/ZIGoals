import {addLocalDays} from '../local-date';
import type {HealthData} from '../health';
import {dailyHealthSummary} from '../health';
import {weightTrend} from './trend';

/**
 * N1: an adaptive estimate of daily energy expenditure (the MacroFactor idea): over a rolling window, the mean logged
 * intake minus the energy the trend weight change accounts for (7,700 kcal per kilogram), so a person who ate 2,200 a
 * day and lost 0.3 kg a week expends about 2,530. It needs about two weeks of logs (14 logged days and 6 readings)
 * before it shows, carries a confidence band from the day-to-day spread of intake, and is always labelled an estimate,
 * never medical advice. Unknown is never zero: a day without a diary entry is left out, not counted as fasting.
 */
export const KCAL_PER_KG = 7700, ENERGY_WINDOW_DAYS = 28, ENERGY_MIN_LOGGED_DAYS = 14, ENERGY_MIN_WEIGHTS = 6;
export type EnergyEstimate = {ready: boolean; /** The logs read as incomplete (HE2). */ implausible?: boolean; loggedDays: number; weights: number; expenditure: number | null; low: number | null; high: number | null; meanIntake: number | null; weeklyChangeGrams: number | null; windowDays: number};
export function energyEstimate(data: HealthData, today: string): EnergyEstimate {
  const first = addLocalDays(today, -(ENERGY_WINDOW_DAYS - 1));
  const intakes: number[] = [];
  for (let i = 0; i < ENERGY_WINDOW_DAYS; i++) { const date = addLocalDays(first, i); const s = dailyHealthSummary(data, date); if (s.entries > 0 && s.nutrients.kcal !== null) intakes.push(s.nutrients.kcal); }
  const weights = data.weights.filter(w => w.date >= first && w.date <= today).length;
  const trend = weightTrend(data, today, ENERGY_WINDOW_DAYS);
  const ready = intakes.length >= ENERGY_MIN_LOGGED_DAYS && weights >= ENERGY_MIN_WEIGHTS && trend.points[0]!.trend !== null && trend.latestTrend !== null;
  if (!ready) return {ready: false, loggedDays: intakes.length, weights, expenditure: null, low: null, high: null, meanIntake: null, weeklyChangeGrams: null, windowDays: ENERGY_WINDOW_DAYS};
  const mean = intakes.reduce((a, b) => a + b, 0) / intakes.length;
  const changeGrams = trend.latestTrend! - trend.points[0]!.trend!;
  // Session AH (HE2, B-088, N-035): no advice from logs that cannot be a person's real month — an average intake outside
  // 800–6,000 kcal or a trend faster than 1.5 kg a week reads as incomplete, not as an estimate.
  if (mean < 800 || mean > 6000 || Math.abs(changeGrams / ENERGY_WINDOW_DAYS * 7) > 1500) return {ready: false, implausible: true, loggedDays: intakes.length, weights, expenditure: null, low: null, high: null, meanIntake: null, weeklyChangeGrams: null, windowDays: ENERGY_WINDOW_DAYS};
  const perDayFromWeight = (changeGrams / 1000) * KCAL_PER_KG / ENERGY_WINDOW_DAYS;
  const expenditure = Math.round(mean - perDayFromWeight);
  const sd = Math.sqrt(intakes.reduce((a, b) => a + (b - mean) ** 2, 0) / intakes.length), se = sd / Math.sqrt(intakes.length);
  const band = Math.round(Math.max(50, 2 * se));
  return {ready: true, loggedDays: intakes.length, weights, expenditure, low: expenditure - band, high: expenditure + band, meanIntake: Math.round(mean), weeklyChangeGrams: Math.round(changeGrams / ENERGY_WINDOW_DAYS * 7), windowDays: ENERGY_WINDOW_DAYS};
}
/** What a calorie target becomes for a chosen weekly change (kg/week, negative to lose), from the estimate; the person confirms before anything is written. */
export function suggestedTarget(estimate: EnergyEstimate, weeklyChangeKg: number, current?: number | null): number | null {
  if (!estimate.ready || estimate.expenditure === null) return null;
  const raw = Math.max(KCAL_FLOOR, Math.round((estimate.expenditure + weeklyChangeKg * KCAL_PER_KG / 7) / 10) * 10);
  // Session AH (HE2, D-094, L-046): one step at a time — at most 15 % from the current target, never under the floor.
  if (!current) return raw;
  const step = Math.round(current * MAX_STEP / 10) * 10;
  return Math.max(KCAL_FLOOR, Math.min(current + step, Math.max(current - step, raw)));
}
export const KCAL_FLOOR = 1200, MAX_STEP = 0.15;
/** A new calorie target with the macro targets scaled by the same factor (protein, carbs and fat keep their shares). */
export function scaledTargets<T extends {kcal: number | null; proteinMg: number | null; carbsMg: number | null; fatMg: number | null}>(targets: T, kcal: number): T {
  const f = targets.kcal ? kcal / targets.kcal : null, scale = (v: number | null) => v === null || f === null ? v : Math.max(1, Math.round(v * f));
  return {...targets, kcal, proteinMg: scale(targets.proteinMg), carbsMg: scale(targets.carbsMg), fatMg: scale(targets.fatMg)};
}
