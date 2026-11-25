import {describe, expect, test} from 'vitest';
import {createEmptyHealth, saveFood, saveRecipe, type HealthData} from '../health';
import {planFromFood} from '../health-aa/planner';
import {dailyData} from '../health-daily';
import {emptyFoodPlus, foodPlusSchema, MAX_MADE_DAYS, MAX_MENUS} from './schema';
import {madeLine, madeOf, markMade, setStars, sortRecipeIds, starsOf, starsText, unmarkMade} from './made';
import {keepWeekAsMenu, menuNameIssue, menusOf, placeMenu, removeMenu, weekItems} from './menus';
import {setRecipeSteps} from './steps';

/**
 * Session AW (X5, LEDGER #454, #455; TIER 3 stored formats, additive): the food record's new optional parts — "Made it"
 * days and stars by recipe (#455), and menus (#454) — read by this build; a part it cannot read is dropped on its own; a
 * record an older build wrote (no new part) reads as before, and the older parts survive every new writer.
 */
const AT = '2026-11-23T08:00:00.000Z', TODAY = '2026-11-25', MON = '2026-11-23', NEXT = '2026-11-30';
const R1 = 'health_recipe-x5-soup', R2 = 'health_recipe-x5-pie', R3 = 'health_recipe-x5-stew';
function kitchen(): HealthData {
  let h = createEmptyHealth();
  h = saveFood(h, {id: 'health_food-x5-peas', name: 'Peas', brand: '', servingGrams: 100, nutrients: {kcal: 80, proteinMg: 5000, carbsMg: 10000, fatMg: 400}, createdAt: AT, updatedAt: AT});
  for (const [id, name] of [[R1, 'Soup'], [R2, 'Pie'], [R3, 'Stew']] as const) h = saveRecipe(h, {id, name, portionsMilli: 2000, items: [{foodId: 'health_food-x5-peas', quantityMilli: 1000}]}, AT);
  return h;
}
const withDiary = (h: HealthData, recipeId: string, dates: string[]): HealthData => ({...h, diary: [...h.diary, ...dates.map((date, i) => ({id: `health_diary-x5-${recipeId.slice(-4)}-${i}`, sourceId: recipeId, sourceKind: 'recipe' as const, snapshot: {name: 'x', servingGrams: 100, nutrients: {kcal: 1, proteinMg: 1, carbsMg: 1, fatMg: 1}}, date, meal: 'Dinner' as const, quantityMilli: 1000, createdAt: AT, updatedAt: AT}))]});

describe('stored format: made, stars and menus are optional parts of the loose food record', () => {
  test('an older record (no new part) reads as before; the older parts survive the new writers', () => {
    const old = foodPlusSchema.parse({version: 1, notify: true, steps: {[R1]: ['Simmer for 15 minutes.']}});
    const next = setStars(markMade(old, R1, '2026-11-20'), R1, 4);
    expect(next.notify).toBe(true);
    expect(next.steps).toEqual({[R1]: ['Simmer for 15 minutes.']});
    expect(next.made).toEqual({[R1]: ['2026-11-20']});
    expect(next.stars).toEqual({[R1]: 4});
    // and the steps writer keeps the new parts
    expect(setRecipeSteps(next, R2, ['Bake.']).made).toEqual({[R1]: ['2026-11-20']});
  });
  test('a part this build cannot read is dropped on its own, never the whole record', () => {
    const read = foodPlusSchema.parse({version: 1, notify: true, made: {[R1]: ['not a day']}, stars: {[R1]: 9}, menus: 'not a list', future: {kept: 1}});
    expect(read.made).toBeUndefined();
    expect(read.stars).toBeUndefined();
    expect(read.menus).toBeUndefined();
    expect(read.notify).toBe(true);
    expect((read as Record<string, unknown>).future).toEqual({kept: 1});
    expect(menusOf(foodPlusSchema.parse({version: 1, menus: [{id: 'menu-ok', name: 'Fine', keptOn: TODAY, items: [{day: 0, meal: 'Dinner', savedMealId: 'health_meal-x5-aaaa', name: 'Soup'}]}, {id: 'bad id', name: ''}]})).map(m => m.name)).toEqual(['Fine']);
  });
});

describe('#455 when you last made it, and stars', () => {
  test('days come from the diary and from "Made it", once a day; the newest 400 are kept; removed recipes are dropped', () => {
    const h = withDiary(kitchen(), R1, ['2026-11-12', '2026-11-12', '2026-11-03']);
    let r = markMade(emptyFoodPlus(), R1, '2026-11-12');
    r = markMade(r, R1, '2026-11-20');
    r = markMade(r, R1, '2026-11-20');
    const info = madeOf(h, r, R1, TODAY);
    expect(info).toEqual({days: ['2026-11-03', '2026-11-12', '2026-11-20'], last: '2026-11-20', times: 3, marked: ['2026-11-12', '2026-11-20']});
    expect(madeLine(info, TODAY)).toBe('Last made Nov 20 · 3 times');
    expect(madeLine(madeOf(h, markMade(r, R1, TODAY), R1, TODAY), TODAY)).toBe('Made today · 4 times');
    expect(madeLine(madeOf(h, null, R2, TODAY), TODAY)).toBe('Not made yet');
    expect(madeLine(madeOf(withDiary(kitchen(), R2, ['2025-12-30']), null, R2, TODAY), TODAY)).toBe('Last made Dec 30, 2025 · once');
    expect(unmarkMade(r, R1, '2026-11-20').made).toEqual({[R1]: ['2026-11-12']});
    expect(unmarkMade(unmarkMade(r, R1, '2026-11-20'), R1, '2026-11-12').made).toBeUndefined();
    let many = emptyFoodPlus();
    for (let i = 0; i < MAX_MADE_DAYS + 5; i++) many = markMade(many, R1, new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10));
    expect(many.made![R1]).toHaveLength(MAX_MADE_DAYS);
    expect(many.made![R1]![0]).toBe('2025-01-06');
    expect(markMade(markMade(emptyFoodPlus(), R3, TODAY), R1, TODAY, new Set([R1])).made).toEqual({[R1]: [TODAY]});
  });
  test('stars are the person’s own, 1 to 5; none is none, never 0', () => {
    const r = setStars(emptyFoodPlus(), R2, 5);
    expect(starsOf(r, R2)).toBe(5);
    expect(starsOf(r, R1)).toBeNull();
    expect(starsText(3)).toBe('★★★☆☆');
    expect(setStars(r, R2, null).stars).toBeUndefined();
    expect(() => setStars(r, R2, 0)).toThrow('Choose from one to five stars.');
    expect(() => setStars(r, R2, 6)).toThrow();
  });
  test('the recipe list sorted by last made or by stars; ties and the unmarked keep the list’s own order', () => {
    const h = withDiary(withDiary(kitchen(), R3, ['2026-11-01']), R2, ['2026-11-21']);
    const r = setStars(setStars(emptyFoodPlus(), R3, 4), R1, 5);
    expect(sortRecipeIds(h, r, 'added', TODAY)).toEqual([R1, R2, R3]);
    expect(sortRecipeIds(h, r, 'last-made', TODAY)).toEqual([R2, R3, R1]);
    expect(sortRecipeIds(h, r, 'stars', TODAY)).toEqual([R1, R3, R2]);
    expect(sortRecipeIds(h, r, 'name', TODAY)).toEqual([R2, R1, R3]);
  });
});

describe('#454 a week of meals kept as a menu', () => {
  const planned = () => {
    let h = kitchen();
    h = planFromFood(h, 'health_food-x5-peas', 1000, '2026-11-23', 'Dinner', AT, 'health_plan-x5-0001');
    h = planFromFood(h, 'health_food-x5-peas', 1000, '2026-11-25', 'Lunch', AT, 'health_plan-x5-0002');
    h = planFromFood(h, 'health_food-x5-peas', 1000, '2026-11-25', 'Lunch', AT, 'health_plan-x5-0003');
    h = planFromFood(h, 'health_food-x5-peas', 1000, '2026-12-01', 'Dinner', AT, 'health_plan-x5-0004');
    return h;
  };
  test('the week’s meals, Monday first and each once; kept by name, replaced by the same name, at most twelve', () => {
    const h = planned();
    expect(weekItems(h, MON).map(i => [i.day, i.meal])).toEqual([[0, 'Dinner'], [2, 'Lunch']]);
    let r = keepWeekAsMenu(emptyFoodPlus(), h, MON, '  Pea week ', {id: 'menu-one', today: TODAY});
    expect(menusOf(r)).toMatchObject([{id: 'menu-one', name: 'Pea week', keptOn: TODAY}]);
    r = keepWeekAsMenu(r, h, NEXT, 'pea WEEK', {id: 'menu-two', today: TODAY});
    expect(menusOf(r).map(m => [m.id, m.items.length])).toEqual([['menu-one', 1]]);
    expect(() => keepWeekAsMenu(r, h, '2026-12-07', 'Empty', {id: 'menu-x', today: TODAY})).toThrow('Nothing is planned this week yet.');
    expect(menuNameIssue(' ')).toMatch(/Give the menu a name/);
    expect(menuNameIssue('x'.repeat(41))).toMatch(/at most 40 characters \(this one has 41\)/);
    let full = emptyFoodPlus();
    for (let i = 0; i < MAX_MENUS; i++) full = keepWeekAsMenu(full, h, MON, `Menu ${i}`, {id: `menu-${i}`, today: TODAY});
    expect(() => keepWeekAsMenu(full, h, MON, 'One more', {id: 'menu-more', today: TODAY})).toThrow('At most 12 menus');
    expect(keepWeekAsMenu(full, h, MON, 'menu 3', {id: 'menu-more', today: TODAY}).menus).toHaveLength(MAX_MENUS);
    expect(removeMenu(r, 'menu-one').menus).toBeUndefined();
  });
  test('placed on another week as ordinary plans; a slot planned already is left; a gone saved meal is named', () => {
    const h = planned(), menu = menusOf(keepWeekAsMenu(emptyFoodPlus(), h, MON, 'Pea week', {id: 'menu-one', today: TODAY}))[0]!;
    let n = 0;
    const placed = placeMenu(h, menu, NEXT, AT, () => `health_plan-x5-new-${++n}`);
    expect(placed.planIds).toEqual(['health_plan-x5-new-1', 'health_plan-x5-new-2']);
    expect(placed.already).toBe(0);
    const plans = dailyData(placed.data).plans.filter(p => placed.planIds.includes(p.id)).map(p => [p.date, p.meal, p.loggedAt]);
    expect(plans).toEqual([['2026-11-30', 'Dinner', undefined], ['2026-12-02', 'Lunch', undefined]]);
    const again = placeMenu(placed.data, menu, NEXT, AT, () => `health_plan-x5-again-${++n}`);
    expect(again).toMatchObject({planIds: [], already: 2, missing: []});
    const gone = {...h, daily: {...dailyData(h), savedMeals: []}};
    expect(placeMenu(gone, menu, NEXT, AT, () => 'health_plan-x5-never').missing).toEqual([menu.items[0]!.name]);
  });
});
