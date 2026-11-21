import {finished} from './engine';
import type {Workouts} from './schema';
import type {SplitsRecord} from './splits-schema';

/**
 * Session AV (owner follow-up 1, F-RUN-BESTS; Strava's best efforts): the fastest 1, 5 and 10 km and the longest run, from
 * the person's own records. The timed bests come only from runs kept with per-kilometre splits (imported GPX or TCX
 * files: consecutive whole kilometres, never a guess from an average pace); the longest run also counts distance sets and
 * imported distances. Runs imported before splits were kept do not count for the timed bests (nothing is back-filled). Pure.
 */
export type TimedBest = {km: 1 | 5 | 10; seconds: number; workoutId: string; date: string; name: string};
export type RunBests = {timed: TimedBest[]; longest: {km: number; workoutId: string; date: string; name: string} | null; withSplits: number};
export function runBests(w: Workouts, splits: SplitsRecord | null): RunBests {
  const done = finished(w), timed: TimedBest[] = [];
  let longest: RunBests['longest'] = null, withSplits = 0;
  for (const km of [1, 5, 10] as const) {
    let best: TimedBest | null = null;
    for (const x of done) {
      const s = splits?.workouts[x.id]?.splits;
      if (!s) continue;
      const whole = [...s].sort((a, b) => a.km - b.km);
      for (let i = 0; i + km <= whole.length; i++) {
        const run = whole.slice(i, i + km);
        if (run.some((p, k) => p.meters !== 1000 || (k > 0 && p.km !== run[k - 1]!.km + 1))) continue;
        const seconds = run.reduce((t, p) => t + p.seconds, 0);
        if (!best || seconds < best.seconds) best = {km, seconds, workoutId: x.id, date: x.date, name: x.name};
      }
    }
    if (best) timed.push(best);
  }
  for (const x of done) {
    const s = splits?.workouts[x.id]?.splits;
    if (s) withSplits++;
    const fromSplits = s ? s.reduce((t, p) => t + p.meters, 0) / 1000 : 0;
    const fromSets = x.exercises.reduce((t, e) => t + (e.measure === 'distance-time' ? e.sets.reduce((m, p) => m + (p.distanceKm ?? 0), 0) : 0), 0);
    const file = (x as {imported?: {distanceKm?: number; sport?: string}}).imported, fileImport = (x as {fileImport?: {distanceKm?: number; sport?: string}}).fileImport;
    const fromFile = (file?.distanceKm ?? fileImport?.distanceKm ?? 0);
    const km = Math.round(Math.max(fromSplits, fromSets, fromFile) * 100) / 100;
    if (km > 0 && (!longest || km > longest.km)) longest = {km, workoutId: x.id, date: x.date, name: x.name};
  }
  return {timed, longest, withSplits};
}
/** "4:52" or "1:02:10". */
export const clockOf = (seconds: number) => { const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`; };
