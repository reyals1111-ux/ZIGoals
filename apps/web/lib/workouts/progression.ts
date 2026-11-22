import {finished, setReady} from './engine';
import {workoutsSchema, type ExerciseEntry, type Progression, type Workouts, type WorkoutTemplate} from './schema';

/**
 * Session AV lane 2 (body; LEDGER #109, MacroFactor Workouts' rep-progression schemes): the next session's targets from a
 * routine's progression rule and the last time the person did that routine's exercise — from their own sets only.
 * - double (a rep range): every working set reached the top of the range → add the step and start again at the bottom;
 *   otherwise the same weight, one more rep on each set below the top.
 * - linear: every working set reached the reps the routine plans → add the step; otherwise the same weight again.
 * Reps-only exercises add a rep instead of weight, timed ones five seconds; distance is left as it is. A first session
 * has no target (nothing to build on). Nothing is stored: the targets fill the sets when the routine starts. Pure.
 */
export type Target = {exerciseId: string; sets: {weightKg?: number; reps?: number; seconds?: number}[]; why: 'up' | 'more-reps' | 'repeat'; lastDate: string};
const working = (e: Pick<ExerciseEntry, 'sets' | 'measure'>) => e.sets.filter(s => s.kind !== 'warmup' && setReady(e.measure, s));
const round = (kg: number) => Math.round(kg * 1000) / 1000;
/** The last finished session of this exercise from this routine (else any), started before `before`. */
function lastFrom(w: Workouts, routineId: string, exerciseId: string, before?: string): {entry: ExerciseEntry; date: string} | null {
  const past = finished(w).filter(x => !before || x.startedAt < before);
  for (const pick of [(x: (typeof past)[number]) => x.templateId === routineId, () => true]) for (const x of past) { if (!pick(x)) continue; const entry = x.exercises.find(e => e.exerciseId === exerciseId); if (entry && working(entry).length) return {entry, date: x.date}; }
  return null;
}
export function targetFor(w: Workouts, routine: Pick<WorkoutTemplate, 'id' | 'exercises' | 'progression'>, exerciseId: string, before?: string): Target | null {
  const rule: Progression | undefined = routine.progression, planned = routine.exercises.find(e => e.exerciseId === exerciseId);
  if (!rule || !planned || planned.measure === 'distance-time') return null;
  const last = lastFrom(w, routine.id, exerciseId, before);
  if (!last) return null;
  const sets = working(last.entry), plannedWork = planned.sets.filter(s => s.kind !== 'warmup');
  const count = Math.max(1, plannedWork.length || sets.length);
  const at = (i: number) => sets[Math.min(i, sets.length - 1)]!;
  if (planned.measure === 'time') {
    const done = sets.every((s, i) => (s.seconds ?? 0) >= (plannedWork[i]?.seconds ?? 0));
    return {exerciseId, lastDate: last.date, why: done ? 'up' : 'repeat', sets: Array.from({length: count}, (_, i) => ({seconds: Math.min(86_400, (at(i).seconds ?? 0) + (done ? 5 : 0))}))};
  }
  const top = rule.kind === 'double' ? rule.maxReps! : undefined, bottom = rule.kind === 'double' ? rule.minReps! : undefined;
  const reached = rule.kind === 'double' ? sets.length >= count && sets.every(s => (s.reps ?? 0) >= top!) : sets.length >= count && sets.every((s, i) => (s.reps ?? 0) >= (plannedWork[i]?.reps ?? 0));
  if (planned.measure === 'reps') {
    return {exerciseId, lastDate: last.date, why: reached ? 'more-reps' : 'repeat', sets: Array.from({length: count}, (_, i) => ({reps: Math.min(1000, (at(i).reps ?? 0) + (reached || rule.kind === 'double' ? 1 : 0))}))};
  }
  const heaviest = Math.max(...sets.map(s => s.weightKg ?? 0));
  if (reached) return {exerciseId, lastDate: last.date, why: 'up', sets: Array.from({length: count}, (_, i) => ({weightKg: round(Math.min(1000, heaviest + rule.stepKg)), reps: rule.kind === 'double' ? bottom : plannedWork[i]?.reps ?? at(i).reps}))};
  return {exerciseId, lastDate: last.date, why: rule.kind === 'double' ? 'more-reps' : 'repeat', sets: Array.from({length: count}, (_, i) => ({weightKg: at(i).weightKg ?? heaviest, reps: rule.kind === 'double' ? Math.min(top!, (at(i).reps ?? 0) + 1) : plannedWork[i]?.reps ?? at(i).reps}))};
}
/** The routine as it starts today: each exercise with a target takes it (warm-ups as planned), the rest as written. */
export function progressed(w: Workouts, routine: WorkoutTemplate, before?: string): WorkoutTemplate {
  if (!routine.progression) return routine;
  return {...routine, exercises: routine.exercises.map(e => {
    const t = targetFor(w, routine, e.exerciseId, before);
    if (!t) return e;
    const warm = e.sets.filter(s => s.kind === 'warmup');
    return {...e, sets: [...warm, ...t.sets.map(s => ({kind: 'normal' as const, ...s}))]};
  })};
}
/** Sets (or removes, with null) a routine's progression rule. */
export function setProgression(w: Workouts, routineId: string, rule: Progression | null): Workouts {
  if (!w.templates.some(t => t.id === routineId)) throw Error('This routine is no longer here.');
  if (rule?.kind === 'double' && !(rule.minReps! >= 1 && rule.maxReps! > rule.minReps!)) throw Error('Choose a rep range with the lowest first, such as 8 to 12.');
  if (rule && !(rule.stepKg >= 0.25 && rule.stepKg <= 20)) throw Error('Choose a step from 0.25 to 20 kg.');
  return workoutsSchema.parse({...w, templates: w.templates.map(t => { if (t.id !== routineId) return t; const {progression: _p, ...rest} = t; void _p; return rule ? {...rest, progression: rule} : rest; })});
}
