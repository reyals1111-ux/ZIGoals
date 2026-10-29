import * as z from 'zod';
/**
 * Session AJ (item 22): generic-food search in the Swiss Food Composition Database (FSVO, naehrwertdaten.ch), offered when
 * a barcode is not found or has no nutrition values. The browser calls only /api/food-lookup?q=&lang=; that route calls the
 * food Worker's /search, which alone reaches FSVO (workers/food-lookup/worker.mjs). Only the typed words travel.
 */
export const FOOD_SEARCH_LANGS=['en','de','fr','it'] as const;
export type FoodSearchLang=typeof FOOD_SEARCH_LANGS[number];
export const FOOD_SEARCH_LANG_NAMES:Record<FoodSearchLang,string>={en:'English',de:'Deutsch',fr:'Français',it:'Italiano'};
export const FSVO_ATTRIBUTION='Source: Swiss Food Composition Database V 7.1, Federal Food Safety and Veterinary Office FSVO (naehrwertdaten.ch)';
export const FSVO_LINK='https://naehrwertdaten.ch/en/';
/** Saved as the food's brand, so the library and diary still name the source (the provenance record is Open Food Facts only). */
export const GENERIC_FOOD_BRAND='Swiss Food Composition Database (FSVO)';
// The food Worker's rule: 2 to 60 letters, digits, spaces or basic punctuation, starting with a letter or digit.
const searchText=/^[\p{L}\p{M}\d][\p{L}\p{M}\d ,.'’()&/-]{1,59}$/u;
export function normalizeFoodQuery(input:string){
 const q=input.normalize('NFC').trim().replace(/\s+/g,' ').toLowerCase();
 if(!searchText.test(q))throw Error('Type 2 to 60 letters or numbers to search, for example "banana".');
 return q;
}
export const isFoodSearchLang=(value:string):value is FoodSearchLang=>(FOOD_SEARCH_LANGS as readonly string[]).includes(value);
const kcal=z.number().int().min(0).max(1000).nullable(),mg=z.number().int().min(0).max(100_000).nullable();
export const genericFoodSchema=z.strictObject({
 id:z.string().regex(/^\d{1,10}$/),name:z.string().min(1).max(120),basis:z.literal('per-100g'),
 nutrients:z.strictObject({kcal,proteinMg:mg,carbsMg:mg,fatMg:mg,fiberMg:mg,sugarMg:mg,saltMg:mg}),
 source:z.literal('Swiss Food Composition Database'),datasetVersion:z.literal('V 7.1'),attribution:z.literal(FSVO_ATTRIBUTION),link:z.literal(FSVO_LINK),
});
export type GenericFood=z.infer<typeof genericFoodSchema>;
const foodSearchSchema=z.strictObject({results:z.array(genericFoodSchema).max(5)});
/** The Worker's answer, checked field by field; anything else is refused rather than shown. */
export function parseFoodSearch(raw:unknown){return foodSearchSchema.parse(raw);}
/** "52 kcal per 100 g", or that the calories are unknown. */
export function genericFoodSummary(food:GenericFood){return food.nutrients.kcal===null?'Calories unknown':`${food.nutrients.kcal} kcal per 100 g`;}
