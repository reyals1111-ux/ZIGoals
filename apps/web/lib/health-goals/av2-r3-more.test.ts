import {describe, expect, test} from 'vitest';
import {createEmptyHealth, type HealthData} from '../health';
import {saveMeasurement} from '../body-measurements';
import {addLocalDays} from '../local-date';
import {healthNumbersSchema} from '../health-numbers/store';
import {collectEverything, DEVICE_KEYS} from '../export/everything';
import {nextValue, planParts} from '../restore/plan';
import {addMoreGoal, emptyMoreGoals, MORE_GOALS_KEY, moreGoalLine, moreGoalProgress, moreGoalsSchema, nutrientOn, removeMoreGoal, restoreMoreGoal, setMoreGoalStatus, type MoreGoalDraft} from './more';

/**
 * Session AV lane 2 (health r3; LEDGER #287, Carb Manager): goals on a nutrient's daily average, a body measurement or one of
 * your own numbers, over a rolling window; TIER 3 (stored format): the new device record `zigoals:health-goals-more:v1`.
 * Days without a value are left out; nothing is suggested; ketones, glucose and BMI are not offered.
 */
const TODAY = '2026-11-23', NOW = '2026-11-23T08:00:00.000Z';
const entry = (date: string, proteinG: number | null, fiberG?: number) => ({id: `health_${date.replace(/-/g, '')}aa`, sourceId: 'health_food0001', sourceKind: 'food', date, meal: 'Lunch', quantityMilli: 1000, createdAt: NOW, updatedAt: NOW,
  snapshot: {name: 'Fictional bowl', servingGrams: 100, nutrients: {kcal: 400, proteinMg: proteinG === null ? null : proteinG * 1000, carbsMg: 40_000, fatMg: 10_000, ...(fiberG !== undefined ? {fiberMg: fiberG * 1000} : {})}}});
function withFood(days: [number, number | null, number?][]): HealthData {
  return {...createEmptyHealth(), diary: days.map(([ago, p, f]) => entry(addLocalDays(TODAY, -ago), p, f))} as unknown as HealthData;
}
const draft = (over: Partial<MoreGoalDraft> = {}): MoreGoalDraft => ({name: '', source: 'nutrient', key: 'proteinMg', target: '100', direction: 'at-least', windowDays: 7, ...over});

describe('the record (TIER 3 (stored format))', () => {
  test('reads as written; an unreadable goal is dropped, the others kept', () => {
    const one = addMoreGoal(emptyMoreGoals(), draft(), 'g1', NOW);
    if (!one.ok) throw new Error(one.issue.message);
    expect(moreGoalsSchema.parse(one.value)).toEqual(one.value);
    const r = moreGoalsSchema.parse({version: 1, goals: [{id: 'bad id'}, one.value.goals[0], {...one.value.goals[0], id: 'g2', windowDays: 9}], later: {kept: true}});
    expect(r.goals.map(g => g.id)).toEqual(['g1']);
    expect((r as {later?: unknown}).later).toEqual({kept: true});
  });
  const registered = Object.values(DEVICE_KEYS as Record<string, string>).includes(MORE_GOALS_KEY);
  test.skipIf(!registered)('Export everything → erase → Restore keeps the goals', () => {
    const one = addMoreGoal(emptyMoreGoals(), draft(), 'g1', NOW);
    if (!one.ok) throw new Error('no goal');
    const collected = collectEverything({[MORE_GOALS_KEY]: JSON.stringify(one.value)}, {now: new Date(NOW), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null});
    const part = planParts(JSON.parse(JSON.stringify(collected.json))).find(p => p.kind === 'device' && p.key === MORE_GOALS_KEY);
    expect(part).toBeDefined();
    const back = nextValue(part!, 'replace', undefined);
    expect('value' in back ? back.value : undefined).toEqual(one.value);
  });
});

describe('goals on any health number (LEDGER #287)', () => {
  test('adds with a plain name, and says which field to fix', () => {
    const r = addMoreGoal(emptyMoreGoals(), draft(), 'g1', NOW);
    expect(r.ok && r.goal).toMatchObject({name: 'Protein at least 100 g', source: 'nutrient', key: 'proteinMg', target: 100, windowDays: 7, status: 'active'});
    expect(addMoreGoal(emptyMoreGoals(), draft({target: '0'}), 'g', NOW)).toMatchObject({ok: false, issue: {field: 'target'}});
    expect(addMoreGoal(emptyMoreGoals(), draft({key: 'vitaminZ'}), 'g', NOW)).toMatchObject({ok: false, issue: {field: 'key'}});
  });
  test('ketones, glucose and BMI are not offered as a target', () => {
    for (const key of ['Ketones', 'Blood glucose', 'BMI', 'HbA1c']) {
      const r = addMoreGoal(emptyMoreGoals(), draft({source: 'number', key, unit: 'mmol/L', target: '1'}), 'g', NOW);
      expect(r.ok).toBe(false);
      expect(!r.ok && r.issue.message).toContain('medical advice');
    }
  });
  test('a nutrient’s daily average over the last full days; a day without a value is left out, today not counted', () => {
    const data = withFood([[0, 200], [1, 90], [2, 110], [3, null], [5, 100], [9, 50]]);
    expect(nutrientOn(data, addLocalDays(TODAY, -3), 'proteinMg')).toBeNull();
    const r = addMoreGoal(emptyMoreGoals(), draft(), 'g1', NOW);
    if (!r.ok) throw new Error('no goal');
    const p = moreGoalProgress(r.goal, data, null, TODAY);
    expect(p).toMatchObject({average: 100, days: 3, met: true, percent: 100});
    expect(moreGoalLine(r.goal, p)).toBe('Protein: 100 g a day on average over 3 of the last 7 full days. Your goal: at least 100 g. Met.');
    const fibre = addMoreGoal(emptyMoreGoals(), draft({key: 'fiberMg', target: '25'}), 'g2', NOW);
    if (!fibre.ok) throw new Error('no goal');
    expect(moreGoalProgress(fibre.goal, data, null, TODAY)).toMatchObject({average: null, days: 0, met: null});
    expect(moreGoalLine(fibre.goal, moreGoalProgress(fibre.goal, data, null, TODAY))).toContain('No day in the last 7 full days has fibre known');
  });
  test('a body measurement: the average of the window’s days, in cm, at most', () => {
    let data = createEmptyHealth();
    for (const [ago, cm, n] of [[1, 86, 1], [4, 88, 2], [20, 95, 3]] as const) data = saveMeasurement(data, {id: `health_waist000${n}`, kind: 'waist', quantityMilli: cm * 1000, unit: 'cm', observedAt: `${addLocalDays(TODAY, -ago)}T07:00:00+00:00`, timezone: 'UTC', sourceLabel: 'Manual'}, NOW);
    const r = addMoreGoal(emptyMoreGoals(), draft({source: 'body', key: 'waist', target: '85', direction: 'at-most', windowDays: 14}), 'g3', NOW);
    if (!r.ok) throw new Error(r.issue.message);
    const p = moreGoalProgress(r.goal, data, null, TODAY);
    expect(p).toMatchObject({average: 87, days: 2, met: false});
    expect(moreGoalLine(r.goal, p)).toBe('Waist: 87 cm on average over 2 readings in the last 14 days. Your goal: at most 85 cm.');
  });
  test('one of your own numbers, by its name and unit', () => {
    const numbers = healthNumbersSchema.parse({version: 1, entries: [
      {id: 'a', date: addLocalDays(TODAY, -2), kind: 'lab', name: 'Resting pulse', value: 58, unit: 'bpm'},
      {id: 'b', date: addLocalDays(TODAY, -1), kind: 'lab', name: 'resting pulse', value: 62, unit: 'bpm'},
      {id: 'c', date: addLocalDays(TODAY, -1), kind: 'lab', name: 'Resting pulse', value: 99, unit: 'per min'},
    ]});
    const r = addMoreGoal(emptyMoreGoals(), draft({source: 'number', key: 'Resting pulse', unit: 'bpm', target: '60', direction: 'at-most'}), 'g4', NOW);
    if (!r.ok) throw new Error(r.issue.message);
    expect(r.goal.name).toBe('Resting pulse at most 60 bpm');
    expect(moreGoalProgress(r.goal, null, numbers, TODAY)).toMatchObject({average: 60, days: 2, met: true});
  });
  test('close, reopen, remove and Undo keep its place', () => {
    let rec = emptyMoreGoals();
    for (const id of ['g1', 'g2', 'g3']) { const r = addMoreGoal(rec, draft(), id, NOW); if (!r.ok) throw new Error('no'); rec = r.value; }
    expect(setMoreGoalStatus(rec, 'g2', 'closed').goals[1]!.status).toBe('closed');
    const gone = removeMoreGoal(rec, 'g2');
    expect(restoreMoreGoal(gone, rec.goals[1]!, 1).goals.map(g => g.id)).toEqual(['g1', 'g2', 'g3']);
  });
});
