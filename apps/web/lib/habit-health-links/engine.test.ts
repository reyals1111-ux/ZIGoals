import {afterEach, describe, expect, test} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {HABITS_KEY, createHabit, emptyHabitData, habitDataSchema, logHabitValue, setHabitState, type HabitData, type HabitInput} from '../habits';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema, type HealthData} from '../health';
import {saveMeasurement} from '../body-measurements';
import {applyAutoCompletion, autoCheckInMarker, autoCompletions, formatMeasureValue, measureSource, measureValue, ruleMet} from './engine';
import {DEFAULT_DISPLAY_LOCALE, setDisplayLocale} from '../visual-format';
import {type HabitHealthLink, type HabitHealthLinks} from './schema';

// H7 (docs/product/features/H7-auto-checkins.md, "Tests"): the engine against the Showcase fixture and small journals.
const DAY = '2026-10-01', AT = `${DAY}T07:00:00.000Z`;
const deviceZone = process.env.TZ;
afterEach(() => { if (deviceZone === undefined) delete process.env.TZ; else process.env.TZ = deviceZone; });
const link = (patch: Partial<HabitHealthLink>): HabitHealthLink => ({version: 1, measure: 'steps', rule: 'at-least', target: 8000, updatedAt: AT, ...patch});
const WALK = '92000000-0000-4000-8000-000000000003';
function showcase() {
  const {records} = buildShowcase(DAY);
  return {habits: habitDataSchema.parse(JSON.parse(records[HABITS_KEY]!)), health: healthSchema.parse(JSON.parse(records[HEALTH_STORAGE_KEY]!))};
}
const withLinks = (links: Record<string, HabitHealthLink>, applied: HabitHealthLinks['applied'] = []): HabitHealthLinks => ({version: 1, links, applied});
/** The Showcase habits without Walk's entry for the day: Walk is due, nothing logged yet. */
function walkDue(habits: HabitData): HabitData { return {...habits, habits: habits.habits.map(h => h.id === WALK ? {...h, entries: h.entries.filter(e => e.date !== DAY)} : h)}; }
const water = (health: HealthData, entries: {date: string; amountMilli: number; unit: 'ml' | 'fl-oz-us'}[]): HealthData => ({...health, daily: {version: 1, favorites: [], savedMeals: [], plans: [], waterOperations: [], copyOperations: [], groceryNotes: '', preferences: {timezone: null, waterUnit: 'ml', waterTargetMl: null, weightUnit: 'kg'}, ...health.daily, water: entries.map((w, i) => ({id: `health_water-00${i}`, createdAt: AT, updatedAt: AT, ...w}))}});
const INPUT: HabitInput = {title: 'Drink water', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1};

describe('measureValue: the Health day\'s value, or null when nothing was recorded', () => {
  test('water adds the day\'s entries in millilitres; fl oz are converted; no entries is null', () => {
    const health = water(createEmptyHealth(), [{date: DAY, amountMilli: 250_000, unit: 'ml'}, {date: DAY, amountMilli: 500_000, unit: 'ml'}, {date: '2026-09-30', amountMilli: 900_000, unit: 'ml'}]);
    expect(measureValue(health, DAY, link({measure: 'water', target: 500}))).toBe(750);
    expect(measureValue(health, '2026-09-29', link({measure: 'water', target: 500}))).toBeNull();
    expect(measureValue(water(createEmptyHealth(), [{date: DAY, amountMilli: 8000, unit: 'fl-oz-us'}]), DAY, link({measure: 'water', target: 200}))).toBeCloseTo(236.588, 3);
  });
  test('steps and active minutes add the day\'s activities; a day without one is null, not zero', () => {
    const health: HealthData = {...createEmptyHealth(), activity: [{id: 'health_activity-001', date: DAY, name: 'Walk', steps: 6000, minutes: 30, createdAt: AT, updatedAt: AT}, {id: 'health_activity-002', date: DAY, name: 'Run', steps: 2800, minutes: 12, createdAt: AT, updatedAt: AT}]};
    expect(measureValue(health, DAY, link({measure: 'steps'}))).toBe(8800);
    expect(measureValue(health, DAY, link({measure: 'activeMinutes', target: 30}))).toBe(42);
    expect(measureValue(health, '2026-09-30', link({measure: 'steps'}))).toBeNull();
    expect(measureValue(health, '2026-09-30', link({measure: 'activeMinutes', target: 30}))).toBeNull();
  });
  test('weight: a date-only reading or a timed measurement on the day is 1; yesterday\'s is null', () => {
    const weight = link({measure: 'weight', rule: 'recorded', target: undefined});
    const dated: HealthData = {...createEmptyHealth(), weights: [{id: 'health_weight-001', date: DAY, grams: 78400, createdAt: AT, updatedAt: AT}]};
    expect(measureValue(dated, DAY, weight)).toBe(1);
    expect(measureValue(dated, '2026-10-02', weight)).toBeNull();
    const timed = saveMeasurement(createEmptyHealth(), {id: 'health_measure-weight-01', kind: 'weight', quantityMilli: 78400, unit: 'kg', observedAt: `${DAY}T07:30:00+02:00`, timezone: 'Europe/Brussels', sourceLabel: 'Fictional scale'}, AT);
    expect(measureValue(timed, DAY, weight)).toBe(1);
    expect(measureValue(timed, '2026-09-30', weight)).toBeNull();
  });
  test('exercise: the counter\'s day count; no entry or a deleted counter is null', () => {
    const health: HealthData = {...createEmptyHealth(), exercise: {version: 1, counters: [{id: 'health_counter-pushups', name: 'Push-ups', icon: 'pushup'}], days: [{id: `health_counter-pushups@${DAY}`, counterId: 'health_counter-pushups', date: DAY, count: 24}]}};
    expect(measureValue(health, DAY, link({measure: 'exercise', exerciseId: 'health_counter-pushups', target: 20}))).toBe(24);
    expect(measureValue(health, '2026-09-30', link({measure: 'exercise', exerciseId: 'health_counter-pushups', target: 20}))).toBeNull();
    expect(measureValue(health, DAY, link({measure: 'exercise', exerciseId: 'health_counter-gone', target: 20}))).toBeNull();
  });
  test('ruleMet', () => {
    expect(ruleMet(link({target: 8000}), 8000)).toBe(true);
    expect(ruleMet(link({target: 8000}), 7999)).toBe(false);
    expect(ruleMet(link({target: 8000}), null)).toBe(false);
    expect(ruleMet(link({rule: 'recorded', target: undefined}), 0)).toBe(false);
    expect(ruleMet(link({rule: 'recorded', target: undefined}), 1)).toBe(true);
  });
});

describe('autoCompletions and applyAutoCompletion', () => {
  test('Showcase on its day: exactly Walk at 8,800 steps when nothing is logged yet; none once the entry exists', () => {
    process.env.TZ = 'UTC';
    const {habits, health} = showcase(), now = new Date(`${DAY}T12:00:00Z`), links = withLinks({[WALK]: link({})});
    expect(autoCompletions({links, habits: walkDue(habits), health, now})).toEqual([{habitId: WALK, date: DAY, healthDate: DAY, measure: 'steps', value: 8800}]);
    expect(autoCompletions({links, habits, health, now})).toEqual([]);
    expect(autoCompletions({links: withLinks({[WALK]: link({})}, [{habitId: WALK, date: DAY, healthDate: DAY, measure: 'steps', value: 8800, appliedAt: AT}]), habits: walkDue(habits), health, now})).toEqual([]);
    expect(autoCompletions({links, habits: setHabitState(walkDue(habits), WALK, 'paused', new Date('2026-09-20T12:00:00Z')), health, now})).toEqual([]);
    const quit = createHabit(walkDue(habits), {...INPUT, title: 'No-spend day', type: 'quit', target: 0, measurement: {kind: 'count', unit: 'purchases'}}, new Date('2026-09-20T12:00:00Z'), '92000000-0000-4000-8000-000000000099');
    expect(autoCompletions({links: withLinks({'92000000-0000-4000-8000-000000000099': link({measure: 'steps'})}), habits: quit, health, now})).toEqual([]);
  });
  test('no double count: applying twice returns the same object, the entry is logged at the target', () => {
    process.env.TZ = 'UTC';
    const {habits, health} = showcase(), now = new Date(`${DAY}T12:00:00Z`), item = autoCompletions({links: withLinks({[WALK]: link({})}), habits: walkDue(habits), health, now})[0]!;
    const once = applyAutoCompletion(walkDue(habits), item, now), twice = applyAutoCompletion(once, item, now);
    expect(twice).toBe(once);
    expect(once.habits.find(h => h.id === WALK)!.entries.find(e => e.date === DAY)).toMatchObject({count: 8000, disposition: 'logged'});
    expect(autoCheckInMarker(item, now)).toEqual({habitId: WALK, date: DAY, healthDate: DAY, measure: 'steps', value: 8800, appliedAt: now.toISOString()});
  });
  test('a tap always wins: an undo with a marker, or a manual tap before the hook runs, applies nothing', () => {
    process.env.TZ = 'UTC';
    const {habits, health} = showcase(), now = new Date(`${DAY}T12:00:00Z`), links = withLinks({[WALK]: link({})}, [{habitId: WALK, date: DAY, healthDate: DAY, measure: 'steps', value: 8800, appliedAt: AT, undone: true}]);
    const undone = logHabitValue(walkDue(habits), WALK, DAY, 0, {}, now);
    expect(autoCompletions({links, habits: undone, health, now})).toEqual([]);
    const tapped = logHabitValue(walkDue(habits), WALK, DAY, 500, {}, now);
    expect(autoCompletions({links: withLinks({[WALK]: link({})}), habits: tapped, health, now})).toEqual([]);
    expect(applyAutoCompletion(tapped, {habitId: WALK, date: DAY, healthDate: DAY, measure: 'steps', value: 8800}, now)).toBe(tapped);
  });
  test('each journal counts its own day at the same instant: Kiritimati habits, UTC-12 Health', () => {
    process.env.TZ = 'Europe/Brussels';
    const now = new Date('2026-10-01T11:30:00Z');
    let habits = createHabit({...emptyHabitData(), timeZone: 'Pacific/Kiritimati'}, {...INPUT, title: 'Walk', target: 8000, measurement: {kind: 'count', unit: 'steps'}}, new Date('2026-09-20T12:00:00Z'), WALK);
    habits = habitDataSchema.parse(habits);
    const health: HealthData = {...water(createEmptyHealth(), []), activity: [{id: 'health_activity-001', date: '2026-09-30', name: 'Walk', steps: 9000, minutes: 60, createdAt: AT, updatedAt: AT}]};
    health.daily!.preferences.timezone = 'Etc/GMT+12';
    const items = autoCompletions({links: withLinks({[WALK]: link({})}), habits, health, now});
    expect(items).toEqual([{habitId: WALK, date: '2026-10-02', healthDate: '2026-09-30', measure: 'steps', value: 9000}]);
    expect(applyAutoCompletion(habits, items[0]!, now).habits[0]!.entries.map(e => e.date)).toEqual(['2026-10-02']);
  });
  test.each(['UTC', 'Europe/Brussels', 'America/New_York', 'Pacific/Kiritimati', 'Etc/GMT+12', 'Asia/Kolkata', 'Asia/Kathmandu', 'Australia/Adelaide', 'Pacific/Chatham', 'Australia/Lord_Howe', 'America/Santiago'])('equal journal zones (%s) give the same day to both', zone => {
    process.env.TZ = 'UTC';
    const now = new Date('2026-10-25T01:30:00Z');
    const habits = habitDataSchema.parse(createHabit({...emptyHabitData(), timeZone: zone}, {...INPUT, title: 'Walk', target: 1, measurement: {kind: 'count', unit: 'steps'}}, new Date('2026-09-20T12:00:00Z'), WALK));
    const health = water(createEmptyHealth(), []); health.daily!.preferences.timezone = zone;
    const day = new Intl.DateTimeFormat('en-CA', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'}).format(now);
    health.activity.push({id: 'health_activity-001', date: day, name: 'Walk', steps: 1, minutes: 1, createdAt: AT, updatedAt: AT});
    const items = autoCompletions({links: withLinks({[WALK]: link({target: 1})}), habits, health, now});
    expect(items).toEqual([{habitId: WALK, date: day, healthDate: day, measure: 'steps', value: 1}]);
  });
  test('DST: the repeated hour in Brussels is one day, one completion', () => {
    process.env.TZ = 'Europe/Brussels';
    const habits = habitDataSchema.parse(createHabit({...emptyHabitData(), timeZone: 'Europe/Brussels'}, {...INPUT, title: 'Walk', target: 1, measurement: {kind: 'count', unit: 'steps'}}, new Date('2026-09-20T12:00:00Z'), WALK));
    const health = water(createEmptyHealth(), []); health.daily!.preferences.timezone = 'Europe/Brussels';
    health.activity.push({id: 'health_activity-001', date: '2026-10-25', name: 'Walk', steps: 1, minutes: 1, createdAt: AT, updatedAt: AT});
    for (const instant of ['2026-10-25T00:30:00Z', '2026-10-25T01:30:00Z']) { // 02:30 CEST, then 02:30 CET
      const now = new Date(instant), items = autoCompletions({links: withLinks({[WALK]: link({target: 1})}), habits, health, now});
      expect(items.map(i => i.date)).toEqual(['2026-10-25']);
    }
  });
});

describe('badge copy', () => {
  test('sources and values', () => {
    const health: HealthData = {...createEmptyHealth(), exercise: {version: 1, counters: [{id: 'health_counter-pushups', name: 'Push-ups', icon: 'pushup'}], days: []}};
    expect(measureSource({measure: 'water'})).toBe('your water journal');
    expect(measureSource({measure: 'steps'})).toBe('your activity log');
    expect(measureSource({measure: 'activeMinutes'})).toBe('your activity log');
    expect(measureSource({measure: 'weight'})).toBe('your weight journal');
    expect(measureSource({measure: 'exercise', exerciseId: 'health_counter-pushups'}, health.exercise!.counters)).toBe('your Push-ups counter');
    expect(measureSource({measure: 'exercise', exerciseId: 'health_counter-gone'}, health.exercise!.counters)).toBe('your exercise counter');
    expect(formatMeasureValue('water', 2250)).toBe('2,250 mL');
    expect(formatMeasureValue('water', 2250, 'fl-oz-us')).toBe('76.1 fl oz');
    expect(formatMeasureValue('steps', 8800)).toBe('8,800 steps');
    expect(formatMeasureValue('activeMinutes', 42)).toBe('42 minutes');
    expect(formatMeasureValue('activeMinutes', 1)).toBe('1 minute');
    expect(formatMeasureValue('weight', 1)).toBe('a reading');
    expect(formatMeasureValue('exercise', 24)).toBe('24 reps');
    // Session X P2.5: in the display locale, as every other figure (en-US above, the server's and the tests' default).
    try { setDisplayLocale('de-DE'); expect(formatMeasureValue('steps', 8800)).toBe('8.800 steps'); expect(formatMeasureValue('water', 2250, 'fl-oz-us')).toBe('76,1 fl oz'); }
    finally { setDisplayLocale(DEFAULT_DISPLAY_LOCALE); }
  });
});
