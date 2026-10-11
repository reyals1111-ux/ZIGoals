import {test,expect} from 'vitest';
import {dashboardSettingsSchema,presetSettings,saveWidget,removeWidget,type DashboardWidget} from './dashboard-settings';
import {eligibleWidgetSources,selectableWidgetKinds} from './dashboard-widget-registry';
import {widgetMetric,type DashboardSources} from './dashboard-metrics';
import {createEmptyHealth,diarySchema,scaleNutrition,dailyHealthSummary} from './health';
import {emptyPlatform} from './positions';
import {emptyHabitData} from './habits';
const entry=()=>diarySchema.parse({id:'health_entry0001',sourceId:'health_food00001',sourceKind:'food',snapshot:{name:'Fictional oats',servingGrams:40,nutrients:{kcal:100,proteinMg:5000,carbsMg:18000,fatMg:2000}},date:'2026-09-26',meal:'Breakfast',quantityMilli:1500,createdAt:'2026-09-26T08:00:00Z',updatedAt:'2026-09-26T08:00:00Z'});
const source=():DashboardSources=>({health:{...createEmptyHealth(),diary:[entry()]},platform:emptyPlatform(),goals:[],habits:emptyHabitData(),quotes:[],now:Date.parse('2026-09-26T12:00:00Z'),today:'2026-09-26',healthDate:'2026-09-26'});
const widget=(kind:'food-entry'|'meal',entity:string,metric='kcal'):DashboardWidget=>({id:'food-widget',kind,entity,metric,title:'',size:'compact',revision:1,hidden:false});
test('food and meal widgets persist only selector identities, reject invalid selectors, retain presets and duplicate refusal',()=>{
 const health=presetSettings('health'),pinned=saveWidget(health,widget('food-entry',entry().id));expect(dashboardSettingsSchema.parse(JSON.parse(JSON.stringify(pinned)))).toEqual(pinned);expect(JSON.stringify(pinned)).not.toContain('Fictional oats');
 expect(()=>saveWidget(pinned,{...widget('food-entry',entry().id),id:'duplicate'})).toThrow('already');expect(removeWidget(pinned,'food-widget')).toEqual(health);
 expect(()=>saveWidget(health,widget('meal','Brunch'))).toThrow();expect(()=>saveWidget(health,widget('food-entry','renamed-food'))).toThrow();expect(saveWidget(health,widget('meal','Breakfast')).widgets.at(-1)?.entity).toBe('Breakfast');
});
test('food entries resolve canonical snapshot quantities and stable IDs without rebinding by name',()=>{
 const s=source(),w=widget('food-entry',entry().id),nutrients=scaleNutrition(s.health.diary[0]!.snapshot.nutrients,1500);expect(widgetMetric(w,s)).toMatchObject({title:'Fictional oats',value:`${nutrients.kcal} kcal`,detail:expect.stringContaining('2026-09-26')});
 s.health.diary[0]!.quantityMilli=2000;expect(widgetMetric(w,s).value).toBe('200 kcal');expect(widgetMetric({...w,metric:'macros'},s).value).toBe('10 g protein');
 s.health.diary=[{...entry(),id:'health_entry0002'}];expect(widgetMetric(w,s)).toMatchObject({missing:true,value:'Record unavailable'});
});
test('meal selectors follow the Health date and only include their own meal without turning empty days into zero',()=>{
 const s=source();s.health.diary.push({...entry(),id:'health_entry0002',meal:'Lunch'});const expected=dailyHealthSummary({...s.health,diary:s.health.diary.filter(row=>row.meal==='Breakfast')},s.healthDate);
 expect(widgetMetric(widget('meal','Breakfast'),s)).toMatchObject({title:'Breakfast today',value:`${expected.nutrients.kcal} kcal`});s.healthDate='2026-09-27';expect(widgetMetric(widget('meal','Breakfast'),s).value).toBe('No meals recorded');expect(widgetMetric(widget('food-entry',entry().id),s).value).toBe('150 kcal');
 expect(eligibleWidgetSources('meal',s).map(row=>row.id)).toEqual(['Breakfast','Lunch','Dinner','Snacks']);expect(eligibleWidgetSources('food-entry',s)[0]?.label).toContain('2026-09-26');s.health.diary=[];expect(selectableWidgetKinds(s,()=>true)).not.toContain('food-entry');expect(selectableWidgetKinds(s,()=>true)).toContain('meal');
});
