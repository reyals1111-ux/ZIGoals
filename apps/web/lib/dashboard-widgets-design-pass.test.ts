import {expect,test} from 'vitest';
import {widgetMetric,type DashboardSources} from './dashboard-metrics';
import {emptyPlatform} from './positions';
import {createHabit,emptyHabitData,logHabitCount,type HabitInput} from './habits';
import {createEmptyHealth} from './health';
import {changeCount,DEFAULT_COUNTERS} from './health-counters';
import {manualSourcePosition} from './manual-source';
import {dashboardSettingsSchema,presetSettings,saveWidget,WIDGET_CATALOG,type DashboardWidget} from './dashboard-settings';
import {WIDGET_GROUPS,WIDGET_DESCRIPTIONS} from './dashboard-widget-registry';
import type {GoalSummary} from './goal-summary';

const today='2026-09-23';
const source=():DashboardSources=>({platform:emptyPlatform(),habits:emptyHabitData(),health:createEmptyHealth(),goals:[],quotes:[],now:Date.parse(`${today}T12:00:00Z`),today,healthDate:today});
const widget=(kind:DashboardWidget['kind'],metric:string):DashboardWidget=>({id:'test',kind,metric,title:'',size:'compact',hidden:false,revision:1});
const goal=(name:string,targetDate:string|undefined,extra:Partial<GoalSummary>={}):GoalSummary=>({key:`private:${name}`,id:name,href:`/app/goals/tracked/${name}`,name,type:'Value Goal',source:'Existing wealth',status:'active',scene:'home',current:'100',target:'1000',currency:'USD',progressPct:'10',remaining:'900',targetDate,fundingHealth:'on track',requiresReview:false,metadata:[],...extra});

test('new widget kinds are additive: every kind is in a category with a description, and the presets are unchanged',()=>{
 for(const kind of ['milestone','streak','checkins','holding-share','exercise'] as const){
  expect(WIDGET_GROUPS.some(g=>(g.kinds as readonly string[]).includes(kind))).toBe(true);expect(WIDGET_DESCRIPTIONS[kind]).toBeTruthy();
  const saved=saveWidget(presetSettings('balanced'),{...widget(kind,WIDGET_CATALOG[kind].metrics[0]),id:`new-${kind}`});
  expect(dashboardSettingsSchema.parse(saved).widgets.at(-1)!.kind).toBe(kind);
 }
 expect(presetSettings('balanced').widgets.map(w=>w.kind)).toEqual(['goals','habits','health','wealth']);
 expect(()=>dashboardSettingsSchema.parse({...presetSettings('balanced'),widgets:[{...widget('streak','week'),id:'bad'}]})).toThrow();
});

test('next Goal milestone: the nearest future saved target date; none is said plainly',()=>{
 const s=source();expect(widgetMetric(widget('milestone','next'),s).value).toBe('No upcoming target date');
 s.goals=[goal('Later','2027-01-10'),goal('Past','2026-01-01'),goal('Sooner','2026-10-03'),goal('Undated',undefined),goal('Done','2026-09-30',{status:'completed'})];
 const m=widgetMetric(widget('milestone','next'),s);
 expect(m).toMatchObject({value:'Sooner',detail:expect.stringContaining('2026-10-03'),href:'/app/goals/tracked/Sooner',percent:'10'});
 expect(m.facts).toEqual([{label:'Days to the target date',value:'10'},{label:'Remaining',value:'$900'}]);
});

test('Habit streak and weekly check-ins use recorded check-ins only',()=>{
 const s=source();
 expect(widgetMetric(widget('streak','best'),s).value).toBe('No Habits yet');expect(widgetMetric(widget('checkins','week'),s).value).toBe('No Habits yet');
 const input:HabitInput={title:'Fictional walk',category:'Wellbeing',description:'',notes:'',schedule:{kind:'daily'},measurement:{kind:'count',unit:'times'},target:1};
 let habits=createHabit(emptyHabitData(),input,new Date('2026-09-10T12:00:00'),'59a35604-3696-4a78-b455-4015acb66885');
 expect(widgetMetric(widget('streak','best'),{...s,habits}).value).toBe('No current streak');
 for(const d of ['2026-09-21','2026-09-22','2026-09-23'])habits=logHabitCount(habits,'59a35604-3696-4a78-b455-4015acb66885',d,1,'',new Date(`${d}T20:00:00`));
 expect(widgetMetric(widget('streak','best'),{...s,habits})).toMatchObject({value:'3 days',detail:expect.stringContaining('Fictional walk')});
 expect(widgetMetric(widget('checkins','week'),{...s,habits})).toMatchObject({value:'3 check-ins',detail:'Last 7 days · 3 of 7 days with a check-in'});
});

test('top holding share stays inside one currency and flags incomplete coverage',()=>{
 const s=source();expect(widgetMetric(widget('holding-share','top'),s).value).toBe('No valued assets yet');
 s.platform.positions=[manualSourcePosition({category:'Cash',name:'Dollar',quantity:'7500',currency:'USD'},'usd'),manualSourcePosition({category:'Cash',name:'Savings',quantity:'2500',currency:'USD'},'usd2'),manualSourcePosition({category:'Cash',name:'Euro',quantity:'900000',currency:'EUR'},'eur')];
 const m=widgetMetric(widget('holding-share','top'),s);
 // EUR has the larger number but is a different currency; nothing is converted, EUR stays out of the USD share.
 expect(m.detail).toContain('EUR');expect(m.value).toBe('100%');
 s.platform.positions=s.platform.positions.filter(p=>p.id!=='eur');
 expect(widgetMetric(widget('holding-share','top'),s)).toMatchObject({value:'75%',detail:expect.stringContaining('of known USD value'),warning:undefined});
});

test('exercise counters today: each counter separately, and no entry is never zero',()=>{
 const s=source();
 expect(widgetMetric(widget('exercise','counts'),s)).toMatchObject({value:'0 of 3 counted',facts:[{label:'Push-ups',value:'No entry'},{label:'Pull-ups',value:'No entry'},{label:'Squats',value:'No entry'}]});
 s.health=changeCount(changeCount(s.health,DEFAULT_COUNTERS[0]!.id,today,12),DEFAULT_COUNTERS[2]!.id,today,1);
 s.health=changeCount(s.health,DEFAULT_COUNTERS[2]!.id,today,-1);
 expect(widgetMetric(widget('exercise','counts'),s)).toMatchObject({value:'2 of 3 counted',facts:[{label:'Push-ups',value:'12'},{label:'Pull-ups',value:'No entry'},{label:'Squats',value:'0'}]});
});

test('macros ring: known values only, with the calorie ring only when a target is set',()=>{
 const s=source();expect(widgetMetric(widget('health','macros-ring'),s).value).toBe('No meals recorded');
});
