import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {dailyHealthSummary, type HealthData} from '../health';
import {KCAL_FLOOR} from './energy';
import {weekDays} from './planner';

/**
 * Session AK (COMPETITORS N3, P2 #7): the weekly calorie budget, a display layer over the daily calorie target (the coach's
 * maths are untouched). The week's budget is the target × 7, shown as seven bars. "Shift" moves calories between weekdays
 * as a repeating pattern (Monday first): the weekly total stays the same and no day goes below the coach's floor. "Roll
 * over" (off by default) carries up to N kcal of a past day's unused budget to the next day. Device-only
 * (`zigoals:calorie-week:v1`, loose and versioned). An estimate-free view: it only re-spreads the person's own target.
 */
export const CALORIE_WEEK_KEY = 'zigoals:calorie-week:v1';
export const MAX_SHIFT = 2000, MAX_ROLLOVER = 1000;
export const calorieWeekSchema = z.looseObject({
  version: z.literal(1),
  /** Monday … Sunday, kcal added (+) or taken (−); they sum to 0. */
  shifts: z.array(z.number().int().min(-MAX_SHIFT).max(MAX_SHIFT)).length(7).refine(s => s.reduce((a, b) => a + b, 0) === 0, 'Shifts keep the weekly total.').optional(),
  rollover: z.looseObject({on: z.boolean(), maxKcal: z.number().int().min(0).max(MAX_ROLLOVER)}).optional(),
});
export type CalorieWeek = z.infer<typeof calorieWeekSchema>;
export const emptyCalorieWeek = (): CalorieWeek => ({version: 1});
export const CALORIE_WEEK: DeviceRecordSpec<CalorieWeek> = {key: CALORIE_WEEK_KEY, schema: calorieWeekSchema, empty: emptyCalorieWeek};
const ZERO = [0, 0, 0, 0, 0, 0, 0];
export const shiftsOf = (r: CalorieWeek) => r.shifts ?? ZERO;

/** Moves `kcal` from one weekday (0 = Monday) to another. Refuses a day under the floor; the weekly total never changes. */
export function shiftCalories(r: CalorieWeek, baseKcal: number, from: number, to: number, kcal: number): CalorieWeek {
  if (from === to || kcal <= 0) return r;
  if (![from, to].every(i => Number.isInteger(i) && i >= 0 && i < 7)) throw new Error('Choose two weekdays.');
  const shifts = [...shiftsOf(r)];
  shifts[from]! -= Math.round(kcal); shifts[to]! += Math.round(kcal);
  if (shifts.some(s => Math.abs(s) > MAX_SHIFT)) throw new Error(`A day moves at most ${MAX_SHIFT} kcal from your daily target.`);
  if (shifts.some(s => baseKcal + s < KCAL_FLOOR)) throw new Error(`No day goes below ${KCAL_FLOOR} kcal; shift less.`);
  return calorieWeekSchema.parse({...r, shifts});
}
export const resetShifts = (r: CalorieWeek): CalorieWeek => { const rest: Record<string, unknown> = {...r}; delete rest.shifts; return calorieWeekSchema.parse(rest); };
export const setRollover = (r: CalorieWeek, on: boolean, maxKcal: number): CalorieWeek => calorieWeekSchema.parse({...r, rollover: {on, maxKcal: Math.max(0, Math.min(MAX_ROLLOVER, Math.round(maxKcal)))}});

export type BudgetDay = {date: string; base: number; shift: number; carried: number; budget: number; eaten: number | null; remaining: number | null; past: boolean};
/** The week of `anchor` against `today`: each day's budget (base + shift + what rolled over), what was logged and what is left. */
export function weekBudget(data: HealthData, r: CalorieWeek, anchor: string, today: string): {days: BudgetDay[]; weeklyBudget: number; eaten: number; base: number} | null {
  const base = data.targets.kcal;
  if (!base) return null;
  const shifts = shiftsOf(r), roll = r.rollover?.on ? r.rollover.maxKcal : 0, days: BudgetDay[] = [];
  for (const [i, date] of weekDays(anchor).entries()) {
    const s = dailyHealthSummary(data, date), eaten = s.entries > 0 ? s.nutrients.kcal : null;
    const prev = days[i - 1];
    // Only a past day with a log can leave anything unused; an unlogged day is unknown, never "all unused".
    const carried = roll && prev && prev.past && prev.eaten !== null ? Math.min(roll, Math.max(0, prev.budget - prev.eaten)) : 0;
    const budget = Math.max(KCAL_FLOOR, base + shifts[i]!) + carried;
    days.push({date, base, shift: shifts[i]!, carried, budget, eaten, remaining: eaten === null ? null : budget - eaten, past: date < today});
  }
  return {days, weeklyBudget: base * 7, eaten: days.reduce((a, d) => a + (d.eaten ?? 0), 0), base};
}
