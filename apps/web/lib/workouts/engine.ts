import {workoutsSchema, type ExerciseEntry, type Measure, type Workout, type WorkoutSet, type Workouts, type WorkoutTemplate} from './schema';
import type {LibraryExercise} from './library';

/**
 * Session AH Part 6 (DE8): the workout log's rules, pure and tested. What the best apps do (Strong, Hevy, JEFIT, Fitbod,
 * Nike Training Club): start empty, from a routine or by repeating the last workout; each set shows the same set last
 * time; ticking a set starts the rest timer; finishing names new personal bests and keeps the minutes in Health; each
 * exercise keeps its history (best set, an estimated one-rep max, volume, last time). Every mutator returns a parsed
 * record or throws a sentence.
 */
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const parse = (w: Workouts) => workoutsSchema.parse(w);
export const inProgress = (w: Workouts): Workout | undefined => w.workouts.find(x => !x.endedAt);
export const finished = (w: Workouts): Workout[] => w.workouts.filter(x => x.endedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
const blankSet = (measure: Measure, from?: Partial<WorkoutSet>): WorkoutSet => ({id: uid('set'), kind: from?.kind ?? 'normal', done: false,
  ...(measure === 'weight-reps' ? {reps: from?.reps, weightKg: from?.weightKg} : measure === 'reps' ? {reps: from?.reps} : measure === 'time' ? {seconds: from?.seconds} : {distanceKm: from?.distanceKm, seconds: from?.seconds})});

export function startWorkout(w: Workouts, input: {name?: string; date: string; now: Date; template?: WorkoutTemplate; repeat?: Workout}): Workouts {
  if (inProgress(w)) throw Error('A workout is already in progress. Finish or discard it first.');
  const source = input.template ?? input.repeat;
  const exercises: ExerciseEntry[] = (source?.exercises ?? []).map(e => ({id: uid('ex'), exerciseId: e.exerciseId, name: e.name, measure: e.measure, sets: e.sets.map(s => blankSet(e.measure, s))}));
  const workout: Workout = {id: uid('workout'), name: (input.name ?? source?.name ?? 'Workout').trim() || 'Workout', date: input.date, type: source?.type ?? 'strength',
    startedAt: input.now.toISOString(), exercises, ...(input.template ? {templateId: input.template.id} : {})};
  return parse({...w, workouts: [...w.workouts, workout]});
}
const editCurrent = (w: Workouts, change: (x: Workout) => Workout): Workouts => {
  const current = inProgress(w); if (!current) throw Error('No workout is in progress.');
  return parse({...w, workouts: w.workouts.map(x => x.id === current.id ? change(x) : x)});
};
export const renameWorkout = (w: Workouts, name: string) => editCurrent(w, x => ({...x, name: name.trim() || 'Workout'}));
export function addExercise(w: Workouts, exercise: Pick<LibraryExercise, 'id' | 'name' | 'measure'>): Workouts {
  const last = lastEntryFor(w, exercise.id);
  return editCurrent(w, x => {
    if (x.exercises.length >= 40) throw Error('Up to 40 exercises fit in one workout.');
    const sets = last ? last.sets.filter(s => s.kind !== 'warmup' || last.sets.length === 1).map(s => blankSet(exercise.measure, s)) : [blankSet(exercise.measure)];
    return {...x, exercises: [...x.exercises, {id: uid('ex'), exerciseId: exercise.id, name: exercise.name, measure: exercise.measure, sets}]};
  });
}
export const removeExercise = (w: Workouts, entryId: string) => editCurrent(w, x => ({...x, exercises: x.exercises.filter(e => e.id !== entryId)}));
export const moveExercise = (w: Workouts, entryId: string, by: -1 | 1) => editCurrent(w, x => {
  const i = x.exercises.findIndex(e => e.id === entryId), j = i + by; if (i < 0 || j < 0 || j >= x.exercises.length) return x;
  const list = [...x.exercises]; [list[i], list[j]] = [list[j]!, list[i]!]; return {...x, exercises: list};
});
const editEntry = (w: Workouts, entryId: string, change: (e: ExerciseEntry) => ExerciseEntry) => editCurrent(w, x => ({...x, exercises: x.exercises.map(e => e.id === entryId ? change(e) : e)}));
export const addSet = (w: Workouts, entryId: string) => editEntry(w, entryId, e => {
  if (e.sets.length >= 50) throw Error('Up to 50 sets fit in one exercise.');
  const prev = e.sets.at(-1); return {...e, sets: [...e.sets, blankSet(e.measure, prev ? {...prev, kind: prev.kind === 'warmup' ? 'normal' : prev.kind} : undefined)]};
});
export const removeSet = (w: Workouts, entryId: string, setId: string) => editEntry(w, entryId, e => ({...e, sets: e.sets.filter(s => s.id !== setId)}));
export const updateSet = (w: Workouts, entryId: string, setId: string, patch: Partial<Omit<WorkoutSet, 'id'>>) => editEntry(w, entryId, e => ({...e, sets: e.sets.map(s => s.id === setId ? {...s, ...patch} : s)}));
export const setExerciseNote = (w: Workouts, entryId: string, note: string) => editEntry(w, entryId, e => ({...e, note: note.slice(0, 500)}));
/** A set counts once it has what its exercise measures. */
export function setReady(measure: Measure, s: WorkoutSet): boolean {
  return measure === 'weight-reps' ? (s.reps ?? 0) > 0 && s.weightKg !== undefined : measure === 'reps' ? (s.reps ?? 0) > 0 : measure === 'time' ? (s.seconds ?? 0) > 0 : (s.distanceKm ?? 0) > 0 || (s.seconds ?? 0) > 0;
}
export const doneSets = (x: Workout) => x.exercises.flatMap(e => e.sets.filter(s => s.done && setReady(e.measure, s)).map(s => ({entry: e, set: s})));
export const durationMinutes = (x: Pick<Workout, 'startedAt' | 'endedAt'>, now = new Date()) => Math.max(0, Math.round(((x.endedAt ? Date.parse(x.endedAt) : now.getTime()) - Date.parse(x.startedAt)) / 60_000));
/** Finishes the workout in progress: unticked or empty sets are left out, exercises without a set go. */
export function finishWorkout(w: Workouts, now: Date, minutes?: number): {workouts: Workouts; workout: Workout; bests: PersonalBest[]} {
  const current = inProgress(w); if (!current) throw Error('No workout is in progress.');
  const exercises = current.exercises.map(e => ({...e, sets: e.sets.filter(s => s.done && setReady(e.measure, s))})).filter(e => e.sets.length);
  if (!exercises.length) throw Error('Tick at least one finished set, or discard this workout.');
  const endedAt = minutes !== undefined ? new Date(Date.parse(current.startedAt) + Math.max(1, minutes) * 60_000).toISOString() : now.toISOString();
  const workout: Workout = {...current, exercises, endedAt};
  const bests = personalBests(w, workout);
  return {workouts: parse({...w, workouts: w.workouts.map(x => x.id === current.id ? workout : x)}), workout, bests};
}
export const discardWorkout = (w: Workouts) => { const current = inProgress(w); return current ? parse({...w, workouts: w.workouts.filter(x => x.id !== current.id)}) : w; };
export const removeWorkout = (w: Workouts, workoutId: string) => parse({...w, workouts: w.workouts.filter(x => x.id !== workoutId)});
export const withActivity = (w: Workouts, workoutId: string, activityId: string) => parse({...w, workouts: w.workouts.map(x => x.id === workoutId ? {...x, activityId} : x)});

export function saveTemplate(w: Workouts, from: Workout, name: string, now: Date): Workouts {
  if (w.templates.length >= 50) throw Error('Up to 50 routines fit. Remove one first.');
  const template: WorkoutTemplate = {id: uid('routine'), name: name.trim() || from.name, type: from.type, createdAt: now.toISOString(),
    exercises: from.exercises.map(e => ({exerciseId: e.exerciseId, name: e.name, measure: e.measure, sets: e.sets.map(({id: _i, done: _d, ...s}) => { void _i; void _d; return s; })}))};
  return parse({...w, templates: [template, ...w.templates.filter(t => t.name.toLowerCase() !== template.name.toLowerCase())]});
}
export const removeTemplate = (w: Workouts, templateId: string) => parse({...w, templates: w.templates.filter(t => t.id !== templateId)});
export const setRest = (w: Workouts, seconds: number) => parse({...w, restSeconds: Math.max(0, Math.min(900, Math.round(seconds)))});
export function addCustomExercise(w: Workouts, input: {name: string; category: Workouts['exercises'][number]['category']; measure: Measure}): {workouts: Workouts; exercise: LibraryExercise} {
  const name = input.name.trim(); if (!name) throw Error('Name the exercise.');
  const existing = w.exercises.find(e => e.name.toLowerCase() === name.toLowerCase());
  if (existing) return {workouts: w, exercise: existing};
  const exercise = {id: uid('custom'), name: name.slice(0, 80), category: input.category, measure: input.measure};
  return {workouts: parse({...w, exercises: [...w.exercises, exercise]}), exercise};
}

/** The same exercise's sets in the last finished workout (the "previous" column). */
export function lastEntryFor(w: Workouts, exerciseId: string, before?: string): ExerciseEntry | undefined {
  for (const x of finished(w)) { if (before && x.startedAt >= before) continue; const e = x.exercises.find(e => e.exerciseId === exerciseId); if (e) return e; }
  return undefined;
}
/** Epley's estimate of a one-rep max, for sets of 1 to 12 reps (beyond that the estimate is not useful). */
export const oneRepMax = (weightKg: number, reps: number) => reps < 1 || reps > 12 ? null : reps === 1 ? weightKg : weightKg * (1 + reps / 30);
const working = (s: WorkoutSet) => s.kind !== 'warmup';
export const volumeKg = (e: Pick<ExerciseEntry, 'measure' | 'sets'>) => e.measure !== 'weight-reps' ? 0 : e.sets.filter(working).reduce((t, s) => t + (s.weightKg ?? 0) * (s.reps ?? 0), 0);
export type ExerciseHistory = {exerciseId: string; name: string; measure: Measure; sessions: {workoutId: string; date: string; sets: WorkoutSet[]; volumeKg: number; best: WorkoutSet | null}[];
  bestWeightKg: number | null; bestOneRepMaxKg: number | null; mostReps: number | null; longestSeconds: number | null; farthestKm: number | null};
export function exerciseHistory(w: Workouts, exerciseId: string): ExerciseHistory | null {
  const sessions: ExerciseHistory['sessions'] = []; let name = '', measure: Measure = 'weight-reps';
  for (const x of finished(w)) for (const e of x.exercises.filter(e => e.exerciseId === exerciseId)) {
    name ||= e.name; measure = e.measure;
    const best = e.sets.filter(working).reduce<WorkoutSet | null>((b, s) => !b ? s : score(e.measure, s) > score(e.measure, b) ? s : b, null);
    sessions.push({workoutId: x.id, date: x.date, sets: e.sets, volumeKg: volumeKg(e), best});
  }
  if (!sessions.length) return null;
  const sets = sessions.flatMap(s => s.sets.filter(working));
  const max = (f: (s: WorkoutSet) => number | null | undefined) => { const v = sets.map(f).filter((n): n is number => typeof n === 'number' && n > 0); return v.length ? Math.max(...v) : null; };
  return {exerciseId, name, measure, sessions, bestWeightKg: max(s => s.weightKg), bestOneRepMaxKg: max(s => s.weightKg !== undefined && s.reps ? oneRepMax(s.weightKg, s.reps) : null), mostReps: max(s => s.reps), longestSeconds: max(s => s.seconds), farthestKm: max(s => s.distanceKm)};
}
const score = (measure: Measure, s: WorkoutSet) => measure === 'weight-reps' ? (s.weightKg !== undefined && s.reps ? oneRepMax(s.weightKg, Math.min(s.reps, 12)) ?? 0 : 0) : measure === 'reps' ? s.reps ?? 0 : measure === 'time' ? s.seconds ?? 0 : s.distanceKm ?? s.seconds ?? 0;
export type PersonalBest = {exerciseId: string; name: string; what: 'weight' | 'one-rep max' | 'reps' | 'time' | 'distance'; value: number};
/** New bests in a finished workout against every earlier one (none for an exercise done for the first time). */
export function personalBests(w: Workouts, workout: Workout): PersonalBest[] {
  const out: PersonalBest[] = [];
  for (const e of workout.exercises) {
    const earlier = finished(w).filter(x => x.id !== workout.id && x.startedAt < workout.startedAt).flatMap(x => x.exercises.filter(p => p.exerciseId === e.exerciseId)).flatMap(p => p.sets.filter(working));
    if (!earlier.length) continue;
    const now = e.sets.filter(working);
    const best = (sets: WorkoutSet[], f: (s: WorkoutSet) => number | null | undefined) => Math.max(0, ...sets.map(f).filter((n): n is number => typeof n === 'number'));
    const checks: [PersonalBest['what'], (s: WorkoutSet) => number | null | undefined][] = e.measure === 'weight-reps' ? [['weight', s => s.weightKg], ['one-rep max', s => s.weightKg !== undefined && s.reps ? oneRepMax(s.weightKg, s.reps) : null]] : e.measure === 'reps' ? [['reps', s => s.reps]] : e.measure === 'time' ? [['time', s => s.seconds]] : [['distance', s => s.distanceKm]];
    for (const [what, f] of checks) { const v = best(now, f); if (v > 0 && v > best(earlier, f)) out.push({exerciseId: e.exerciseId, name: e.name, what, value: Math.round(v * 10) / 10}); }
  }
  return out;
}
/** This week (Monday to today) and the last four weeks, for the summary line and the weekly review. */
export function weekSummary(w: Workouts, today: string) {
  const d = new Date(`${today}T12:00:00Z`), monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86_400_000).toISOString().slice(0, 10);
  const week = finished(w).filter(x => x.date >= monday && x.date <= today);
  return {workouts: week.length, minutes: week.reduce((t, x) => t + durationMinutes(x), 0), sets: week.reduce((t, x) => t + x.exercises.reduce((n, e) => n + e.sets.length, 0), 0), volumeKg: week.reduce((t, x) => t + x.exercises.reduce((n, e) => n + volumeKg(e), 0), 0)};
}
