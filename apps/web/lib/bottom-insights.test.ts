import {expect,test} from 'vitest';
import {goalTimeline,habitRhythm,healthWeek,lastDays,wealthAllocation,weekAcross} from './bottom-insights';
import {createHabit,emptyHabitData,logHabitCount,type HabitInput} from './habits';
import {createEmptyHealth} from './health';
import {addWater} from './health-daily';
import {changeCount,DEFAULT_COUNTERS} from './health-counters';
import {emptyPlatform} from './positions';
import {manualSourcePosition} from './manual-source';
import {wealthOverview} from './wealth';
import type {GoalSummary} from './goal-summary';

const today='2026-09-23',id='59a35604-3696-4a78-b455-4015acb66885';
const input:HabitInput={title:'Fictional walk',category:'Wellbeing',description:'',notes:'',schedule:{kind:'daily'},measurement:{kind:'count',unit:'times'},target:1};
function habits(dates:string[]){let h=createHabit(emptyHabitData(),input,new Date('2026-08-20T12:00:00'),id);for(const d of dates)h=logHabitCount(h,id,d,1,'',new Date(`${d}T20:00:00`));return h;}

test('the week window ends today and has seven days',()=>{expect(lastDays(today)).toEqual(['2026-09-17','2026-09-18','2026-09-19','2026-09-20','2026-09-21','2026-09-22','2026-09-23']);});

test('Today week: counts of records saved each day across the three areas',()=>{
 let health=createEmptyHealth();health=changeCount(health,DEFAULT_COUNTERS[0]!.id,'2026-09-22',5);
 const week=weekAcross({today,habits:habits(['2026-09-22','2026-09-23']),health,platform:emptyPlatform()});
 expect(week.map(d=>d.habitCheckins)).toEqual([0,0,0,0,0,1,1]);
 expect(week.map(d=>d.healthRecords)).toEqual([0,0,0,0,0,1,0]);
 expect(week.every(d=>d.goalContributions===0)).toBe(true);
});

test('Habit rhythm groups the last four weeks by weekday and lists best streaks',()=>{
 const r=habitRhythm(habits(['2026-09-21','2026-09-22','2026-09-23','2026-09-14']),today);
 // 2026-09-21 and 09-14 are Mondays; 22 Tuesday; 23 Wednesday.
 expect(r.byWeekday.map(d=>d.checkins)).toEqual([2,1,1,0,0,0,0]);expect(r.total).toBe(4);
 expect(r.streaks).toEqual([{title:'Fictional walk',best:3,current:3,unit:'days'}]);
 expect(habitRhythm(emptyHabitData(),today)).toEqual({byWeekday:expect.any(Array),total:0,streaks:[]});
});

test('Health week: a day without entries is null, never zero',()=>{
 let health=createEmptyHealth();
 health=addWater(health,{id:'health_water-00000001',date:'2026-09-23',amountMilli:500000,unit:'ml'},'2026-09-23T08:00:00.000Z');
 health=changeCount(health,DEFAULT_COUNTERS[1]!.id,'2026-09-23',0+3);
 const week=healthWeek(health,today),last=week.at(-1)!,first=week[0]!;
 expect(first).toMatchObject({kcal:null,waterMl:null});expect(first.exercise.every(e=>e.count===null)).toBe(true);
 expect(last.waterMl).toBe(500);expect(last.kcal).toBeNull();
 expect(last.exercise).toEqual([{name:'Push-ups',count:null},{name:'Pull-ups',count:3},{name:'Squats',count:null}]);
});

test('Goal timeline lists active dated Goals soonest first and counts undated ones',()=>{
 const g=(name:string,targetDate?:string,status:GoalSummary['status']='active'):GoalSummary=>({key:`private:${name}`,id:name,href:`/g/${name}`,name,type:'Value Goal',source:'x',status,scene:'home',current:'0',currency:'USD',progressPct:'5',targetDate,fundingHealth:'',requiresReview:false,metadata:[]});
 const t=goalTimeline([g('B','2027-01-01'),g('A','2026-10-01'),g('Old','2026-01-01'),g('None'),g('Done','2026-11-01','completed')],today);
 expect(t.dated.map(d=>[d.name,d.past])).toEqual([['Old',true],['A',false],['B',false]]);expect(t.undated).toBe(1);
});

test('Wealth allocation stays inside the headline currency and reports coverage',()=>{
 const p=emptyPlatform();p.positions=[manualSourcePosition({category:'Cash',name:'Dollar',quantity:'7500',currency:'USD'},'usd'),manualSourcePosition({category:'Precious metals',name:'Gold',quantity:'10',value:'2500',currency:'USD'},'gold'),manualSourcePosition({category:'Cash',name:'Euro',quantity:'300',currency:'EUR'},'eur'),manualSourcePosition({category:'Crypto',name:'Unknown',symbol:'ZZZ',quantity:'1',currency:'USD'},'unknown')];
 const a=wealthAllocation(wealthOverview(p,Date.parse(`${today}T12:00:00Z`),[]));
 expect(a.currency).toBe('USD');expect(a.classes.map(c=>[c.assetClass,c.share])).toEqual([['Cash',75],['Precious Metals',25]]);
 expect(a.otherCurrencies).toEqual(['EUR']);expect(a.coverage.total).toBe(4);expect(a.coverage.valued).toBeLessThan(4);
 expect(wealthAllocation(wealthOverview(emptyPlatform(),0,[]))).toEqual({currency:undefined,classes:[],otherCurrencies:[],coverage:{valued:0,total:0}});
});
