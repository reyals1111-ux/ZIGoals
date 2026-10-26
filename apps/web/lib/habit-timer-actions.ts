// Session AA-Local Gate A (ADR-022 B41): the saved timer's actions, Session X's code moved verbatim out of habit-actions.ts so the
// habits store (in the shell through the knock) no longer carries them; the timer UI and ZIGi's timer cards import this module.
import {habitRuleOn,habitDay,logHabitValue,type Habit,type HabitData,type HabitRule} from './habits';
import {habitById,replace} from './habit-actions';
const MAX_TIMER_MS=7*86400000;
function zonedDay(now:Date,timeZone:string){const parts=new Intl.DateTimeFormat('en',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now),get=(type:string)=>parts.find(p=>p.type===type)!.value;return `${get('year')}-${get('month')}-${get('day')}`;}
function ruleFingerprint(rule:HabitRule){return JSON.stringify(rule);}
function assertTimerReview(h:Habit,expected?:string){if(expected!==undefined&&JSON.stringify(h.timer)!==expected)throw Error('The timer changed after your review. Review its current timestamps again.');}
function timerFor(h:Habit,id:string){if(!h.timer||h.timer.id!==id)throw Error('The saved timer changed. Review the current timer.');return h.timer;}
export function startHabitTimer(data:HabitData,id:string,timerId:string,now=new Date(),timeZone=data.timeZone??Intl.DateTimeFormat().resolvedOptions().timeZone):HabitData{
 const h=habitById(data,id);if(h.timerReceipts?.some(r=>(r.timerId??r.id)===timerId))throw Error('This timer identity was already used.');if(h.timer){if(h.timer.id===timerId)return data;throw Error('A saved timer already exists. Review it first.');}
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
 const t=h.timer!,p=habitTimerPreview(h,now);return {id:crypto.randomUUID(),timerId:t.id,date:t.date,startedAt:t.startedAt,endedAt:t.state==='paused'?t.pausedAt!:now.toISOString(),elapsedMs:p.elapsedMs>=0?p.elapsedMs:null,timeZone:t.timeZone,ruleFingerprint:t.ruleFingerprint,unit:t.unit,value:status==='logged'?p.value:0,status,recordedAt:now.toISOString()};
}
export function commitHabitTimer(data:HabitData,id:string,timerId:string,now=new Date(),expected?:string):HabitData{
 const h=habitById(data,id);if(h.timerReceipts?.some(r=>(r.timerId??r.id)===timerId&&r.status==='logged'))return data;assertTimerReview(h,expected);const t=timerFor(h,timerId),p=habitTimerPreview(h,now);if(t.state!=='paused')throw Error('Pause and review the timer before logging.');if(data.timeZone&&data.timeZone!==t.timeZone)throw Error('The Habit timezone changed. Review the original timer date and record it manually in History.');if(p.reviewReason)throw Error(`Timer needs review. ${p.reviewReason}`);if(p.value<=0)throw Error('No elapsed duration to log.');
 // Session AH (HA11, M-138): a timed session is logged in whole seconds, written as 2 decimals of a minute (3 of an
 // hour), never "30.030783 minutes"; the receipt keeps the exact milliseconds.
 const logged=t.unit==='hours'?Math.round(p.value*1000)/1000:Math.round(p.value*100)/100;
 const next=logHabitValue(data,id,t.date,logged>0?logged:p.value,{mode:'add'},now),updated=habitById(next,id);
 return replace(next,{...updated,timer:undefined,timerReceipts:[...(h.timerReceipts??[]),receipt(h,now,'logged')]});
}
/** Session AA-Local H2: Finish in one tap: a running timer is paused at `now` and logged at once (the review rules of commit apply unchanged). */
export function finishHabitTimer(data:HabitData,id:string,timerId:string,now=new Date(),expected?:string):HabitData{
 const h=habitById(data,id),t=timerFor(h,timerId);const paused=t.state==='running'?pauseHabitTimer(data,id,timerId,now,expected):data;return commitHabitTimer(paused,id,timerId,now,JSON.stringify(habitById(paused,id).timer));
}
export function discardHabitTimer(data:HabitData,id:string,timerId:string,now=new Date(),expected?:string):HabitData{
 const h=habitById(data,id);if(h.timerReceipts?.some(r=>(r.timerId??r.id)===timerId))return data;assertTimerReview(h,expected);timerFor(h,timerId);return replace(data,{...h,timer:undefined,timerReceipts:[...(h.timerReceipts??[]),receipt(h,now,'discarded')],updatedAt:now.toISOString()});
}
