/**
 * Summaries for the sections at the bottom of each page (UI design pass, Part 8). Real records only, no
 * projections or advice. A day without a record is null ("no entry"), never zero; units and currencies
 * stay separate.
 */
import {addLocalDays,localDate} from './local-date';
import {habitRuleOn,habitStats,type HabitData} from './habits';
import {dailyHealthSummary,type HealthData} from './health';
import {dailyData,waterSummary} from './health-daily';
import {exerciseData} from './health-counters';
import {splitWealthTotals} from './wealth-total';
import type {Platform} from './positions';
import type {GoalSummary} from './goal-summary';
import type {wealthOverview} from './wealth';

export const lastDays = (today: string, n = 7) => Array.from({length: n}, (_, i) => addLocalDays(today, i - (n - 1)));
const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Today: the last 7 days across Goals, Habits and Health, as counts of records saved on those days. */
export function weekAcross({today, habits, health, platform}: {today: string; habits: HabitData; health: HealthData; platform: Platform}) {
  const exercise = exerciseData(health).days;
  return lastDays(today).map(date => ({
    date,
    habitCheckins: habits.habits.reduce((n, h) => n + h.entries.filter(e => e.date === date && e.disposition === 'logged').length, 0),
    healthRecords: health.diary.filter(e => e.date === date).length + dailyData(health).water.filter(w => w.date === date).length + health.activity.filter(a => a.date === date).length + exercise.filter(d => d.date === date).length,
    goalContributions: platform.contributions.filter(c => localDate(new Date(c.occurredAt)) === date).length,
  }));
}

/** Habits: check-ins by weekday over the last 4 weeks, and the three best streaks (each in its own period). */
export function habitRhythm(habits: HabitData, today: string) {
  const days = lastDays(today, 28), byWeekday = WEEKDAYS.map(() => 0);
  for (const date of days) {
    const count = habits.habits.reduce((n, h) => n + h.entries.filter(e => e.date === date && e.disposition === 'logged').length, 0);
    byWeekday[(weekday(date) + 6) % 7]! += count;
  }
  const streaks = habits.habits.filter(h => habitRuleOn(h, today)?.state !== 'archived').map(h => ({title: h.title, ...habitStats(h, today)}))
    .filter(s => s.bestStreak > 0).sort((a, b) => b.bestStreak - a.bestStreak || a.title.localeCompare(b.title)).slice(0, 3)
    .map(s => ({title: s.title, best: s.bestStreak, current: s.currentStreak, unit: s.streakUnit}));
  return {byWeekday: WEEKDAYS.map((label, i) => ({label, checkins: byWeekday[i]!})), total: byWeekday.reduce((a, b) => a + b, 0), streaks};
}

/** Health: 7 days of calories, water and exercise counters; each value is null when that day has no entry. */
export function healthWeek(health: HealthData, today: string) {
  const counters = exerciseData(health);
  return lastDays(today).map(date => {
    const food = dailyHealthSummary(health, date), water = waterSummary(health, date);
    return {
      date,
      kcal: food.entries && food.nutrients.kcal !== null ? food.nutrients.kcal : null,
      kcalPartial: food.entries > 0 && food.nutrients.kcal === null,
      waterMl: water.entries ? water.millilitres : null,
      exercise: counters.counters.map(c => ({name: c.name, count: counters.days.find(d => d.counterId === c.id && d.date === date)?.count ?? null})),
    };
  });
}

/** Goals: active Goals with a saved target date, soonest first; how many have none. */
export function goalTimeline(goals: readonly GoalSummary[], today: string) {
  const active = goals.filter(g => g.status === 'active');
  const dated = active.filter(g => g.targetDate).sort((a, b) => a.targetDate!.localeCompare(b.targetDate!) || a.name.localeCompare(b.name));
  return {dated: dated.map(g => ({key: g.key, name: g.name, href: g.href, targetDate: g.targetDate!, progressPct: g.progressPct, past: g.targetDate! < today})), undated: active.length - dated.length};
}

/** Wealth: how the known value of the headline currency is spread across asset classes, and valuation coverage. */
export function wealthAllocation(overview: ReturnType<typeof wealthOverview>) {
  const {primary} = splitWealthTotals(overview.subtotals), valued = overview.rows.filter(r => r.value !== undefined).length;
  const classes = primary && primary.value > 0n ? overview.categories.flatMap(c => {
    const total = c.items.filter(r => r.currency === primary.currency && r.value !== undefined).reduce((n, r) => n + r.value!, 0n);
    return total > 0n ? [{assetClass: c.assetClass, value: total, share: Number(total * 10000n / primary.value) / 100}] : [];
  }).sort((a, b) => b.share - a.share) : [];
  return {currency: primary?.currency, classes, otherCurrencies: overview.subtotals.filter(s => s !== primary).map(s => s.currency), coverage: {valued, total: overview.rows.length}};
}
