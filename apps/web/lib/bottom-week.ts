/**
 * The week summaries of lib/bottom-insights.ts that Today's week grid, Habits' rhythm and the weekly review use (UI design
 * pass, Part 8): real records only, a day without a record is null or zero counts, never a projection. In their own module
 * (CI13, weights) so those pages do not load Health's sleep engine or Wealth's composition with them. lib/bottom-insights.ts
 * re-exports everything here.
 */
import {addLocalDays,localDate} from './local-date';
import {habitRuleOn,habitStats,type HabitData} from './habits';
import type {HealthData} from './health';
import {dailyData} from './health-daily';
import {exerciseData} from './health-counters';
import type {Platform} from './positions';
import {checkInsOn} from './numbers/habit-counts';

export const lastDays = (today: string, n = 7) => Array.from({length: n}, (_, i) => addLocalDays(today, i - (n - 1)));
const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Today: the last 7 days across Goals, Habits and Health, as counts of records saved on those days. */
export function weekAcross({today, habits, health, platform}: {today: string; habits: HabitData; health: HealthData; platform: Platform}) {
  const exercise = exerciseData(health).days;
  return lastDays(today).map(date => ({
    date,
    // Session AH (TR6): the shared check-in count (lib/numbers/counts.ts, ./numbers/habit-counts.ts): a scheduled day completed, once per habit.
    habitCheckins: checkInsOn(habits.habits, date, today),
    // Session AC (persona #13, "2 Health entries for 3 logged"): a weight is a Health entry too.
    healthRecords: health.diary.filter(e => e.date === date).length + dailyData(health).water.filter(w => w.date === date).length + health.weights.filter(w => w.date === date).length + health.activity.filter(a => a.date === date).length + exercise.filter(d => d.date === date).length,
    goalContributions: platform.contributions.filter(c => localDate(new Date(c.occurredAt)) === date).length,
  }));
}

/** Habits: check-ins by weekday over the last 4 weeks, and the three best streaks (each in its own period). */
export function habitRhythm(habits: HabitData, today: string) {
  const days = lastDays(today, 28), byWeekday = WEEKDAYS.map(() => 0);
  for (const date of days) {
    const count = checkInsOn(habits.habits, date, today);
    byWeekday[(weekday(date) + 6) % 7]! += count;
  }
  const streaks = habits.habits.filter(h => habitRuleOn(h, today)?.state !== 'archived').map(h => ({title: h.title, ...habitStats(h, today)}))
    .filter(s => s.bestStreak > 0).sort((a, b) => b.bestStreak - a.bestStreak || a.title.localeCompare(b.title)).slice(0, 3)
    .map(s => ({title: s.title, best: s.bestStreak, current: s.currentStreak, unit: s.streakUnit}));
  return {byWeekday: WEEKDAYS.map((label, i) => ({label, checkins: byWeekday[i]!})), total: byWeekday.reduce((a, b) => a + b, 0), streaks};
}

/**
 * Session AI (B3: the week grid's P&L row): the day-to-day change of tracked wealth in one currency (the one with the most
 * history), from Wealth's own recorded history: each day's last value minus the day before's. A day without a value on or
 * before it is null, never zero; nothing is converted.
 */
export function weekWealthChange(history: readonly {currency: string; points: readonly {at: string; value: string}[]}[], days: readonly string[]): {currency: string; changes: (number | null)[]} | null {
  const main = [...history].sort((a, b) => b.points.length - a.points.length)[0];
  if (!main || main.points.length < 2) return null;
  const sorted = [...main.points].sort((a, b) => a.at.localeCompare(b.at));
  const valueOn = (day: string) => { let v: number | null = null; for (const p of sorted) { if (p.at.slice(0, 10) <= day) v = Number(p.value) / 100; /* minor units, two decimals */ else break; } return v; };
  const changes = days.map(day => { const now = valueOn(day), before = valueOn(addLocalDays(day, -1)); return now === null || before === null ? null : Math.round((now - before) * 100) / 100; });
  return changes.some(c => c !== null) ? {currency: main.currency, changes} : null;
}
