import {test,expect} from 'vitest';
import {createEmptyHealth,foodSchema,saveFood,saveRecipe,logHealthItem,recipeSnapshot,foodSnapshot,scaleNutrition,recipeServingGrams} from './health';
import {servingsFromMeasure,saveMealFromRecipe,saveMealPlan,groceryList,exportHealthCsv} from './health-daily';
const at='2026-09-26T12:00:00Z',date='2026-09-26';
const liquid=()=>foodSchema.parse({id:'health_liquid001',name:'Fictional juice',brand:'',servingGrams:null,servingMl:250,nutrients:scaleNutrition({kcal:40,proteinMg:null,carbsMg:10000,fatMg:0},2500),createdAt:at,updatedAt:at});
test('volume serving scales per100mL without inventing mass and exports original units',()=>{
 const food=liquid();expect(food.nutrients.kcal).toBe(100);expect(servingsFromMeasure('125',food,'ml')).toBe(500);expect(()=>servingsFromMeasure('125',food,'g')).toThrow();expect(()=>foodSchema.parse({...food,servingGrams:250})).toThrow();
 const data=logHealthItem(saveFood(createEmptyHealth(),food),{id:'health_entry0001',sourceId:food.id,sourceKind:'food',date,meal:'Lunch',quantityMilli:500},at);expect(data.diary[0]?.snapshot).toMatchObject({servingGrams:null,servingMl:250});expect(foodSnapshot(food).servingGrams).toBeNull();expect(exportHealthCsv(data,date,date)).toContain('serving_volume_ml');
});
test('recipe measured yield and revision are copied into immutable diary and saved-meal snapshots',()=>{
 let data=saveFood(createEmptyHealth(),liquid());const draft={id:'health_recipe001',name:'Mixed drink',portionsMilli:2000,yield:{quantityMilli:400000,unit:'ml' as const},items:[{foodId:liquid().id,quantityMilli:2000}]};data=saveRecipe(data,draft,at);const snap=recipeSnapshot(data.recipes[0]!);expect(snap).toMatchObject({servingGrams:null,servingMl:200,recipeVersion:1,recipeYield:draft.yield});
 data=logHealthItem(data,{id:'health_entry0001',sourceId:draft.id,sourceKind:'recipe',date,meal:'Lunch',quantityMilli:1000},at);data=saveMealFromRecipe(data,'health_saved0001',draft.id,1000,at);const historic=structuredClone(data.diary[0]);data=saveRecipe(data,{...draft,yield:{quantityMilli:600000,unit:'ml'},portionsMilli:3000},at);expect(data.recipes[0]?.revision).toBe(2);expect(data.diary[0]).toEqual(historic);expect(data.daily?.savedMeals[0]?.items[0]?.snapshot.recipeVersion).toBe(1);
});
test('planned volume ingredients remain volume in grocery evidence',()=>{
 let data=saveFood(createEmptyHealth(),liquid());data=saveRecipe(data,{id:'health_recipe001',name:'Juice portions',portionsMilli:1000,items:[{foodId:liquid().id,quantityMilli:1000}]},at);data=saveMealFromRecipe(data,'health_saved0001','health_recipe001',1000,at);data=saveMealPlan(data,{id:'health_plan00001',savedMealId:'health_saved0001',date,meal:'Lunch'},at);expect(groceryList(data,date,date)[0]).toMatchObject({grams:null,millilitres:250});
});

test('mixed mass and volume ingredients cannot invent a recipe weight or combine incompatible grocery units',()=>{
 let data=saveFood(createEmptyHealth(),liquid());data=saveFood(data,{...liquid(),id:'health_mass00001',name:'Fictional dry mix',servingGrams:100,servingMl:undefined});data=saveRecipe(data,{id:'health_recipe001',name:'Mixed units',portionsMilli:1000,items:[{foodId:liquid().id,quantityMilli:1000},{foodId:'health_mass00001',quantityMilli:1000}]},at);expect(recipeServingGrams(data.recipes[0]!)).toBeNull();expect(recipeSnapshot(data.recipes[0]!).servingMl).toBeUndefined();data=saveMealFromRecipe(data,'health_saved0001','health_recipe001',1000,at);data=saveMealPlan(data,{id:'health_plan00001',savedMealId:'health_saved0001',date,meal:'Lunch'},at);expect(groceryList(data,date,date).map(row=>[row.grams,row.millilitres])).toEqual([[100,null],[null,250]]);
});

test('grocery aggregation never merges different units even when imported ingredient evidence shares an identity',()=>{
 let data=saveFood(createEmptyHealth(),liquid());data=saveRecipe(data,{id:'health_recipe001',name:'Juice',portionsMilli:1000,items:[{foodId:liquid().id,quantityMilli:1000}]},at);data=saveMealFromRecipe(data,'health_saved0001','health_recipe001',1000,at);data=saveMealPlan(data,{id:'health_plan00001',savedMealId:'health_saved0001',date,meal:'Lunch'},at);const ingredient=data.daily!.plans[0]!.items[0]!.groceries![0]!;data.daily!.plans[0]!.items[0]!.groceries!.push({...ingredient,grams:100,millilitres:undefined});expect(groceryList(data,date,date)).toHaveLength(2);
});
