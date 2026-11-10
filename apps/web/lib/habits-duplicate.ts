import {latestHabitRule, type Habit, type HabitInput} from './habits';

/**
 * Session AL fourth pass (NB-133): a habit's copy, as a new habit with the same rule and words and no history: "Read
 * (copy)", then "Read (copy 2)" when that name is taken. An end date already past is dropped (the copy would end before
 * it starts), and the stack link is left out, so the copy never joins a chain by itself. The goal link stays (the copy
 * supports the same goal; Edit changes it).
 */
export function duplicateHabitInput(habit: Habit, takenTitles: readonly string[], today: string): HabitInput {
  const rule = latestHabitRule(habit), taken = new Set(takenTitles.map(t => t.trim().toLowerCase()));
  const base = habit.title.trim();
  const named = (suffix: string) => `${base.slice(0, Math.max(1, 100 - suffix.length)).trimEnd()}${suffix}`;
  let title = named(' (copy)');
  for (let n = 2; taken.has(title.toLowerCase()) && n < 100; n++) title = named(` (copy ${n})`);
  const end = habit.endCondition.kind === 'date' && habit.endCondition.date < today ? {kind: 'none' as const} : habit.endCondition;
  return {title, category: habit.category, description: habit.description, notes: habit.notes, ...(habit.goalLink ? {goalLink: habit.goalLink} : {}), type: rule.type, measurement: rule.measurement, schedule: rule.schedule, target: rule.target, targetPeriod: rule.targetPeriod, timeOfDay: habit.timeOfDay, endCondition: end};
}
