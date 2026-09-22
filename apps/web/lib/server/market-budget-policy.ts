/** Pure, immutable policy foundation. NOT connected to provider admission.
 * All limits, costs, period boundaries and time come from the caller. No plan defaults.
 * A future durable owner must serialize transitions and persist dispatch BEFORE I/O.
 */
export type MarketPriority='interactive'|'refresh'|'optional'|'monitoring';
export type BudgetPolicy={rolling:{windowMs:number;allowance:number};concurrent:number;dailyAllowance:number;monthlyAllowance:number;monitoringReserve:{rolling:number;daily:number;monthly:number}};
export type BudgetPeriod={id:string;start:number;end:number};
export type BudgetPeriods={day:BudgetPeriod;month:BudgetPeriod};
export type ReservationRequest={id:string;cost:number;kind:'request'|'retry'|'fallback';priority:MarketPriority};
export type Reservation=ReservationRequest & {status:'RESERVED'|'DISPATCHED'|'SETTLED'|'CANCELLED';reservedAt:number;dispatchedAt?:number;periods:BudgetPeriods;outcome?:'success'|'failure'};
export type BudgetState={lastTime:number;periods?:BudgetPeriods;reservations:Readonly<Record<string,Reservation>>};
export type BudgetReason='POLICY_UNAVAILABLE'|'INVALID_REQUEST'|'CLOCK_OR_PERIOD'|'DUPLICATE_OPERATION'|'INVALID_TRANSITION'|'RESERVATION_EXPIRED'|'ROLLING_LIMIT'|'CONCURRENT_LIMIT'|'DAILY_LIMIT'|'MONTHLY_LIMIT';
export type BudgetDecision={ok:true;state:BudgetState;reason?:never}|{ok:false;state:BudgetState;reason:BudgetReason};
export const emptyBudgetState=():BudgetState=>({lastTime:0,reservations:{}});
const integer=(n:number)=>Number.isSafeInteger(n)&&n>=0;
function validPolicy(p:BudgetPolicy|undefined):p is BudgetPolicy {
 return !!p&&!!p.rolling&&!!p.monitoringReserve&&[p.rolling.windowMs,p.rolling.allowance,p.concurrent,p.dailyAllowance,p.monthlyAllowance].every(n=>integer(n)&&n>0)&&Object.values(p.monitoringReserve).every(integer)&&p.monitoringReserve.rolling<=p.rolling.allowance&&p.monitoringReserve.daily<=p.dailyAllowance&&p.monitoringReserve.monthly<=p.monthlyAllowance;
}
function validTime(state:BudgetState,periods:BudgetPeriods,now:number){
 if(!integer(now)||now<state.lastTime)return false;
 return (['day','month'] as const).every(kind=>{
  const next=periods[kind],previous=state.periods?.[kind];
  if(!/^[A-Za-z0-9_-]{1,80}$/.test(next.id)||!integer(next.start)||!integer(next.end)||next.start>now||next.end<=now)return false;
  if(!previous)return true;
  return next.id===previous.id?next.start===previous.start&&next.end===previous.end:next.start>=previous.end;
 });
}
const deny=(state:BudgetState,reason:BudgetReason):BudgetDecision=>({ok:false,state,reason});
function admit(state:BudgetState,p:BudgetPolicy,periods:BudgetPeriods,r:ReservationRequest,now:number):BudgetReason|undefined {
 const charged=Object.values(state.reservations).filter(r=>r.status!=='CANCELLED');
 const active=charged.filter(r=>r.status==='RESERVED'||r.status==='DISPATCHED');
 const sum=(rows:Reservation[])=>rows.reduce((total,row)=>total+row.cost,0);
 const reserve=r.priority==='monitoring'?{rolling:0,daily:0,monthly:0}:p.monitoringReserve;
 // Undispatched holds remain reserved even after the rolling window; they cannot
 // silently free capacity then dispatch later. Expired holds require explicit cancellation.
 if(sum(charged.filter(r=>r.status==='RESERVED'||(r.dispatchedAt??r.reservedAt)>now-p.rolling.windowMs))+r.cost>p.rolling.allowance-reserve.rolling)return 'ROLLING_LIMIT';
 if(sum(charged.filter(r=>r.periods.day.id===periods.day.id))+r.cost>p.dailyAllowance-reserve.daily)return 'DAILY_LIMIT';
 if(sum(charged.filter(r=>r.periods.month.id===periods.month.id))+r.cost>p.monthlyAllowance-reserve.monthly)return 'MONTHLY_LIMIT';
 if(active.length>=p.concurrent)return 'CONCURRENT_LIMIT';
}
export function reserve(state:BudgetState,policy:BudgetPolicy|undefined,periods:BudgetPeriods,request:ReservationRequest,now:number):BudgetDecision {
 if(!validPolicy(policy))return deny(state,'POLICY_UNAVAILABLE');
 if(!validTime(state,periods,now))return deny(state,'CLOCK_OR_PERIOD');
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(request.id)||!integer(request.cost)||request.cost===0||!['request','retry','fallback'].includes(request.kind)||!['interactive','refresh','optional','monitoring'].includes(request.priority))return deny(state,'INVALID_REQUEST');
 if(Object.hasOwn(state.reservations,request.id))return deny(state,'DUPLICATE_OPERATION');
 const reason=admit(state,policy,periods,request,now);if(reason)return deny(state,reason);
 const copyPeriod=(p:BudgetPeriod):BudgetPeriod=>({id:p.id,start:p.start,end:p.end});
 const periodCopy={day:copyPeriod(periods.day),month:copyPeriod(periods.month)};
 const row:Reservation={id:request.id,cost:request.cost,kind:request.kind,priority:request.priority,status:'RESERVED',reservedAt:now,periods:periodCopy};
 return {ok:true,state:{lastTime:now,periods:periodCopy,reservations:{...state.reservations,[request.id]:row}}};
}
export function markDispatched(state:BudgetState,policy:BudgetPolicy|undefined,periods:BudgetPeriods,id:string,now:number):BudgetDecision {
 if(!validPolicy(policy))return deny(state,'POLICY_UNAVAILABLE');
 if(!validTime(state,periods,now))return deny(state,'CLOCK_OR_PERIOD');
 const row=Object.hasOwn(state.reservations,id)?state.reservations[id]:undefined;if(!row||row.status!=='RESERVED')return deny(state,'INVALID_TRANSITION');
 if(row.periods.day.id!==periods.day.id||row.periods.month.id!==periods.month.id||now-row.reservedAt>=policy.rolling.windowMs)return deny(state,'RESERVATION_EXPIRED');
 const others={...state.reservations};delete others[id];
 const reason=admit({...state,reservations:others},policy,periods,row,now);if(reason)return deny(state,reason);
 return {ok:true,state:{...state,lastTime:now,reservations:{...state.reservations,[id]:{...row,status:'DISPATCHED',dispatchedAt:now}}}};
}
function transition(state:BudgetState,id:string,now:number,from:Reservation['status'],to:Reservation['status'],outcome?:Reservation['outcome']):BudgetDecision {
 if(!integer(now)||now<state.lastTime)return deny(state,'CLOCK_OR_PERIOD');
 const row=Object.hasOwn(state.reservations,id)?state.reservations[id]:undefined;if(!row||row.status!==from)return deny(state,'INVALID_TRANSITION');
 return {ok:true,state:{...state,lastTime:now,reservations:{...state.reservations,[id]:{...row,status:to,...(outcome?{outcome}:{})}}}};
}
export const settle=(state:BudgetState,id:string,outcome:'success'|'failure',now:number)=>transition(state,id,now,'DISPATCHED','SETTLED',outcome);
export const cancelUndispatched=(state:BudgetState,id:string,now:number)=>transition(state,id,now,'RESERVED','CANCELLED');
