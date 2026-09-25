import {test,expect} from 'vitest';
import {normalizeBarcode,parseFoodProduct} from './food-lookup';
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
