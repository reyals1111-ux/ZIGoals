import {test,expect} from 'vitest';
import {nutritionSchema,scaleNutrition,recipeNutrition,additionalNutritionSummary} from './health';
const base={kcal:100,proteinMg:1000,carbsMg:2000,fatMg:3000};
test('optional label nutrients preserve unknown versus explicit zero and scale with integer arithmetic',()=>{
 expect(scaleNutrition({...base,fiberMg:1250,sodiumMg:0},500)).toMatchObject({fiberMg:625,sodiumMg:0});expect(scaleNutrition(base,500)).not.toHaveProperty('fiberMg');expect(nutritionSchema.safeParse({...base,fiberMg:-1}).success).toBe(false);
 const result=additionalNutritionSummary([{...base,fiberMg:1250,sodiumMg:0},base]);expect(result.fiberMg).toEqual({value:1250,known:1,total:2});expect(result.sodiumMg).toEqual({value:0,known:1,total:2});expect(result.calciumMg).toEqual({value:null,known:0,total:2});
});
test('recipe optional nutrients remain unknown when any ingredient lacks their evidence',()=>{
 const ingredient=(id:string,nutrients:typeof base)=>({foodId:id,quantityMilli:1000,snapshot:{name:'Fixture',servingGrams:100,nutrients}}),recipe={id:'health_recipe000',name:'Fixture recipe',portionsMilli:2000,ingredients:[ingredient('health_food0001',{...base,fiberMg:2000} as typeof base),ingredient('health_food0002',base)],createdAt:'2026-09-20T00:00:00Z',updatedAt:'2026-09-20T00:00:00Z'};
 expect(recipeNutrition(recipe)).not.toHaveProperty('fiberMg');
});
