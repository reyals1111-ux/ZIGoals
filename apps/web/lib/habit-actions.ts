import {habitCalendarDay,habitDataSchema,habitInputSchema,latestHabitRule,ruleSchema,type Habit,type HabitData,type HabitInput,type HabitRule,type HabitState} from './habits';
import {localDate,addLocalDays} from './local-date';
export function habitById(data:HabitData,id:string){const h=data.habits.find(h=>h.id===id);if(!h)throw Error('Habit unavailable.');return h;}
export function replace(data:HabitData,h:Habit):HabitData{return habitDataSchema.parse({...data,habits:data.habits.map(x=>x.id===h.id?h:x)});}
export function habitEditFingerprint(h:Habit){const {entries,timer,timerReceipts,updatedAt,...details}=h;void entries;void timer;void timerReceipts;void updatedAt;return JSON.stringify(details);}
export function earliestHabitChange(h:Habit,today=localDate()){return [addLocalDays(today,1),latestHabitRule(h).from].sort().at(-1)!;}
function checkChange(h:Habit,from:string,today:string,expected?:string){if(expected!==undefined&&expected!==habitEditFingerprint(h))throw Error('This Habit changed while you were editing. Reopen it and review the latest rule.');if(from<earliestHabitChange(h,today))throw Error('Choose a future day on or after the latest scheduled rule.');}
function revised(h:Habit,rule:HabitRule,now:Date):Habit{
 const revisions=[...(h.ruleRevisions??h.rules.map(rule=>({id:`rule:${h.id}:${crypto.randomUUID()}`,recordedAt:now.toISOString(),source:'retained' as const,rule})))];
 revisions.push({id:`rule:${h.id}:${crypto.randomUUID()}`,recordedAt:now.toISOString(),source:'scheduled',rule});
 return {...h,rules:[...h.rules.filter(r=>r.from<rule.from),rule],endCondition:rule.endCondition,ruleRevisions:revisions,updatedAt:now.toISOString()};
}
export function scheduleHabitEdit(data:HabitData,id:string,input:HabitInput,from:string,now=new Date(),expected?:string):HabitData{
 const h=habitById(data,id);checkChange(h,from,habitCalendarDay(data,now),expected);const parsed=habitInputSchema.parse(input),{schedule:incoming,target,type,measurement,targetPeriod,endCondition,...details}=parsed,current=latestHabitRule(h);
 const schedule=incoming.kind==='interval'?{...incoming,anchor:current.schedule.kind==='interval'?current.schedule.anchor:from}:incoming;
 if(endCondition.kind==='date'&&endCondition.date<from&&JSON.stringify(endCondition)!==JSON.stringify(current.endCondition))throw Error('Choose an end date on or after the new rule begins.');
 const rule=ruleSchema.parse({...current,schedule,target,type,measurement,targetPeriod,endCondition,from});
 const comparable=(r:HabitRule)=>{const {from,...rest}=r;void from;return JSON.stringify(rest);};
 const next=comparable(rule)===comparable(current)?h:revised(h,rule,now);
 return replace(data,{...next,...details,goalLink:details.goalLink,updatedAt:now.toISOString()});
}
export function scheduleHabitState(data:HabitData,id:string,state:HabitState,from:string,now=new Date(),expected?:string):HabitData{
 const h=habitById(data,id);checkChange(h,from,habitCalendarDay(data,now),expected);return replace(data,revised(h,ruleSchema.parse({...latestHabitRule(h),state,from}),now));
}
// The timer's day key is read from date parts, like habitCalendarDay, never from a locale's display pattern (QA-34).
