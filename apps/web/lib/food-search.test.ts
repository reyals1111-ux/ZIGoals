import {test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {FSVO_ATTRIBUTION,FSVO_LINK,genericFoodSummary,isFoodSearchLang,normalizeFoodQuery,parseFoodSearch,type GenericFood} from './food-search';

// Session AJ (item 22). A fictional result in the food Worker's shape (scripts/run11/food-search.test.mjs pins the Worker).
const food:GenericFood={id:'900001',name:'Fixture apple, fresh',basis:'per-100g',nutrients:{kcal:52,proteinMg:300,carbsMg:11400,fatMg:200,fiberMg:2040,sugarMg:10100,saltMg:null},source:'Swiss Food Composition Database',datasetVersion:'V 7.1',attribution:FSVO_ATTRIBUTION,link:FSVO_LINK};

test('the words are normalised the way the Worker does; anything else is refused with a plain sentence',()=>{
 expect(normalizeFoodQuery('  Banana,   RAW ')).toBe('banana, raw');expect(normalizeFoodQuery('Crème brûlée')).toBe('crème brûlée');expect(normalizeFoodQuery('7 grain bread (wholemeal)')).toBe('7 grain bread (wholemeal)');
 for(const bad of ['a',' ','x'.repeat(61),'<b>','https://evil.test','apple;drop','-apple','a\u0000b','apple\u200b'])expect(()=>normalizeFoodQuery(bad),bad).toThrow('Type 2 to 60 letters or numbers to search');
 expect(['en','de','fr','it'].every(isFoodSearchLang)).toBe(true);expect(['nl','EN',''].some(isFoodSearchLang)).toBe(false);
});

test('the same rule in the app and the Worker',()=>{
 const worker=readFileSync(new URL('../../../workers/food-lookup/worker.mjs',import.meta.url),'utf8'),lib=readFileSync(new URL('./food-search.ts',import.meta.url),'utf8');
 const rule=(source:string,name:string)=>new RegExp(`${name}=(/.+/u);`).exec(source)?.[1];
 expect(rule(worker,'SEARCH_TEXT')).toBeDefined();expect(rule(worker,'SEARCH_TEXT')).toBe(rule(lib,'searchText'));
 expect(worker).toContain(`FSVO_ATTRIBUTION='${FSVO_ATTRIBUTION}'`);expect(worker).toContain(`FSVO_LINK='${FSVO_LINK}'`);
});

test('a result is accepted only with its attribution, link, per-100 g basis and bounded values',()=>{
 expect(parseFoodSearch({results:[food]}).results[0]).toEqual(food);
 expect(parseFoodSearch({results:[]})).toEqual({results:[]});
 for(const bad of [{...food,attribution:'Source: elsewhere'},{...food,link:'https://evil.test/'},{...food,basis:'per-serving'},{...food,nutrients:{...food.nutrients,kcal:1001}},{...food,nutrients:{...food.nutrients,fatMg:-1}},{...food,extra:1},{...food,name:''}])
  expect(()=>parseFoodSearch({results:[bad]})).toThrow();
 expect(()=>parseFoodSearch({results:Array(6).fill(food)})).toThrow();
 expect(genericFoodSummary(food)).toBe('52 kcal per 100 g');expect(genericFoodSummary({...food,nutrients:{...food.nutrients,kcal:null}})).toBe('Calories unknown');
});
