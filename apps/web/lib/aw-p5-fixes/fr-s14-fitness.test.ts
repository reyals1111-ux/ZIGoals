import {describe, expect, test} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {MOVE_FOCUS, SETUP_FOCUSES, movementLeftOut, quickCountersShown, turnOnQuickCounters} from './fitness-choice';
import {ONBOARDING_SETUP, FOCUS_IDS} from '../onboarding-setup';
import {readDeviceRecord} from '../device-record';
import {createEmptyHealth, healthSchema} from '../health';
import {changeCount, DEFAULT_COUNTERS} from '../health-counters';
import {coachSlotShown} from '../health-aa/coach-slot';

/**
 * Session AW (p5-fixes; FR-S-14, the Health and Today parts): a person who left "Move more" out of the welcome no longer
 * sees Push-ups, Pull-ups and Squats on Health's first screen until they use or choose them (Activity → "Show quick
 * counters"), and Today's coach waits for a weigh-in or a goal weight. NOVA's tiles are Carried (AR's NOVA composition).
 */
const memory = (entries: Record<string, string>) => ({getItem: (k: string) => entries[k] ?? null});
const at = '2026-11-20T10:00:00.000Z';
describe('FR-S-14: the example counters wait for a use or a choice', () => {
  test('the read-only view names the welcome\'s own record and "Move more" in its words', () => {
    expect(SETUP_FOCUSES.key).toBe(ONBOARDING_SETUP.key);
    expect(FOCUS_IDS).toContain(MOVE_FOCUS);
  });
  test('it reads a real welcome record, and anything else as no choice', () => {
    const real = ONBOARDING_SETUP.schema.parse({version: 1, at, habitIds: ['h1'], widgetIds: [], focuses: ['water', 'read']});
    expect(readDeviceRecord(memory({[SETUP_FOCUSES.key]: JSON.stringify(real)}), SETUP_FOCUSES).data.focuses).toEqual(['water', 'read']);
    expect(movementLeftOut(readDeviceRecord(memory({[SETUP_FOCUSES.key]: '{not json'}), SETUP_FOCUSES).data)).toBe(false);
    expect(movementLeftOut(readDeviceRecord(memory({}), SETUP_FOCUSES).data)).toBe(false);
  });
  test('no welcome choices, or "Move more" among them: shown as before', () => {
    const fresh = createEmptyHealth();
    expect(quickCountersShown(fresh, null)).toBe(true);
    expect(quickCountersShown(fresh, {version: 1})).toBe(true);
    expect(quickCountersShown(fresh, {version: 1, focuses: []})).toBe(true);
    expect(quickCountersShown(fresh, {version: 1, focuses: ['water', 'move']})).toBe(true);
    // An undone setup is no choice.
    expect(quickCountersShown(fresh, {version: 1, focuses: ['water'], undone: true})).toBe(true);
  });
  test('choices without movement: hidden until a first count or "Show quick counters"', () => {
    const setup = {version: 1 as const, focuses: ['water', 'read', 'save']}, fresh = createEmptyHealth();
    expect(quickCountersShown(fresh, setup)).toBe(false);
    const counted = changeCount(fresh, DEFAULT_COUNTERS[0]!.id, '2026-11-20', 1);
    expect(quickCountersShown(counted, setup)).toBe(true);
    const on = turnOnQuickCounters(fresh);
    expect(quickCountersShown(on, setup)).toBe(true);
    expect(on.exercise).toEqual({version: 1, counters: DEFAULT_COUNTERS.map(c => ({...c})), days: []});
    // Health's own schema keeps it (an existing optional group, nothing new is stored), and a second turn-on changes nothing.
    expect(healthSchema.parse(on).exercise?.counters.map(c => c.name)).toEqual(['Push-ups', 'Pull-ups', 'Squats']);
    expect(turnOnQuickCounters(counted)).toBe(counted);
  });
  test('Health draws the counters only when shown and offers them in Activity otherwise', () => {
    const app = readFileSync(join(__dirname, '..', '..', 'components', 'health', 'health-app.tsx'), 'utf8');
    expect(app).toContain('{!phone && countersOn && <ExerciseCounters');
    expect(app).toContain('{phone && countersOn && <ExerciseCounters');
    expect(app).toMatch(/view === "Activity" && <>\{!countersOn && <p className="fine health-counters-off">.*Show quick counters<\/button><\/p>\}/);
  });
});

describe('FR-S-14: Today\'s coach waits for a weigh-in or a goal weight', () => {
  test('with the goal weight known, records alone no longer bring the coach', () => {
    expect(coachSlotShown({healthShown: true, weights: 0, records: 4, weightGoal: false})).toBe(false);
    expect(coachSlotShown({healthShown: true, weights: 0, records: 0, weightGoal: true})).toBe(true);
    expect(coachSlotShown({healthShown: true, weights: 1, records: 1, weightGoal: false})).toBe(true);
    expect(coachSlotShown({healthShown: false, weights: 0, records: 4, weightGoal: true})).toBe(false);
    expect(coachSlotShown({healthShown: false, weights: 2, weightGoal: false})).toBe(true);
  });
  test('the earlier rule holds where the goal weight is not passed', () => {
    expect(coachSlotShown({healthShown: true, weights: 0, records: 2})).toBe(true);
    expect(coachSlotShown({healthShown: true, weights: 0, records: 0})).toBe(false);
  });
  test('Today\'s slot card passes the goal weight', () => {
    const card = readFileSync(join(__dirname, '..', '..', 'components', 'health', 'coach-card.tsx'), 'utf8');
    expect(card).toContain('weightGoal: health.data.targets.weightGrams !== null');
  });
});
