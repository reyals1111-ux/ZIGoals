import {oneRepMax, type ExerciseHistory} from './engine';
import type {Measure, WorkoutSet} from './schema';

/**
 * Session AV (owner follow-up 1, F-SET-BEST; Hevy's PR badge on the set): which personal best a ticked set beats, against
 * every finished workout before it — the same measures the finished workout's "New personal bests" uses (heaviest
 * weight, then the estimated one-rep max for 12 reps or fewer; most reps; longest time; farthest distance). A warm-up
 * set, a set not ticked, and an exercise done for the first time have none. Pure.
 */
export type SetBest = 'weight' | 'one-rep max' | 'reps' | 'time' | 'distance';
type Bests = Pick<ExerciseHistory, 'bestWeightKg' | 'bestOneRepMaxKg' | 'mostReps' | 'longestSeconds' | 'farthestKm'>;
const above = (v: number | undefined | null, best: number | null) => typeof v === 'number' && v > 0 && best !== null && v > best + 1e-9;
export function setBest(measure: Measure, set: WorkoutSet, before: Bests | null): SetBest | null {
  if (!before || !set.done || set.kind === 'warmup') return null;
  if (measure === 'weight-reps') {
    if (above(set.weightKg, before.bestWeightKg)) return 'weight';
    const est = set.weightKg !== undefined && set.reps ? oneRepMax(set.weightKg, set.reps) : null;
    return above(est, before.bestOneRepMaxKg) ? 'one-rep max' : null;
  }
  if (measure === 'reps') return above(set.reps, before.mostReps) ? 'reps' : null;
  if (measure === 'time') return above(set.seconds, before.longestSeconds) ? 'time' : null;
  return above(set.distanceKm, before.farthestKm) ? 'distance' : above(set.seconds, before.longestSeconds) && !set.distanceKm ? 'time' : null;
}
export const SET_BEST_WORDS: Record<SetBest, string> = {weight: 'heaviest yet', 'one-rep max': 'best estimated one-rep max', reps: 'most reps yet', time: 'longest yet', distance: 'farthest yet'};
