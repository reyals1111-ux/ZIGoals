import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {createEmptyHealth, healthSchema, logHealthItem, newHealthId, type HealthData} from '../health';
import {dailyData, groceryList, logMealPlan, saveMealPlan} from '../health-daily';
import {genericCatalogSchema} from '../food-generic/catalog';
import {checkSourceFile, type LoadedGenericSource} from '../food-generic/load';
import {applyTemplate, dayKcal, mondayOf, resolveTemplateFoods, templateMealName, templatePreview, undoTemplate} from './apply';
import {DIET_TEMPLATES, TEMPLATE_FOODS, type FoodKey} from './templates';

// Session AK (item 20). The shipped offline library is read from public/, so every authored id is checked against it.
const pub = join(__dirname, '..', '..', 'public', 'food-generic');
const catalog = genericCatalogSchema.parse(JSON.parse(readFileSync(join(pub, 'manifest.json'), 'utf8')));
const sources: LoadedGenericSource[] = catalog.sources.filter(e => e.source === 'ciqual').map(entry => ({entry, file: checkSourceFile(JSON.parse(readFileSync(join(pub, entry.file), 'utf8')), entry)}));
const allKeys = Object.keys(TEMPLATE_FOODS) as FoodKey[];
const resolved = resolveTemplateFoods(allKeys, sources);
const AT = '2026-10-31T10:00:00.000Z';
let n = 0; const ids = () => `health_t${String(++n).padStart(8, '0')}`;

describe('the authored templates', () => {
  test('three templates, each food found in the shipped library with its calories known', () => {
    expect(DIET_TEMPLATES.map(t => t.name)).toEqual(['Mediterranean', 'High-protein', 'Vegetarian']);
    expect(resolved.missing).toEqual([]);
    for (const key of allKeys) expect(resolved.foods[key]!.nutrients.kcal, key).not.toBeNull();
  });
  test('every week has 7 days of breakfast, lunch, dinner and a snack, every meal used, portions plain', () => {
    for (const t of DIET_TEMPLATES) {
      expect(t.week).toHaveLength(7);
      for (const [b, l, d, s] of t.week) { expect(t.breakfasts[b]).toBeDefined(); expect(t.lunches[l]).toBeDefined(); expect(t.dinners[d]).toBeDefined(); expect(t.snacks[s]).toBeDefined(); }
      for (const [list, i] of [[t.breakfasts, 0], [t.lunches, 1], [t.dinners, 2], [t.snacks, 3]] as const) expect(new Set(t.week.map(w => w[i])).size, `${t.id} ${i}`).toBe(list.length);
      for (const dish of [...t.breakfasts, ...t.lunches, ...t.dinners, ...t.snacks]) for (const [, grams] of dish.items) { expect(grams).toBeGreaterThan(0); expect(grams).toBeLessThanOrEqual(300); }
    }
  });
  test('vegetarian has no meat or fish; Mediterranean has fish at least twice a week', () => {
    const veg = DIET_TEMPLATES.find(t => t.id === 'vegetarian')!, fish: FoodKey[] = ['salmon', 'cod', 'sardines', 'tuna', 'chicken'];
    expect(templatePreview(veg, '2026-11-04').foods.filter(k => fish.includes(k))).toEqual([]);
    const med = templatePreview(DIET_TEMPLATES[0]!, '2026-11-04');
    expect(med.days.filter(d => d.slots.some(s => s.dish.items.some(([k]) => fish.includes(k)))).length).toBeGreaterThanOrEqual(2);
  });
  test('a day comes to an ordinary amount of energy, from the library’s typical values (an estimate, not a target)', () => {
    for (const t of DIET_TEMPLATES) for (const day of templatePreview(t, '2026-11-02').days) {
      const kcal = dayKcal(day.slots.map(s => s.dish), resolved.foods)!;
      expect(kcal, `${t.id} ${day.date}`).toBeGreaterThan(1300); expect(kcal, `${t.id} ${day.date}`).toBeLessThan(2800);
    }
  });
});

describe('preview: nothing is written', () => {
  test('the week runs Monday first from any day in it', () => {
    expect(mondayOf('2026-10-31')).toBe('2026-10-26'); expect(mondayOf('2026-10-26')).toBe('2026-10-26'); expect(mondayOf('2026-11-01')).toBe('2026-10-26');
    const p = templatePreview(DIET_TEMPLATES[0]!, '2026-10-31');
    expect(p.weekStart).toBe('2026-10-26'); expect(p.days.map(d => d.date)).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
    expect(p.days[0]!.slots.map(s => s.meal)).toEqual(['Breakfast', 'Lunch', 'Dinner', 'Snacks']);
  });
});

describe('apply, then undo', () => {
  const t = DIET_TEMPLATES[0]!;
  const fresh = (): HealthData => createEmptyHealth();
  test('foods join the library, meals are saved with the template label, the week is planned and the grocery list follows', () => {
    const {data, added, preview} = applyTemplate(fresh(), t, '2026-10-31', resolved.foods, AT, ids);
    expect(added.foods).toHaveLength(preview.foods.length); expect(added.plans).toHaveLength(28); expect(added.savedMeals).toHaveLength(11);
    const daily = dailyData(data);
    expect(daily.plans).toHaveLength(28); expect(daily.plans.every(p => p.name.endsWith(' · Mediterranean template'))).toBe(true);
    expect(daily.plans.every(p => !p.loggedAt)).toBe(true); expect(data.diary).toEqual([]);
    expect(data.foods.find(f => f.name === 'Oat, raw')).toMatchObject({servingGrams: 100, brand: 'Ciqual 2025 (ANSES, France)'});
    const groceries = groceryList(data, '2026-10-26', '2026-11-01');
    expect(groceries.find(g => g.name === 'Oat, raw')?.grams).toBe(40 * 2); // Tuesday and Friday's oats with milk
    expect(groceries.find(g => g.name === 'Olive oil, extra virgin')?.grams).toBeGreaterThan(0);
    expect(healthSchema.safeParse(data).success).toBe(true);
  });
  test('each plan is exactly what the planner’s own saveMealPlan writes', () => {
    const {data} = applyTemplate(fresh(), t, '2026-10-31', resolved.foods, AT, ids);
    const daily = dailyData(data), plan = daily.plans[5]!;
    const without = healthSchema.parse({...data, daily: {...daily, plans: daily.plans.filter(p => p.id !== plan.id)}});
    const again = dailyData(saveMealPlan(without, {id: plan.id, savedMealId: plan.savedMealId, date: plan.date, meal: plan.meal}, AT)).plans.find(p => p.id === plan.id);
    expect(again).toEqual(plan);
  });
  test('a library food of the same name and source, and a saved meal of the same name, are reused', () => {
    const first = applyTemplate(fresh(), t, '2026-10-31', resolved.foods, AT, ids);
    const second = applyTemplate(first.data, t, '2026-11-07', resolved.foods, AT, ids);
    expect(second.added.foods).toEqual([]); expect(second.added.savedMeals).toEqual([]); expect(second.added.plans).toHaveLength(28);
    expect(second.data.foods).toHaveLength(first.data.foods.length);
  });
  test('undo removes exactly what was added; existing foods and plans stay', () => {
    let base = fresh();
    const keep = resolved.foods.oats!;
    base = healthSchema.parse({...base, foods: [{id: newHealthId(), name: keep.name, brand: keep.sourceName.slice(0, 80), servingGrams: 100, nutrients: keep.nutrients, createdAt: AT, updatedAt: AT}]});
    const {data, added} = applyTemplate(base, t, '2026-10-31', resolved.foods, AT, ids);
    expect(added.foods).not.toContain(base.foods[0]!.id);
    const back = undoTemplate(data, added);
    expect(back.kept).toBe(0); expect(back.data.foods).toEqual(base.foods); expect(dailyData(back.data)).toEqual(dailyData(base));
  });
  test('a plan already logged as eaten stays, with its meal and foods; the rest goes', () => {
    const {data, added} = applyTemplate(fresh(), t, '2026-10-31', resolved.foods, AT, ids);
    const eaten = logMealPlan(data, added.plans[0]!, AT);
    const back = undoTemplate(eaten, added), daily = dailyData(back.data);
    expect(back.kept).toBe(1); expect(daily.plans).toHaveLength(1); expect(daily.savedMeals).toHaveLength(1);
    expect(back.data.diary.length).toBeGreaterThan(0);
    for (const e of back.data.diary) expect(back.data.foods.some(f => f.id === e.sourceId)).toBe(true);
  });
  test('a food the person logged after applying stays after undo', () => {
    const {data, added} = applyTemplate(fresh(), t, '2026-10-31', resolved.foods, AT, ids);
    const banana = data.foods.find(f => f.id === added.foods[0])!;
    const logged = logHealthItem(data, {id: newHealthId(), sourceId: banana.id, sourceKind: 'food', date: '2026-10-31', meal: 'Snacks', quantityMilli: 1000}, AT);
    expect(undoTemplate(logged, added).data.foods.map(f => f.id)).toEqual([banana.id]);
  });
  test('a template needing a food the library lacks writes nothing', () => {
    const partial = {...resolved.foods}; delete partial.oats;
    expect(() => applyTemplate(fresh(), t, '2026-10-31', partial, AT, ids)).toThrow(/Nothing was added/);
    expect(resolveTemplateFoods(['oats'], []).missing).toEqual(['oats']);
  });
  test('the meal name carries the template label and fits the journal’s limit', () => {
    for (const tt of DIET_TEMPLATES) for (const dish of [...tt.breakfasts, ...tt.lunches, ...tt.dinners, ...tt.snacks]) { const name = templateMealName(tt, dish); expect(name.length).toBeLessThanOrEqual(120); expect(name).toContain(`${tt.name} template`); }
  });
});
