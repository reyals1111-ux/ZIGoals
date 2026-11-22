'use client';
import {useEffect, useId, useState} from 'react';
import {newHealthId, type HealthData} from '../../../lib/health';
import {resolveTemplateFoods, type GenericFood} from '../../../lib/diet-templates/apply';
import type {FoodKey} from '../../../lib/diet-templates/templates';
import {BOOK_STYLES, RECIPE_BOOK} from '../../../lib/food-plus/recipe-book';
import {bookFoods, bookName, bookServing, bookTags, saveBookRecipe, type BookTag, type Lang} from '../../../lib/food-plus/recipe-book-apply';
import {setRecipeSteps} from '../../../lib/food-plus/steps';
import {FOOD_PLUS} from '../../../lib/food-plus/schema';
import {useDeviceRecord} from '../../ai/use-device-record';
import {formatNumber} from '../../../lib/visual-format';
import {HEALTH_VITAMINS} from '../../../lib/health-vitamins/schema';
import {NUTRIENT_EXTRAS_RECORD} from '../../../lib/health-vitamins/extras';
import {bookExtras, hasLibraryExtras, keepLibraryExtras, type LibraryExtras} from '../../../lib/food-plus/library-extras';
import './food-plus.css';

/**
 * Session AV lane 2 (food, LEDGER #91; MyFitnessPal's Plan tab, Yazio's recipes): Health → Foods & recipes → "Recipes to
 * start from": twenty plain recipes written in the repository in English and Dutch, from the offline library's generic
 * foods, filtered by style (vegetarian, vegan, Mediterranean, and high protein or low carb from their own nutrition).
 * Each shows a serving's calories and macros from the library, its ingredients and method; "Save to my recipes" adds it
 * (foods per 100 g, the method kept for the cooking view). A starting point to change, never advice.
 */
type Perform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
const g = (mg: number | null, partial?: number) => mg === null ? '?' : `${formatNumber(Math.round(mg / 1000))}${partial ? '+' : ''}`;
export default function RecipeBook({data, perform}: {data: HealthData; perform: Perform}) {
  const id = useId(), steps = useDeviceRecord(FOOD_PLUS), vitaminRecord = useDeviceRecord(HEALTH_VITAMINS), extrasRecord = useDeviceRecord(NUTRIENT_EXTRAS_RECORD);
  const [more, setMore] = useState<Partial<Record<FoodKey, LibraryExtras>>>({});
  const [lang, setLang] = useState<Lang>(() => typeof navigator !== 'undefined' && /^nl\b/i.test(navigator.language) ? 'nl' : 'en');
  const [style, setStyle] = useState<BookTag | 'all'>('all'), [foods, setFoods] = useState<Partial<Record<FoodKey, GenericFood>> | null | 'failed'>(null);
  useEffect(() => {
    let live = true;
    void import('../../../lib/food-generic/load').then(async load => { const {sources} = await load.loadGenericLibrary(); if (!live) return; setFoods(sources.length ? resolveTemplateFoods(bookFoods(), sources).foods : 'failed'); setMore(bookExtras(bookFoods(), sources)); }).catch(() => { if (live) setFoods('failed'); });
    return () => { live = false; };
  }, []);
  if (foods === null) return <p className="fine" role="status">Opening the offline food library…</p>;
  if (foods === 'failed') return <p className="fine" role="status">The offline food library could not be opened on this device just now, so the recipes cannot show their nutrition. Try again later.</p>;
  const rows = RECIPE_BOOK.map(recipe => { const serving = bookServing(recipe, foods); return {recipe, serving, tags: bookTags(recipe, serving)}; }).filter(r => style === 'all' || r.tags.includes(style));
  const label = (tag: BookTag) => { const s = BOOK_STYLES.find(x => x.id === tag)!; return lang === 'nl' ? s.nl : s.en; };
  const save = (recipe: (typeof RECIPE_BOOK)[number]) => {
    const recipeId = newHealthId(), name = bookName(recipe, lang), made: [FoodKey, string][] = [];
    void perform(latest => { made.length = 0; return saveBookRecipe(latest, recipe, foods, lang, new Date().toISOString(), {recipeId, made: (key, foodId) => made.push([key, foodId])}); }, `“${name}” saved to your recipes, with its method. Log it from Log a meal, or cook it from Foods & recipes.`, () => {
      try { steps.update(r => setRecipeSteps(r, recipeId, recipe.steps[lang])); } catch { /* the recipe is saved; only its method is not kept on this device */ }
      // LEDGER #93: each new library food keeps the vitamins and extras the library carries.
      for (const [key, foodId] of made) { const x = more[key]; if (!hasLibraryExtras(x)) continue; try { const both = keepLibraryExtras({vitamins: vitaminRecord.data, extras: extrasRecord.data}, foodId, x!, data.diary.map(d => d.id)); vitaminRecord.update(() => both.vitamins); extrasRecord.update(() => both.extras); } catch { /* the food keeps its label values */ } }
    });
  };
  return <div className="food-plus-card">
    <p className="fine">Plain recipes to start from, made of everyday foods from the offline food library. The numbers are a serving’s, from public food tables; “12+ g” means some ingredient does not give that value. Change anything after saving; information, not advice.</p>
    <div className="food-plus-row">
      <fieldset className="health-quick-macros"><legend>Language</legend><div className="food-plus-row">
        <label className="food-plus-choice"><input type="radio" name={`${id}-lang`} checked={lang === 'en'} onChange={() => setLang('en')}/> English</label>
        <label className="food-plus-choice" lang="nl"><input type="radio" name={`${id}-lang`} checked={lang === 'nl'} onChange={() => setLang('nl')}/> Nederlands</label>
      </div></fieldset>
      <label className="field"><span>Style</span><select value={style} onChange={e => setStyle(e.target.value as BookTag | 'all')}><option value="all">{lang === 'nl' ? 'Alle recepten' : 'All recipes'}</option>{BOOK_STYLES.map(s => <option key={s.id} value={s.id}>{lang === 'nl' ? s.nl : s.en}</option>)}</select></label>
    </div>
    <p className="fine" role="status">{rows.length} {rows.length === 1 ? 'recipe' : 'recipes'}</p>
    <ul className="food-plus-list" aria-label="Recipes to start from" lang={lang}>{rows.map(({recipe, serving, tags}) => { const name = bookName(recipe, lang), saved = data.recipes.some(r => r.name === name); return <li key={recipe.id} className="food-plus-book-item">
      <div className="food-plus-book-main"><h3>{name}</h3>
        <p className="fine">{recipe.servings} {lang === 'nl' ? (recipe.servings === 1 ? 'portie' : 'porties') : (recipe.servings === 1 ? 'serving' : 'servings')} · {recipe.minutes} min{tags.length ? ` · ${tags.map(label).join(', ')}` : ''}</p>
        <p data-body-figure="">{lang === 'nl' ? 'Per portie' : 'A serving'}: {serving.kcal === null ? '?' : `${formatNumber(serving.kcal)}${serving.missing.kcal ? '+' : ''}`} kcal · P {g(serving.proteinMg, serving.missing.proteinMg)} g · C {g(serving.carbsMg, serving.missing.carbsMg)} g · F {g(serving.fatMg, serving.missing.fatMg)} g</p>
        <details><summary className="fine">{lang === 'nl' ? 'Ingrediënten en bereiding' : 'Ingredients and method'}</summary>
          <ul>{recipe.items.map(([key, grams]) => <li key={key}>{grams} g {foods[key]?.name ?? key}</li>)}</ul>
          <ol>{recipe.steps[lang].map((s, i) => <li key={i}>{s}</li>)}</ol>
        </details>
      </div>
      <button type="button" className="secondary" aria-disabled={saved || undefined} aria-label={saved ? `${name} is in your recipes` : `Save ${name} to my recipes`} onClick={() => { if (!saved) save(recipe); }}>{saved ? (lang === 'nl' ? 'In je recepten' : 'In your recipes') : (lang === 'nl' ? 'Bewaar in mijn recepten' : 'Save to my recipes')}</button>
    </li>; })}</ul>
  </div>;
}
