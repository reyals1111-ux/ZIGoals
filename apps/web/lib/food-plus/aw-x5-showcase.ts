import {addLocalDays} from '../local-date';
import {GROCERY_KEY, groceryRecordSchema} from '../grocery/schema';
import {FOOD_PLUS_KEY, foodPlusSchema} from './schema';

/**
 * Session AW (X5, LEDGER #449, #452, #454, #455; Paprika): the Showcase's labelled kitchen examples, on the Showcase's own
 * pea soup (lib/health-aa/showcase.ts, `health_recipe-aa-soup`, planned for five dinners): its method, with steps that
 * name a time (so "Start 5 min timer" and "Start 45 min timer" show while cooking), made twice ("Made it" days) with four
 * stars, and the soup week kept as a menu "Soup week (Showcase)"; three things at home with a use-by day — one tomorrow,
 * one past it, one later. Writes only where nothing is kept yet (the records map lib/showcase-data.ts builds; one line).
 */
export const SHOWCASE_SOUP = 'health_recipe-aa-soup', SHOWCASE_SOUP_MEAL = 'health_meal-aa-soup';
export function withAwX5Showcase(records: Record<string, string>, day: string): Record<string, string> {
  const at = `${day}T08:00:00.000Z`;
  records[FOOD_PLUS_KEY] ??= JSON.stringify(foodPlusSchema.parse({version: 1,
    steps: {[SHOWCASE_SOUP]: ['Rinse the split peas under cold water.', 'Soften the leek in a little oil for 5 minutes.', 'Add the peas and 1.2 litres of water, then simmer for 40–45 minutes, stirring now and then.', 'Blend half of the soup, stir it back in and season to taste.']},
    made: {[SHOWCASE_SOUP]: [addLocalDays(day, -12), addLocalDays(day, -5)]},
    stars: {[SHOWCASE_SOUP]: 4},
    menus: [{id: 'menu-showcase-soup', name: 'Soup week (Showcase)', keptOn: addLocalDays(day, -7), items: [0, 1, 2, 3, 4].map(d => ({day: d, meal: 'Dinner', savedMealId: SHOWCASE_SOUP_MEAL, name: 'Showcase pea soup'}))}],
  }));
  records[GROCERY_KEY] ??= JSON.stringify(groceryRecordSchema.parse({version: 1,
    pantry: {'showcase yoghurt': at, 'showcase spinach': at, 'showcase rice': at},
    useBy: {'showcase yoghurt': addLocalDays(day, 1), 'showcase spinach': addLocalDays(day, -1), 'showcase rice': addLocalDays(day, 40)},
  }));
  return records;
}
