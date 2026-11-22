import {describe, expect, test} from 'vitest';
import {progressed, setProgression, targetFor} from './progression';
import {showcaseWorkouts} from './showcase';
import {workoutsSchema, type Workouts, type WorkoutTemplate} from './schema';

/** Session AV lane 2 (body; LEDGER #109, MacroFactor's rep progression): next session's targets from the person's own sets. */
const AT = (d: string) => `${d}T08:00:00.000Z`;
const routine = (progression: WorkoutTemplate['progression'], measure: 'weight-reps' | 'reps' | 'time' = 'weight-reps'): WorkoutTemplate => ({id: 'routine-r', name: 'R', type: 'strength', createdAt: AT('2026-11-01'), ...(progression ? {progression} : {}),
  exercises: [{exerciseId: 'bench-press', name: 'Bench press', measure, sets: [{kind: 'warmup', weightKg: 40, reps: 10}, ...Array.from({length: 3}, () => ({kind: 'normal' as const, reps: 8, ...(measure === 'time' ? {seconds: 30} : {})}))]}]});
const log = (r: WorkoutTemplate, sets: {kg?: number; reps?: number; seconds?: number}[], measure: 'weight-reps' | 'reps' | 'time' = 'weight-reps'): Workouts => workoutsSchema.parse({version: 1, templates: [r], exercises: [], restSeconds: 90,
  workouts: [{id: 'w1', name: 'R', date: '2026-11-20', type: 'strength', startedAt: AT('2026-11-20'), endedAt: '2026-11-20T09:00:00.000Z', templateId: r.id,
    exercises: [{id: 'e1', exerciseId: 'bench-press', name: 'Bench press', measure, sets: [{id: 'w', kind: 'warmup', weightKg: 40, reps: 10, done: true}, ...sets.map((s, i) => ({id: `s${i}`, kind: 'normal', weightKg: s.kg, reps: s.reps, seconds: s.seconds, done: true}))]}]}]});

describe('double progression (a rep range)', () => {
  const r = routine({kind: 'double', minReps: 8, maxReps: 12, stepKg: 2.5});
  test('every set at the top: the step is added, reps back to the bottom', () => {
    expect(targetFor(log(r, [{kg: 60, reps: 12}, {kg: 60, reps: 12}, {kg: 60, reps: 12}]), r, 'bench-press')).toMatchObject({why: 'up', lastDate: '2026-11-20', sets: [{weightKg: 62.5, reps: 8}, {weightKg: 62.5, reps: 8}, {weightKg: 62.5, reps: 8}]});
  });
  test('not yet: the same weight, one more rep on each set below the top', () => {
    expect(targetFor(log(r, [{kg: 60, reps: 12}, {kg: 60, reps: 10}, {kg: 60, reps: 9}]), r, 'bench-press')).toMatchObject({why: 'more-reps', sets: [{weightKg: 60, reps: 12}, {weightKg: 60, reps: 11}, {weightKg: 60, reps: 10}]});
  });
  test('the routine starts at the targets, its warm-up as planned; a first session has none', () => {
    const start = progressed(log(r, [{kg: 60, reps: 12}, {kg: 60, reps: 12}, {kg: 60, reps: 12}]), r);
    expect(start.exercises[0]!.sets).toEqual([{kind: 'warmup', weightKg: 40, reps: 10}, {kind: 'normal', weightKg: 62.5, reps: 8}, {kind: 'normal', weightKg: 62.5, reps: 8}, {kind: 'normal', weightKg: 62.5, reps: 8}]);
    const fresh = workoutsSchema.parse({version: 1, templates: [r], exercises: [], restSeconds: 90, workouts: []});
    expect(targetFor(fresh, r, 'bench-press')).toBeNull();
    expect(progressed(fresh, r)).toEqual(r);
  });
  test('only sessions before the workout in progress count', () => {
    const w = log(r, [{kg: 60, reps: 12}, {kg: 60, reps: 12}, {kg: 60, reps: 12}]);
    expect(targetFor(w, r, 'bench-press', AT('2026-11-19'))).toBeNull();
  });
});
describe('linear progression and other measures', () => {
  test('linear: all planned reps done adds the step; a missed set repeats the weight', () => {
    const r = routine({kind: 'linear', stepKg: 5});
    expect(targetFor(log(r, [{kg: 100, reps: 8}, {kg: 100, reps: 8}, {kg: 100, reps: 8}]), r, 'bench-press')).toMatchObject({why: 'up', sets: [{weightKg: 105, reps: 8}, {weightKg: 105, reps: 8}, {weightKg: 105, reps: 8}]});
    expect(targetFor(log(r, [{kg: 100, reps: 8}, {kg: 100, reps: 8}, {kg: 100, reps: 6}]), r, 'bench-press')).toMatchObject({why: 'repeat', sets: [{weightKg: 100, reps: 8}, {weightKg: 100, reps: 8}, {weightKg: 100, reps: 8}]});
  });
  test('reps-only adds a rep; timed adds five seconds; no rule, no target', () => {
    const reps = routine({kind: 'linear', stepKg: 2.5}, 'reps');
    expect(targetFor(log(reps, [{reps: 8}, {reps: 8}, {reps: 8}], 'reps'), reps, 'bench-press')!.sets).toEqual([{reps: 9}, {reps: 9}, {reps: 9}]);
    const timed = routine({kind: 'linear', stepKg: 2.5}, 'time');
    expect(targetFor(log(timed, [{seconds: 30}, {seconds: 30}, {seconds: 30}], 'time'), timed, 'bench-press')!.sets).toEqual([{seconds: 35}, {seconds: 35}, {seconds: 35}]);
    const none = routine(undefined);
    expect(targetFor(log(none, [{kg: 60, reps: 12}]), none, 'bench-press')).toBeNull();
  });
  test('setProgression sets, refuses a bad range, removes', () => {
    const r = routine(undefined), w = log(r, []);
    expect(setProgression(w, r.id, {kind: 'double', minReps: 6, maxReps: 10, stepKg: 2.5}).templates[0]!.progression).toEqual({kind: 'double', minReps: 6, maxReps: 10, stepKg: 2.5});
    expect(() => setProgression(w, r.id, {kind: 'double', minReps: 10, maxReps: 6, stepKg: 2.5})).toThrow('lowest first');
    expect(setProgression(w, r.id, null).templates[0]!.progression).toBeUndefined();
  });
  test('the Showcase\'s Push day: one more rep at 62.5 kg on the bench', () => {
    const w = showcaseWorkouts('2026-11-17'), push = w.templates.find(t => t.id === 'showcase-routine-push')!;
    expect(targetFor(w, push, 'bench-press')).toMatchObject({why: 'more-reps', sets: [{weightKg: 62.5, reps: 9}, {weightKg: 62.5, reps: 9}, {weightKg: 62.5, reps: 8}]});
  });
});
