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
import {portfolioComposition} from './product-insights';
import {checkInsOn} from './numbers/counts';
import {dailySeries} from './sleep/engine';
import {healthGroupIn} from './vault/w-homes';
import {GRAMS_PER_LB, type WeightUnit} from './health-units';

export const lastDays = (today: string, n = 7) => Array.from({length: n}, (_, i) => addLocalDays(today, i - (n - 1)));
const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Today: the last 7 days across Goals, Habits and Health, as counts of records saved on those days. */
export function weekAcross({today, habits, health, platform}: {today: string; habits: HabitData; health: HealthData; platform: Platform}) {
  const exercise = exerciseData(health).days;
  return lastDays(today).map(date => ({
    date,
    // Session AH (TR6): the shared check-in count (lib/numbers/counts.ts): a scheduled day completed, once per habit.
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

/** Health: 7 days of calories, water and exercise counters; each value is null when that day has no entry.
 *  Session AL (MO-150, P14-D): also steps and active minutes (activity entries), sleep (minutes asleep of the nights that
 *  ended that day) and weight (that day's latest reading, in grams); each null without a record, never zero. */
export function healthWeek(health: HealthData, today: string) {
  const counters = exerciseData(health), days = lastDays(today);
  const sleep = healthGroupIn(health, 'sleep'), nights = sleep ? dailySeries(sleep, today, days.length) : [];
  return days.map(date => {
    const food = dailyHealthSummary(health, date), water = waterSummary(health, date);
    const moves = health.activity.filter(a => a.date === date), weighed = health.weights.filter(w => w.date === date).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)).at(-1);
    return {
      date,
      kcal: food.entries && food.nutrients.kcal !== null ? food.nutrients.kcal : null,
      kcalPartial: food.entries > 0 && food.nutrients.kcal === null,
      waterMl: water.entries ? water.millilitres : null,
      exercise: counters.counters.map(c => ({name: c.name, count: counters.days.find(d => d.counterId === c.id && d.date === date)?.count ?? null})),
      steps: moves.some(a => a.steps > 0) ? moves.reduce((n, a) => n + a.steps, 0) : null,
      activeMinutes: moves.some(a => a.minutes > 0) ? moves.reduce((n, a) => n + a.minutes, 0) : null,
      sleepMinutes: nights.find(n => n.date === date)?.asleep ?? null,
      weightGrams: weighed ? weighed.grams : null,
    };
  });
}
export type HealthWeekDay = ReturnType<typeof healthWeek>[number];
export type CareRow = {key: 'steps' | 'minutes' | 'sleep' | 'weight'; label: string; tone: 'health'; digits: number; values: [string, number | null, boolean][]};
/**
 * Session AL (MO-150): the extra "Seven days of care" rows — steps, active minutes, sleep in hours and weight in the
 * person's unit — each only when the week holds at least one record of it. `digits` is the decimals to show (sleep and
 * weight one, the counts none). A dash stays "no entry".
 */
export function careRows(week: readonly HealthWeekDay[], weightUnit: WeightUnit = 'kg'): CareRow[] {
  const tenth = (n: number) => Math.round(n * 10) / 10;
  const rows: CareRow[] = [
    {key: 'steps', label: 'Steps', tone: 'health', digits: 0, values: week.map(d => [d.date, d.steps, false])},
    {key: 'minutes', label: 'Active minutes', tone: 'health', digits: 0, values: week.map(d => [d.date, d.activeMinutes, false])},
    {key: 'sleep', label: 'Sleep · hours', tone: 'health', digits: 1, values: week.map(d => [d.date, d.sleepMinutes === null ? null : tenth(d.sleepMinutes / 60), false])},
    {key: 'weight', label: `Weight · ${weightUnit}`, tone: 'health', digits: 1, values: week.map(d => [d.date, d.weightGrams === null ? null : tenth(weightUnit === 'lb' ? d.weightGrams / GRAMS_PER_LB : d.weightGrams / 1000), false])},
  ];
  return rows.filter(r => r.values.some(([, v]) => v !== null));
}

/** Goals: active Goals with a saved target date, soonest first; how many have none. */
/** Session AK RB (RELEASE_REVIEW_2 R2-8): how many days of a healthWeek have any entry (food, water or a counter). A day
 *  with only unknown calories still counts: it has an entry. Health's "Seven days of care" folds until this is 2. */
export function loggedDaysOfWeek(week: readonly {kcal: number | null; kcalPartial: boolean; waterMl: number | null; exercise: readonly {count: number | null}[]; steps?: number | null; activeMinutes?: number | null; sleepMinutes?: number | null; weightGrams?: number | null}[]): number {
  // Session AL (MO-150): a day with only steps, a night or a weight is a logged day too (the section shows those rows).
  return week.filter(d => d.kcal !== null || d.kcalPartial || d.waterMl !== null || d.exercise.some(e => e.count !== null) || [d.steps, d.activeMinutes, d.sleepMinutes, d.weightGrams].some(v => v !== undefined && v !== null)).length;
}
export function goalTimeline(goals: readonly GoalSummary[], today: string) {
  const active = goals.filter(g => g.status === 'active');
  const dated = active.filter(g => g.targetDate).sort((a, b) => a.targetDate!.localeCompare(b.targetDate!) || a.name.localeCompare(b.name));
  return {dated: dated.map(g => ({key: g.key, name: g.name, href: g.href, targetDate: g.targetDate!, progressPct: g.progressPct, past: g.targetDate! < today})), undated: active.length - dated.length};
}

/** Wealth: how the known value of the headline currency is spread across asset classes, and valuation coverage. */
export function wealthAllocation(overview: ReturnType<typeof wealthOverview>) {
  const {primary} = splitWealthTotals(overview.subtotals), valued = overview.rows.filter(r => r.value !== undefined).length;
  // Session AF Gate C (design critique 1): the same class shares as Wealth's composition (one class map, one rounding), so a
  // class reads the same figure, to the same two decimals, in both places; largest first.
  const group = primary && primary.value > 0n ? portfolioComposition(overview).find(g => g.currency === primary.currency) : undefined;
  const classes = group ? group.segments.filter(s => s.value > 0n).map(s => ({assetClass: s.label, value: s.value, share: s.basisPoints / 100})).sort((a, b) => b.share - a.share) : [];
  return {currency: primary?.currency, classes, otherCurrencies: overview.subtotals.filter(s => s !== primary).map(s => s.currency), coverage: {valued, total: overview.rows.length}};
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
