import {habitDataSchema,habitInputSchema,habitRuleOn,habitDay,latestHabitRule,ruleSchema,logHabitValue,type Habit,type HabitData,type HabitInput,type HabitRule,type HabitState} from './habits';
import {localDate,addLocalDays} from './local-date';
const MAX_TIMER_MS=7*86400000;
function habitById(data:HabitData,id:string){const h=data.habits.find(h=>h.id===id);if(!h)throw Error('Habit unavailable.');return h;}
function replace(data:HabitData,h:Habit):HabitData{return habitDataSchema.parse({...data,habits:data.habits.map(x=>x.id===h.id?h:x)});}
export function habitEditFingerprint(h:Habit){const {entries,timer,timerReceipts,updatedAt,...details}=h;void entries;void timer;void timerReceipts;void updatedAt;return JSON.stringify(details);}
export function earliestHabitChange(h:Habit,today=localDate()){return [addLocalDays(today,1),latestHabitRule(h).from].sort().at(-1)!;}
function checkChange(h:Habit,from:string,now:Date,expected?:string){if(expected!==undefined&&expected!==habitEditFingerprint(h))throw Error('This Habit changed while you were editing. Reopen it and review the latest rule.');if(from<earliestHabitChange(h,localDate(now)))throw Error('Choose a future day on or after the latest scheduled rule.');}
function revised(h:Habit,rule:HabitRule,now:Date):Habit{
 const revisions=[...(h.ruleRevisions??h.rules.map((rule,i)=>({id:`rule:${h.id}:${+now}:${i}`,recordedAt:now.toISOString(),source:'retained' as const,rule})))];
 revisions.push({id:`rule:${h.id}:${+now}:${revisions.length}`,recordedAt:now.toISOString(),source:'scheduled',rule});
 return {...h,rules:[...h.rules.filter(r=>r.from<rule.from),rule],endCondition:rule.endCondition,ruleRevisions:revisions,updatedAt:now.toISOString()};
}
export function scheduleHabitEdit(data:HabitData,id:string,input:HabitInput,from:string,now=new Date(),expected?:string):HabitData{
 const h=habitById(data,id);checkChange(h,from,now,expected);const parsed=habitInputSchema.parse(input),{schedule:incoming,target,type,measurement,targetPeriod,endCondition,...details}=parsed,current=latestHabitRule(h);
 const schedule=incoming.kind==='interval'?{...incoming,anchor:current.schedule.kind==='interval'?current.schedule.anchor:from}:incoming;
 if(endCondition.kind==='date'&&endCondition.date<from&&JSON.stringify(endCondition)!==JSON.stringify(current.endCondition))throw Error('Choose an end date on or after the new rule begins.');
 const rule=ruleSchema.parse({...current,schedule,target,type,measurement,targetPeriod,endCondition,from});
 const comparable=(r:HabitRule)=>{const {from,...rest}=r;void from;return JSON.stringify(rest);};
 const next=comparable(rule)===comparable(current)?h:revised(h,rule,now);
 return replace(data,{...next,...details,goalLink:details.goalLink,updatedAt:now.toISOString()});
}
export function scheduleHabitState(data:HabitData,id:string,state:HabitState,from:string,now=new Date(),expected?:string):HabitData{
 const h=habitById(data,id);checkChange(h,from,now,expected);return replace(data,revised(h,ruleSchema.parse({...latestHabitRule(h),state,from}),now));
}
function zonedDay(now:Date,timeZone:string){return new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
function ruleFingerprint(rule:HabitRule){return JSON.stringify(rule);}
function assertTimerReview(h:Habit,expected?:string){if(expected!==undefined&&JSON.stringify(h.timer)!==expected)throw Error('The timer changed after your review. Review its current timestamps again.');}
function timerFor(h:Habit,id:string){if(!h.timer||h.timer.id!==id)throw Error('The saved timer changed. Review the current timer.');return h.timer;}
export function startHabitTimer(data:HabitData,id:string,timerId:string,now=new Date(),timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone):HabitData{
 const h=habitById(data,id);if(h.timerReceipts?.some(r=>r.id===timerId))throw Error('This timer identity was already used.');if(h.timer){if(h.timer.id===timerId)return data;throw Error('A saved timer already exists. Review it first.');}
 const date=zonedDay(now,timeZone),rule=habitRuleOn(h,date);if(!rule||rule.measurement.kind!=='duration'||!habitDay(h,date,date).scheduled)throw Error('Timers need an active, scheduled duration Habit.');
 return replace(data,{...h,timer:{id:timerId,startedAt:now.toISOString(),date,timeZone,ruleFingerprint:ruleFingerprint(rule),unit:rule.measurement.unit,state:'running',segmentStartedAt:now.toISOString(),elapsedMs:0},updatedAt:now.toISOString()});
}
export function habitTimerPreview(h:Habit,now=new Date()){
 const t=h.timer;if(!t)throw Error('No saved timer.');const segment=t.state==='running'?+now-Date.parse(t.segmentStartedAt):0,elapsedMs=t.elapsedMs+segment,end=t.state==='paused'?new Date(t.pausedAt!):now;
 const rule=habitRuleOn(h,t.date);
 const reviewReason=segment<0||+end<Date.parse(t.startedAt)?'Your clock moved backwards. Review this timer.':elapsedMs>MAX_TIMER_MS?'This timer exceeds seven days. Review its recorded timestamps.':zonedDay(end,t.timeZone)!==t.date?'This timer crossed a calendar day. Review and record each day manually in History.':!rule||ruleFingerprint(rule)!==t.ruleFingerprint?'The Habit rule changed. Review the original timer unit before logging.':null;
 return {elapsedMs,value:elapsedMs/(t.unit==='hours'?3600000:60000),unit:t.unit,date:t.date,reviewReason};
}
export function pauseHabitTimer(data:HabitData,id:string,timerId:string,now=new Date(),expected?:string):HabitData{
 const h=habitById(data,id),t=timerFor(h,timerId);if(t.state==='paused')return data;assertTimerReview(h,expected);const elapsedMs=t.elapsedMs+(+now-Date.parse(t.segmentStartedAt));if(+now<Date.parse(t.segmentStartedAt))throw Error('Your clock moved backwards. The running timer is retained.');if(elapsedMs>MAX_TIMER_MS)throw Error('Timer exceeds seven days; review its timestamps and discard it after manual correction.');
 return replace(data,{...h,timer:{...t,state:'paused',pausedAt:now.toISOString(),elapsedMs},updatedAt:now.toISOString()});
}
export function resumeHabitTimer(data:HabitData,id:string,timerId:string,now=new Date(),expected?:string):HabitData{
 const h=habitById(data,id),t=timerFor(h,timerId);if(t.state==='running')return data;assertTimerReview(h,expected);if(+now<Date.parse(t.pausedAt!))throw Error('Your clock moved backwards.');if(zonedDay(now,t.timeZone)!==t.date||habitTimerPreview(h,now).reviewReason)throw Error('Review the saved timer before starting a new day.');
 return replace(data,{...h,timer:{...t,state:'running',segmentStartedAt:now.toISOString(),pausedAt:undefined},updatedAt:now.toISOString()});
}
function receipt(h:Habit,now:Date,status:'logged'|'discarded'){
 const t=h.timer!,p=habitTimerPreview(h,now);return {id:t.id,date:t.date,startedAt:t.startedAt,endedAt:t.state==='paused'?t.pausedAt!:now.toISOString(),elapsedMs:p.elapsedMs>=0?p.elapsedMs:null,timeZone:t.timeZone,ruleFingerprint:t.ruleFingerprint,unit:t.unit,value:status==='logged'?p.value:0,status,recordedAt:now.toISOString()};
}
export function commitHabitTimer(data:HabitData,id:string,timerId:string,now=new Date(),expected?:string):HabitData{
 const h=habitById(data,id);if(h.timerReceipts?.some(r=>r.id===timerId&&r.status==='logged'))return data;assertTimerReview(h,expected);const t=timerFor(h,timerId),p=habitTimerPreview(h,now);if(t.state!=='paused')throw Error('Pause and review the timer before logging.');if(p.reviewReason)throw Error(`Timer needs review. ${p.reviewReason}`);if(p.value<=0)throw Error('No elapsed duration to log.');
 const next=logHabitValue(data,id,t.date,p.value,{mode:'add'},now),updated=habitById(next,id);
 return replace(next,{...updated,timer:undefined,timerReceipts:[...(h.timerReceipts??[]),receipt(h,now,'logged')]});
}
export function discardHabitTimer(data:HabitData,id:string,timerId:string,now=new Date(),expected?:string):HabitData{
 const h=habitById(data,id);if(h.timerReceipts?.some(r=>r.id===timerId))return data;assertTimerReview(h,expected);timerFor(h,timerId);return replace(data,{...h,timer:undefined,timerReceipts:[...(h.timerReceipts??[]),receipt(h,now,'discarded')],updatedAt:now.toISOString()});
}
