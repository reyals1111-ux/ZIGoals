import {describe, expect, test} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {healthSchema, HEALTH_STORAGE_KEY} from '../health';
import {dailyData} from '../health-daily';
import {GROCERY_KEY, groceryRecordSchema} from '../grocery/schema';
import {pantrySoon} from '../grocery/use-soon';
import {FOOD_PLUS_KEY, foodPlusSchema} from './schema';
import {madeOf, starsOf} from './made';
import {menusOf, placeMenu} from './menus';
import {stepTime} from './step-timers';
import {SHOWCASE_SOUP, withAwX5Showcase} from './aw-x5-showcase';

/** Session AW (X5): the Showcase's labelled kitchen examples sit on its own pea soup, and only where nothing is kept yet. */
const DAY = '2026-11-17';
describe('X5 Showcase examples', () => {
  const {records} = buildShowcase(DAY, 'UTC'), health = healthSchema.parse(JSON.parse(records[HEALTH_STORAGE_KEY]!));
  const food = foodPlusSchema.parse(JSON.parse(records[FOOD_PLUS_KEY]!)), grocery = groceryRecordSchema.parse(JSON.parse(records[GROCERY_KEY]!));
  test('the pea soup’s method names times, it was made twice with four stars, and its menu places on next week', () => {
    expect(health.recipes.some(r => r.id === SHOWCASE_SOUP && r.name.startsWith('Showcase'))).toBe(true);
    expect(food.steps![SHOWCASE_SOUP]!.map(s => stepTime(s, 'Showcase pea soup')?.words ?? null)).toEqual([null, '5 min', '45 min', null]);
    expect(madeOf(health, food, SHOWCASE_SOUP, DAY)).toMatchObject({last: '2026-11-12', times: 2});
    expect(starsOf(food, SHOWCASE_SOUP)).toBe(4);
    const [menu] = menusOf(food);
    expect(menu!.name).toBe('Soup week (Showcase)');
    const placed = placeMenu(health, menu!, '2026-11-23', `${DAY}T08:00:00.000Z`, (() => { let n = 0; return () => `health_plan-x5-test-${++n}`; })());
    expect(placed.planIds).toHaveLength(5);
    expect(dailyData(placed.data).plans.filter(p => p.date >= '2026-11-23').map(p => p.date)).toEqual(['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27']);
  });
  test('three labelled things at home: one to use tomorrow, one past its day, one later', () => {
    const {soon, past, later} = pantrySoon(grocery, DAY);
    expect([soon.map(i => i.name), past.map(i => i.name), later.map(i => i.name)]).toEqual([['showcase yoghurt'], ['showcase spinach'], ['showcase rice']]);
    expect(Object.keys(grocery.pantry!).every(n => n.startsWith('showcase '))).toBe(true);
  });
  test('an existing record is kept', () => {
    const r = withAwX5Showcase({[FOOD_PLUS_KEY]: '{"version":1}', [GROCERY_KEY]: '{"version":1}'}, DAY);
    expect([r[FOOD_PLUS_KEY], r[GROCERY_KEY]]).toEqual(['{"version":1}', '{"version":1}']);
  });
});
