import {oneRepMax, type ExerciseHistory} from './engine';
import type {Measure, WorkoutSet} from './schema';

/**
 * Session AV (owner follow-up 1, F-SET-BEST; Hevy's PR badge on the set): which personal best a ticked set beats, against
 * every finished workout before it — the same measures the finished workout's "New personal bests" uses (heaviest
 * weight, then the estimated one-rep max for 12 reps or fewer; most reps; longest time; farthest distance). A warm-up
 * set, a set not ticked, and an exercise done for the first time have none. Pure.
 */
export type SetBest = 'weight' | 'one-rep max' | 'reps' | 'time' | 'distance' | 'added weight' | 'least help';
type Bests = Pick<ExerciseHistory, 'bestWeightKg' | 'bestOneRepMaxKg' | 'mostReps' | 'longestSeconds' | 'farthestKm'> & Partial<Pick<ExerciseHistory, 'bestAddedKg' | 'leastAssistKg'>>;
const above = (v: number | undefined | null, best: number | null) => typeof v === 'number' && v > 0 && best !== null && v > best + 1e-9;
export function setBest(measure: Measure, set: WorkoutSet, before: Bests | null): SetBest | null {
  if (!before || !set.done || set.kind === 'warmup') return null;
  if (measure === 'weight-reps') {
    if (above(set.weightKg, before.bestWeightKg)) return 'weight';
    const est = set.weightKg !== undefined && set.reps ? oneRepMax(set.weightKg, set.reps) : null;
    return above(est, before.bestOneRepMaxKg) ? 'one-rep max' : null;
  }
  // Session AV lane 2 (body; LEDGER #202): a weighted set beats on added weight; an assisted one on less help (lower is better).
  if (measure === 'reps' && set.addedKg !== undefined && above(set.addedKg, before.bestAddedKg ?? null)) return 'added weight';
  if (measure === 'reps' && set.assistKg !== undefined && (set.reps ?? 0) > 0 && typeof before.leastAssistKg === 'number' && set.assistKg < before.leastAssistKg - 1e-9) return 'least help';
  if (measure === 'reps') return above(set.reps, before.mostReps) ? 'reps' : null;
  if (measure === 'time') return above(set.seconds, before.longestSeconds) ? 'time' : null;
  return above(set.distanceKm, before.farthestKm) ? 'distance' : above(set.seconds, before.longestSeconds) && !set.distanceKm ? 'time' : null;
}
/**
 * Session AV (q3 #40): the bests to beat for a set, raised by the sets ticked before it in this same workout, so a second
 * 80 kg × 8 after the first one is not a second star for the same best. Warm-ups and unticked sets do not raise them.
 */
export function withEarlier(before: Bests | null, earlier: readonly WorkoutSet[]): Bests | null {
  if (!before) return null;
  const done = earlier.filter(x => x.done && x.kind !== 'warmup');
  if (!done.length) return before;
  const top = (b: number | null, values: (number | null | undefined)[]) => values.reduce<number | null>((m, v) => typeof v === 'number' && v > 0 && (m === null || v > m) ? v : m, b);
  return {
    bestWeightKg: top(before.bestWeightKg, done.map(x => x.weightKg)),
    bestOneRepMaxKg: top(before.bestOneRepMaxKg, done.map(x => x.weightKg !== undefined && x.reps ? oneRepMax(x.weightKg, x.reps) : null)),
    mostReps: top(before.mostReps, done.map(x => x.reps)),
    longestSeconds: top(before.longestSeconds, done.map(x => x.seconds)),
    farthestKm: top(before.farthestKm, done.map(x => x.distanceKm)),
    bestAddedKg: top(before.bestAddedKg ?? null, done.map(x => x.reps ? x.addedKg : null)),
    leastAssistKg: done.reduce<number | null>((m, x) => typeof x.assistKg === 'number' && (x.reps ?? 0) > 0 && (m === null || x.assistKg < m) ? x.assistKg : m, before.leastAssistKg ?? null),
  };
}
export const SET_BEST_WORDS: Record<SetBest, string> = {weight: 'heaviest yet', 'one-rep max': 'best estimated one-rep max', reps: 'most reps yet', time: 'longest yet', distance: 'farthest yet', 'added weight': 'most weight added yet', 'least help': 'least help yet'};
