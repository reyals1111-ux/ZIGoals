import {dailyHealthSummary, type HealthData} from '../health';
import {healthGoalProgress} from '../health-goals/progress';
import {targetNumber, type HealthGoal} from '../health-goals/schema';
import {habitRuleOn, type HabitData} from '../habits';
import {addLocalDays, localWeekday} from '../local-date';

/**
 * Session AP (owner-approved feature 3): "orbits" from the person's own goals — steps, active minutes and workout days.
 * Derived on every read, never stored, no calories (owner rule). Each orbit appears only when the person has set the goal
 * it follows; without one it says where to set it. ZIGoals' own shape (a planet on its own orbit, side by side, in the
 * pillar colours), never three nested rings and never another app's names for them.
 *
 * - Steps today, against the daily step target (Health → Targets) or else an active steps goal (its daily average target).
 * - Active minutes, against an active "active minutes" Health goal, over that goal's own window.
 * - Workout days this week (Monday to today), against an active habit about workouts with an "X times a week" schedule.
 */
export type OrbitId = 'steps' | 'minutes' | 'workouts';
export type Orbit = {id: OrbitId; label: string; value: number; target: number; share: number; reached: boolean; period: string; source: string; unit: string};
export type OrbitMissing = {id: OrbitId; label: string; how: string};
export type Orbits = {orbits: Orbit[]; missing: OrbitMissing[]};
export const ORBIT_LABELS: Readonly<Record<OrbitId, string>> = {steps: 'Steps', minutes: 'Active minutes', workouts: 'Workout days'};
const WORKOUT_WORDS = /\b(workouts?|exercise|training|train|gym|run|running|cardio|sport|fitness|lift|lifting)\b/i;

const make = (id: OrbitId, value: number, target: number, period: string, source: string, unit: string): Orbit => ({id, label: ORBIT_LABELS[id], value, target, share: target > 0 ? Math.min(1, value / target) : 0, reached: value >= target, period, source, unit});
const activeGoal = (goals: readonly HealthGoal[], measure: HealthGoal['measure']) => goals.filter(g => g.status === 'active' && g.measure === measure).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
/** Monday of the week that holds `day`. */
export const weekStart = (day: string) => addLocalDays(day, -((localWeekday(day) + 6) % 7));

export function orbitsFor({health, goals, workouts, habits, today}: {health: HealthData; goals: readonly HealthGoal[]; workouts: {workouts: readonly {date: string; endedAt?: string}[]} | null; habits: HabitData | null; today: string}): Orbits {
  const orbits: Orbit[] = [], missing: OrbitMissing[] = [];
  // Steps: the daily target first, then a steps goal (its target is a daily average).
  const stepsGoal = activeGoal(goals, 'steps'), stepTarget = health.targets.steps ?? (stepsGoal ? targetNumber(stepsGoal) : null);
  if (stepTarget && stepTarget > 0) orbits.push(make('steps', dailyHealthSummary(health, today).steps, stepTarget, 'today', health.targets.steps ? 'Your daily step target (Health → Targets)' : `Your goal “${stepsGoal!.name}”`, 'steps'));
  else missing.push({id: 'steps', label: ORBIT_LABELS.steps, how: 'Set a daily step target in Health → Targets.'});
  // Active minutes: the goal's own window and its own count (lib/health-goals/progress).
  const minutesGoal = activeGoal(goals, 'activeMinutes');
  const minutes = minutesGoal ? healthGoalProgress(minutesGoal, health, today) : null;
  if (minutesGoal) orbits.push(make('minutes', minutes?.kind === 'value' ? minutes.current : 0, targetNumber(minutesGoal), minutesGoal.window.kind === 'rolling' ? `the last ${minutesGoal.window.weeks === 1 ? 'week' : `${minutesGoal.window.weeks} weeks`}` : 'so far', `Your goal “${minutesGoal.name}”`, 'min'));
  else missing.push({id: 'minutes', label: ORBIT_LABELS.minutes, how: 'Add an “active minutes” goal in Goals → Health goals.'});
  // Workout days: an active weekly habit about workouts sets how many; the workout log says which days had one.
  const habit = (habits?.habits ?? []).find(h => { const r = habitRuleOn(h, today); return r?.state === 'active' && r.type === 'build' && r.schedule.kind === 'frequency' && r.schedule.period === 'week' && WORKOUT_WORDS.test(h.title); });
  const rule = habit ? habitRuleOn(habit, today) : undefined;
  if (habit && rule?.schedule.kind === 'frequency') {
    const from = weekStart(today), days = new Set((workouts?.workouts ?? []).filter(w => w.endedAt && w.date >= from && w.date <= today).map(w => w.date));
    orbits.push(make('workouts', days.size, rule.schedule.times, 'this week', `Your habit “${habit.title}”, ${rule.schedule.times} ${rule.schedule.times === 1 ? 'time' : 'times'} a week`, rule.schedule.times === 1 ? 'day' : 'days'));
  } else missing.push({id: 'workouts', label: ORBIT_LABELS.workouts, how: 'Give a workout habit an “X times a week” schedule in Habits.'});
  return {orbits, missing};
}
/** "6,240 of 8,000 steps today · 78%": the orbit in words (the drawing is never the only way to read it). */
export function orbitWords(o: Orbit, format: (n: number) => string = n => String(n)): string {
  return `${format(o.value)} of ${format(o.target)} ${o.unit} ${o.period} · ${o.reached ? 'reached' : `${Math.floor(o.share * 100)}%`}`;
}
