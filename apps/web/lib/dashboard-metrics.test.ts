import {expect,test} from 'vitest';
import {widgetMetric,type DashboardSources} from './dashboard-metrics';
import {emptyPlatform,privateGoalSchema} from './positions';
import {emptyHabitData} from './habits';
import {createEmptyHealth} from './health';
import {manualSourcePosition} from './manual-source';
import type {DashboardWidget} from './dashboard-settings';
const source=():DashboardSources=>({platform:emptyPlatform(),habits:emptyHabitData(),health:createEmptyHealth(),goals:[],quotes:[],now:Date.parse('2026-09-23T12:00:00Z'),today:'2026-09-23',healthDate:'2026-09-23'});
const widget=(kind:DashboardWidget['kind'],metric:string,entity?:string):DashboardWidget=>({id:'test',kind,metric,entity,title:'',size:'compact',hidden:false,revision:1});
test('missing entities stay missing, even when other records have a similar name',()=>{
 const s=source();s.platform.positions=[manualSourcePosition({category:'Cash',name:'Similar',quantity:'100',currency:'USD'},'different')];
 expect(widgetMetric(widget('asset','value','gone'),s)).toMatchObject({missing:true});
 expect(widgetMetric(widget('goal','progress','private:gone'),s)).toMatchObject({missing:true});
});
test('money currencies and unknown valuations stay separate and qualified',()=>{
 const s=source();s.platform.positions=[manualSourcePosition({category:'Cash',name:'Dollar',quantity:'12500',currency:'USD'},'usd'),manualSourcePosition({category:'Cash',name:'Euro',quantity:'300',currency:'EUR'},'eur'),manualSourcePosition({category:'Crypto',name:'Unknown',symbol:'ZZZ',quantity:'1',currency:'USD'},'unknown')];
 expect(widgetMetric(widget('wealth','USD'),s)).toMatchObject({value:'$12,500',warning:expect.stringContaining('incomplete')});
 expect(widgetMetric(widget('wealth','EUR'),s).value).toBe('€300');
 expect(widgetMetric(widget('asset','value','unknown'),s).value).toBe('Value unavailable');
});
test('Health unknown days never become confirmed zero and measurement timestamps stay visible',()=>{
 const s=source();
 expect(widgetMetric(widget('health','kcal'),s).value).toBe('No meals recorded');
 expect(widgetMetric(widget('health','steps'),s).value).toBe('No activity recorded');
 expect(widgetMetric(widget('health','water'),s).value).toBe('No water recorded');
 s.health.weights=[{id:'health_1',date:'2026-09-21',grams:72000,createdAt:'2026-09-21T12:00:00Z',updatedAt:'2026-09-21T12:00:00Z'}];
 expect(widgetMetric(widget('health','weight'),s)).toMatchObject({value:'72 kg',detail:expect.stringContaining('2026-09-21')});
});
test('allocation deficits remain discoverable regardless of the chosen layout',async()=>{
 const {dashboardIntegrityWarning}=await import('./dashboard-metrics');const s=source();s.platform.positions=[manualSourcePosition({category:'Cash',name:'Dollar',quantity:'1',currency:'USD'},'cash')];s.platform.goals=[privateGoalSchema.parse({id:'42',name:'Goal',type:'VALUE',status:'active',asset:'USD',denom:'USD',decimals:2,target:'200',notes:'',createdAt:'2026-09-23T12:00:00Z',milestones:[]})];s.platform.allocations=[{goalId:'42',positionId:'cash',quantity:(BigInt(s.platform.positions[0]!.quantity)*2n).toString()}];
 expect(dashboardIntegrityWarning(s.platform)).toContain('allocation');s.platform.allocations=[];expect(dashboardIntegrityWarning(s.platform)).toBeUndefined();
});
