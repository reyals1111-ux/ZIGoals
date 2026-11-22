import {describe, expect, test} from 'vitest';
import {collectEverything, DEVICE_KEYS} from '../export/everything';
import {nextValue, planParts} from '../restore/plan';
import {EVENING_PLAN_KEY, eveningRecordSchema} from '../evening-plan/schema';
import {WORKOUTS_KEY, workoutsSchema} from './schema';

/**
 * Session AV lane 2 (body; TIER 3 (stored formats), additive): the new optional fields of the workout log (a routine's
 * folder, note, library id and progression rule; pinned exercise notes; distance goals) and the new evening-plan key.
 * A record written by an earlier release still reads; an unreadable new value is dropped, never a reason to refuse the
 * log; and Export everything → erase → Restore keeps every new field.
 */
const AT = '2026-11-20T08:00:00.000Z';
const OLD = {version: 1, workouts: [], templates: [{id: 'routine-a', name: 'Push day', type: 'strength', createdAt: AT, exercises: [{exerciseId: 'bench-press', name: 'Bench press', measure: 'weight-reps', sets: [{kind: 'normal', weightKg: 60, reps: 8}]}]}], exercises: [], restSeconds: 90};
const NEW = {...OLD, templates: [{...OLD.templates[0], folder: 'Gym', note: 'Example · keep the elbows in', guideId: 'push-pull-legs-push', progression: {kind: 'double', minReps: 6, maxReps: 10, stepKg: 2.5}}],
  pinnedNotes: {'bench-press': 'Example · seat at notch 4'}, distanceGoals: [{id: 'goal-run-month', sport: 'run', period: 'month', km: 60, createdAt: AT}]};

describe('the workout log, additive fields', () => {
  test('a log written by an earlier release reads as before, with none of the new fields', () => {
    const w = workoutsSchema.parse(OLD);
    expect(w.templates[0]!.folder).toBeUndefined();
    expect(w.pinnedNotes).toBeUndefined();
    expect(w.distanceGoals).toBeUndefined();
  });
  test('the new fields are kept as written', () => {
    const w = workoutsSchema.parse(NEW);
    expect(w.templates[0]).toMatchObject({folder: 'Gym', note: 'Example · keep the elbows in', guideId: 'push-pull-legs-push', progression: {kind: 'double', minReps: 6, maxReps: 10, stepKg: 2.5}});
    expect(w.pinnedNotes).toEqual({'bench-press': 'Example · seat at notch 4'});
    expect(w.distanceGoals).toHaveLength(1);
  });
  test('an unreadable new value is dropped; the rest of the log is kept', () => {
    const bad = {...NEW, templates: [{...NEW.templates[0], folder: '', progression: {kind: 'double', minReps: 10, maxReps: 6, stepKg: 2.5}, guideId: 'Not An Id'}], pinnedNotes: {'__proto__': 'x'}, distanceGoals: [{sport: 'fly'}]};
    const w = workoutsSchema.parse(bad);
    expect(w.templates[0]!.name).toBe('Push day');
    expect(w.templates[0]!.folder).toBeUndefined();
    expect(w.templates[0]!.progression).toBeUndefined();
    expect(w.templates[0]!.guideId).toBeUndefined();
    expect(w.distanceGoals).toBeUndefined();
  });
  test('Export everything → erase → Restore keeps every new field', () => {
    const collected = collectEverything({[WORKOUTS_KEY]: JSON.stringify(workoutsSchema.parse(NEW))}, {now: new Date(AT), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null});
    // Erase: the device holds nothing; the backup is all there is.
    const part = planParts(JSON.parse(JSON.stringify(collected.json))).find(p => p.kind === 'device' && p.key === WORKOUTS_KEY);
    expect(part).toBeDefined();
    const back = nextValue(part!, 'replace', undefined);
    expect('value' in back && workoutsSchema.parse(back.value)).toEqual(workoutsSchema.parse(NEW));
  });
});

const PLAN = {version: 1, plan: {bedtime: '23:00', windDown: 45, hindrances: ['screens'], steps: [{id: 'screens-away', label: 'Screens away', minutesBefore: 45}, {id: 'habit-read', label: 'Read', minutesBefore: 20, habitId: 'habit-read-1'}], updatedAt: AT}, days: {'2026-11-19': ['screens-away']}};
describe('the evening plan record', () => {
  test('reads as written; an unreadable plan is dropped, the evenings kept', () => {
    expect(eveningRecordSchema.parse(PLAN)).toEqual(PLAN);
    const r = eveningRecordSchema.parse({...PLAN, plan: {bedtime: '25:00'}});
    expect(r.plan).toBeUndefined();
    expect(r.days).toEqual(PLAN.days);
  });
  test('survives a JSON round trip unchanged (what a backup stores)', () => {
    expect(eveningRecordSchema.parse(JSON.parse(JSON.stringify(eveningRecordSchema.parse(PLAN))))).toEqual(PLAN);
  });
  // The key joins Export everything and the restore plan through the lead's registries (docs/review/session-av/lane2/body.md);
  // from then on this round trip runs on every test run.
  const registered = Object.values(DEVICE_KEYS as Record<string, string>).includes(EVENING_PLAN_KEY);
  test.skipIf(!registered)('Export everything → erase → Restore keeps the plan and its evenings', () => {
    const collected = collectEverything({[EVENING_PLAN_KEY]: JSON.stringify(PLAN)}, {now: new Date(AT), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null});
    const part = planParts(JSON.parse(JSON.stringify(collected.json))).find(p => p.kind === 'device' && p.key === EVENING_PLAN_KEY);
    expect(part).toBeDefined();
    const back = nextValue(part!, 'replace', undefined);
    expect('value' in back && back.value).toEqual(PLAN);
  });
});
