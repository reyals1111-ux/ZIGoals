import {describe, expect, test} from 'vitest';
import {createEmptyHealth, healthSchema, logHealthItem, saveFood, saveRecipe, type HealthData, type HealthFood} from '../health';
import {DEFAULT_VITAMIN_TARGETS, emptyHealthVitamins, entryVitamins, healthVitaminsSchema, parseVitamin, recipeVitamins, setFoodVitamins, setVitaminTarget, vitaminDay, vitaminText} from './schema';

// Session AB-Cloud Part 4 (ADR-023 C20): vitamins beside the nutrition format, never inside it.
const at = '2026-10-13T08:00:00.000Z';
const food = (id: string, name: string): HealthFood => ({id, name, brand: '', servingGrams: 100, nutrients: {kcal: 50, proteinMg: 1000, carbsMg: 10000, fatMg: 0}, createdAt: at, updatedAt: at});
const ORANGE = 'health_orange-0001', SALMON = 'health_salmon-0001', BOWL = 'health_bowl-00001';
function health(): HealthData {
  let h = saveFood(saveFood(createEmptyHealth(), food(ORANGE, 'Orange')), food(SALMON, 'Salmon'));
  h = saveRecipe(h, {id: BOWL, name: 'Bowl', portionsMilli: 2000, items: [{foodId: ORANGE, quantityMilli: 1000}, {foodId: SALMON, quantityMilli: 2000}]}, at);
  h = logHealthItem(h, {id: 'health_entry-0001', sourceId: ORANGE, sourceKind: 'food', date: '2026-10-13', meal: 'Breakfast', quantityMilli: 2000}, at);
  h = logHealthItem(h, {id: 'health_entry-0002', sourceId: BOWL, sourceKind: 'recipe', date: '2026-10-13', meal: 'Lunch', quantityMilli: 1000}, at);
  return h;
}

describe('vitamins', () => {
  test('values are thousandths of the unit, so B12 in micrograms stays exact; blank is unknown; a bad value is refused', () => {
    expect(parseVitamin('2.4')).toBe(2400); expect(parseVitamin('2,4')).toBe(2400); expect(parseVitamin('90')).toBe(90_000);
    expect(parseVitamin('')).toBeNull(); expect(parseVitamin('  ')).toBeNull();
    for (const bad of ['-1', 'abc', '1.2345', '1e3']) expect(() => parseVitamin(bad), bad).toThrow();
    expect(vitaminText(2400)).toBe('2.4'); expect(vitaminText(undefined)).toBe('');
  });
  test('a food\'s values scale with the entry; a recipe knows a vitamin only when every ingredient gives it', () => {
    const h = health();
    let r = setFoodVitamins(emptyHealthVitamins(), h, ORANGE, {cMg: 53_200, aUg: 11_000});
    r = setFoodVitamins(r, h, SALMON, {dUg: 11_000, b12Ug: 3_200, aUg: 12_000});
    expect(entryVitamins(r, h, h.diary.find(d => d.id === 'health_entry-0001')!)).toEqual({cMg: 106_400, aUg: 22_000});
    // Per portion: (orange × 1 + salmon × 2) / 2 portions; only A is given by both.
    expect(recipeVitamins(r, h.recipes[0]!)).toEqual({aUg: Math.round((11_000 * 1000 + 12_000 * 2000) / 2000)});
    const day = vitaminDay(h, '2026-10-13', r);
    expect(day.find(v => v.key === 'aUg')).toMatchObject({total: 22_000 + 17_500, known: 2, entries: 2});
    // Unknown is never zero: vitamin C is known for the orange only, D for neither entry as a whole.
    expect(day.find(v => v.key === 'cMg')).toMatchObject({total: 106_400, known: 1, entries: 2});
    expect(day.find(v => v.key === 'dUg')).toMatchObject({total: null, known: 0, entries: 2});
  });
  test('editing a food\'s vitamins later never rewrites what was logged before (entries frozen first)', () => {
    const h = health();
    let r = setFoodVitamins(emptyHealthVitamins(), h, ORANGE, {cMg: 50_000});
    r = setFoodVitamins(r, h, ORANGE, {cMg: 70_000});
    expect(entryVitamins(r, h, h.diary[0]!)).toEqual({cMg: 100_000});
    // A new entry logged after the edit reads the new value.
    const later = logHealthItem(h, {id: 'health_entry-0003', sourceId: ORANGE, sourceKind: 'food', date: '2026-10-14', meal: 'Breakfast', quantityMilli: 1000}, at);
    expect(entryVitamins(r, later, later.diary.find(d => d.id === 'health_entry-0003')!)).toEqual({cMg: 70_000});
    // Clearing the food's vitamins keeps the frozen entries and forgets the food.
    const cleared = setFoodVitamins(r, h, ORANGE, null);
    expect(cleared.foods?.[ORANGE]).toBeUndefined(); expect(entryVitamins(cleared, h, h.diary[0]!)).toEqual({cMg: 100_000});
    // Frozen entries of diary records that are gone are pruned on the next write.
    const pruned = setFoodVitamins(cleared, {...h, diary: []}, SALMON, {dUg: 1000});
    expect(pruned.entries).toEqual({});
  });
  test('targets: the reference values unless the person set their own; the record stays loose and versioned', () => {
    const r = setVitaminTarget(emptyHealthVitamins(), 'dUg', 15_000);
    expect(vitaminDay(health(), '2026-10-13', r).find(v => v.key === 'dUg')!.target).toBe(15_000);
    expect(vitaminDay(health(), '2026-10-13', r).find(v => v.key === 'cMg')!.target).toBe(DEFAULT_VITAMIN_TARGETS.cMg);
    expect(setVitaminTarget(r, 'dUg', null).targets).toEqual({});
    // A later build's field and an unknown vitamin are kept and ignored.
    expect(healthVitaminsSchema.parse({version: 1, futureField: 1, foods: {[ORANGE]: {cMg: 1, biotinUg: 30_000}}})).toMatchObject({futureField: 1, foods: {[ORANGE]: {cMg: 1, biotinUg: 30_000}}});
  });
  test('Health v4 is untouched: no vitamin field ever enters a food, a recipe or a diary entry', () => {
    const h = health();
    setFoodVitamins(emptyHealthVitamins(), h, ORANGE, {cMg: 50_000});
    expect(JSON.stringify(h)).not.toMatch(/Ug"|cMg|eMg/);
    expect(healthSchema.safeParse({...h, foods: [{...h.foods[0], nutrients: {...h.foods[0]!.nutrients, cMg: 1}}]}).success).toBe(false);
  });
});
