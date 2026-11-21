import {finished} from './engine';
import type {Workouts} from './schema';
import type {SplitsRecord} from './splits-schema';

/**
 * Session AV (owner follow-up 1, F-RUN-BESTS; Strava's best efforts): the fastest 1, 5 and 10 km and the longest run, from
 * the person's own records. The timed bests come only from runs kept with per-kilometre splits (imported GPX or TCX
 * files: consecutive whole kilometres, never a guess from an average pace); the longest run also counts distance sets and
 * imported distances. Runs imported before splits were kept do not count for the timed bests (nothing is back-filled). Pure.
 * Session AV (q3 #13): runs only — a ride, a swim or a walk never becomes the "longest run": a distance set counts when its
 * exercise is a run, an imported file when its sport reads as a run, splits always (they are only kept for runs). And the
 * half marathon: 21 whole kilometres in a row plus the next 97.5 m at that next split's own pace.
 */
export const HALF_MARATHON_KM = 21.0975;
export type TimedBest = {km: 1 | 5 | 10 | typeof HALF_MARATHON_KM; seconds: number; workoutId: string; date: string; name: string};
/** A run exercise: the library's "Running" (and its older id "run"), or an own exercise named for running or jogging. */
export const isRunExercise = (e: {exerciseId: string; name: string}) => e.exerciseId === 'running' || e.exerciseId === 'run' || /\b(run|running|jog|jogging|hardlopen)\b/i.test(e.name);
/** A file's sport word that reads as a run: the same first rule as `sportLabel` in ./import-file (kept here so this chunk does not load the file parser). */
const isRunSport = (sport: string | undefined) => !!sport && /run|jog/i.test(sport);
export type RunBests = {timed: TimedBest[]; longest: {km: number; workoutId: string; date: string; name: string} | null; withSplits: number};
export function runBests(w: Workouts, splits: SplitsRecord | null): RunBests {
  const done = finished(w), timed: TimedBest[] = [];
  let longest: RunBests['longest'] = null, withSplits = 0;
  for (const km of [1, 5, 10, HALF_MARATHON_KM] as const) {
    let best: TimedBest | null = null;
    const whole = Math.floor(km), rest = Math.round((km - whole) * 10_000) / 10; // metres past the whole km: 97.5 for the half
    for (const x of done) {
      const s = splits?.workouts[x.id]?.splits;
      if (!s) continue;
      const sorted = [...s].sort((a, b) => a.km - b.km);
      for (let i = 0; i + whole <= sorted.length; i++) {
        const run = sorted.slice(i, i + whole);
        if (run.some((p, k) => p.meters !== 1000 || (k > 0 && p.km !== run[k - 1]!.km + 1))) continue;
        let seconds = run.reduce((t, p) => t + p.seconds, 0);
        if (rest) {
          const next = sorted[i + whole];
          if (!next || next.km !== run.at(-1)!.km + 1 || next.meters < rest) continue;
          seconds += Math.round(next.seconds * rest / next.meters);
        }
        if (!best || seconds < best.seconds) best = {km, seconds, workoutId: x.id, date: x.date, name: x.name};
      }
    }
    if (best) timed.push(best);
  }
  for (const x of done) {
    const s = splits?.workouts[x.id]?.splits;
    if (s) withSplits++;
    const fromSplits = s ? s.reduce((t, p) => t + p.meters, 0) / 1000 : 0;
    const fromSets = x.exercises.reduce((t, e) => t + (e.measure === 'distance-time' && isRunExercise(e) ? e.sets.reduce((m, p) => m + (p.distanceKm ?? 0), 0) : 0), 0);
    const file = (x as {imported?: {distanceKm?: number; sport?: string}}).imported, fileImport = (x as {fileImport?: {distanceKm?: number; sport?: string}}).fileImport;
    const fromFile = file && isRunSport(file.sport) ? file.distanceKm ?? 0 : fileImport && isRunSport(fileImport.sport) ? fileImport.distanceKm ?? 0 : 0;
    const km = Math.round(Math.max(fromSplits, fromSets, fromFile) * 100) / 100;
    if (km > 0 && (!longest || km > longest.km)) longest = {km, workoutId: x.id, date: x.date, name: x.name};
  }
  return {timed, longest, withSplits};
}
/** "Fastest 5 km", "Half marathon". */
export const bestLabel = (km: TimedBest['km']) => km === HALF_MARATHON_KM ? 'Half marathon' : `Fastest ${km} km`;
/** "4:52" or "1:02:10". */
export const clockOf = (seconds: number) => { const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`; };
