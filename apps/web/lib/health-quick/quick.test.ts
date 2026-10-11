import {describe, expect, test} from 'vitest';
import {createEmptyHealth, logHealthItem, removeHealthItem, saveFood, type HealthData} from '../health';
import {dailyData, saveHealthPreferences} from '../health-daily';
import {copyMealFromDayBefore, dayBefore, isPinned, logAgain, pinnedItems, quickIn, repeatDayBefore, resetWaterSizes, saveWaterSizes, setPinned, usualForMeal, waterButtons, waterSizesText} from './quick';

// Session W Part 9: one-tap logging from the person's own diary and library, and their own water buttons.
const AT = '2026-10-07T07:00:00.000Z';
function food(health: HealthData, id: string, name: string, kcal: number): HealthData {
  return saveFood(health, {id: `health_food-${id}`, name, brand: '', servingGrams: 100, nutrients: {kcal, proteinMg: 1000, carbsMg: 2000, fatMg: 500}, createdAt: AT, updatedAt: AT});
}
let n = 0;
const log = (health: HealthData, id: string, date: string, meal: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks', quantityMilli = 1000) =>
  logHealthItem(health, {id: `health_diary-test-${String(++n).padStart(4, '0')}`, sourceId: `health_food-${id}`, sourceKind: 'food', date, meal, quantityMilli}, `${date}T0${n % 9}:00:00.000Z`);
function journal(): HealthData {
  let h = createEmptyHealth();
  h = food(h, 'oats', 'Oats', 380); h = food(h, 'coffee', 'Coffee', 5); h = food(h, 'soup', 'Lentil soup', 240); h = food(h, 'apple', 'Apple', 52);
  h = log(h, 'oats', '2026-10-06', 'Breakfast', 1500); h = log(h, 'coffee', '2026-10-06', 'Breakfast'); h = log(h, 'soup', '2026-10-06', 'Lunch', 2000);
  return h;
}

describe('the day before, in one tap', () => {
  test('a meal comes over exactly as it was logged (snapshot and amount); the same tap twice adds nothing', () => {
    const h = journal();
    expect(dayBefore(h, '2026-10-07')).toEqual({date: '2026-10-06', meals: {Breakfast: 2, Lunch: 1, Dinner: 0, Snacks: 0}, total: 3});
    const once = copyMealFromDayBefore(h, '2026-10-07', 'Breakfast', 'health_copy-test-0001', AT);
    const copied = once.diary.filter(e => e.date === '2026-10-07');
    expect(copied.map(e => [e.meal, e.snapshot.name, e.quantityMilli, e.snapshot.nutrients.kcal])).toEqual([['Breakfast', 'Oats', 1500, 380], ['Breakfast', 'Coffee', 1000, 5]]);
    expect(copyMealFromDayBefore(once, '2026-10-07', 'Breakfast', 'health_copy-test-0001', AT)).toBe(once);
    expect(() => copyMealFromDayBefore(h, '2026-10-07', 'Dinner', 'health_copy-test-0002', AT)).toThrow(/Nothing was logged for dinner/);
  });
  test('"Repeat yesterday" brings every meal into the same meals, as one operation', () => {
    const h = journal(), once = repeatDayBefore(h, '2026-10-07', 'health_copy-test-0003', AT);
    expect(once.diary.filter(e => e.date === '2026-10-07').map(e => [e.meal, e.snapshot.name])).toEqual([['Breakfast', 'Oats'], ['Breakfast', 'Coffee'], ['Lunch', 'Lentil soup']]);
    expect(dailyData(once).copyOperations).toEqual(['health_copy-test-0003']);
    expect(repeatDayBefore(once, '2026-10-07', 'health_copy-test-0003', AT)).toBe(once);
    expect(() => repeatDayBefore(h, '2026-10-06', 'health_copy-test-0004', AT)).toThrow(/Nothing was logged the day before/);
  });
});

describe('usual items and pins', () => {
  test('usual for a meal: logged there in the 30 days before, most often first, at the amount last used there; not what is already there today', () => {
    let h = journal();
    h = log(h, 'oats', '2026-10-05', 'Breakfast', 1000); h = log(h, 'apple', '2026-10-05', 'Snacks'); h = log(h, 'apple', '2026-09-01', 'Breakfast');
    expect(usualForMeal(h, '2026-10-07', 'Breakfast').map(u => [u.name, u.count, u.quantityMilli])).toEqual([['Oats', 2, 1500], ['Coffee', 1, 1000]]);
    h = log(h, 'coffee', '2026-10-07', 'Breakfast');
    expect(usualForMeal(h, '2026-10-07', 'Breakfast').map(u => u.name)).toEqual(['Oats']);
    expect(usualForMeal(h, '2026-10-07', 'Snacks').map(u => u.name)).toEqual(['Apple']);
    // A food removed from the library is not offered (logging it again would need its label).
    expect(usualForMeal(removeHealthItem(h, 'foods', 'health_food-oats'), '2026-10-07', 'Breakfast')).toEqual([]);
  });
  test('pins: at most twelve, only library items, kept in Health v4 quick; one tap logs at the last amount with today\'s label', () => {
    let h = journal();
    expect(quickIn(h)).toBeUndefined();
    h = setPinned(h, 'food', 'health_food-apple', true, AT);
    expect(h.schemaVersion).toBe(4);
    expect(isPinned(h, 'food', 'health_food-apple')).toBe(true);
    expect(pinnedItems(h)).toEqual([{id: 'health_food-apple', kind: 'food', name: 'Apple', quantityMilli: 1000, count: 0}]);
    expect(pinnedItems(setPinned(h, 'food', 'health_food-soup', true, AT)).map(p => [p.name, p.quantityMilli])).toEqual([['Apple', 1000], ['Lentil soup', 2000]]);
    expect(() => setPinned(h, 'food', 'health_food-missing', true, AT)).toThrow(/no longer in your library/);
    let many = h;
    for (let i = 0; i < 11; i++) { many = food(many, `extra-${i}`, `Extra ${i}`, 10); many = setPinned(many, 'food', `health_food-extra-${i}`, true, AT); }
    expect(() => setPinned(many, 'food', 'health_food-oats', true, AT)).toThrow(/up to 12/);
    expect(isPinned(setPinned(h, 'food', 'health_food-apple', false, AT), 'food', 'health_food-apple')).toBe(false);
    const logged = logAgain(h, pinnedItems(h)[0]!, '2026-10-07', 'Snacks', 'health_diary-test-again1', AT);
    expect(logged.diary.at(-1)).toMatchObject({date: '2026-10-07', meal: 'Snacks', quantityMilli: 1000, snapshot: {name: 'Apple'}});
  });
});

describe('water buttons', () => {
  test('until chosen: 250 and 500 mL, or 8 and 16 US fl oz, exactly as before', () => {
    const h = createEmptyHealth(), oz = saveHealthPreferences(h, {...dailyData(h).preferences, waterUnit: 'fl-oz-us'});
    expect(waterButtons(h)).toEqual([{amountMilli: 250_000, unit: 'ml', label: 'Add 250 mL'}, {amountMilli: 500_000, unit: 'ml', label: 'Add 500 mL'}]);
    expect(waterButtons(oz)).toEqual([{amountMilli: 8000, unit: 'fl-oz-us', label: 'Add 8 US fl oz'}, {amountMilli: 16_000, unit: 'fl-oz-us', label: 'Add 16 US fl oz'}]);
    expect(waterSizesText(oz)).toBe('8, 16');
  });
  test('your own sizes in your unit (kept in mL); refusals say why; back to the usual', () => {
    const h = createEmptyHealth(), oz = saveHealthPreferences(h, {...dailyData(h).preferences, waterUnit: 'fl-oz-us'});
    const mine = saveWaterSizes(h, '330, 750,150', AT);
    expect(quickIn(mine)?.waterSizesMl).toEqual([330, 750, 150]);
    expect(waterButtons(mine).map(b => b.label)).toEqual(['Add 330 mL', 'Add 750 mL', 'Add 150 mL']);
    const ozMine = saveWaterSizes(oz, '8, 12, 20', AT);
    expect(quickIn(ozMine)?.waterSizesMl).toEqual([237, 355, 591]);
    expect(waterButtons(ozMine).map(b => [b.label, b.amountMilli])).toEqual([['Add 8 US fl oz', 8000], ['Add 12 US fl oz', 12_000], ['Add 20 US fl oz', 20_000]]);
    expect(() => saveWaterSizes(h, '', AT)).toThrow(/one to six/);
    expect(() => saveWaterSizes(h, '1,2,3,4,5,6,7', AT)).toThrow(/one to six/);
    expect(() => saveWaterSizes(h, '250, 250', AT)).toThrow(/different size/);
    expect(() => saveWaterSizes(h, '5', AT)).toThrow(/between 10 and 5,000 mL/);
    expect(() => saveWaterSizes(h, 'a glass', AT)).toThrow(/is not a size/);
    expect(quickIn(resetWaterSizes(mine, AT))?.waterSizesMl).toEqual([250, 500]);
    expect(quickIn(resetWaterSizes(ozMine, AT))?.waterSizesMl).toEqual([237, 473]);
    expect(resetWaterSizes(h, AT)).toBe(h);
  });
});
