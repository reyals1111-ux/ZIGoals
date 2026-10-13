import {addLocalDays, localWeekday} from '../local-date';
import {habitDay, habitRuleOn, type Habit, type HabitDayStatus} from '../habits';

/**
 * H8: a full-year grid per habit (53 columns of 7 days, Monday first, like the month calendar) and an all-habits
 * overview (the share of scheduled habits completed per day). Every cell carries its status so the grid can be read by a
 * screen reader through the row summaries; nothing is invented for days before a habit started or after today.
 */
export type YearCell = {date: string; status: HabitDayStatus | 'outside'; inYear: boolean};
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
/** The 53×7 grid for a year: columns are weeks starting on the Monday on or before 1 January. */
export function yearWeeks(year: number): string[][] {
  const first = `${year}-01-01`, start = addLocalDays(first, -((localWeekday(first) + 6) % 7));
  const weeks: string[][] = [];
  for (let w = 0; w < 54; w++) {
    const week = Array.from({length: 7}, (_, d) => addLocalDays(start, w * 7 + d));
    if (week[0]! > `${year}-12-31`) break;
    weeks.push(week);
  }
  return weeks;
}
/** The month label positions: the week index where each month's first day falls. */
export function monthStarts(weeks: readonly string[][], year: number): {label: string; week: number}[] {
  return MONTHS.map((label, m) => { const first = `${year}-${String(m + 1).padStart(2, '0')}-01`; return {label, week: weeks.findIndex(w => w.some(d => d === first))}; }).filter(x => x.week >= 0);
}
export type HabitYear = {weeks: YearCell[][]; counts: Record<'complete' | 'partial' | 'skipped' | 'failed' | 'scheduled', number>; summary: string};
export function habitYear(habit: Habit, year: number, today: string): HabitYear {
  const counts = {complete: 0, partial: 0, skipped: 0, failed: 0, scheduled: 0};
  const weeks = yearWeeks(year).map(week => week.map(date => {
    const inYear = date.startsWith(String(year));
    if (!inYear || date > today || date < habit.startDate) return {date, status: 'outside' as const, inYear};
    const day = habitDay(habit, date, today);
    if (day.scheduled) counts.scheduled++;
    if (day.status === 'complete') counts.complete++; else if (day.status === 'partial') counts.partial++; else if (day.status === 'skipped' || day.status === 'planned-skip') counts.skipped++; else if (day.status === 'failed') counts.failed++;
    return {date, status: day.status, inYear};
  }));
  const summary = counts.scheduled ? `${habit.title}, ${year}: ${counts.complete} of ${counts.scheduled} scheduled days complete, ${counts.partial} partial, ${counts.skipped} skipped, ${counts.failed} missed.` : `${habit.title}, ${year}: no scheduled days yet.`;
  return {weeks, counts, summary};
}
export type OverviewCell = {date: string; share: number | null; done: number; due: number; inYear: boolean};
export type OverviewYear = {weeks: OverviewCell[][]; days: number; fullDays: number; summary: string};
/** Every habit at once: the share of scheduled, active habits completed each day (null when none was scheduled). */
export function overviewYear(habits: readonly Habit[], year: number, today: string): OverviewYear {
  const active = habits.filter(h => habitRuleOn(h, today)?.state !== 'archived');
  let days = 0, fullDays = 0;
  const weeks = yearWeeks(year).map(week => week.map(date => {
    const inYear = date.startsWith(String(year));
    if (!inYear || date > today) return {date, share: null, done: 0, due: 0, inYear};
    let done = 0, due = 0;
    for (const h of active) { if (date < h.startDate) continue; const day = habitDay(h, date, today); if (day.scheduled) { due++; if (day.status === 'complete') done++; } }
    if (due) { days++; if (done === due) fullDays++; }
    return {date, share: due ? done / due : null, done, due, inYear};
  }));
  return {weeks, days, fullDays, summary: days ? `${year}: ${fullDays} of ${days} days with every scheduled habit complete.` : `${year}: nothing scheduled yet.`};
}
