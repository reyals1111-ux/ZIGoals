import {describe, expect, it} from 'vitest';
import {createEmptyHealth, logHealthItem, saveFood, saveWeight, setHealthTargets, type HealthData} from './health';
import {exportHealthCsv, previewDayCopy} from './health-daily';
import {changeCount} from './health-counters';
import {workoutsSchema} from './workouts/schema';
import {fastStartAt, logPastFast, startFast} from './fasting/engine';
import {emptyFasting} from './fasting/schema';
import {formatMacroGrams, servingsWarning, tinyWaterWarning, weightJumpWarning} from './health-plausible';
import {rankFoodResults} from './food-search';
import {groceryNameIssue} from './grocery/schema';
import {weekBudget} from './health-aa/calorie-week';
import {foodInsights} from './health-aa/food-insights';
import {saveMeasurement} from './body-measurements';
import {saveNight} from './sleep/engine';
import {emptySleep} from './sleep/schema';
import {withHealthGroup} from './vault/w-homes';
import {instantAt} from './zone-time';

// Session AL, lane L2 (Health), second pass: the logic behind the rows finished in this pass, each named by its ids.
const AT = '2026-11-04T09:00:00.000Z', BXL = 'Europe/Brussels';
const id = (n: number) => `health_00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const oats = {id: id(1), name: 'Oats', brand: '', servingGrams: 40, nutrients: {kcal: 150, proteinMg: 5333, carbsMg: 27000, fatMg: 3000}, createdAt: AT, updatedAt: AT};
const noKcal = {id: id(2), name: 'Mystery bar', brand: '', servingGrams: 50, nutrients: {kcal: null, proteinMg: null, carbsMg: null, fatMg: null}, createdAt: AT, updatedAt: AT};

describe('P-MO-55 (MO-025, C-MO-34/36): a fast begun earlier, and a past fast', () => {
  it('"Started at 20:30" is the last 20:30 not after now: yesterday before 20:30, today after', () => {
    expect(fastStartAt('20:30', instantAt('2026-11-04', '08:00', BXL), BXL).toISOString()).toBe(new Date(instantAt('2026-11-03', '20:30', BXL)).toISOString());
    expect(fastStartAt('06:00', instantAt('2026-11-04', '08:00', BXL), BXL).toISOString()).toBe(new Date(instantAt('2026-11-04', '06:00', BXL)).toISOString());
    expect(() => fastStartAt('8pm', Date.now(), BXL)).toThrow('like 20:30');
  });
  it('a past fast is kept with its own times; future, too short, too long and overlapping ones say why', () => {
    const now = new Date(instantAt('2026-11-04', '12:00', BXL)), at = (d: string, c: string) => new Date(instantAt(d, c, BXL));
    const one = logPastFast(emptyFasting(), {id: 'fast_a', start: at('2026-11-02', '20:00'), end: at('2026-11-03', '12:00'), targetHours: 16, timeZone: BXL, now});
    expect(one.sessions[0]).toMatchObject({endedAt: at('2026-11-03', '12:00').toISOString(), stoppedBy: 'person', targetHours: 16});
    const base = {id: 'fast_b', targetHours: 16, timeZone: BXL, now};
    expect(() => logPastFast(one, {...base, start: at('2026-11-04', '10:00'), end: at('2026-11-04', '13:00')})).toThrow('ends before now');
    expect(() => logPastFast(one, {...base, start: at('2026-11-04', '10:00'), end: at('2026-11-04', '10:05')})).toThrow('at least ten minutes');
    expect(() => logPastFast(one, {...base, start: at('2026-11-01', '10:00'), end: at('2026-11-02', '11:00')})).toThrow('at most 24 hours');
    expect(() => logPastFast(one, {...base, start: at('2026-11-03', '08:00'), end: at('2026-11-03', '18:00')})).toThrow('overlaps another fast');
    // A fast started from an earlier time runs from that time.
    const started = startFast(emptyFasting(), {id: 'fast_c', now: fastStartAt('07:00', now.getTime(), BXL), targetHours: 16, timeZone: BXL});
    expect(started.sessions[0]!.startedAt).toBe(at('2026-11-04', '07:00').toISOString());
  });
});

describe('P-MO-43 (MO-017, MO-109, MO-111): the soft "are you sure?" checks', () => {
  const readings = [{date: '2026-11-03', grams: 82_000}];
  it('a 13 kg jump in a day asks; a normal day does not; a week apart allows more', () => {
    expect(weightJumpWarning(95_000, '2026-11-04', readings, 'kg')).toBe('That is +13 kg from your reading a day away. If it is right, press Save weight again to keep it.');
    expect(weightJumpWarning(81_600, '2026-11-04', readings, 'kg')).toBeNull();
    expect(weightJumpWarning(86_000, '2026-11-10', readings, 'kg')).toBeNull();
    expect(weightJumpWarning(95_000, '2026-11-04', [], 'kg')).toBeNull();
  });
  it('1,000 servings or 99,999 g in one entry asks; 2 servings do not; 0.5 mL asks', () => {
    expect(servingsWarning(1_000_000, null)).toMatch(/^1,000 servings in one entry is a lot/);
    expect(servingsWarning(1_000, 99_999)).toMatch(/^100 kg in one entry is a lot/);
    expect(servingsWarning(2_000, 80)).toBeNull();
    expect(tinyWaterWarning(0.5)).toMatch(/^0.5 mL is less than a sip/);
    expect(tinyWaterWarning(250)).toBeNull();
  });
});

describe('P-MO-48 (MO-108, MO-133): macros in tenths of a gram', () => {
  it('10.313 g reads 10.3 g, 6.65 rounds half up, unknown stays unknown', () => {
    expect(formatMacroGrams(10_313)).toBe('10.3');
    expect(formatMacroGrams(6_650)).toBe('6.7');
    expect(formatMacroGrams(null)).toBe('Unknown');
  });
});

describe('P-MO-65 (MO-106): the Swiss results in a reader\'s order', () => {
  it('names starting with the words first, a raw food before a product, then shorter', () => {
    const r = rankFoodResults([{name: 'Banana nectar'}, {name: 'Dried banana chips'}, {name: 'Banana, raw'}, {name: 'Banana bread'}], 'banana');
    expect(r.map(x => x.name)).toEqual(['Banana, raw', 'Banana bread', 'Banana nectar', 'Dried banana chips']);
  });
});

describe('P-MO-32 / P-MO-52 (MO-166, MO-131): a grocery item says why it is not added', () => {
  it('blank and over 120 characters are named; a normal item passes', () => {
    expect(groceryNameIssue('   ')).toBe('Type an item to add, like coffee or soap.');
    expect(groceryNameIssue('x'.repeat(130))).toBe('An item can be at most 120 characters (this one has 130).');
    expect(groceryNameIssue('Coffee')).toBe('');
  });
});

describe('P-MO-74 (MO-011): a whole day copied keeps each entry in its meal', () => {
  it('breakfast stays breakfast and lunch stays lunch on every chosen date', () => {
    let d: HealthData = saveFood(createEmptyHealth(), oats);
    d = logHealthItem(d, {id: id(10), sourceId: oats.id, sourceKind: 'food', date: '2026-11-02', meal: 'Breakfast', quantityMilli: 1000}, AT);
    d = logHealthItem(d, {id: id(11), sourceId: oats.id, sourceKind: 'food', date: '2026-11-02', meal: 'Lunch', quantityMilli: 2000}, AT);
    const preview = previewDayCopy(d, '2026-11-02', ['2026-11-03', '2026-11-04'], id(90), AT);
    expect(preview.map(e => [e.date, e.meal, e.quantityMilli])).toEqual([['2026-11-03', 'Breakfast', 1000], ['2026-11-03', 'Lunch', 2000], ['2026-11-04', 'Breakfast', 1000], ['2026-11-04', 'Lunch', 2000]]);
    expect(() => previewDayCopy(d, '2026-10-01', ['2026-11-03'], id(91), AT)).toThrow('a day with entries');
  });
});

describe('P-MO-68 (MO-013): a partial day in the weekly budget', () => {
  it('a day with an entry lacking calories shows the known part as a lower bound, and rolls nothing over', () => {
    let d: HealthData = setHealthTargets(saveFood(saveFood(createEmptyHealth(), oats), noKcal), {kcal: 2000, proteinMg: null, carbsMg: null, fatMg: null, weightGrams: null, steps: null});
    d = logHealthItem(d, {id: id(20), sourceId: oats.id, sourceKind: 'food', date: '2026-11-03', meal: 'Breakfast', quantityMilli: 2000}, AT);
    d = logHealthItem(d, {id: id(21), sourceId: noKcal.id, sourceKind: 'food', date: '2026-11-03', meal: 'Snacks', quantityMilli: 1000}, AT);
    const week = weekBudget(d, {version: 1, rollover: {on: true, maxKcal: 500}}, '2026-11-04', '2026-11-04')!;
    const tue = week.days.find(x => x.date === '2026-11-03')!, wed = week.days.find(x => x.date === '2026-11-04')!;
    expect([tue.eaten, tue.partial]).toEqual([300, true]);
    expect(wed.carried).toBe(0);
  });
});

describe('P-MO-60 (MO-016, MO-031): the Health CSV covers the journal', () => {
  it('weight rows read in kg and lb too; sleep, measurements and meditation are rows of their own', () => {
    let d: HealthData = saveWeight(createEmptyHealth(), {id: id(30), date: '2026-11-04', grams: 72_500}, AT);
    d = saveMeasurement(d, {id: id(31), kind: 'waist', unit: 'cm', quantityMilli: 89_900, observedAt: '2026-11-04T08:00:00.000Z', timezone: BXL, sourceLabel: 'Manual measurement'}, AT);
    d = withHealthGroup(d, 'sleep', saveNight(emptySleep(), {kind: 'night', start: Date.parse('2026-11-03T22:00:00.000Z'), end: Date.parse('2026-11-04T06:00:00.000Z'), timeZone: BXL}, new Date(AT)), false);
    const [header, ...rows] = exportHealthCsv(d, '2026-11-04', '2026-11-04').split('\r\n');
    // Session AL (MO-016, deliberate): four columns follow weight_kg and weight_lb (TIER 3, additive); the weight row keeps
    // its kg and lb in the same two places, with the new columns empty after them.
    expect(header).toMatch(/"weight_kg","weight_lb","kcal_entry","protein_g_per_serving","carbs_g_per_serving","fat_g_per_serving"$/);
    expect(rows.find(r => r.includes('"weight"'))).toMatch(/"72\.5","159\.84","","","",""$/);
    expect(rows.some(r => r.includes('"sleep","Night"') && r.includes('"480","minutes in bed"'))).toBe(true);
    expect(rows.some(r => r.includes('"measurement","waist"') && r.includes('"89.9","cm"'))).toBe(true);
  });
});

describe('Session AL final pass (MO-016, MO-031): the Health CSV adds grams, each entry\'s kcal, counters, fasts and workout sets', () => {
  it('adds columns and rows only; every existing column keeps its place', () => {
    let d: HealthData = saveFood(createEmptyHealth(), oats);
    d = logHealthItem(d, {id: id(50), sourceId: oats.id, sourceKind: 'food', date: '2026-11-04', meal: 'Breakfast', quantityMilli: 1500}, AT);
    d = changeCount(d, 'health_counter-pushups', '2026-11-04', 12);
    const fasting = logPastFast(emptyFasting(), {id: 'fast_b', start: new Date('2026-11-03T16:00:00.000Z'), end: new Date('2026-11-04T08:00:00.000Z'), targetHours: 16, timeZone: BXL, now: new Date(AT)});
    const workouts = workoutsSchema.parse({version: 1, workouts: [{id: 'w1', name: 'Push day', date: '2026-11-04', startedAt: '2026-11-04T07:00:00.000Z', endedAt: '2026-11-04T07:40:00.000Z', exercises: [{id: 'e1', exerciseId: 'bench-press', name: 'Bench press', sets: [{id: 's1', reps: 8, weightKg: 60, done: true}]}]}], templates: [], exercises: [], restSeconds: 90});
    const [header, ...rows] = exportHealthCsv(d, '2026-11-04', '2026-11-04', {fasting, workouts}).split('\r\n');
    expect(header).toMatch(/^"record_id","date","kind","name","meal","quantity","unit","serving_weight_g","kcal_per_serving","protein_mg_per_serving","carbs_mg_per_serving","fat_mg_per_serving",/);
    expect(header).toMatch(/"kcal_entry","protein_g_per_serving","carbs_g_per_serving","fat_g_per_serving"$/);
    const diary = rows.find(r => r.includes('"diary"'))!;
    expect(diary).toContain('"1.5","servings","40","150","5333","27000","3000"');
    expect(diary).toMatch(/"225","5\.3","27","3"$/);
    expect(rows.some(r => r.includes('"counter","Push-ups"') && r.includes('"12","repetitions"'))).toBe(true);
    expect(rows.some(r => r.includes('"fast","16 h fast"') && r.includes('"16","hours fasted"'))).toBe(true);
    expect(rows.some(r => r.includes('"workout set","Push day · Bench press · set 1 · 60 kg"') && r.includes('"8","reps"'))).toBe(true);
    // Without the device records, the journal's own rows only (Export everything keeps its own fasting and workout files).
    expect(exportHealthCsv(d, '2026-11-04', '2026-11-04')).not.toContain('"fast"');
  });
});

describe('P-MO-78 (MO-150): "Late-evening eating" waits for meals that can speak about the evening', () => {
  it('with only breakfasts logged, the card is left out', () => {
    let d: HealthData = saveFood(createEmptyHealth(), oats);
    for (let i = 0; i < 7; i++) d = logHealthItem(d, {id: id(40 + i), sourceId: oats.id, sourceKind: 'food', date: `2026-10-${String(20 + i)}`, meal: 'Breakfast', quantityMilli: 1000}, `2026-10-${String(20 + i)}T08:00:00.000Z`);
    expect(foodInsights(d, '2026-10-27', BXL).map(c => c.id)).not.toContain('late-evening');
  });
});

describe('P-MO-79 (MO-042, C-MO-58): the week in one place', () => {
  it('weight change, steps against the target and fasts; a part with nothing logged says so', async () => {
    const {weekDigest} = await import('./health-aa/week-digest');
    const {saveActivity} = await import('./health');
    let d: HealthData = setHealthTargets(createEmptyHealth(), {kcal: null, proteinMg: null, carbsMg: null, fatMg: null, weightGrams: null, steps: 8000});
    d = saveWeight(saveWeight(d, {id: id(60), date: '2026-10-29', grams: 82_000}, AT), {id: id(61), date: '2026-11-04', grams: 81_400}, AT);
    d = saveActivity(saveActivity(d, {id: id(62), date: '2026-11-03', name: 'Walk', steps: 9000, minutes: 0}, AT), {id: id(63), date: '2026-11-04', name: 'Walk', steps: 5000, minutes: 0}, AT);
    const fast = logPastFast(emptyFasting(), {id: 'fast_d', start: new Date('2026-11-02T19:00:00.000Z'), end: new Date('2026-11-03T11:00:00.000Z'), targetHours: 16, timeZone: BXL, now: new Date(AT)});
    expect(weekDigest(d, fast, '2026-11-04', 'kg').map(l => [l.key, l.text])).toEqual([
      ['weight', '\u22120.6 kg over 2 readings' /* fifth pass (deliberate): the minus sign of lib/health-units weightChangeText */], ['sleep', 'No night logged this week'], ['steps', '7,000 a day over 2 logged days; your target 8,000, reached on 1'], ['fasts', '1 fast, 16 h on average']]);
  });
});

// Session AL (keep-list guards): positives the Moscow bot confirmed, so a later change cannot quietly undo them.
describe('keep: MO-116, MO-162, BUG-021/L-009', () => {
  it('MO-116: the one-rep max is Epley (100 kg × 5 → 116.7 kg), nothing past 12 reps', async () => {
    const {oneRepMax} = await import('./workouts/engine');
    expect(Math.round(oneRepMax(100, 5)! * 10) / 10).toBe(116.7);
    expect(oneRepMax(100, 1)).toBe(100);
    expect(oneRepMax(100, 13)).toBeNull();
  });
  it('MO-162: sleep debt is the sum of goal minus asleep over the logged nights; BUG-021/L-009: a nap over a night is refused', async () => {
    const {sleepDebt, setSleepGoal} = await import('./sleep/engine');
    let s = setSleepGoal(emptySleep(), {minutes: 480}, new Date(AT));
    s = saveNight(s, {kind: 'night', start: Date.parse('2026-11-02T23:00:00.000Z'), end: Date.parse('2026-11-03T06:00:00.000Z'), timeZone: BXL}, new Date(AT));
    s = saveNight(s, {kind: 'night', start: Date.parse('2026-11-03T22:00:00.000Z'), end: Date.parse('2026-11-04T07:00:00.000Z'), timeZone: BXL}, new Date(AT));
    expect(sleepDebt(s, '2026-11-04')).toEqual({minutes: 0, nights: 2, goal: 480});
    expect(() => saveNight(s, {kind: 'nap', start: Date.parse('2026-11-04T01:00:00.000Z'), end: Date.parse('2026-11-04T02:00:00.000Z'), timeZone: BXL}, new Date(AT))).toThrow(/overlaps the night/);
  });
});
