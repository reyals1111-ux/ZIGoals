import {describe, expect, test} from 'vitest';
import {mealsLoggedLine, mealsLoggedOn, noNutritionKnown} from './health-today-meals';
import {createEmptyHealth, dailyHealthSummary, logHealthItem, saveFood, type HealthData} from './health';
import {trendNote} from './health-aa/trend';
import {focusHabitTemplate, focusStarter} from './onboarding-setup';
import {habitTemplate} from './templates/habits';
import {emptyHabitHealthLinks} from './habit-health-links/schema';
import {withIdeaLinks} from './habit-health-links/suggest';

const DAY = '2026-11-08', AT = new Date('2026-11-08T07:30:00.000Z');
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function withFood(data: HealthData, n: number, name: string, meal: 'Breakfast' | 'Lunch' | 'Snacks', kcal: number | null): HealthData {
  const foodId = `health_food-${n}-0000`;
  const food = {id: foodId, name, brand: '', servingGrams: 100, nutrients: {kcal, proteinMg: null, carbsMg: null, fatMg: null}, createdAt: AT.toISOString(), updatedAt: AT.toISOString()};
  return logHealthItem(saveFood(data, food as Parameters<typeof saveFood>[1]), {id: `health_entry-${n}-000`, sourceId: foodId, sourceKind: 'food', date: DAY, meal, quantityMilli: 1000}, AT.toISOString());
}

describe('Session AL release review, Life areas', () => {
  test('RR-5: Today names the meals logged, in meal order; a day with no nutrition at all is said so (never 0)', () => {
    let d = withFood(createEmptyHealth(), 1, 'apple', 'Snacks', null);
    d = withFood(d, 2, 'oatmeal with blueberries', 'Breakfast', null);
    expect(mealsLoggedOn(d, DAY)).toEqual({names: ['Breakfast: oatmeal with blueberries', 'Snack: apple'], more: 0});
    expect(mealsLoggedLine(d, DAY, 1)).toBe('Breakfast: oatmeal with blueberries · 1 more');
    expect(mealsLoggedLine(d, '2026-11-07')).toBe('');
    expect(noNutritionKnown(dailyHealthSummary(d, DAY))).toBe(true);
    expect(noNutritionKnown(dailyHealthSummary(withFood(d, 3, 'soup', 'Lunch', 120), DAY))).toBe(false);
  });
  test('RR-6: one weigh-in is a first reading; a weekly rate is said when there is one', () => {
    expect(trendNote(1, null)).toBe('First reading. Two or three a week draw the line.');
    expect(trendNote(3, null)).toBe('smoothed over 3 readings · an estimate');
    expect(trendNote(12, '−0.3 kg')).toBe('−0.3 kg a week · an estimate');
  });
  test('RR-15: the welcome makes the habit its focus card describes', () => {
    expect(focusHabitTemplate('Read')).toMatchObject({title: 'Read', target: 20, note: '20 minutes a day', measurement: {kind: 'duration', unit: 'minutes'}});
    expect(focusHabitTemplate('Meditate')).toMatchObject({target: 10, measurement: {kind: 'duration', unit: 'minutes'}});
    expect(focusHabitTemplate('Deep work')).toBeNull(); // no template: the focus's own daily check-in
    const read = habitTemplate('read')!;
    expect(focusStarter(read, ['read'])).toMatchObject({target: 20}); // the focus picked: its amount
    expect(focusStarter(read, ['meditate'])).toBe(read); // not picked: the library's 30 minutes
  });
  test('RR-1: one-tap setup habits start linked to Health (water in mL, steps); an existing link is kept; v1Only keeps the device key\'s measures', () => {
    const water = {id: id(1), input: {title: 'Drink water', measurement: {kind: 'quantity', unit: 'liters'}, target: 2}};
    const walk = {id: id(2), input: {title: 'Walk', measurement: {kind: 'quantity', unit: 'steps'}, target: 8000}};
    const meditate = {id: id(3), input: {title: 'Meditate', measurement: {kind: 'duration', unit: 'minutes'}, target: 10}};
    const read = {id: id(4), input: {title: 'Read', measurement: {kind: 'duration', unit: 'minutes'}, target: 20}};
    const linked = withIdeaLinks(emptyHabitHealthLinks(), [water, walk, meditate, read], 'ml', AT);
    expect(Object.fromEntries(Object.entries(linked.links).map(([k, l]) => [k, [l.measure, l.target]]))).toEqual({[id(1)]: ['water', 2000], [id(2)]: ['steps', 8000], [id(3)]: ['meditationMinutes', 10]});
    expect(Object.keys(withIdeaLinks(emptyHabitHealthLinks(), [water, meditate], 'ml', AT, true).links)).toEqual([id(1)]);
    const own = {...emptyHabitHealthLinks(), links: {[id(1)]: {version: 1 as const, measure: 'water' as const, rule: 'at-least' as const, target: 1500, updatedAt: AT.toISOString()}}};
    expect(withIdeaLinks(own, [water], 'ml', AT)).toBe(own);
  });
});
