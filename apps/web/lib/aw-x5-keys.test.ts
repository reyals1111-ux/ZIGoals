import {describe, expect, test} from 'vitest';
import {AW_X5_EXTENDED_KEYS, AW_X5_NEW_PARTS, FOOD_PLUS_KEY_LITERAL, GROCERY_KEY_LITERAL} from './aw-x5-keys';
import {FOOD_PLUS_KEY, foodPlusSchema} from './food-plus/schema';
import {GROCERY_KEY, groceryRecordSchema} from './grocery/schema';
import {DEVICE_KEYS} from './export/everything';

/** Session AW (X5): the literals equal their owners' constants; both records are exported already; the new parts parse. */
describe('X5 stored records', () => {
  test('literals equal their owners’ constants, and both records are in Export everything already', () => {
    expect(FOOD_PLUS_KEY_LITERAL).toBe(FOOD_PLUS_KEY);
    expect(GROCERY_KEY_LITERAL).toBe(GROCERY_KEY);
    for (const key of AW_X5_EXTENDED_KEYS) expect(Object.values(DEVICE_KEYS)).toContain(key);
  });
  test('each new part is a part the record’s schema keeps', () => {
    const food = foodPlusSchema.parse({version: 1, made: {'health_recipe-x5-soup': ['2026-11-20']}, stars: {'health_recipe-x5-soup': 4}, menus: []});
    for (const part of AW_X5_NEW_PARTS[FOOD_PLUS_KEY_LITERAL]) expect(food).toHaveProperty(part);
    const grocery = groceryRecordSchema.parse({version: 1, pantry: {rice: '2026-11-20T08:00:00.000Z'}, useBy: {rice: '2026-11-27'}});
    for (const part of AW_X5_NEW_PARTS[GROCERY_KEY_LITERAL]) expect(grocery).toHaveProperty(part);
  });
});
