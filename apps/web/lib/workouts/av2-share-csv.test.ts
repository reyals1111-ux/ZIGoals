import {describe, expect, test} from 'vitest';
import {addSharedRoutine, exportRoutine, readRoutineFile, workoutShareFileName, workoutShareText, WORKOUT_SHARE_KIND} from './share';
import {WORKOUT_SET_COLUMNS, workoutSetRows} from './csv';
import {workoutsSchema, type Workouts} from './schema';

/** Session AV lane 2 (body; LEDGER #206, #207; Strong): a routine shared as a small file; workout-sets.csv with notes. */
const AT = '2026-11-20T08:00:00.000Z';
const w: Workouts = workoutsSchema.parse({version: 1, restSeconds: 90, exercises: [{id: 'custom-sled', name: 'Sled push', category: 'Legs', measure: 'time'}],
  templates: [{id: 'routine-a', name: 'Fictional legs', type: 'strength', createdAt: AT, note: 'Private · knee', folder: 'Gym', progression: {kind: 'double', minReps: 6, maxReps: 10, stepKg: 2.5},
    exercises: [{exerciseId: 'squat', name: 'Squat', measure: 'weight-reps', restSeconds: 180, sets: [{kind: 'warmup', weightKg: 40, reps: 8}, {kind: 'normal', weightKg: 100, reps: 6}]},
      {exerciseId: 'custom-sled', name: 'Sled push', measure: 'time', sets: [{kind: 'normal', seconds: 30}]}, {exerciseId: 'pull-up', name: 'Pull-up', measure: 'reps', load: 'assisted', sets: [{kind: 'normal', reps: 8, assistKg: 20}]}]}],
  shoes: [{id: 'shoe-a', name: 'Fictional trainers', startKm: 0, retireKm: 700, createdAt: AT}],
  workouts: [{id: 'w1', name: 'Fictional legs', date: '2026-11-20', type: 'strength', startedAt: AT, endedAt: '2026-11-20T09:00:00.000Z', notes: 'Felt strong, "really"', shoeId: 'shoe-a',
    exercises: [{id: 'e1', exerciseId: 'squat', name: 'Squat', measure: 'weight-reps', note: 'Bars at 6', sets: [{id: 's1', kind: 'normal', weightKg: 100, reps: 6, rpe: 8.5, done: true}]},
      {id: 'e2', exerciseId: 'pull-up', name: 'Pull-up', measure: 'reps', load: 'assisted', sets: [{id: 's2', kind: 'normal', reps: 8, assistKg: 20, done: true}]}]}]});
describe('a routine shared as a file', () => {
  test('the structure without weights, notes, folders or own ids by default; weights when ticked', () => {
    const s = exportRoutine(w, w.templates[0]!);
    expect(s).toMatchObject({kind: WORKOUT_SHARE_KIND, version: 1, name: 'Fictional legs', progression: {kind: 'double', minReps: 6, maxReps: 10, stepKg: 2.5}});
    expect(s.exercises[0]).toEqual({builtIn: 'squat', name: 'Squat', category: 'Legs', measure: 'weight-reps', restSeconds: 180, sets: [{kind: 'warmup', reps: 8}, {kind: 'normal', reps: 6}]});
    expect(s.exercises[1]).toEqual({name: 'Sled push', category: 'Legs', measure: 'time', sets: [{kind: 'normal', seconds: 30}]});
    const text = workoutShareText(s);
    for (const secret of ['Private', 'knee', 'Gym', 'custom-sled', 'routine-a', '100', '"assistKg"']) expect(text, secret).not.toContain(secret);
    expect(exportRoutine(w, w.templates[0]!, {includeWeights: true}).exercises[0]!.sets[1]).toEqual({kind: 'normal', reps: 6, weightKg: 100});
    expect(workoutShareFileName(s)).toBe('fictional-legs.zigoals-workout.json');
  });
  test('read strictly: not a file, a newer one, an unknown field, too large', () => {
    const good = workoutShareText(exportRoutine(w, w.templates[0]!));
    expect(readRoutineFile(good).ok).toBe(true);
    expect(readRoutineFile('nope')).toEqual({ok: false, error: 'This is not a workout routine file.'});
    expect(readRoutineFile(JSON.stringify({...JSON.parse(good), version: 2}))).toMatchObject({ok: false, error: expect.stringContaining('newer ZIGoals')});
    expect(readRoutineFile(JSON.stringify({...JSON.parse(good), owner: 'x'})).ok).toBe(false);
    expect(readRoutineFile(JSON.stringify({...JSON.parse(good), name: 'A‮B'})).ok).toBe(false);
    expect(readRoutineFile('x'.repeat(33_000))).toMatchObject({ok: false, error: expect.stringContaining('too large')});
  });
  test('added as a new routine in "Shared with me", with the own exercises it needs', () => {
    const r = readRoutineFile(workoutShareText(exportRoutine(w, w.templates[0]!)));
    if (!r.ok) throw Error(r.error);
    const fresh = workoutsSchema.parse({version: 1, templates: [], exercises: [], workouts: []});
    const added = addSharedRoutine(fresh, r.share, new Date(AT));
    expect(added.newExercises).toBe(1);
    expect(added.routine).toMatchObject({name: 'Fictional legs', folder: 'Shared with me', progression: {kind: 'double'}});
    expect(added.routine.exercises.map(e => e.exerciseId)[0]).toBe('squat');
    expect(added.workouts.exercises[0]).toMatchObject({name: 'Sled push', category: 'Legs', measure: 'time'});
    expect(addSharedRoutine(w, r.share, new Date(AT)).routine.name).toBe('Fictional legs (shared)');
  });
});
describe('workout-sets.csv with notes', () => {
  test('the old columns in their order, then RPE, added weight or help, the notes and the shoes', () => {
    expect(WORKOUT_SET_COLUMNS.slice(0, 13)).toEqual(['workout_id', 'workout_name', 'date', 'started_at_utc', 'ended_at_utc', 'exercise', 'exercise_id', 'set_number', 'set_kind', 'weight_kg', 'reps', 'distance_km', 'seconds']);
    expect(workoutSetRows(w)).toEqual([
      ['w1', 'Fictional legs', '2026-11-20', AT, '2026-11-20T09:00:00.000Z', 'Squat', 'squat', 1, 'normal', 100, 6, '', '', 8.5, '', '', 'Bars at 6', 'Felt strong, "really"', 'Fictional trainers'],
      ['w1', 'Fictional legs', '2026-11-20', AT, '2026-11-20T09:00:00.000Z', 'Pull-up', 'pull-up', 1, 'normal', '', 8, '', '', '', '', 20, '', 'Felt strong, "really"', 'Fictional trainers']]);
    expect(workoutSetRows(null)).toEqual([]);
  });
});
