import type {Workouts} from './schema';

/**
 * Session AV lane 2 (body; LEDGER #207, Strong's CSV export with notes): `workout-sets.csv` with the columns it had (in the
 * same order, so a sheet built on them still reads) and six more at the end: how hard the set felt (RPE), the added weight
 * or the help on a bodyweight set, the exercise's note, the workout's note and the shoes. The records are unchanged; only
 * the export catalogue's columns grow. The lead points `lib/export/everything.ts` (`CSV_HEADERS['workout-sets.csv']` and
 * the `out['workout-sets.csv']` line) at these two, so the existing CSV helper still escapes every cell.
 */
export const WORKOUT_SET_COLUMNS = ['workout_id', 'workout_name', 'date', 'started_at_utc', 'ended_at_utc', 'exercise', 'exercise_id', 'set_number', 'set_kind', 'weight_kg', 'reps', 'distance_km', 'seconds',
  'rpe', 'added_kg', 'assist_kg', 'exercise_note', 'workout_note', 'shoes'] as const;
export type WorkoutSetCell = string | number;
export function workoutSetRows(w: Workouts | null | undefined): WorkoutSetCell[][] {
  const shoes = new Map((w?.shoes ?? []).map(s => [s.id, s.name] as const));
  return (w?.workouts ?? []).filter(x => x.endedAt).flatMap(x => x.exercises.flatMap(e => e.sets.map((st, i) => [
    x.id, x.name, x.date, x.startedAt, x.endedAt ?? '', e.name, e.exerciseId, i + 1, st.kind, st.weightKg ?? '', st.reps ?? '', st.distanceKm ?? '', st.seconds ?? '',
    st.rpe ?? '', st.addedKg ?? '', st.assistKg ?? '', e.note ?? '', x.notes ?? '', x.shoeId ? shoes.get(x.shoeId) ?? '' : '',
  ])));
}
