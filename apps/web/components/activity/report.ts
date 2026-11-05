/**
 * Session AL third pass (L4; competitor rows GAP-124 / P-DVG-13, GAP-122 / P-DVG-11, GAP-125 / P-DVG-14): Activity's own
 * report, read from the rows Activity already lists and the habits' own day results. Nothing is stored and nothing is
 * estimated: a count is of records, a streak is of days that have a record.
 * - Reports by week, month, year and all time, with habits ranked by their current streak (Strides-style reports).
 * - A streak of "goal days" (a day with at least one goal step) and the last 12 weeks of goal steps (Todoist-style).
 * - Perfect weeks: finished weeks in which no due habit check-in was missed, overall and by habit category (Griply-style).
 */
import {addDays} from '../../lib/zone-time';
import {habitDay, habitStats, latestHabitRule, type Habit} from '../../lib/habits';

export type Period = 'week' | 'month' | 'year' | 'all';
export const PERIODS: readonly {id: Period; label: string}[] = [{id: 'week', label: 'This week'}, {id: 'month', label: 'This month'}, {id: 'year', label: 'This year'}, {id: 'all', label: 'All time'}];
export type ReportRow = {category: string; dayKey: string};

/** Monday of the week that holds `day` (YYYY-MM-DD). */
export function weekStart(day: string): string {
 const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
 return addDays(day, -((weekday + 6) % 7));
}
/** The first day a period covers ('' for all time). */
export function periodStart(period: Period, today: string): string {
 return period === 'week' ? weekStart(today) : period === 'month' ? `${today.slice(0, 7)}-01` : period === 'year' ? `${today.slice(0, 4)}-01-01` : '';
}
/** How many rows of each category fall in the period, up to today. */
export function periodCounts(rows: readonly ReportRow[], period: Period, today: string): Record<string, number> {
 const from = periodStart(period, today), out: Record<string, number> = {};
 for (const r of rows) if (r.dayKey >= from && r.dayKey <= today) out[r.category] = (out[r.category] ?? 0) + 1;
 return out;
}
/**
 * Days in a row with a record, ending today, or yesterday while today has none yet (a streak is not broken before the
 * day is over). 0 when neither has one.
 */
export function dayStreak(days: ReadonlySet<string>, today: string): number {
 let day = days.has(today) ? today : addDays(today, -1), n = 0;
 while (days.has(day) && n < 10000) { n++; day = addDays(day, -1); }
 return n;
}
/** Rows per week for the last `weeks` weeks, oldest first; the last is the week that holds today (so far). */
export function weeklyCounts(dayKeys: readonly string[], today: string, weeks = 12): {weekStart: string; count: number}[] {
 const last = weekStart(today), out = Array.from({length: weeks}, (_, i) => ({weekStart: addDays(last, -7 * (weeks - 1 - i)), count: 0}));
 const index = new Map(out.map((w, i) => [w.weekStart, i]));
 for (const d of dayKeys) { if (d > today) continue; const i = index.get(weekStart(d)); if (i !== undefined) out[i]!.count++; }
 return out;
}
/** Active habits ranked by their current streak (longest first), with its unit ("days", "weeks"…); a 0 streak is left out. */
export function habitsByStreak(habits: readonly Habit[], today: string, top = 5): {id: string; title: string; streak: number; unit: string}[] {
 return habits.filter(h => latestHabitRule(h).state === 'active').map(h => { const s = habitStats(h, today); return {id: h.id, title: h.title, streak: s.currentStreak, unit: s.streakUnit}; })
  .filter(h => h.streak > 0).sort((a, b) => b.streak - a.streak || a.title.localeCompare(b.title)).slice(0, top);
}
/** Whether a habit missed no due day in [from, to]: undefined when nothing was due (that week says nothing about it). */
function cleanWeek(h: Habit, from: string, to: string, today: string): boolean | undefined {
 let due = false;
 for (let d = from; d <= to; d = addDays(d, 1)) {
  const day = habitDay(h, d, today);
  if (!day.scheduled) continue;
  if (day.status === 'skipped') continue; // a skipped day is neutral, as everywhere in Habits
  due = true;
  if (day.status !== 'complete') return false;
 }
 return due ? true : undefined;
}
/**
 * Perfect weeks among the last `weeks` finished weeks (Monday to Sunday, before this week): every habit with a due day
 * that week checked in on each one. Overall and per habit category (a category's week is perfect when its own habits were).
 */
export function perfectWeeks(habits: readonly Habit[], today: string, weeks = 12): {total: number; weeks: number; byCategory: {category: string; perfect: number}[]} {
 const current = weekStart(today);
 const byCategory = new Map<string, number>();
 let total = 0;
 for (let i = 1; i <= weeks; i++) {
  const from = addDays(current, -7 * i), to = addDays(from, 6);
  const results = habits.map(h => ({h, clean: cleanWeek(h, from, to, today)})).filter(r => r.clean !== undefined);
  if (results.length && results.every(r => r.clean)) total++;
  for (const category of new Set(results.map(r => r.h.category))) {
   const mine = results.filter(r => r.h.category === category);
   if (mine.every(r => r.clean)) byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
   else if (!byCategory.has(category)) byCategory.set(category, 0);
  }
 }
 return {total, weeks, byCategory: [...byCategory].map(([category, perfect]) => ({category, perfect})).sort((a, b) => b.perfect - a.perfect || a.category.localeCompare(b.category))};
}
