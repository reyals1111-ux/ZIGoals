import type {HealthData} from '../health';
import {measureValue} from '../habit-health-links/engine';
import type {Workouts} from '../workouts/schema';
import type {ContributionEvent, PrivateGoal} from '../positions';
import {eventValueForGoal} from '../goal-intelligence';
import type {ContributionReading, DaySources, WorkoutReading} from './engine';

/**
 * Session AK (5.6): the day's values for the rules, read from the existing stores' data (no storage access here). The
 * Health values come from AH's own `measureValue` (lib/habit-health-links/engine.ts), so a rule and a Health link read
 * the very same number; null means nothing was recorded.
 */
const AT = '2000-01-01T00:00:00.000Z';
export function healthSources(health: HealthData, healthDate: string): Pick<DaySources, 'steps' | 'sleepMinutes' | 'waterMl' | 'activeMinutes'> {
  const read = (measure: 'steps' | 'sleepMinutes' | 'water' | 'activeMinutes') => { try { return measureValue(health, healthDate, {version: 1, measure, rule: 'recorded', updatedAt: AT}); } catch { return null; } };
  return {steps: read('steps'), sleepMinutes: read('sleepMinutes'), waterMl: read('water'), activeMinutes: read('activeMinutes')};
}
/** The finished workouts of a day, with their minutes (from start and end, or an imported file's duration). */
export function workoutSources(workouts: Pick<Workouts, 'workouts'>, date: string): WorkoutReading[] {
  return workouts.workouts.filter(w => w.date === date && w.endedAt).map(w => {
    const span = (Date.parse(w.endedAt!) - Date.parse(w.startedAt)) / 60_000;
    const minutes = w.imported ? w.imported.durationSeconds / 60 : Number.isFinite(span) ? Math.max(0, span) : 0;
    return {minutes: Math.round(minutes * 10) / 10, type: w.type};
  });
}
/**
 * The money or units put into private goals on a day (IN only; reward income is not a contribution; an event in another
 * unit than its goal's is skipped, never converted), in each goal's own unit.
 */
export function contributionSources(goals: readonly PrivateGoal[], events: readonly ContributionEvent[], date: string): ContributionReading[] {
  const out: ContributionReading[] = [];
  for (const e of events) {
    if (e.direction !== 'IN' || e.goalScope !== 'private' || e.provenance === 'REWARD_INCOME' || e.occurredAt.slice(0, 10) !== date) continue;
    const goal = goals.find(g => g.id === e.goalId);
    const units = goal ? eventValueForGoal(e, goal) : null;
    if (units === null || !goal) continue;
    out.push({goalId: goal.id, amount: Number(units) / 10 ** goal.decimals});
  }
  return out;
}
/** Everything the rules read for one day. A store that has not loaded passes undefined, which reads as unknown. */
export function daySources({health, healthDate, workouts, date, goals, events}: {health?: HealthData; healthDate?: string; workouts?: Pick<Workouts, 'workouts'>; date: string; goals?: readonly PrivateGoal[]; events?: readonly ContributionEvent[]}): DaySources {
  return {
    ...(health && healthDate ? healthSources(health, healthDate) : {}),
    workouts: workouts ? workoutSources(workouts, date) : null,
    contributions: goals && events ? contributionSources(goals, events, date) : null,
  };
}
