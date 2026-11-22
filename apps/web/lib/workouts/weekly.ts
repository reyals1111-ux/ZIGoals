import {addLocalDays, localWeekday} from '../local-date';
import {durationMinutes, finished, volumeKg} from './engine';
import type {Workouts} from './schema';

/**
 * Session AV (owner follow-up 1, F-WORKOUT-WEEKS; Strava's weekly totals, Hevy's progress): the last 12 weeks (Monday
 * first, this week last) of finished workouts: how many, their minutes, the distance of distance-and-time sets and imported
 * routes, and the weight lifted (working sets, weight × reps). Counts from the person's log only; no calorie figure. Pure.
 */
export type WorkoutWeek = {start: string; end: string; workouts: number; minutes: number; distanceKm: number; volumeKg: number};
/**
 * Session AV (q3 #11): distance is per sport, as Strava keeps it (a 42 km ride and a 10 km run are not 52 km). A distance
 * set's sport comes from its exercise, an imported file's from its own sport word.
 */
export const DISTANCE_SPORTS = ['run', 'ride', 'swim', 'walk', 'other'] as const;
export type DistanceSport = typeof DISTANCE_SPORTS[number];
export const SPORT_WORDS: Record<DistanceSport, string> = {run: 'Running', ride: 'Cycling', swim: 'Swimming', walk: 'Walking and hiking', other: 'Other'};
export function sportOf(word: string): DistanceSport {
  return /run|jog|hardlo/i.test(word) ? 'run' : /bik|cycl|ride|fiets/i.test(word) ? 'ride' : /swim|zwem/i.test(word) ? 'swim' : /walk|hik|trek|wandel/i.test(word) ? 'walk' : 'other';
}
type Distanced = {exercises: {exerciseId: string; name: string; measure: string; sets: {distanceKm?: number}[]}[]; imported?: {distanceKm?: number; sport?: string}; fileImport?: {distanceKm?: number; sport?: string}};
/** A workout's distance in km, of one sport or (no sport) of all; the sets' when they have any, else its imported file's. */
export function distanceOf(x: Distanced, sport?: DistanceSport): number {
  const sets = x.exercises.reduce((n, e) => n + (e.measure === 'distance-time' && (!sport || sportOf(`${e.exerciseId} ${e.name}`) === sport) ? e.sets.reduce((m, s) => m + (s.distanceKm ?? 0), 0) : 0), 0);
  const info = x.imported ?? x.fileImport, file = info && (!sport || sportOf(info.sport ?? '') === sport) ? info.distanceKm ?? 0 : 0;
  return sets || file;
}
/** The sports with any distance in these weeks, most kilometres first. */
export function sportsWithDistance(w: Workouts, today: string, weeks = 12): DistanceSport[] {
  return DISTANCE_SPORTS.map(s => [s, workoutWeeks(w, today, weeks, s).reduce((t, k) => t + k.distanceKm, 0)] as const).filter(([, km]) => km > 0).sort((a, b) => b[1] - a[1]).map(([s]) => s);
}
export function workoutWeeks(w: Workouts, today: string, weeks = 12, sport?: DistanceSport): WorkoutWeek[] {
  const monday = addLocalDays(today, -((localWeekday(today) + 6) % 7));
  const out: WorkoutWeek[] = Array.from({length: weeks}, (_, i) => { const start = addLocalDays(monday, -7 * (weeks - 1 - i)); return {start, end: addLocalDays(start, 6), workouts: 0, minutes: 0, distanceKm: 0, volumeKg: 0}; });
  for (const x of finished(w)) {
    const week = out.find(k => x.date >= k.start && x.date <= k.end && x.date <= today);
    if (!week) continue;
    week.workouts++; week.minutes += durationMinutes(x);
    week.distanceKm += distanceOf(x as Distanced, sport);
    week.volumeKg += x.exercises.reduce((n, e) => n + volumeKg(e), 0);
  }
  for (const k of out) { k.distanceKm = Math.round(k.distanceKm * 100) / 100; k.volumeKg = Math.round(k.volumeKg); }
  return out;
}
