import {addLocalDays, localWeekday} from '../local-date';
import {durationMinutes, finished, volumeKg} from './engine';
import type {Workouts} from './schema';

/**
 * Session AV (owner follow-up 1, F-WORKOUT-WEEKS; Strava's weekly totals, Hevy's progress): the last 12 weeks (Monday
 * first, this week last) of finished workouts: how many, their minutes, the distance of distance-and-time sets and imported
 * routes, and the weight lifted (working sets, weight × reps). Counts from the person's log only; no calorie figure. Pure.
 */
export type WorkoutWeek = {start: string; end: string; workouts: number; minutes: number; distanceKm: number; volumeKg: number};
export function workoutWeeks(w: Workouts, today: string, weeks = 12): WorkoutWeek[] {
  const monday = addLocalDays(today, -((localWeekday(today) + 6) % 7));
  const out: WorkoutWeek[] = Array.from({length: weeks}, (_, i) => { const start = addLocalDays(monday, -7 * (weeks - 1 - i)); return {start, end: addLocalDays(start, 6), workouts: 0, minutes: 0, distanceKm: 0, volumeKg: 0}; });
  for (const x of finished(w)) {
    const week = out.find(k => x.date >= k.start && x.date <= k.end && x.date <= today);
    if (!week) continue;
    week.workouts++; week.minutes += durationMinutes(x);
    const sets = x.exercises.reduce((n, e) => n + (e.measure === 'distance-time' ? e.sets.reduce((m, s) => m + (s.distanceKm ?? 0), 0) : 0), 0);
    const file = (x as {imported?: {distanceKm?: number}; fileImport?: {distanceKm?: number}}).imported?.distanceKm ?? (x as {fileImport?: {distanceKm?: number}}).fileImport?.distanceKm ?? 0;
    week.distanceKm += sets || file;
    week.volumeKg += x.exercises.reduce((n, e) => n + volumeKg(e), 0);
  }
  for (const k of out) { k.distanceKm = Math.round(k.distanceKm * 100) / 100; k.volumeKg = Math.round(k.volumeKg); }
  return out;
}
