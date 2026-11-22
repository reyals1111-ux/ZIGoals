import {addLocalDays} from '../local-date';
import {CATEGORY_MUSCLES, MUSCLE_GROUPS, type CategoryLookup, type MuscleGroup} from './depth';
import {durationMinutes, finished, oneRepMax, personalBests, volumeKg, type ExerciseHistory} from './engine';
import type {Workouts} from './schema';
import {distanceOf} from './weekly';

/**
 * Session AV lane 2 (body; LEDGER #117, Hevy's progress analytics): from the person's own finished workouts only —
 * working sets per muscle group across the last weeks, a month's report beside the month before (workouts, days, time,
 * sets, weight lifted, distance, new personal bests, the most trained muscle group and exercise), a session-by-session
 * series per exercise (estimated one-rep max, heaviest set, volume, most reps), and the year in training for Wrapped.
 * Warm-ups never count. No calorie figure. Pure.
 */
const working = (s: {kind: string}) => s.kind !== 'warmup';
const mondayOf = (d: string) => addLocalDays(d, -((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7));

export type MuscleWeeks = {weeks: string[]; rows: {muscle: MuscleGroup; sets: number[]; total: number}[]};
/** Working sets per muscle group for the `weeks` weeks ending this week (Monday first, oldest first). */
export function muscleWeeks(w: Workouts, lookup: CategoryLookup, today: string, weeks = 8): MuscleWeeks {
  const last = mondayOf(today), starts = Array.from({length: weeks}, (_, i) => addLocalDays(last, -7 * (weeks - 1 - i)));
  const rows = MUSCLE_GROUPS.map(muscle => ({muscle, sets: starts.map(() => 0), total: 0}));
  for (const x of finished(w)) {
    if (x.date < starts[0]! || x.date > today) continue;
    const k = starts.findIndex((s, i) => x.date >= s && (i === starts.length - 1 || x.date < starts[i + 1]!));
    for (const e of x.exercises) {
      const n = e.sets.filter(working).length, category = lookup(e.exerciseId);
      if (!n || !category) continue;
      for (const g of CATEGORY_MUSCLES[category]) { const r = rows.find(y => y.muscle === g)!; r.sets[k]! += n; r.total += n; }
    }
  }
  return {weeks: starts, rows};
}

export type MonthFigures = {month: string; workouts: number; days: number; minutes: number; sets: number; volumeKg: number; distanceKm: number; bests: number; topMuscle: MuscleGroup | null; topExercise: string | null};
export function monthFigures(w: Workouts, month: string, lookup: CategoryLookup, today: string): MonthFigures {
  const all = finished(w), inMonth = all.filter(x => x.date.slice(0, 7) === month && x.date <= today);
  const muscles = new Map<MuscleGroup, number>(), exercises = new Map<string, number>();
  let sets = 0, volume = 0, distance = 0, bests = 0;
  for (const x of inMonth) {
    distance += distanceOf(x);
    // A best counts against every workout before it (the same rule as the line at the finish).
    bests += personalBests(w, x).length;
    for (const e of x.exercises) {
      const n = e.sets.filter(working).length;
      sets += n; volume += volumeKg(e);
      if (n) exercises.set(e.name, (exercises.get(e.name) ?? 0) + n);
      const category = lookup(e.exerciseId);
      if (n && category) for (const g of CATEGORY_MUSCLES[category]) muscles.set(g, (muscles.get(g) ?? 0) + n);
    }
  }
  const top = <K,>(m: Map<K, number>) => [...m].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0]?.[0] ?? null;
  return {month, workouts: inMonth.length, days: new Set(inMonth.map(x => x.date)).size, minutes: inMonth.reduce((t, x) => t + durationMinutes(x), 0), sets, volumeKg: Math.round(volume), distanceKm: Math.round(distance * 100) / 100, bests, topMuscle: top(muscles), topExercise: top(exercises)};
}
export const previousMonth = (month: string) => { const y = Number(month.slice(0, 4)), m = Number(month.slice(5, 7)); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; };
export const nextMonth = (month: string) => { const y = Number(month.slice(0, 4)), m = Number(month.slice(5, 7)); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; };

export const SERIES_METRICS = ['e1rm', 'heaviest', 'volume', 'reps'] as const;
export type SeriesMetric = typeof SERIES_METRICS[number];
/** Each session's value for one metric, oldest first (sessions without one left out). */
export function exerciseSeries(h: ExerciseHistory, metric: SeriesMetric): {date: string; v: number}[] {
  return [...h.sessions].reverse().map(s => {
    const sets = s.sets.filter(working);
    const v = metric === 'volume' ? s.volumeKg : metric === 'heaviest' ? Math.max(0, ...sets.map(x => x.weightKg ?? 0)) : metric === 'reps' ? Math.max(0, ...sets.map(x => x.reps ?? 0))
      : Math.max(0, ...sets.map(x => x.weightKg !== undefined && x.reps ? oneRepMax(x.weightKg, Math.min(x.reps, 12)) ?? 0 : 0));
    return {date: s.date, v: Math.round(v * 10) / 10};
  }).filter(p => p.v > 0);
}

export type TrainingYear = {workouts: number; days: number; hours: number; volumeKg: number; distanceKm: number; topExercise: string | null; bestMonth: string | null; bests: number};
/** The year in training (Wrapped): from the person's own finished workouts between `start` and `end`. */
export function trainingYear(w: Workouts, start: string, end: string): TrainingYear {
  const inYear = finished(w).filter(x => x.date >= start && x.date <= end), exercises = new Map<string, number>(), months = new Map<string, number>();
  let volume = 0, distance = 0, minutes = 0, bests = 0;
  for (const x of inYear) {
    minutes += durationMinutes(x); distance += distanceOf(x); bests += personalBests(w, x).length;
    months.set(x.date.slice(0, 7), (months.get(x.date.slice(0, 7)) ?? 0) + 1);
    for (const e of x.exercises) { volume += volumeKg(e); if (e.sets.some(working)) exercises.set(e.name, (exercises.get(e.name) ?? 0) + 1); }
  }
  const top = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
  return {workouts: inYear.length, days: new Set(inYear.map(x => x.date)).size, hours: Math.round(minutes / 6) / 10, volumeKg: Math.round(volume), distanceKm: Math.round(distance * 10) / 10, topExercise: top(exercises), bestMonth: top(months), bests};
}
