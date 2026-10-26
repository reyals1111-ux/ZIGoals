import {addLocalDays} from '../local-date';
import {workoutsSchema, type ExerciseEntry, type Workout, type Workouts} from './schema';

/**
 * Session AH Part 6 (DE8): the Showcase's fictional training log — two weeks of push, pull and leg days and a run, with
 * steady progress so personal bests and history have something to show, and two routines. Deterministic for a day.
 */
type Plan = [exerciseId: string, name: string, sets: [kg: number, reps: number][]];
const lifts = (prefix: string, plan: Plan[], bump: number): ExerciseEntry[] => plan.map(([exerciseId, name, sets], i) => ({id: `${prefix}-e${i}`, exerciseId, name, measure: 'weight-reps',
  sets: sets.map(([kg, reps], j) => ({id: `${prefix}-e${i}-s${j}`, kind: j === 0 ? 'warmup' : 'normal', weightKg: kg + (j === 0 ? 0 : bump), reps, done: true}))}));
const PUSH: Plan[] = [['bench-press', 'Bench press', [[40, 10], [60, 8], [60, 8], [60, 7]]], ['overhead-press', 'Overhead press', [[20, 10], [35, 8], [35, 8]]], ['triceps-pushdown', 'Triceps pushdown', [[15, 12], [25, 12], [25, 10]]]];
const PULL: Plan[] = [['deadlift', 'Deadlift', [[60, 5], [100, 5], [100, 5]]], ['barbell-row', 'Barbell row', [[30, 10], [50, 8], [50, 8]]], ['bicep-curl', 'Bicep curl', [[8, 12], [12, 10], [12, 10]]]];
const LEGS: Plan[] = [['squat', 'Squat', [[40, 8], [80, 6], [80, 6], [80, 5]]], ['romanian-deadlift', 'Romanian deadlift', [[40, 10], [60, 8], [60, 8]]], ['calf-raise', 'Calf raise', [[40, 15], [60, 12], [60, 12]]]];
export function showcaseWorkouts(day: string): Workouts {
  const at = (offset: number, hour: number, minutes = 0) => new Date(Date.parse(`${addLocalDays(day, offset)}T${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00Z`)).toISOString();
  const session = (offset: number, name: string, plan: Plan[], bump: number, length: number): Workout => ({id: `showcase-workout-${-offset}`, name, date: addLocalDays(day, offset), type: 'strength',
    startedAt: at(offset, 7), endedAt: at(offset, 7, length), exercises: lifts(`sw${-offset}`, plan, bump), notes: 'SHOWCASE DATA · fictional'});
  const run = (offset: number, km: number, seconds: number): Workout => ({id: `showcase-workout-${-offset}`, name: 'Easy run', date: addLocalDays(day, offset), type: 'cardio', startedAt: at(offset, 18), endedAt: at(offset, 18, Math.round(seconds / 60)),
    exercises: [{id: `sr${-offset}-e0`, exerciseId: 'running', name: 'Running', measure: 'distance-time', sets: [{id: `sr${-offset}-s0`, kind: 'normal', distanceKm: km, seconds, done: true}]}], notes: 'SHOWCASE DATA · fictional'});
  const workouts = [session(-13, 'Push day', PUSH, 0, 52), session(-12, 'Pull day', PULL, 0, 48), session(-11, 'Leg day', LEGS, 0, 55), run(-9, 5, 1680),
    session(-6, 'Push day', PUSH, 2.5, 50), session(-5, 'Pull day', PULL, 5, 47), session(-4, 'Leg day', LEGS, 5, 57), run(-2, 6, 2040), session(-1, 'Push day', PUSH, 2.5, 49)];
  const template = (id: string, name: string, plan: Plan[]) => ({id, name, type: 'strength' as const, createdAt: at(-13, 9), exercises: plan.map(([exerciseId, n, sets]) => ({exerciseId, name: n, measure: 'weight-reps' as const, sets: sets.map(([kg, reps], j) => ({kind: j === 0 ? 'warmup' as const : 'normal' as const, weightKg: kg, reps}))}))});
  return workoutsSchema.parse({version: 1, workouts, templates: [template('showcase-routine-push', 'Push day', PUSH), template('showcase-routine-legs', 'Leg day', LEGS)], exercises: [], restSeconds: 90});
}
