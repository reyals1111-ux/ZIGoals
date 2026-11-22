import {describe, expect, test} from 'vitest';
import {collectEverything} from './export/everything';
import {nextValue, planParts} from './restore/plan';
import {HEALTH_EXTRAS_KEY, healthExtrasSchema} from './health-extras';
import {MORE_GOALS_KEY, moreGoalsSchema} from './health-goals/more';
import {CALORIE_WEEK_KEY, calorieWeekSchema} from './health-aa/calorie-week';

/**
 * Session AV lane 2, round 4 (health; TIER 3 (stored formats), additive): every new optional field reads, a value this
 * build cannot read is dropped on its own (never the record), records written before keep reading, and Export everything
 * → erase → Restore keeps every new field.
 */
const NOW = '2026-11-20T09:00:00.000Z';
const collect = (key: string, value: unknown) => collectEverything({[key]: JSON.stringify(value)}, {now: new Date(NOW), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null});
const roundTrip = (key: string, value: unknown) => {
  const part = planParts(JSON.parse(JSON.stringify(collect(key, value).json))).find(p => p.kind === 'device' && p.key === key);
  if (!part) return undefined;
  const back = nextValue(part, 'replace', undefined);
  return 'value' in back ? back.value : undefined;
};

describe('zigoals:health-extras:v1 — sleepTips (LEDGER #334)', () => {
  const OLD = {version: 1, waterTips: true, meals: {Lunch: {name: 'Midday'}}};
  const NEW = {...OLD, sleepTips: true};
  test('an older record reads as before, the new field reads, a bad value is dropped alone', () => {
    expect(healthExtrasSchema.parse(OLD)).toEqual(OLD);
    expect(healthExtrasSchema.parse(NEW)).toEqual(NEW);
    expect(healthExtrasSchema.parse({...NEW, sleepTips: 'yes'})).toEqual({...OLD, sleepTips: undefined});
  });
  test('Export everything → erase → Restore keeps it', () => { expect(roundTrip(HEALTH_EXTRAS_KEY, NEW)).toEqual(NEW); });
});

describe('zigoals:health-extras:v1 — returnNote (LEDGER #329)', () => {
  const NEW = {version: 1, returnNote: {text: 'Why: to feel steady.\nOne small thing: log breakfast.', closedFor: '2026-11-15'}};
  test('reads; a bad part is dropped alone', () => {
    expect(healthExtrasSchema.parse(NEW)).toEqual(NEW);
    expect(healthExtrasSchema.parse({...NEW, returnNote: {text: ''}})).toEqual({version: 1, returnNote: undefined});
    expect(healthExtrasSchema.parse({...NEW, returnNote: {...NEW.returnNote, closedFor: 'soon'}})).toEqual({version: 1, returnNote: {text: NEW.returnNote.text, closedFor: undefined}});
  });
  test('Export everything → erase → Restore keeps it', () => { expect(roundTrip(HEALTH_EXTRAS_KEY, NEW)).toEqual(NEW); });
});

describe('zigoals:health-goals-more:v1 — weightBand (LEDGER #331)', () => {
  const OLD = {version: 1, goals: []};
  const NEW = {...OLD, weightBand: {lowGrams: 70_000, highGrams: 73_000, createdAt: '2026-11-01T08:00:00.000Z'}};
  test('an older record reads as before; the band reads; a band that is not one is dropped alone', () => {
    expect(moreGoalsSchema.parse(OLD)).toEqual(OLD);
    expect(moreGoalsSchema.parse(NEW)).toEqual(NEW);
    expect(moreGoalsSchema.parse({...NEW, weightBand: {...NEW.weightBand, highGrams: 70_200}}).weightBand).toBeUndefined();
  });
  test('Export everything → erase → Restore keeps it', () => { expect(roundTrip(MORE_GOALS_KEY, NEW)).toEqual(NEW); });
});

describe('zigoals:calorie-week:v1 — freeDay (LEDGER #328)', () => {
  const OLD = {version: 1, shifts: [0, 0, 0, 0, -200, 200, 0], rollover: {on: true, maxKcal: 200}};
  const NEW = {...OLD, freeDay: {date: '2026-11-21', extraKcal: 600, plannedOn: '2026-11-18'}};
  test('an older record reads as before; the free day reads; a bad one is dropped alone', () => {
    expect(calorieWeekSchema.parse(OLD)).toEqual(OLD);
    expect(calorieWeekSchema.parse(NEW)).toEqual(NEW);
    expect(calorieWeekSchema.parse({...NEW, freeDay: {...NEW.freeDay, extraKcal: 99_999}})).toEqual({...OLD, freeDay: undefined});
  });
  test('Export everything → erase → Restore keeps it', () => { expect(roundTrip(CALORIE_WEEK_KEY, NEW)).toEqual(NEW); });
});

describe('zigoals:health-extras:v1 — napRun (LEDGER #335, review B4E-4)', () => {
  const NEW = {version: 1, sleepTips: true, napRun: {startedAt: '2026-11-20T13:00:00.000Z', minutes: 20}};
  test('reads; a bad one is dropped alone', () => {
    expect(healthExtrasSchema.parse(NEW)).toEqual(NEW);
    expect(healthExtrasSchema.parse({...NEW, napRun: {startedAt: 'soon', minutes: 20}})).toEqual({version: 1, sleepTips: true, napRun: undefined});
  });
  test('Export everything → erase → Restore keeps it', () => { expect(roundTrip(HEALTH_EXTRAS_KEY, NEW)).toEqual(NEW); });
});

