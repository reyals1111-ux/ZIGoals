import {addLocalDays, localWeekday} from '../local-date';
import {habitDay, habitStats, type HabitData} from '../habits';
import {dailyHealthSummary, type HealthData} from '../health';
import {waterSummary} from '../health-daily';
import {latestWeightObservation} from '../body-measurements';
import {weekAcross} from '../bottom-insights';
import type {Platform} from '../positions';
import type {MarketQuote} from '../market-quotes';
import {wealthOverview} from '../wealth';
import {unifiedGoalSummaries, type GoalSummary} from '../goal-summary';
import type {LocalGoal} from '../local-ledger';
import type {GoalMetadata} from '@zigoals/shared-types';
import type {WeeklyReview} from './schema';

/** The week a review looks back on: the most recent chosen weekday on or before today, and the six days before it. */
export function reviewWindow(weekday: number, today: string): {reviewDay: string; weekStart: string; weekEnd: string} {
  const back = (localWeekday(today) - weekday + 7) % 7, reviewDay = addLocalDays(today, -back);
  return {reviewDay, weekStart: addLocalDays(reviewDay, -6), weekEnd: reviewDay};
}
export type ReviewState = 'due' | 'draft' | 'done' | 'skipped';
/** Whether the current review is still open: due (untouched), a draft (words saved), done or skipped. */
export function reviewState(data: WeeklyReview, weekStart: string): ReviewState {
  const review = data.reviews.find(r => r.weekStart === weekStart);
  if (!review) return 'due';
  if (review.completedAt) return 'done';
  if (review.skipped) return 'skipped';
  return 'draft';
}
export type WeekSummary = {
  wentWell: {habitCheckIns: number; healthEntries: number; goalContributions: number; bestDay: string | null};
  goals: {name: string; fundingHealth: string; nextContributionDate: string | null; progress: string}[];
  habits: {title: string; done: number; scheduled: number; skipped: number; streak: number; unit: string}[];
  health: string[];
  wealth: {subtotals: {currency: string; value: bigint}[]; attention: number; contributions: number} | null;
  lastIntention: string | null;
};
const dayList = (from: string, to: string) => { const out: string[] = []; for (let date = from; date <= to; date = addLocalDays(date, 1)) out.push(date); return out; };
const stamp = (at: string) => new Date(at).toISOString().slice(0, 10);
/**
 * Read-only figures for the six steps, from the existing engines: counts and totals of the person's own records in the
 * seven days, each journal by its stored day strings. Nothing is scored, nothing is invented.
 */
export function weekSummary({weekStart, weekEnd, habits, health, platform, localGoals = [], metadata = {}, quotes = [], now, financial, review}: {
  weekStart: string; weekEnd: string; habits: HabitData; health: HealthData; platform: Platform; localGoals?: readonly LocalGoal[]; metadata?: Record<string, GoalMetadata>; quotes?: readonly MarketQuote[]; now: number; financial: boolean; review: WeeklyReview;
}): WeekSummary {
  const days = dayList(weekStart, weekEnd), across = weekAcross({today: weekEnd, habits, health, platform}).filter(d => days.includes(d.date));
  const totals = across.reduce((sum, d) => ({habitCheckIns: sum.habitCheckIns + d.habitCheckins, healthEntries: sum.healthEntries + d.healthRecords, goalContributions: sum.goalContributions + d.goalContributions}), {habitCheckIns: 0, healthEntries: 0, goalContributions: 0});
  const busiest = across.reduce<{date: string; records: number} | null>((best, d) => { const records = d.habitCheckins + d.healthRecords + d.goalContributions; return records > 0 && (!best || records > best.records) ? {date: d.date, records} : best; }, null);
  const summaries: GoalSummary[] = unifiedGoalSummaries(localGoals, metadata, platform, quotes, now);
  const goals = summaries.filter(g => g.status === 'active').map(g => ({name: g.name, fundingHealth: g.fundingHealth, nextContributionDate: g.nextContributionDate ?? null, progress: `${g.progressPct}%`}));
  const habitLines = habits.habits.map(habit => {
    const results = days.map(date => habitDay(habit, date, weekEnd)).filter(r => r.scheduled);
    if (!results.length) return null;
    const stats = habitStats(habit, weekEnd);
    return {title: habit.title, done: results.filter(r => r.status === 'complete').length, scheduled: results.length, skipped: results.filter(r => r.status === 'skipped').length, streak: stats.currentStreak, unit: stats.streakUnit};
  }).filter((line): line is NonNullable<typeof line> => line !== null);
  const healthLines: string[] = [];
  const meals = days.filter(date => health.diary.some(e => e.date === date)).length;
  if (meals) healthLines.push(`${meals} ${meals === 1 ? 'day' : 'days'} with meals logged`);
  const active = days.filter(date => health.activity.some(a => a.date === date)).map(date => dailyHealthSummary(health, date));
  if (active.length) healthLines.push(`${active.reduce((n, d) => n + d.steps, 0).toLocaleString('en-US')} steps · ${active.reduce((n, d) => n + d.minutes, 0).toLocaleString('en-US')} min movement`);
  const water = days.filter(date => waterSummary(health, date).entries > 0).length;
  if (water) healthLines.push(`${water} ${water === 1 ? 'day' : 'days'} with water`);
  const weight = latestWeightObservation(health, weekEnd);
  if (weight && weight.date >= weekStart) healthLines.push(`latest weight ${(weight.grams / 1000).toLocaleString('en-US', {maximumFractionDigits: 2})} kg on ${weight.date}`);
  let wealth: WeekSummary['wealth'] = null;
  if (financial) {
    const overview = wealthOverview(platform, now, quotes);
    wealth = {subtotals: overview.subtotals.map(s => ({currency: s.currency, value: s.value})), attention: overview.rows.filter(r => r.value === undefined).length, contributions: platform.contributions.filter(c => { const day = stamp(c.occurredAt); return day >= weekStart && day <= weekEnd; }).length};
  }
  const previous = [...review.reviews].filter(r => r.completedAt && r.weekStart < weekStart && r.notes?.intention).sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
  return {wentWell: {...totals, bestDay: busiest?.date ?? null}, goals, habits: habitLines, health: healthLines, wealth, lastIntention: previous?.notes?.intention ?? null};
}
