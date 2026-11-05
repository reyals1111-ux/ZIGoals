/**
 * Health's "Seven days of care" summary of lib/bottom-insights.ts (UI design pass, Part 8): real records only, a day without
 * an entry is null, never zero. Its own module (CI13, weights) so Health does not load Wealth's composition with it;
 * lib/bottom-insights.ts re-exports everything here.
 */
import {dailyHealthSummary,type HealthData} from './health';
import {waterSummary} from './health-daily';
import {exerciseData} from './health-counters';
import {dailySeries} from './sleep/engine';
import {healthGroupIn} from './vault/w-homes';
import {GRAMS_PER_LB, type WeightUnit} from './health-units';
import {lastDays} from './bottom-week';

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

/** Session AK RB (RELEASE_REVIEW_2 R2-8): how many days of a healthWeek have any entry (food, water or a counter). A day
 *  with only unknown calories still counts: it has an entry. Health's "Seven days of care" folds until this is 2. */
export function loggedDaysOfWeek(week: readonly {kcal: number | null; kcalPartial: boolean; waterMl: number | null; exercise: readonly {count: number | null}[]; steps?: number | null; activeMinutes?: number | null; sleepMinutes?: number | null; weightGrams?: number | null}[]): number {
  // Session AL (MO-150): a day with only steps, a night or a weight is a logged day too (the section shows those rows).
  return week.filter(d => d.kcal !== null || d.kcalPartial || d.waterMl !== null || d.exercise.some(e => e.count !== null) || [d.steps, d.activeMinutes, d.sleepMinutes, d.weightGrams].some(v => v !== undefined && v !== null)).length;
}
