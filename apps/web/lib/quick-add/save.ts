import {newHealthId, saveActivity, saveWeight, type HealthData} from '../health';
import {addWater, dailyData, healthDay} from '../health-daily';
import {changeCount} from '../health-counters';
import {habitCalendarDay, logHabitValue, type HabitData} from '../habits';
import {addLocalDays} from '../local-date';
import type {QuickAddKnown} from './types';

/**
 * What a Quick-add result writes (A2): exactly one ordinary record through an existing mutator, on the journal's own
 * day (Health's zone for Health records, the Habits zone for a habit entry); "yesterday" is one day earlier in each.
 * Pure: the caller passes the stores and the instant and writes what comes back.
 */
export type QuickAddStores = {health: HealthData; habits: HabitData};
export type QuickAddWrite = {health?: HealthData; habits?: HabitData; habitTotal?: {value: number; target: number; unit: string}};
export function quickAddDays(stores: QuickAddStores, now: Date): {health: string; habits: string} {
  return {health: healthDay(dailyData(stores.health).preferences.timezone, now), habits: habitCalendarDay(stores.habits, now)};
}
export function applyQuickAdd(result: QuickAddKnown, stores: QuickAddStores, now: Date, id = newHealthId()): QuickAddWrite {
  const at = now.toISOString(), days = quickAddDays(stores, now);
  const healthDate = result.day === 'yesterday' ? addLocalDays(days.health, -1) : days.health;
  const habitDate = result.day === 'yesterday' ? addLocalDays(days.habits, -1) : days.habits;
  switch (result.kind) {
    case 'water': return {health: addWater(stores.health, {id, date: healthDate, amountMilli: Math.round(result.millilitres * 1000), unit: 'ml'}, at)};
    case 'weight': return {health: saveWeight(stores.health, {id, date: healthDate, grams: result.grams}, at)};
    case 'steps': return {health: saveActivity(stores.health, {id, date: healthDate, name: 'Walk', steps: result.steps, minutes: Math.round(result.minutes ?? 0)}, at)};
    case 'activity': return {health: saveActivity(stores.health, {id, date: healthDate, name: result.distanceKm !== undefined ? `${result.name} · ${result.distanceKm} km` : result.name, steps: 0, minutes: Math.round(result.minutes)}, at)};
    case 'sleep': return {health: saveActivity(stores.health, {id, date: healthDate, name: 'Sleep', steps: 0, minutes: Math.round(result.minutes)}, at)};
    case 'exercise': return {health: changeCount(stores.health, result.counterId, healthDate, result.count)};
    case 'habit': {
      const habits = logHabitValue(stores.habits, result.habitId, habitDate, result.value, {mode: 'add'}, now);
      const habit = habits.habits.find(h => h.id === result.habitId)!, rule = habit.rules[habit.rules.length - 1]!;
      return {habits, habitTotal: {value: habit.entries.find(e => e.date === habitDate)?.count ?? 0, target: rule.target, unit: rule.measurement.kind === 'duration' ? rule.measurement.unit : rule.measurement.kind === 'boolean' ? 'done' : rule.measurement.unit}};
    }
  }
}
