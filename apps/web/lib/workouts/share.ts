import * as z from 'zod';
import {addCustomExercise} from './engine';
import {EXERCISES} from './library';
import {CATEGORIES, MEASURES, PROGRESSION_KINDS, WORKOUT_TYPES, workoutsSchema, type Workouts, type WorkoutTemplate} from './schema';

/**
 * Session AV lane 2 (body; LEDGER #206, Strong's routine sharing): a workout routine as a small file the person hands over —
 * its name, exercises, planned sets and rest, a progression rule; the weights only when "Include my weights" is ticked
 * (off by default); never a workout done, a date, a note or an id of the person's (an own exercise travels by its name,
 * group and measure). No server. Import is strict: a fixed shape (unknown fields refused), at most 40 exercises and 32 KB,
 * plain-text names, previewed, and it only ever adds a new routine (and the own exercises it needs).
 */
export const WORKOUT_SHARE_KIND = 'zigoals-workout-routine', MAX_WORKOUT_SHARE_BYTES = 32_000;
const SAFE_TEXT = /^[^\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]*$/;
const text = (max: number) => z.string().trim().min(1).max(max).regex(SAFE_TEXT, 'Names are plain text.');
const shareSet = z.strictObject({kind: z.enum(['warmup', 'normal', 'drop', 'failure']), reps: z.number().int().min(0).max(1000).optional(), seconds: z.number().int().min(0).max(86_400).optional(),
  distanceKm: z.number().finite().min(0).max(1000).optional(), weightKg: z.number().finite().min(0).max(1000).optional(), addedKg: z.number().finite().min(0).max(500).optional(), assistKg: z.number().finite().min(0).max(500).optional()});
const shareExercise = z.strictObject({builtIn: z.string().regex(/^[a-z0-9-]{1,40}$/).optional(), name: text(80), category: z.enum(CATEGORIES), measure: z.enum(MEASURES), load: z.enum(['weighted', 'assisted']).optional(),
  restSeconds: z.number().int().min(0).max(900).optional(), sets: z.array(shareSet).min(1).max(50)});
export const workoutShareSchema = z.strictObject({kind: z.literal(WORKOUT_SHARE_KIND), version: z.literal(1), name: text(80), type: z.enum(WORKOUT_TYPES),
  progression: z.strictObject({kind: z.enum(PROGRESSION_KINDS), minReps: z.number().int().min(1).max(50).optional(), maxReps: z.number().int().min(1).max(50).optional(), stepKg: z.number().finite().min(0.25).max(20)}).optional(),
  exercises: z.array(shareExercise).min(1).max(40)});
export type WorkoutShare = z.infer<typeof workoutShareSchema>;
const clean = (s: string, max: number) => s.replace(/[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/g, '').trim().slice(0, max);
/** The routine as a file's content; weights only with `includeWeights`. */
export function exportRoutine(w: Workouts, t: WorkoutTemplate, {includeWeights = false}: {includeWeights?: boolean} = {}): WorkoutShare {
  const own = new Map(w.exercises.map(e => [e.id, e] as const));
  const exercises = t.exercises.slice(0, 40).map(e => {
    const lib = EXERCISES.find(x => x.id === e.exerciseId), custom = own.get(e.exerciseId);
    return {...(lib ? {builtIn: lib.id} : {}), name: clean(e.name, 80) || 'Exercise', category: lib?.category ?? custom?.category ?? 'Full body', measure: e.measure, ...(e.load ? {load: e.load} : {}), ...(e.restSeconds !== undefined ? {restSeconds: e.restSeconds} : {}),
      sets: (e.sets.length ? e.sets : [{kind: 'normal' as const}]).slice(0, 50).map(s => ({kind: s.kind, ...(s.reps !== undefined ? {reps: s.reps} : {}), ...(s.seconds !== undefined ? {seconds: s.seconds} : {}), ...(s.distanceKm !== undefined ? {distanceKm: s.distanceKm} : {}),
        ...(includeWeights && s.weightKg !== undefined ? {weightKg: s.weightKg} : {}), ...(includeWeights && s.addedKg !== undefined ? {addedKg: s.addedKg} : {}), ...(includeWeights && s.assistKg !== undefined ? {assistKg: s.assistKg} : {})}))};
  });
  const p = t.progression;
  return workoutShareSchema.parse({kind: WORKOUT_SHARE_KIND, version: 1, name: clean(t.name, 80) || 'Routine', type: t.type, ...(p ? {progression: {kind: p.kind, ...(p.minReps !== undefined ? {minReps: p.minReps} : {}), ...(p.maxReps !== undefined ? {maxReps: p.maxReps} : {}), stepKg: p.stepKg}} : {}), exercises});
}
export const workoutShareText = (s: WorkoutShare) => JSON.stringify(s, null, 2);
export const workoutShareFileName = (s: WorkoutShare) => `${s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'routine'}.zigoals-workout.json`;
export type ShareRead = {ok: true; share: WorkoutShare} | {ok: false; error: string};
export function readRoutineFile(textIn: string): ShareRead {
  if (new TextEncoder().encode(textIn).length > MAX_WORKOUT_SHARE_BYTES) return {ok: false, error: 'This file is too large for a workout routine (32 KB at most).'};
  let raw: unknown;
  try { raw = JSON.parse(textIn); } catch { return {ok: false, error: 'This is not a workout routine file.'}; }
  if (!raw || typeof raw !== 'object' || (raw as {kind?: unknown}).kind !== WORKOUT_SHARE_KIND) return {ok: false, error: 'This is not a workout routine file.'};
  if ((raw as {version?: unknown}).version !== 1) return {ok: false, error: 'This routine was made by a newer ZIGoals. Update the app, then try again.'};
  const parsed = workoutShareSchema.safeParse(raw);
  if (!parsed.success) return {ok: false, error: `This routine file is not valid: ${parsed.error.issues[0]?.message ?? 'unknown field'}.`};
  return {ok: true, share: parsed.data};
}
/** Adds the shared routine as a new one ("(shared)" when the name is taken), and any own exercise it needs. */
export function addSharedRoutine(w: Workouts, share: WorkoutShare, now: Date): {workouts: Workouts; routine: WorkoutTemplate; newExercises: number} {
  if (w.templates.length >= 50) throw Error('Up to 50 routines fit. Remove one first.');
  let next = w, newExercises = 0;
  const exercises = share.exercises.map(e => {
    const lib = e.builtIn ? EXERCISES.find(x => x.id === e.builtIn && x.measure === e.measure) : undefined;
    let id = lib?.id;
    if (!id) { const before = next.exercises.length, r = addCustomExercise(next, {name: e.name, category: e.category, measure: e.measure}); next = r.workouts; id = r.exercise.id; if (next.exercises.length > before) newExercises++; }
    return {exerciseId: id, name: lib?.name ?? e.name, measure: e.measure, ...(e.load ? {load: e.load} : {}), ...(e.restSeconds !== undefined ? {restSeconds: e.restSeconds} : {}), sets: e.sets};
  });
  const taken = new Set(next.templates.map(t => t.name.toLowerCase())), name = taken.has(share.name.toLowerCase()) ? `${share.name.slice(0, 70)} (shared)` : share.name;
  const routine: WorkoutTemplate = {id: `routine-${crypto.randomUUID()}`, name, type: share.type, createdAt: now.toISOString(), folder: 'Shared with me', exercises, ...(share.progression ? {progression: share.progression} : {})};
  return {workouts: workoutsSchema.parse({...next, templates: [routine, ...next.templates]}), routine, newExercises};
}
