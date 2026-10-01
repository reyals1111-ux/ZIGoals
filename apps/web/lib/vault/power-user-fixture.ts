import {buildShowcase} from '../showcase-data';
import {HABITS_KEY,habitDataSchema} from '../habits';
import {HEALTH_STORAGE_KEY,healthSchema} from '../health';
import {PLATFORM_KEY,platformSchema} from '../positions';
// Fictional stores at the size of Session F's power user (QA sweep 2026-09-30): 45 habits with ~12,900 check-ins,
// three years of Health (3,288 meals) and 200 positions, built from the Showcase generator so every record is valid.
// Test and benchmark input only; never written to a real store.
const DAY=86_400_000;
const isoDay=(t:number)=>new Date(t).toISOString().slice(0,10);
export function powerUserRecords(day='2026-10-01',{habits:habitCount=45,days:habitDays=287}:{habits?:number;days?:number}={}){
 const base=buildShowcase(day).records,end=Date.parse(day+'T00:00:00Z');
 const habits=JSON.parse(base[HABITS_KEY]!),template=habits.habits[0],start=end-(habitDays-1)*DAY,startDate=isoDay(start);
 habits.habits=Array.from({length:habitCount},(_,n)=>({...template,id:`93000000-0000-4000-8000-${String(n+1).padStart(12,'0')}`,title:`Habit ${n+1}`,startDate,createdAt:new Date(start).toISOString(),
  rules:[{...template.rules[0],from:startDate}],
  entries:Array.from({length:habitDays},(_,d)=>{const date=isoDay(start+d*DAY),skipped=(d+n)%9===0;return {date,count:skipped?0:10+(d*7+n)%25,disposition:skipped?'skipped':'logged',note:'',updatedAt:date+'T20:00:00.000Z'};})}));
 const health=JSON.parse(base[HEALTH_STORAGE_KEY]!),foods=health.foods,meals=['Breakfast','Lunch','Dinner'],healthDays=1096;
 health.diary=Array.from({length:healthDays*3},(_,i)=>{const date=isoDay(end-(healthDays-1-Math.floor(i/3))*DAY),food=foods[i%foods.length];return {id:`health_power-${String(i).padStart(5,'0')}`,sourceId:food.id,sourceKind:'food',snapshot:{name:food.name,servingGrams:food.servingGrams,nutrients:food.nutrients},date,meal:meals[i%3],quantityMilli:1000,createdAt:date+'T12:00:00.000Z',updatedAt:date+'T12:00:00.000Z'};});
 const platform=JSON.parse(base[PLATFORM_KEY]!),positions=platform.positions;
 platform.positions=Array.from({length:200},(_,i)=>i<positions.length?positions[i]:{...positions[i%positions.length],id:`power-position-${i}`});
 const records={[PLATFORM_KEY]:JSON.stringify(platformSchema.parse(platform)),[HABITS_KEY]:JSON.stringify(habitDataSchema.parse(habits)),[HEALTH_STORAGE_KEY]:JSON.stringify(healthSchema.parse(health))};
 return {records,checkIns:habitCount*habitDays,meals:health.diary.length,positions:platform.positions.length};
}
