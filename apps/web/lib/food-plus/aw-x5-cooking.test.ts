import {afterEach, describe, expect, test} from 'vitest';
import {createEmptyHealth, saveFood, saveRecipe} from '../health';
import {stepTime, timerName} from './step-timers';
import {factorOf, roundMeasure, roundPieces, scaledLines, scaleWords} from './scale';
import {pageSecondsLeft, pageTimersNow, setNamedTimersLoader, startCookingTimer, stopPageTimer, clockOf} from '../aw-x5/timer-adapter';

/**
 * Session AW (X5, LEDGER #449, #450): a method step's time read from its words in English and Dutch (the larger number
 * of a range), the timer's name after the recipe and the step, the adapter that starts it in #440's Timers or, without
 * that module, as an in-page countdown; and the amounts scaled while cooking, rounded as a cook measures.
 */
describe('#449 timers from the method', () => {
  const t = (s: string) => stepTime(s, 'Pea soup');
  test('English and Dutch times, ranges take the larger number, hours and minutes join', () => {
    expect(t('Simmer for 15 minutes.')).toEqual({seconds: 900, words: '15 min', name: 'Pea soup · Simmer'});
    expect(t('Bake 20–25 min until golden.')?.seconds).toBe(1500);
    expect(t('Bake 20-25 minutes')?.seconds).toBe(1500);
    expect(t('Roast for 1 hour 30 minutes, basting once.')).toMatchObject({seconds: 5400, words: '1 h 30 min', name: 'Pea soup · Roast'});
    expect(t('Leave to rise for 1½ hours.')?.seconds).toBe(5400);
    expect(t('Cook for an hour.')?.seconds).toBe(3600);
    expect(t('Rest for half an hour.')?.seconds).toBe(1800);
    expect(t('Whisk for 30 sec.')?.seconds).toBe(30);
    expect(t('Laat 10 minuten rusten.')).toMatchObject({seconds: 600, words: '10 min', name: 'Pea soup · Laat rusten'});
    expect(t('Kook de pasta in 8 à 10 minuten beetgaar.')?.seconds).toBe(600);
    expect(t('Bak 1 uur en 15 minuten in de oven.')?.seconds).toBe(4500);
    expect(t('Laat een half uur marineren.')?.seconds).toBe(1800);
    expect(t('Stoof het vlees anderhalf uur.')?.seconds).toBe(5400);
    expect(t('Zet een kwartiertje weg.')?.seconds).toBe(900);
    expect(t('Marinate for 2 hrs')?.seconds).toBe(7200);
  });
  test('no time, a measure that is not a time, or past a day: no timer', () => {
    for (const s of ['Chop the onion.', 'Cut into 2 cm pieces.', 'Roll out to 5 mm.', 'Add 200 g flour and 2 tbsp oil.', 'Preheat the oven to 180 °C.', 'Add a pinch of salt.', 'Season with 2 tsp sugar.', 'Leave for 48 hours.'])
      expect(stepTime(s, 'x'), s).toBeNull();
  });
  test('the name comes from the recipe and the step, at most 40 characters; a time first falls back to the step', () => {
    expect(stepTime('10 minutes in a hot pan.', 'Soup', 'Step 3')?.name).toBe('Soup · Step 3');
    expect(stepTime('2. Simmer gently for 5 min', 'Soup')?.name).toBe('Soup · Simmer gently');
    const long = timerName('A very long recipe name for a Sunday family lunch', 'Simmer');
    expect(long.length).toBeLessThanOrEqual(40);
    expect(long.endsWith(' · Simmer')).toBe(true);
    expect(long).toContain('…');
  });
});

describe('#449 the timer adapter', () => {
  afterEach(() => { setNamedTimersLoader(null); for (const x of pageTimersNow()) stopPageTimer(x.id); });
  test('without #440’s module, an in-page countdown (several at once), stopped by id', async () => {
    const a = await startCookingTimer('Soup · Simmer', 900, 1_000_000), b = await startCookingTimer('Soup · Rest', 60, 1_000_000);
    expect(a.where).toBe('page');
    expect(pageTimersNow().map(x => x.name)).toEqual(['Soup · Rest', 'Soup · Simmer']);
    const timer = (a as {timer: {id: string; endsAt: number; seconds: number}}).timer;
    expect(pageSecondsLeft({...timer, name: ''}, 1_000_000 + 60_500)).toBe(840);
    expect(pageSecondsLeft({...timer, name: ''}, 0)).toBe(900);
    expect(pageSecondsLeft({...timer, name: ''}, 1_000_000 + 901_000)).toBe(0);
    stopPageTimer((b as {timer: {id: string}}).timer.id);
    expect(pageTimersNow()).toHaveLength(1);
    expect(clockOf(539)).toBe('8:59');
    expect(clockOf(3723)).toBe('1:02:03');
  });
  test('with the module, it starts there by name and seconds; a module that throws falls back to the page', async () => {
    const calls: [string, number][] = [];
    setNamedTimersLoader(async () => ({startNamedTimer: (n, s) => { calls.push([n, s]); }}));
    expect(await startCookingTimer('Soup · Simmer', 900.4)).toEqual({where: 'timers'});
    expect(calls).toEqual([['Soup · Simmer', 900]]);
    expect(pageTimersNow()).toHaveLength(0);
    setNamedTimersLoader(async () => ({startNamedTimer: () => { throw new Error('storage full'); }}));
    expect((await startCookingTimer('Soup · Rest', 60)).where).toBe('page');
  });
});

describe('#450 a recipe scaled while cooking', () => {
  const AT = '2026-11-23T08:00:00.000Z';
  let h = createEmptyHealth();
  h = saveFood(h, {id: 'health_food-x5-peas', name: 'Split peas', brand: '', servingGrams: 100, nutrients: {kcal: 1, proteinMg: 1, carbsMg: 1, fatMg: 1}, createdAt: AT, updatedAt: AT});
  h = saveFood(h, {id: 'health_food-x5-milk', name: 'Milk', brand: '', servingGrams: null, servingMl: 250, nutrients: {kcal: 1, proteinMg: 1, carbsMg: 1, fatMg: 1}, createdAt: AT, updatedAt: AT});
  h = saveFood(h, {id: 'health_food-x5-salt', name: 'Salt', brand: '', servingGrams: 1, nutrients: {kcal: 0, proteinMg: 0, carbsMg: 0, fatMg: 0}, createdAt: AT, updatedAt: AT});
  h = saveRecipe(h, {id: 'health_recipe-x5-soup', name: 'Soup', portionsMilli: 2000, items: [{foodId: 'health_food-x5-peas', quantityMilli: 2_330}, {foodId: 'health_food-x5-milk', quantityMilli: 1_000}, {foodId: 'health_food-x5-salt', quantityMilli: 3_000}]}, AT);
  const recipe = h.recipes[0]!;
  test('servings and times choose the factor; the recipe as saved is 1×', () => {
    expect(factorOf(recipe, null)).toBe(1);
    expect(factorOf(recipe, {kind: 'servings', servings: 6})).toBe(3);
    expect(factorOf(recipe, {kind: 'times', times: 0.5})).toBe(0.5);
    expect(scaleWords(recipe, {kind: 'servings', servings: 6})).toBe('For 6 servings (the recipe makes 2): amounts × 3.');
    expect(scaleWords(recipe, {kind: 'times', times: 0.5})).toBe('Half the recipe: 1 serving.');
    expect(scaleWords(recipe, {kind: 'times', times: 2})).toBe('Twice the recipe: 4 servings.');
    expect(scaleWords(recipe, {kind: 'servings', servings: 2})).toBe('Makes 2 servings.');
  });
  test('grams and millilitres to 5 (small amounts to the whole one, never 0); pieces to halves; 1× unrounded', () => {
    expect(scaledLines(recipe, 1).map(l => l.amount)).toEqual(['233 g', '250 ml', '3 g']);
    expect(scaledLines(recipe, 3).map(l => l.amount)).toEqual(['700 g', '750 ml', '9 g']);
    expect(scaledLines(recipe, 0.5).map(l => l.amount)).toEqual(['115 g', '125 ml', '2 g']);
    expect(roundMeasure(0.2)).toBe(1);
    expect(roundMeasure(22)).toBe(20);
    expect(roundPieces(0.1)).toBe(0.5);
    expect(roundPieces(1.3)).toBe(1.5);
    // the saved recipe is untouched
    expect(h.recipes[0]!.ingredients.map(i => i.quantityMilli)).toEqual([2_330, 1_000, 3_000]);
  });
});
