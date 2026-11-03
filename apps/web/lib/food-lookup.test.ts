import {test,expect} from 'vitest';
import {FDC_ATTRIBUTION,FDC_LINK,brandedFoodProductSchema,foodProductSchema,gtin14,lookupProductSchema,normalizeBarcode,parseFoodProduct} from './food-lookup';
test('barcodes remain strings, documented leading-zero normalization only; URLs are refused',()=>{
 expect(normalizeBarcode(' 034000470693 ')).toBe('0034000470693');expect(normalizeBarcode('00001234')).toBe('00001234');
 expect(()=>normalizeBarcode('https://evil.test')).toThrow();expect(()=>normalizeBarcode('123')).toThrow();
});
test('product identity and per100g basis are verified; missing nutrient stays unknown',()=>{
 const x=parseFoodProduct({status:'success',product:{code:'0034000470693',product_name:'Fixture',brands_tags:['xx:brand'],nutrition_data_per:'100g',nutriments:{'energy-kcal_100g':123,proteins_100g:2,carbohydrates_100g:8}}},'0034000470693');
 expect(x.nutrients).toEqual({kcal:123,proteinMg:2000,carbsMg:8000,fatMg:null});expect(x.name).toBe('Fixture');
 expect(()=>parseFoodProduct({status:'success',product:{code:'11111111'}},'0034000470693')).toThrow();
 expect(()=>parseFoodProduct({status:'failure'},'0034000470693')).toThrow('not found');
});

test('liquid nutrition is never asserted to be grams without user package confirmation',()=>{
 const x=parseFoodProduct({status:'success',product:{code:'00001234',product_name:'Oil fixture',nutrition_data_per:'100g',nutriments:{'energy-kcal_100g':800,fat_100g:89}}},'00001234');expect(x.basis).toBe('unverified-100g-or-100ml');
});

// Session AK (Part 1b). Fictional answers in the food Worker's shapes (scripts/run11/food-fdc.test.mjs pins the Worker).
const NOW='2026-10-31T12:00:00.000Z';
const off={status:'success',product:{code:'0034000470693',product_name:'Fixture',brands_tags:['xx:brand'],nutrition_data_per:'100g',nutriments:{'energy-kcal_100g':123,proteins_100g:2,carbohydrates_100g:8}}};
const nulls={kcal:null,proteinMg:null,carbsMg:null,fatMg:null,fiberMg:null,sugarMg:null,saturatedFatMg:null,sodiumMg:null,potassiumMg:null,calciumMg:null,ironMg:null,magnesiumMg:null,zincMg:null,vitaminAUg:null,vitaminCMg:null,vitaminDUg:null,vitaminEMg:null,vitaminKUg:null,vitaminB12Ug:null,folateUg:null};
const fdc=(product:Record<string,unknown>={})=>({source:'USDA FoodData Central',attribution:FDC_ATTRIBUTION,link:FDC_LINK,licence:'CC0-1.0',product:{code:'0041303020937',gtinUpc:'041303020937',fdcId:9000001,name:'FIXTURE OAT BAR',brand:'FIXTURE',basis:'per-100g-or-100ml',labelUnit:'g',nutrients:{...nulls,kcal:412,proteinMg:7060,carbsMg:64700,fatMg:14100,fiberMg:5900,sodiumMg:235,ironMg:2.12,vitaminCMg:0,vitaminDUg:10,vitaminB12Ug:0.6},...product}});

test('an Open Food Facts answer with its source named parses exactly as the bare answer did',()=>{
 const named={...off,source:'Open Food Facts',attribution:'Source: Open Food Facts (openfoodfacts.org), Open Database Licence 1.0 / Database Contents Licence 1.0',link:'https://world.openfoodfacts.org/'};
 const before=parseFoodProduct(off,'0034000470693',NOW),after=parseFoodProduct(named,'0034000470693',NOW);
 expect(JSON.stringify(after)).toBe(JSON.stringify(before));
 expect(foodProductSchema.parse(after)).toEqual(after);expect(lookupProductSchema.parse(after)).toEqual(after);
});

test('an FDC answer: app units, unknown stays absent (never 0), vitamins in thousandths, the citation kept',()=>{
 const x=parseFoodProduct(fdc(),'0041303020937',NOW);
 expect(x).toEqual({barcode:'0041303020937',name:'FIXTURE OAT BAR',brand:'FIXTURE',basis:'unverified-100g-or-100ml',labelUnit:'g',
  nutrients:{kcal:412,proteinMg:7060,carbsMg:64700,fatMg:14100,fiberMg:5900,sodiumMg:235,ironMg:2},
  vitamins:{cMg:0,dUg:10000,b12Ug:600},source:'USDA FoodData Central',fdcId:9000001,attribution:FDC_ATTRIBUTION,link:FDC_LINK,licence:'CC0-1.0',observedAt:NOW});
 expect(brandedFoodProductSchema.parse(x)).toEqual(x);expect(lookupProductSchema.parse(x)).toEqual(x);
 // Unknown energy and macros stay null.
 expect(parseFoodProduct(fdc({nutrients:nulls}),'0041303020937',NOW).nutrients).toEqual({kcal:null,proteinMg:null,carbsMg:null,fatMg:null});
});

test('FDC identity: every 12/13/14-digit form of the product matches; another product is refused',()=>{
 for(const asked of ['041303020937','0041303020937','00041303020937'])expect(parseFoodProduct(fdc(),asked,NOW).barcode).toBe('0041303020937');
 expect(gtin14('041303020937')).toBe('00041303020937');
 expect(()=>parseFoodProduct(fdc(),'0041303020944',NOW)).toThrow('identity');
 expect(()=>parseFoodProduct(fdc({gtinUpc:'041303020944'}),'0041303020937',NOW)).toThrow('identity');
});

test('an FDC answer is accepted only with its citation, link, licence and bounded values',()=>{
 for(const bad of [{...fdc(),attribution:'USDA'},{...fdc(),link:'https://evil.test/'},{...fdc(),licence:'proprietary'},{...fdc(),extra:1},fdc({name:''}),fdc({basis:'per-serving'}),fdc({nutrients:{...nulls,kcal:1001}}),fdc({nutrients:{...nulls,fatMg:-1}}),fdc({nutrients:{...nulls,omega:1}}),fdc({fdcId:1.5}),fdc({gtinUpc:'https://evil.test'})])
  expect(()=>parseFoodProduct(bad,'0041303020937',NOW)).toThrow();
});

test('the same citation, link and GTIN rule in the app and the Worker',async()=>{
 const {readFileSync}=await import('node:fs');const worker=readFileSync(new URL('../../../workers/food-lookup/worker.mjs',import.meta.url),'utf8');
 expect(worker).toContain(`FDC_ATTRIBUTION='${FDC_ATTRIBUTION}'`);expect(worker).toContain(`FDC_LINK='${FDC_LINK}'`);expect(worker).toContain("const gtin14=code=>code.padStart(14,'0');");
});
