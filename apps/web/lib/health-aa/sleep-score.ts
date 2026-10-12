import {consistency, dailySeries, sleepDebt} from '../sleep/engine';
import type {Sleep} from '../sleep/schema';

/**
 * N10: a transparent sleep score out of 100 for the last seven nights, with the formula on the card:
 *   duration 50 · min(1, average asleep ÷ goal) + consistency 30 · max(0, 1 − bedtime spread ÷ 90 min) + debt 20 · max(0, 1 − debt ÷ (goal × 2)).
 * Nights without a log are left out (never zeros); with fewer than three nights there is no score, only the count.
 */
export type SleepScore = {score: number | null; nights: number; duration: {points: number; averageMinutes: number | null; goalMinutes: number}; consistency: {points: number; spreadMinutes: number | null}; debt: {points: number; minutes: number | null}; formula: string};
export const SLEEP_SCORE_FORMULA = 'duration 50 × min(1, asleep ÷ goal) + consistency 30 × (1 − bedtime spread ÷ 90 min) + debt 20 × (1 − debt ÷ two nights of goal)';
export function sleepScore(s: Sleep, today: string): SleepScore {
  const goal = s.goal?.minutes ?? 480;
  const points = dailySeries(s, today, 7).filter(p => p.asleep !== null);
  const nights = points.length;
  if (nights < 3) return {score: null, nights, duration: {points: 0, averageMinutes: null, goalMinutes: goal}, consistency: {points: 0, spreadMinutes: null}, debt: {points: 0, minutes: null}, formula: SLEEP_SCORE_FORMULA};
  const average = points.reduce((a, p) => a + p.asleep!, 0) / nights;
  const durationPoints = 50 * Math.min(1, average / goal);
  const c = consistency(s, today), spread = c?.minutes ?? null;
  const consistencyPoints = spread === null ? 15 : 30 * Math.max(0, 1 - spread / 90);
  const d = sleepDebt(s, today), debtMinutes = d?.minutes ?? null;
  const debtPoints = debtMinutes === null ? 10 : 20 * Math.max(0, 1 - Math.max(0, debtMinutes) / (goal * 2));
  return {score: Math.round(durationPoints + consistencyPoints + debtPoints), nights, duration: {points: Math.round(durationPoints), averageMinutes: Math.round(average), goalMinutes: goal}, consistency: {points: Math.round(consistencyPoints), spreadMinutes: spread}, debt: {points: Math.round(debtPoints), minutes: debtMinutes}, formula: SLEEP_SCORE_FORMULA};
}
