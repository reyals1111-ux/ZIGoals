import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {createEmptyHealth, recipeNutrition} from '../health';
import {genericCatalogSchema} from '../food-generic/catalog';
import {checkSourceFile, type LoadedGenericSource} from '../food-generic/load';
import {resolveTemplateFoods} from '../diet-templates/apply';
import {parseRecipeText, fromSchemaRecipe} from '../health-aa/recipe-text';
import {instructionLines} from '../server/recipe-import';
import {RECIPE_BOOK} from './recipe-book';
import {bookFoods, bookName, bookServing, bookTags, saveBookRecipe} from './recipe-book-apply';
import {setRecipeSteps, stepsFromText} from './steps';
import {emptyFoodPlus} from './schema';

/** Session AV lane 2 (food, LEDGER #91, #200): the built-in recipes (EN and NL) from the shipped offline library, and their methods. */
const pub = join(__dirname, '..', '..', 'public', 'food-generic');
const catalog = genericCatalogSchema.parse(JSON.parse(readFileSync(join(pub, 'manifest.json'), 'utf8')));
const sources: LoadedGenericSource[] = catalog.sources.filter(e => e.source === 'ciqual').map(entry => ({entry, file: checkSourceFile(JSON.parse(readFileSync(join(pub, entry.file), 'utf8')), entry)}));
const {foods, missing} = resolveTemplateFoods(bookFoods(), sources);
const AT = '2026-11-23T08:00:00.000Z';
describe('the recipe collection', () => {
  it('twenty recipes, every food found in the shipped library, a name and the method in English and Dutch', () => {
    expect(RECIPE_BOOK).toHaveLength(20);
    expect(missing).toEqual([]);
    expect(new Set(RECIPE_BOOK.map(r => r.id)).size).toBe(20);
    for (const r of RECIPE_BOOK) {
      expect(r.en).not.toBe(r.nl);
      expect(r.steps.en.length).toBeGreaterThan(0);
      expect(r.steps.nl.length, r.id).toBe(r.steps.en.length);
      for (const s of [...r.steps.en, ...r.steps.nl]) expect(s.length).toBeLessThanOrEqual(600);
      const serving = bookServing(r, foods);
      expect(serving.kcal, r.id).toBeGreaterThan(50);
      expect(serving.kcal!, r.id).toBeLessThan(1200);
    }
  });
  it('high protein and low carb come from the nutrition, never claimed; vegan recipes carry no animal food', () => {
    const tags = Object.fromEntries(RECIPE_BOOK.map(r => [r.id, bookTags(r, bookServing(r, foods))]));
    expect(tags['spinach-omelette']).toEqual(expect.arrayContaining(['high-protein', 'low-carb', 'vegetarian']));
    expect(tags['salmon-salad']).toEqual(expect.arrayContaining(['high-protein', 'low-carb']));
    expect(tags['overnight-oats']).not.toContain('low-carb');
    expect(RECIPE_BOOK.filter(r => tags[r.id]!.includes('high-protein')).length).toBeGreaterThanOrEqual(6);
    const animal = new Set(['milk', 'greekYogurt', 'quark', 'honey', 'egg', 'feta', 'mozzarella', 'salmon', 'cod', 'sardines', 'tuna', 'chicken']);
    for (const r of RECIPE_BOOK.filter(x => x.styles.includes('vegan'))) for (const [k] of r.items) expect(animal.has(k), `${r.id}: ${k}`).toBe(false);
    for (const r of RECIPE_BOOK.filter(x => x.styles.includes('vegetarian'))) for (const [k] of r.items) expect(['salmon', 'cod', 'sardines', 'tuna', 'chicken'].includes(k), `${r.id}: ${k}`).toBe(false);
  });
  it('saving one makes its foods per 100 g (reused when there) and the recipe with the book\'s servings; twice is refused', () => {
    const soup = RECIPE_BOOK.find(r => r.id === 'lentil-soup')!;
    let n = 0; const newId = () => `health_book-food-${String(++n).padStart(3, '0')}`;
    const h = saveBookRecipe(createEmptyHealth(), soup, foods, 'nl', AT, {recipeId: 'health_book-recipe-001', newId});
    expect(h.recipes.map(r => [r.name, r.portionsMilli])).toEqual([['Linzen-tomatensoep', 4000]]);
    expect(h.foods).toHaveLength(soup.items.length);
    expect(h.foods.every(f => f.servingGrams === 100 && f.brand.length > 0)).toBe(true);
    expect(recipeNutrition(h.recipes[0]!).kcal).toBe(bookServing(soup, foods).kcal);
    expect(() => saveBookRecipe(h, soup, foods, 'nl', AT, {recipeId: 'health_book-recipe-002', newId})).toThrow('is already in your recipes');
    const chilli = saveBookRecipe(h, RECIPE_BOOK.find(r => r.id === 'three-bean-chilli')!, foods, 'en', AT, {recipeId: 'health_book-recipe-003', newId});
    expect(chilli.foods.filter(f => /onion/i.test(f.name))).toHaveLength(1); // the onion is reused
    expect(bookName(soup, 'en')).toBe('Lentil and tomato soup');
  });
});
describe('a recipe\'s method', () => {
  it('kept by recipe id, typed lines read as steps, an empty method taken off, gone recipes dropped', () => {
    expect(stepsFromText('1. Chop the onion.\n\n2) Soften it.\n- Add the rest\n')).toEqual(['Chop the onion.', 'Soften it.', 'Add the rest']);
    let r = setRecipeSteps(emptyFoodPlus(), 'health_book-recipe-001', ['Chop.', '  Simmer.  ']);
    expect(r.steps).toEqual({'health_book-recipe-001': ['Chop.', 'Simmer.']});
    r = setRecipeSteps(r, 'health_book-recipe-002', ['Stir.'], new Set(['health_book-recipe-002']));
    expect(Object.keys(r.steps!)).toEqual(['health_book-recipe-002']);
    expect(setRecipeSteps(r, 'health_book-recipe-002', []).steps).toBeUndefined();
  });
  it('a pasted recipe and a page keep their method lines (no HTML), at most 60', () => {
    const p = parseRecipeText('Fictional soup\nServes 2\n\nIngredients\n200 g lentils\n\nMethod\nFry the onion.\nAdd the lentils and simmer.');
    expect(p.stepLines).toEqual(['Fry the onion.', 'Add the lentils and simmer.']);
    expect(p.steps).toBe(2);
    expect(instructionLines([{'@type': 'HowToSection', itemListElement: [{'@type': 'HowToStep', text: '<b>Fry</b> it.'}]}, 'Simmer.'])).toEqual(['Fry it.', 'Simmer.']);
    expect(instructionLines(Array.from({length: 80}, (_, i) => `Step ${i}.`))).toHaveLength(60);
    expect(fromSchemaRecipe({name: 'X', ingredients: ['1 onion'], servings: 2, instructions: ['Fry.', 'Eat.']}).stepLines).toEqual(['Fry.', 'Eat.']);
  });
});
