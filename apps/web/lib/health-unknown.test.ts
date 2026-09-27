import {test,expect} from 'vitest';
import {createEmptyHealth,foodSchema,saveFood,saveRecipe,logHealthItem,scaleNutrition,recipeNutrition,dailyHealthSummary,healthSchema} from './health';
import {nutritionDashboard} from './life-intelligence';
import {exportHealthCsv} from './health-daily';
const at='2026-09-26T12:00:00Z',date='2026-09-26';
const food=(id='health_food00001')=>foodSchema.parse({id,name:'Unknown fixture',brand:'',servingGrams:100,nutrients:{kcal:null,proteinMg:1000,carbsMg:null,fatMg:0},createdAt:at,updatedAt:at});
test('explicit unknown core nutrients persist and scale independently from known zero',()=>{
 const f=food();expect(scaleNutrition(f.nutrients,1500)).toEqual({kcal:null,proteinMg:1500,carbsMg:null,fatMg:0});expect(healthSchema.parse({...createEmptyHealth(),foods:[f]}).foods[0]?.nutrients.kcal).toBeNull();
 expect(()=>foodSchema.parse({...f,nutrients:{...f.nutrients,kcal:undefined}})).toThrow();
});
test('daily coverage reports known subtotals without inventing a complete total or averaging incomplete days',()=>{
 let data=saveFood(createEmptyHealth(),food());data=logHealthItem(data,{id:'health_entry0001',sourceId:food().id,sourceKind:'food',date,meal:'Breakfast',quantityMilli:1000},at);
 data=saveFood(data,{...food('health_food00002'),nutrients:{kcal:200,proteinMg:2000,carbsMg:3000,fatMg:1000}});data=logHealthItem(data,{id:'health_entry0002',sourceId:'health_food00002',sourceKind:'food',date,meal:'Lunch',quantityMilli:1000},at);
 const sum=dailyHealthSummary(data,date);expect(sum.nutrients).toEqual({kcal:null,proteinMg:3000,carbsMg:null,fatMg:1000});expect(sum.knownNutrients).toEqual({kcal:200,proteinMg:3000,carbsMg:3000,fatMg:1000});expect(sum.coverage.kcal).toEqual({known:1,total:2});expect(nutritionDashboard(data,date)).toMatchObject({averageKcal:null,completeDays:0,loggedDays:1,remaining:null});
 expect(exportHealthCsv(data,date,date)).toContain('"unknown"');expect(exportHealthCsv(data,date,date)).toContain('"0"');
});
test('recipe unknowns and logged snapshots survive later ingredient corrections',()=>{
 let data=saveFood(createEmptyHealth(),food());data=saveRecipe(data,{id:'health_recipe001',name:'Fictional recipe',portionsMilli:2000,items:[{foodId:food().id,quantityMilli:1000}]},at);expect(recipeNutrition(data.recipes[0]!)).toMatchObject({kcal:null,proteinMg:500,fatMg:0});
 data=logHealthItem(data,{id:'health_entry0001',sourceId:'health_recipe001',sourceKind:'recipe',date,meal:'Dinner',quantityMilli:1000},at);const before=structuredClone(data.diary[0]);data=saveFood(data,{...food(),nutrients:{kcal:100,proteinMg:1000,carbsMg:2000,fatMg:0}});data=saveRecipe(data,{id:'health_recipe001',name:'Corrected recipe',portionsMilli:1000,items:[{foodId:food().id,quantityMilli:1000}]},at);expect(data.diary[0]).toEqual(before);expect(data.diary[0]?.snapshot.nutrients.kcal).toBeNull();
});
