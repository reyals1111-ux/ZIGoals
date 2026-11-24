import {describe, expect, test} from 'vitest';
import {collectEverything, DEVICE_KEYS} from '../export/everything';
import {nextValue, planParts} from '../restore/plan';
import {WORKOUTS_KEY, workoutsSchema} from './schema';
import {PLANNED_KEY, plannedRecordSchema} from './planned';

/**
 * Session AV lane 2, round 5 (gym; TIER 3 (stored formats), additive): a routine's `keepWeights`, a workout's `photos` and
 * `star`, the plate set's `oneSide` and `start`, and the planned-workouts record's `statuses`. A record written by an earlier
 * release reads as before; an unreadable new value is dropped alone; Export everything → erase → Restore keeps each.
 */
const AT = '2026-11-20T08:00:00.000Z';
const OLD = {version: 1, workouts: [{id: 'w-1', name: 'Push day', date: '2026-11-19', type: 'strength', startedAt: AT, endedAt: '2026-11-20T09:00:00.000Z', exercises: []}],
  templates: [{id: 'routine-a', name: 'Push day', type: 'strength', createdAt: AT, exercises: [{exerciseId: 'bench-press', name: 'Bench press', measure: 'weight-reps', sets: [{kind: 'normal', weightKg: 60, reps: 8}]}]}],
  exercises: [], restSeconds: 90, plates: {unit: 'kg', bar: 20, plates: [{size: 20, pairs: 2}]}};
const NEW = {...OLD, workouts: [{...OLD.workouts[0], photos: ['wph-0a1b2c3d-4e5f'], star: true}], templates: [{...OLD.templates[0], keepWeights: true}], plates: {...OLD.plates, oneSide: true, start: 40}};

describe('the workout log, round 5 fields', () => {
  test('a log written by an earlier release reads as before', () => {
    const w = workoutsSchema.parse(OLD);
    expect(w.workouts[0]!.photos).toBeUndefined();
    expect(w.workouts[0]!.star).toBeUndefined();
    expect(w.templates[0]!.keepWeights).toBeUndefined();
    expect(w.plates).toEqual(OLD.plates);
  });
  test('the new fields are kept as written', () => {
    const w = workoutsSchema.parse(NEW);
    expect(w.workouts[0]).toMatchObject({photos: ['wph-0a1b2c3d-4e5f'], star: true});
    expect(w.templates[0]!.keepWeights).toBe(true);
    expect(w.plates).toMatchObject({oneSide: true, start: 40, bar: 20});
  });
  test('an unreadable new value is dropped alone', () => {
    const w = workoutsSchema.parse({...NEW, workouts: [{...NEW.workouts[0], photos: ['x', 'y', 'z', 'q', 'r'], star: 'yes'}], templates: [{...NEW.templates[0], keepWeights: 1}], plates: {...NEW.plates, oneSide: 'no', start: 9000}});
    expect(w.workouts[0]!.name).toBe('Push day');
    expect(w.workouts[0]!.photos).toBeUndefined();
    expect(w.workouts[0]!.star).toBeUndefined();
    expect(w.templates[0]!.keepWeights).toBeUndefined();
    expect(w.plates).toEqual(OLD.plates);
  });
  test('Export everything → erase → Restore keeps every new field', () => {
    const collected = collectEverything({[WORKOUTS_KEY]: JSON.stringify(workoutsSchema.parse(NEW))}, {now: new Date(AT), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null});
    const part = planParts(JSON.parse(JSON.stringify(collected.json))).find(p => p.kind === 'device' && p.key === WORKOUTS_KEY);
    expect(part).toBeDefined();
    const back = nextValue(part!, 'replace', undefined);
    expect('value' in back && workoutsSchema.parse(back.value)).toEqual(workoutsSchema.parse(NEW));
  });
});

const STATUSES = [{id: 'st-1', kind: 'ill', from: '2026-10-01', to: '2026-10-09', createdAt: AT}, {id: 'st-2', kind: 'break', from: '2026-11-16', createdAt: AT}];
describe('the planned-workouts record, statuses', () => {
  test('a record without statuses reads as before; statuses are kept as written', () => {
    expect(plannedRecordSchema.parse({version: 1, items: []}).statuses).toBeUndefined();
    expect(plannedRecordSchema.parse({version: 1, items: [], statuses: STATUSES}).statuses).toEqual(STATUSES);
  });
  test('an unreadable status is dropped and the others kept', () => {
    const r = plannedRecordSchema.parse({version: 1, items: [], statuses: [...STATUSES, {id: 'st-3', kind: 'sad', from: '2026-11-01', createdAt: AT}, {id: 'st-4', kind: 'ill', from: '2026-11-10', to: '2026-11-01', createdAt: AT}], later: {kept: true}});
    expect(r.statuses).toEqual(STATUSES);
    expect(r).toMatchObject({later: {kept: true}});
    expect(plannedRecordSchema.parse({version: 1, items: [], statuses: 'no'}).statuses).toBeUndefined();
  });
  const registered = Object.values(DEVICE_KEYS as Record<string, string>).includes(PLANNED_KEY);
  test.skipIf(!registered)('Export everything → erase → Restore keeps the statuses', () => {
    const value = plannedRecordSchema.parse({version: 1, items: [], statuses: STATUSES});
    const collected = collectEverything({[PLANNED_KEY]: JSON.stringify(value)}, {now: new Date(AT), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null});
    const part = planParts(JSON.parse(JSON.stringify(collected.json))).find(p => p.kind === 'device' && p.key === PLANNED_KEY);
    expect(part).toBeDefined();
    const back = nextValue(part!, 'replace', undefined);
    expect('value' in back ? back.value : undefined).toEqual(value);
  });
});
