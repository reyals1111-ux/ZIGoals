import {describe, expect, test} from 'vitest';
import {HEALTH_GOALS_KEY, MAX_HEALTH_GOALS, emptyHealthGoals, healthGoalIssue, healthGoalSchema, healthGoalsSchema, targetNumber, type HealthGoal} from './schema';
import {addHealthGoal, editHealthGoal, readHealthGoals, removeHealthGoal, setHealthGoalStatus, startOverHealthGoals, updateHealthGoals} from './store';

const AT = '2026-09-01T07:00:00.000Z';
const id = (n: number) => `92000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const STEPS: HealthGoal = {version: 1, id: id(1), name: 'Walk more', measure: 'steps', direction: 'at-least', target: {value: '8000', decimals: 0}, unit: 'steps', window: {kind: 'rolling', weeks: 4}, status: 'active', createdAt: AT, updatedAt: AT};
function memoryStorage() { const m = new Map<string, string>(); return {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage; }

describe('health goal schema', () => {
  test('accepts the measures with their directions and windows; refuses what a goal cannot say', () => {
    for (const goal of [STEPS, {...STEPS, measure: 'weight', direction: 'down', target: {value: '72500', decimals: 3}, unit: 'kg'}, {...STEPS, measure: 'weight', direction: 'up', unit: 'lb', target: {value: '1587', decimals: 1}}, {...STEPS, measure: 'water', unit: 'days', target: {value: '25', decimals: 0}, window: {kind: 'by', date: '2026-12-31'}}, {...STEPS, measure: 'exercise', exerciseId: 'health_counter-pushups', unit: 'reps'}, {...STEPS, measure: 'activeMinutes', unit: 'minutes', notes: 'x'.repeat(2000)}] as const) expect(healthGoalSchema.safeParse(goal).success).toBe(true);
    expect(healthGoalIssue({...STEPS, name: '   '})).toBe('Give the goal a name.');
    expect(healthGoalIssue({...STEPS, measure: 'weight'})).toBe('A weight goal goes towards a lower or a higher weight; every other goal is "at least".');
    expect(healthGoalIssue({...STEPS, direction: 'down'})).toBe('A weight goal goes towards a lower or a higher weight; every other goal is "at least".');
    expect(healthGoalIssue({...STEPS, target: {value: '0', decimals: 0}})).toBe('Enter a target above zero.');
    expect(healthGoalIssue({...STEPS, measure: 'exercise'})).toBe('Choose an exercise counter.');
    for (const goal of [{...STEPS, target: {value: '0', decimals: 0}}, {...STEPS, measure: 'mood'}, {...STEPS, version: 2}, {...STEPS, progress: 50}, {...STEPS, window: {kind: 'rolling', weeks: 105}}, {...STEPS, target: {value: '08000', decimals: 0}}, {...STEPS, unit: ''}]) expect(healthGoalSchema.safeParse(goal).success).toBe(false);
    expect(targetNumber({target: {value: '72500', decimals: 3}})).toBe(72.5);
  });
  test('the record: limits, unique ids, version 2 refused', () => {
    expect(healthGoalsSchema.parse(emptyHealthGoals())).toEqual({version: 1, goals: []});
    const goals = Array.from({length: MAX_HEALTH_GOALS}, (_, i) => ({...STEPS, id: id(i + 1)}));
    expect(healthGoalsSchema.safeParse({version: 1, goals}).success).toBe(true);
    expect(healthGoalsSchema.safeParse({version: 1, goals: [...goals, {...STEPS, id: id(999)}]}).success).toBe(false);
    expect(healthGoalsSchema.safeParse({version: 1, goals: [STEPS, STEPS]}).success).toBe(false);
    expect(healthGoalsSchema.safeParse({version: 2, goals: []}).success).toBe(false);
  });
});

describe('health goals store', () => {
  test('unreadable bytes read as empty, say so, and are never touched; Start over keeps a recovery copy', () => {
    const storage = memoryStorage();
    expect(readHealthGoals(storage)).toEqual({data: emptyHealthGoals(), unreadable: false});
    storage.setItem(HEALTH_GOALS_KEY, JSON.stringify({version: 2, goals: []}));
    expect(readHealthGoals(storage)).toEqual({data: emptyHealthGoals(), unreadable: true});
    expect(() => updateHealthGoals(storage, current => current)).toThrow('could not be read');
    expect(storage.getItem(HEALTH_GOALS_KEY)).toBe(JSON.stringify({version: 2, goals: []}));
    expect(startOverHealthGoals(storage)).toEqual(emptyHealthGoals());
    const recovery = Array.from({length: storage.length}, (_, i) => storage.key(i)!).find(k => k.startsWith(`${HEALTH_GOALS_KEY}:recovery:`))!;
    expect(storage.getItem(recovery)).toBe(JSON.stringify({version: 2, goals: []}));
  });
  test('add, edit, status, remove write the exact validated record; an invalid draft writes nothing', () => {
    const storage = memoryStorage(), now = new Date(AT);
    const {version, id: _id, status, createdAt, updatedAt, ...draft} = STEPS; void version; void _id; void status; void createdAt; void updatedAt;
    const added = updateHealthGoals(storage, current => addHealthGoal(current, draft, now, id(1)));
    expect(JSON.parse(storage.getItem(HEALTH_GOALS_KEY)!)).toEqual({version: 1, goals: [STEPS]});
    expect(() => updateHealthGoals(storage, current => addHealthGoal(current, {...draft, target: {value: '0', decimals: 0}}, now))).toThrow();
    expect(readHealthGoals(storage).data).toEqual(added);
    const later = new Date('2026-09-02T07:00:00.000Z');
    expect(updateHealthGoals(storage, current => editHealthGoal(current, id(1), {...draft, name: 'Walk a lot'}, later)).goals[0]).toMatchObject({name: 'Walk a lot', createdAt: AT, updatedAt: later.toISOString()});
    expect(updateHealthGoals(storage, current => setHealthGoalStatus(current, id(1), 'done', later)).goals[0]!.status).toBe('done');
    expect(() => updateHealthGoals(storage, current => setHealthGoalStatus(current, id(2), 'closed', later))).toThrow('no longer available');
    expect(updateHealthGoals(storage, current => removeHealthGoal(current, id(1))).goals).toEqual([]);
    const full = {version: 1 as const, goals: Array.from({length: MAX_HEALTH_GOALS}, (_, i) => ({...STEPS, id: id(i + 1)}))};
    expect(() => addHealthGoal(full, draft, now)).toThrow('the most it keeps');
  });
});
