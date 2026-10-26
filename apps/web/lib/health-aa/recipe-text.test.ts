import {describe, expect, test} from 'vitest';
import {fromSchemaRecipe, parseIngredientLine, parseQuantity, parseRecipeText} from './recipe-text';
import {aisleOf, defaultAisle, emptyAisles, groupByAisle, setAisle} from './aisles';
import {addCustomKind, addCustomReading, customHistory, emptyMeasurementsCustom, removeCustomKind, removeCustomReading} from './measurements-custom';
import {addPhotoEntry, emptyProgressPhotos, MAX_PHOTOS, removePhotoEntry} from './photos';

describe('N6 pasted recipe text', () => {
  test('quantities, fractions, ranges, units to grams, names cleaned; headings and steps separated; servings read', () => {
    expect(parseQuantity('1 1/2 cups flour')).toEqual({quantity: 1.5, rest: 'cups flour'});
    expect(parseQuantity('½ tsp salt').quantity).toBe(0.5); expect(parseQuantity('2-3 cloves garlic').quantity).toBe(2); expect(parseQuantity('2,5 dl milk').quantity).toBe(2.5);
    expect(parseIngredientLine('- 200 g red lentils, rinsed')).toMatchObject({name: 'red lentils', quantity: 200, unit: 'g', grams: 200});
    expect(parseIngredientLine('2 tbsp olive oil')).toMatchObject({name: 'olive oil', grams: 30});
    expect(parseIngredientLine('1 onion (large), diced')).toMatchObject({name: 'onion', quantity: 1, unit: null, grams: null});
    expect(parseIngredientLine('Ingredients:')).toBeNull();
    const r = parseRecipeText(`Fictional lentil soup\nServes 4\n\nIngredients\n200 g red lentils\n1 onion, chopped\n2 tbsp olive oil\n1 l vegetable stock\n\nMethod\n1. Fry the onion.\n2. Add the rest and simmer 20 minutes.`);
    expect(r.title).toBe('Fictional lentil soup'); expect(r.servings).toBe(4); expect(r.ingredients.map(i => i.name)).toEqual(['red lentils', 'onion', 'olive oil', 'vegetable stock']); expect(r.steps).toBe(2);
    expect(r.ingredients[3]).toMatchObject({grams: 1000, unit: 'l'});
    expect(parseRecipeText('').title).toBe('Pasted recipe');
    expect(fromSchemaRecipe({name: 'Web soup', ingredients: ['300 g carrots', '1 tsp cumin'], servings: 2}).ingredients).toHaveLength(2);
  });
});
describe('N5 aisles', () => {
  test('keyword defaults, the person\'s override, grouping in aisle order', () => {
    expect(defaultAisle('red lentils')).toBe('Pantry'); expect(defaultAisle('Greek yogurt')).toBe('Dairy & eggs'); expect(defaultAisle('mystery item')).toBe('Other');
    let r = emptyAisles(); r = setAisle(r, 'Mystery item', 'Frozen'); expect(aisleOf(r, 'mystery item')).toBe('Frozen'); r = setAisle(r, 'Mystery item', null); expect(r.overrides).toBeUndefined();
    const groups = groupByAisle([{name: 'chicken'}, {name: 'apple'}, {name: 'rice'}, {name: 'milk'}], emptyAisles());
    expect(groups.map(g => g.aisle)).toEqual(['Produce', 'Dairy & eggs', 'Meat & fish', 'Pantry']);
  });
});
describe('N9 custom measurements and progress photos', () => {
  test('kinds and readings on the device; one reading per kind and day; removing a kind removes its readings', () => {
    let r = addCustomKind(emptyMeasurementsCustom(), 'Neck', 'cm'); expect(r.kinds).toEqual([{id: 'neck', label: 'Neck', unit: 'cm'}]);
    expect(() => addCustomKind(r, 'neck', 'cm')).toThrow(/already/);
    r = addCustomReading(r, 'neck', '2026-10-01', 38.5, '2026-10-01T08:00:00.000Z', 'custom_1'); r = addCustomReading(r, 'neck', '2026-10-01', 38.2, '2026-10-01T09:00:00.000Z', 'custom_2');
    expect(customHistory(r, 'neck')).toEqual([{id: 'custom_2', kind: 'neck', date: '2026-10-01', valueMilli: 38200, at: '2026-10-01T09:00:00.000Z'}]);
    expect(() => addCustomReading(r, 'calf', '2026-10-01', 30, '2026-10-01T09:00:00.000Z')).toThrow(/Choose/);
    r = removeCustomReading(r, 'custom_2'); expect(customHistory(r, 'neck')).toEqual([]);
    r = addCustomReading(r, 'neck', '2026-10-02', 38, '2026-10-02T09:00:00.000Z', 'custom_3'); r = removeCustomKind(r, 'neck'); expect(r.readings).toEqual([]); expect(r.kinds).toEqual([]);
  });
  test('the photo index is capped and sorted by day; the bytes live elsewhere', () => {
    let r = emptyProgressPhotos();
    const entry = (i: number, date: string) => ({id: `photo_${String(i).padStart(8, '0')}`, date, pose: 'front' as const, bytes: 120_000, type: 'image/webp' as const, at: `${date}T08:00:00.000Z`});
    r = addPhotoEntry(r, entry(2, '2026-10-05')); r = addPhotoEntry(r, entry(1, '2026-09-01'));
    expect(r.photos!.map(p => p.id)).toEqual(['photo_00000001', 'photo_00000002']);
    r = removePhotoEntry(r, 'photo_00000001'); expect(r.photos).toHaveLength(1);
    for (let i = 3; i <= MAX_PHOTOS + 1; i++) r = addPhotoEntry(r, entry(i, '2026-10-06'));
    expect(() => addPhotoEntry(r, entry(99, '2026-10-07'))).toThrow(/At most/);
  });
});

test('a servings line of its own is the yield, never an ingredient (the import-recipe card, Session AA-Local Part 5)', () => {
  const r = parseRecipeText('Fictional soup\nServes 4\n200 g red lentils\n1 onion');
  expect(r.servings).toBe(4); expect(r.ingredients.map(i => i.name)).toEqual(['red lentils', 'onion']);
  expect(parseRecipeText('Soep\n4 personen\n100 g rijst').ingredients.map(i => i.name)).toEqual(['rijst']);
});

test('Session AH (HE14): a line led by its name keeps its amount; a first line that is an ingredient is not taken as the title', () => {
  expect(parseIngredientLine('Flour, 200 g')).toMatchObject({name: 'Flour', quantity: 200, unit: 'g', grams: 200});
  expect(parseIngredientLine('Milk 300 ml')).toMatchObject({name: 'Milk', quantity: 300, unit: 'ml', grams: 300});
  expect(parseIngredientLine('Eggs 2')).toMatchObject({name: 'Eggs', quantity: 2, unit: null});
  expect(parseIngredientLine('Salt to taste')).toMatchObject({name: 'Salt to taste', quantity: null});
  const r = parseRecipeText('Butter 50 g\nSugar 100 g\n2 eggs');
  expect(r.title).toBe('Pasted recipe');
  expect(r.ingredients.map(i => i.name)).toEqual(['Butter', 'Sugar', 'eggs']);
});
