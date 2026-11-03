import {describe, expect, test} from 'vitest';
import {createEmptyHealth, healthSchema, type HealthData} from '../health';
import {addLocalDays} from '../local-date';
import {emptyHealthVitamins, setNewFoodVitamins} from '../health-vitamins/schema';
import {EXTRA_KEYS, NUTRIENT_EXTRAS_KEY, emptyNutrientExtras, entryExtras, forgetFoodExtras, nutrientExtrasSchema, recipeExtras, rememberExtras} from '../health-vitamins/extras';
import {emptyMicroTargets} from './micro';
import {entryNutrients, nutrientAverages, nutrientDay, referenceShare, reportNutrients, topSources, withData, type ReportContext} from './nutrient-report';
import {CALORIE_WEEK_KEY, calorieWeekSchema, emptyCalorieWeek, resetShifts, setRollover, shiftCalories, weekBudget} from './calorie-week';
import {KCAL_FLOOR} from './energy';
import {foodLine, matchIngredient} from './recipe-match';
import {clearCoachAnswer, answerCoach, emptyHealthCoach} from './coach-schema';
import {coachCheckIn} from './coach';

const TODAY = '2026-10-07'; // a Wednesday
const stamp = (d: string) => `${d}T08:00:00.000Z`;
type Nut = HealthData['foods'][number]['nutrients'];
function diary(entries: {id: string; food: string; name: string; date: string; q?: number; n: Nut}[]): HealthData {
  const foods = [...new Map(entries.map(e => [e.food, {id: e.food, name: e.name, brand: '', servingGrams: 100, nutrients: e.n, createdAt: stamp('2026-09-01'), updatedAt: stamp('2026-09-01')}])).values()];
  return healthSchema.parse({...createEmptyHealth(), foods, diary: entries.map(e => ({id: e.id, sourceId: e.food, sourceKind: 'food', snapshot: {name: e.name, servingGrams: 100, nutrients: e.n}, date: e.date, meal: 'Lunch', quantityMilli: e.q ?? 1000, createdAt: stamp(e.date), updatedAt: stamp(e.date)}))});
}
const base = {kcal: 100, proteinMg: 1000, carbsMg: 1000, fatMg: 1000};
const H = diary([
  {id: 'health_e-000001', food: 'health_f-spinach', name: 'Spinach', date: TODAY, q: 2000, n: {...base, ironMg: 3, calciumMg: 100}},
  {id: 'health_e-000002', food: 'health_f-lentils', name: 'Lentils', date: TODAY, n: {...base, ironMg: 7}},
  {id: 'health_e-000003', food: 'health_f-bread01', name: 'Bread', date: TODAY, n: {...base}},
  {id: 'health_e-000004', food: 'health_f-lentils', name: 'Red lentils', date: addLocalDays(TODAY, -3), n: {...base, ironMg: 7}},
  {id: 'health_e-000005', food: 'health_f-bread01', name: 'Bread', date: addLocalDays(TODAY, -20), n: {...base, ironMg: 1}},
]);
const ctx = (over: Partial<ReportContext> = {}): ReportContext => ({data: H, vitamins: emptyHealthVitamins(), extras: emptyNutrientExtras(), micro: emptyMicroTargets(), ...over});

describe('4.4 the nutrient extras record (zigoals:nutrient-extras:v1)', () => {
  test('a food’s values per serving and its logged entry, scaled and frozen; recipes only when every ingredient gives one', () => {
    expect(NUTRIENT_EXTRAS_KEY).toBe('zigoals:nutrient-extras:v1');
    expect(EXTRA_KEYS).toEqual(['magnesiumMg', 'zincMg', 'b1Mg', 'b2Mg', 'b3Mg', 'b6Mg', 'omega3Mg']);
    let r = rememberExtras(emptyNutrientExtras(), ['health_e-000001'], 'health_f-spinach', {magnesiumMg: 79_000, b1Mg: 78}, {id: 'health_e-000001', quantityMilli: 2000});
    expect(r.entries?.['health_e-000001']).toEqual({magnesiumMg: 158_000, b1Mg: 156});
    const entry = H.diary[0]!;
    expect(entryExtras(r, H, entry)).toEqual({magnesiumMg: 158_000, b1Mg: 156});
    r = forgetFoodExtras(r, 'health_f-spinach');
    expect(entryExtras(r, H, entry)).toEqual({magnesiumMg: 158_000, b1Mg: 156}); // history kept
    expect(entryExtras(r, H, H.diary[1]!)).toEqual({}); // unknown, not zero
    // an entry whose diary record is gone is pruned on the next write; all-unknown values write nothing
    r = rememberExtras(r, [], 'health_f-lentils', {zincMg: 3300});
    expect(r.entries).toEqual({});
    expect(rememberExtras(r, [], 'health_f-bread01', {})).toBe(r);
    const recipe = {id: 'health_r-000001', name: 'Dal', portionsMilli: 2000, ingredients: [{foodId: 'health_f-lentils', quantityMilli: 2000, snapshot: {name: 'Lentils', servingGrams: 100, nutrients: base}}, {foodId: 'health_f-spinach', quantityMilli: 1000, snapshot: {name: 'Spinach', servingGrams: 100, nutrients: base}}], createdAt: stamp(TODAY), updatedAt: stamp(TODAY)};
    expect(recipeExtras(r, recipe)).toEqual({}); // spinach no longer gives zinc
    const both = rememberExtras(r, [], 'health_f-spinach', {zincMg: 500});
    expect(recipeExtras(both, recipe)).toEqual({zincMg: Math.round((3300 * 2000 + 500 * 1000) / 2000)});
    expect(nutrientExtrasSchema.parse({version: 1, later: 1, foods: {'health_f-x0000001': {zincMg: 1, seleniumUg: 5}}})).toMatchObject({later: 1});
  });
  test('a new food’s vitamins are kept without freezing anything; a food that has some is refused', () => {
    const r = setNewFoodVitamins(emptyHealthVitamins(), 'health_f-spinach', {cMg: 28_000});
    expect(r.foods?.['health_f-spinach']).toEqual({cMg: 28_000});
    expect(setNewFoodVitamins(r, 'health_f-other01', {})).toBe(r);
    expect(() => setNewFoodVitamins(r, 'health_f-spinach', {cMg: 1})).toThrow();
  });
});

describe('4.4 the nutrient report', () => {
  test('the day: totals where entries carry a value; nutrients with no value are hidden', () => {
    const day = nutrientDay(ctx(), TODAY), iron = day.find(r => r.key === 'ironMg')!;
    expect(iron).toMatchObject({total: 13, known: 2, entries: 3, reference: 18, direction: 'at-least'});
    const shown = withData(day).map(r => r.key);
    expect(shown).toContain('calciumMg'); expect(shown).not.toContain('sodiumMg'); expect(shown).not.toContain('vitamin:cMg');
    expect(reportNutrients(ctx()).filter(n => n.group === 'Vitamins').length).toBe(7 + 4); // A, C, D, E, K, B12, folate + B1, B2, B3, B6
  });
  test('vitamins and extras come from their records, scaled to the amount', () => {
    const vitamins = setNewFoodVitamins(emptyHealthVitamins(), 'health_f-spinach', {cMg: 28_000});
    const extras = rememberExtras(emptyNutrientExtras(), [], 'health_f-spinach', {magnesiumMg: 79_000});
    const values = entryNutrients(ctx({vitamins, extras}), H.diary[0]!);
    expect(values).toMatchObject({'vitamin:cMg': 56_000, 'extra:magnesiumMg': 158_000, ironMg: 6, kcal: 200});
  });
  test('7-day averages over the days that carry the nutrient, never counting a day without one as 0', () => {
    const avg = nutrientAverages(ctx(), TODAY, 7), iron = avg.find(r => r.key === 'ironMg')!;
    expect(iron).toMatchObject({average: 10, daysWithValue: 2, loggedDays: 2, days: 7}); // (13 + 7) / 2
    expect(avg.find(r => r.key === 'calciumMg')).toMatchObject({average: 200, daysWithValue: 1});
    expect(avg.find(r => r.key === 'sodiumMg')!.average).toBeNull();
  });
  test('top sources over 7 and 30 days: by food, with share and days; an empty window is empty', () => {
    const week = topSources(ctx(), 'ironMg', TODAY, 7);
    expect(week.total).toBe(20); expect(week.known).toBe(3); expect(week.entries).toBe(4);
    expect(week.sources.map(s => [s.name, s.amount, s.days.length])).toEqual([['Lentils', 14, 2], ['Spinach', 6, 1]]);
    expect(week.sources[0]!.share).toBeCloseTo(0.7);
    expect(week.sources[0]!.days).toEqual([addLocalDays(TODAY, -3), TODAY]);
    expect(topSources(ctx(), 'ironMg', TODAY, 30).sources.map(s => s.name)).toEqual(['Lentils', 'Spinach', 'Bread']);
    expect(topSources(ctx(), 'vitamin:dUg', TODAY, 90).sources).toEqual([]);
    expect(referenceShare(9, 18)).toBe(50); expect(referenceShare(null, 18)).toBeNull();
  });
});

describe('P2 #7 the weekly calorie budget (zigoals:calorie-week:v1)', () => {
  const h = (() => { const x = diary([{id: 'health_e-000010', food: 'health_f-meal0001', name: 'Meal', date: '2026-10-05', n: {...base, kcal: 1800}}, {id: 'health_e-000011', food: 'health_f-meal0001', name: 'Meal', date: '2026-10-06', n: {...base, kcal: 2500}}]); x.targets.kcal = 2000; return x; })();
  test('seven days of the target; nothing without a target', () => {
    expect(CALORIE_WEEK_KEY).toBe('zigoals:calorie-week:v1');
    const w = weekBudget(h, emptyCalorieWeek(), TODAY, TODAY)!;
    expect(w.days.map(d => d.date)[0]).toBe('2026-10-05'); expect(w.days.every(d => d.budget === 2000)).toBe(true);
    expect(w.weeklyBudget).toBe(14_000); expect(w.eaten).toBe(4300);
    expect(w.days[2]).toMatchObject({eaten: null, remaining: null}); // not logged: unknown
    expect(weekBudget({...h, targets: {...h.targets, kcal: null}}, emptyCalorieWeek(), TODAY, TODAY)).toBeNull();
  });
  test('a shift keeps the weekly total and the floor; reset clears it', () => {
    const r = shiftCalories(emptyCalorieWeek(), 2000, 0, 5, 300);
    expect(r.shifts).toEqual([-300, 0, 0, 0, 0, 300, 0]);
    const w = weekBudget(h, r, TODAY, TODAY)!;
    expect(w.days.reduce((a, d) => a + d.budget, 0)).toBe(14_000);
    expect(() => shiftCalories(r, 2000, 0, 6, 600)).toThrow(String(KCAL_FLOOR));
    expect(() => calorieWeekSchema.parse({version: 1, shifts: [1, 0, 0, 0, 0, 0, 0]})).toThrow();
    expect(resetShifts(r).shifts).toBeUndefined();
  });
  test('roll over (off by default) carries up to N kcal of a past logged day’s unused budget', () => {
    const r = setRollover(emptyCalorieWeek(), true, 150);
    const w = weekBudget(h, r, TODAY, TODAY)!;
    expect(w.days[1]).toMatchObject({carried: 150, budget: 2150}); // Monday left 200 unused
    expect(w.days[2]).toMatchObject({carried: 0}); // Tuesday went over
    expect(w.days[3]).toMatchObject({carried: 0}); // Wednesday is today and unlogged
  });
});

describe('4.8 recipe import matches', () => {
  const foods = createEmptyHealth().foods.concat([
    {id: 'health_f-lentils', name: 'Red lentils', brand: '', servingGrams: 100, nutrients: {kcal: 116, proteinMg: 9000, carbsMg: 20000, fatMg: 400}, createdAt: stamp(TODAY), updatedAt: stamp(TODAY)},
    {id: 'health_f-onion01', name: 'Onion', brand: '', servingGrams: 100, nutrients: {kcal: null, proteinMg: null, carbsMg: null, fatMg: null}, createdAt: stamp(TODAY), updatedAt: stamp(TODAY)},
  ]);
  test('exact (case and accents ignored), close (every word, plurals folded), or none — never a guess', () => {
    expect(matchIngredient('ONION', foods)).toMatchObject({how: 'exact', food: {id: 'health_f-onion01'}});
    expect(matchIngredient('onions', foods)).toMatchObject({how: 'close', food: {id: 'health_f-onion01'}});
    expect(matchIngredient('lentils', foods)).toMatchObject({how: 'close', food: {id: 'health_f-lentils'}});
    expect(matchIngredient('olive oil', foods)).toMatchObject({how: 'none', food: null, candidates: []});
    expect(foodLine(foods[0]!)).toBe('116 kcal per 100 g'); expect(foodLine(foods[1]!)).toBe('nutrition unknown, per 100 g');
  });
});

test('4.5 the coach card: maintenance once ready, the logs still needed before, and the rails', () => {
  const c = coachCheckIn(createEmptyHealth(), emptyHealthCoach(), TODAY);
  expect(c.maintenance).toBeNull();
  expect(c.progress).toMatchObject({loggedDays: 0, minDays: 14, weights: 0, minWeights: 10, implausible: false});
  expect(c.rails).toEqual({floorKcal: 1200, maxStepPercent: 15});
  expect(c.changeKcal).toBeNull();
  const answered = answerCoach(emptyHealthCoach(), c.weekStart, 'keep', stamp(TODAY));
  expect(clearCoachAnswer(answered, c.weekStart).answers).toEqual({});
});
