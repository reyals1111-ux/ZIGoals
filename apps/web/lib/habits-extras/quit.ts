import {addLocalDays} from '../local-date';
import type {Habit} from '../habits';
import type {QuitCost} from './schema';

/**
 * H3: "days since" for a quit habit. A slip is a day the person recorded an event (a logged count above zero on a
 * quit habit, or a day marked failed). The counter is the days since the last slip (since the habit's start when there
 * is none), the longest run is the longest stretch between slips, and "money saved" is the person's own cost per day
 * times the days since, labelled an estimate (ADR-022 B10). Dates are the habit's own calendar days.
 */
const dayCount = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
export type QuitSummary = {daysSince: number; since: string; longestRun: number; slips: string[]; lastSlip: string | null; moneySaved: number | null; cost: QuitCost | null};
export function quitSummary(habit: Habit, today: string, cost: QuitCost | null = null): QuitSummary {
  const slips = habit.entries.filter(e => e.date <= today && (e.disposition === 'failed' || (e.disposition === 'logged' && e.count > 0))).map(e => e.date).sort();
  const start = habit.startDate <= today ? habit.startDate : today;
  const lastSlip = slips.at(-1) ?? null;
  const since = lastSlip ? addLocalDays(lastSlip, 1) : start;
  const daysSince = Math.max(0, dayCount(since, today) + 1);
  // Runs: start → first slip, between slips, last slip → today (today counts as a day on track unless it is a slip).
  let longestRun = 0, previous = start;
  for (const slip of slips) { longestRun = Math.max(longestRun, Math.max(0, dayCount(previous, slip))); previous = addLocalDays(slip, 1); }
  longestRun = Math.max(longestRun, daysSince);
  const moneySaved = cost ? Math.round(cost.perDay * daysSince * 100) / 100 : null;
  return {daysSince, since, longestRun, slips, lastSlip, moneySaved, cost};
}
/** The slip calendar for one month: every date of the month with whether it was a slip, before the start, or ahead. */
export function slipMonth(summary: QuitSummary, habit: Habit, month: string, today: string): {date: string; state: 'slip' | 'clean' | 'before' | 'ahead'}[] {
  const slips = new Set(summary.slips), first = `${month}-01`;
  const out: {date: string; state: 'slip' | 'clean' | 'before' | 'ahead'}[] = [];
  for (let i = 0; i < 31; i++) { const date = addLocalDays(first, i); if (!date.startsWith(month)) break; out.push({date, state: date > today ? 'ahead' : date < habit.startDate ? 'before' : slips.has(date) ? 'slip' : 'clean'}); }
  return out;
}
