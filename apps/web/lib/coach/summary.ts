import {addLocalDays} from '../local-date';
import {habitDay, type HabitData} from '../habits';
import type {HealthData} from '../health';
import {waterSummary} from '../health-daily';
import {measurementHistory} from '../body-measurements';
import type {Platform} from '../positions';
import {revisionInstallments} from '../plan-revisions';
import type {WeeklyReview} from '../weekly-review/schema';
import {SUMMARY_COPY} from './copy';

/**
 * The Guide's paragraph for the weekly review's last step (ADR-011 "Weekly review summary"): counts from the same
 * engines the review uses, each written out, zero included. Nothing is scored, compared or advised.
 */
export type SummaryCounts = {done: number; scheduled: number; waterDays: number; weights: number; recorded: number; planned: number; lastIntention: string | null};
const dayList = (from: string, to: string) => { const out: string[] = []; for (let date = from; date <= to; date = addLocalDays(date, 1)) out.push(date); return out; };
export function summaryCounts({weekStart, weekEnd, habits, health, platform, financial, review, now}: {weekStart: string; weekEnd: string; habits: HabitData; health: HealthData; platform: Platform; financial: boolean; review: WeeklyReview; now: number}): SummaryCounts {
  const days = dayList(weekStart, weekEnd);
  let done = 0, scheduled = 0;
  for (const habit of habits.habits) for (const date of days) { const day = habitDay(habit, date, weekEnd); if (!day.scheduled) continue; scheduled++; if (day.status === 'complete') done++; }
  const waterDays = days.filter(date => waterSummary(health, date).entries > 0).length;
  const timed = measurementHistory(health, 'weight').readings.filter(r => { const day = r.observedAt.slice(0, 10); return day >= weekStart && day <= weekEnd; }).length;
  const weights = health.weights.filter(w => w.date >= weekStart && w.date <= weekEnd).length + timed;
  let planned = 0, recorded = 0;
  if (financial) for (const goal of platform.goals) {
    if (!goal.planRevisions?.length) continue;
    try { for (const installment of revisionInstallments(goal, weekStart, weekEnd, platform.contributions, now)) { planned++; if (installment.credited !== '0') recorded++; } } catch { /* a revision in another unit: not counted */ }
  }
  const previous = [...review.reviews].filter(r => r.completedAt && r.weekStart < weekStart && r.notes?.intention).sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
  return {done, scheduled, waterDays, weights, recorded, planned, lastIntention: previous?.notes?.intention ?? null};
}
/** The paragraph: "This week: … habit days done, …, … weights recorded[, … planned contributions recorded]. [Last week you wrote: '…'.]" */
export function summaryParagraph(counts: SummaryCounts, financial: boolean): string {
  const clauses = [SUMMARY_COPY.habitDays(counts.done, counts.scheduled), SUMMARY_COPY.waterDays(counts.waterDays), SUMMARY_COPY.weights(counts.weights), ...(financial ? [SUMMARY_COPY.contributions(counts.recorded, counts.planned)] : [])];
  const sentence = `${SUMMARY_COPY.lead} ${clauses.join(', ')}.`;
  return counts.lastIntention ? `${sentence} ${SUMMARY_COPY.intention(counts.lastIntention)}` : sentence;
}
export function guideWeekSummary(input: Parameters<typeof summaryCounts>[0]): string { return summaryParagraph(summaryCounts(input), input.financial); }
