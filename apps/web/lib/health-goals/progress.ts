import {dailyHealthSummary, weightTrend, type HealthData} from '../health';
import {dailyData, healthDay, waterSummary} from '../health-daily';
import {countOn, exerciseData} from '../health-counters';
import {addLocalDays} from '../local-date';
import {targetNumber, type HealthGoal} from './schema';
import {formatNumber} from '../visual-format';

const LB_GRAMS = 453.59237, FL_OZ_ML = 29.5735295625;
const number = (value: number, digits = 0) => formatNumber(value, {maximumFractionDigits: digits});
/** The calendar days a goal counts: a "by" goal from the day it was made to its date; a rolling goal the last N weeks ending today. */
export function windowDays(goal: Pick<HealthGoal, 'window' | 'createdAt'>, today: string, timezone: string | null): {start: string; end: string} {
  if (goal.window.kind === 'by') return {start: healthDay(timezone, new Date(goal.createdAt)), end: goal.window.date};
  return {start: addLocalDays(today, -(7 * goal.window.weeks) + 1), end: today};
}
const days = (start: string, end: string) => { const out: string[] = []; for (let date = start; date <= end; date = addLocalDays(date, 1)) out.push(date); return out; };
export type HealthGoalProgress = {kind: 'no-data'; detail?: string; ended?: string} | {kind: 'value'; current: number; target: number; unit: string; percent: number | null; days: number; done: boolean; detail: string; ended?: string};
/** Progress from the Health records only: nothing stored, nothing interpolated, unknown shown as "no data". */
export function healthGoalProgress(goal: HealthGoal, health: HealthData, today: string): HealthGoalProgress {
  const preferences = dailyData(health).preferences, {start, end} = windowDays(goal, today, preferences.timezone), through = end < today ? end : today, ended = end < today ? end : undefined;
  const target = targetNumber(goal), window = start <= through ? days(start, through) : [];
  if (goal.measure === 'weight') {
    const trend = weightTrend(health, through);
    if (trend.count === 0 || trend.averageGrams === null) return {kind: 'no-data', ended};
    const perUnit = goal.unit === 'lb' ? LB_GRAMS : 1000, current = Math.round(trend.averageGrams / perUnit * 100) / 100, targetGrams = Math.round(target * perUnit);
    const latest = trend.readings.at(-1)!;
    return {kind: 'value', current, target, unit: goal.unit, percent: null, days: trend.count, done: goal.direction === 'down' ? trend.averageGrams <= targetGrams : trend.averageGrams >= targetGrams,
      detail: `30-day average of ${trend.count} ${trend.count === 1 ? 'reading' : 'readings'} · latest ${number(latest.grams / perUnit, 2)} ${goal.unit} on ${latest.date}`, ended};
  }
  if (goal.measure === 'steps' || goal.measure === 'activeMinutes') {
    const recorded = window.filter(date => health.activity.some(a => a.date === date));
    if (!recorded.length) return {kind: 'no-data', ended};
    const totals = recorded.map(date => dailyHealthSummary(health, date));
    const steps = totals.reduce((sum, t) => sum + t.steps, 0), minutes = totals.reduce((sum, t) => sum + t.minutes, 0);
    const current = goal.measure === 'steps' ? Math.round(steps / recorded.length) : minutes;
    return {kind: 'value', current, target, unit: goal.unit, percent: Math.min(100, current / target * 100), days: recorded.length, done: current >= target, ended,
      detail: goal.measure === 'steps' ? `${recorded.length} ${recorded.length === 1 ? 'day' : 'days'} with activity recorded · ${number(steps)} steps in total` : `${recorded.length} ${recorded.length === 1 ? 'day' : 'days'} with activity recorded`};
  }
  if (goal.measure === 'water') {
    const summaries = window.map(date => waterSummary(health, date)), any = summaries.some(s => s.entries > 0);
    if (!any) return {kind: 'no-data', ended};
    const targetMl = preferences.waterTargetMl, current = summaries.filter(s => s.entries > 0 && (targetMl === null || s.millilitres >= targetMl)).length;
    return {kind: 'value', current, target, unit: goal.unit, percent: Math.min(100, current / target * 100), days: window.length, done: current >= target, ended, detail: `${current} of ${window.length} ${window.length === 1 ? 'day' : 'days'} so far`};
  }
  // exercise
  if (!goal.exerciseId || !exerciseData(health).counters.some(c => c.id === goal.exerciseId)) return {kind: 'no-data', detail: 'This counter was deleted.', ended};
  const counts = window.map(date => countOn(health, goal.exerciseId!, date)).filter((count): count is number => count !== null);
  if (!counts.length) return {kind: 'no-data', ended};
  const current = counts.reduce((sum, count) => sum + count, 0);
  return {kind: 'value', current, target, unit: goal.unit, percent: Math.min(100, current / target * 100), days: counts.length, done: current >= target, ended, detail: `${counts.length} ${counts.length === 1 ? 'day' : 'days'} counted · ${number(current)} reps in total`};
}
/** "7,475 of 8,000 steps", "72.4 towards 72 kg", "No data yet". */
export function healthGoalLine(goal: HealthGoal, progress: HealthGoalProgress): string {
  if (progress.kind === 'no-data') return 'No data yet';
  if (goal.measure === 'weight') return `${number(progress.current, 2)} towards ${number(progress.target, 2)} ${goal.unit}`;
  return `${number(progress.current)} of ${number(progress.target)} ${goal.unit}`;
}
/** A water target's millilitres, whatever unit Health shows water in. */
export const waterTargetMl = (value: number, unit: 'ml' | 'fl-oz-us') => unit === 'fl-oz-us' ? value * FL_OZ_ML : value;
