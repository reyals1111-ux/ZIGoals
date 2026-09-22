/** Pure reference transitions; no runtime admission or scheduler. A durable adapter must
 * serialize these transitions and persist DISPATCHED before I/O. Times are milliseconds.
 * Minute limits count attempts; monthly limits count configurable credits. No daily cap.
 */
export type MarketPriority='interactive'|'refresh'|'optional'|'monitoring';
type Capacity={minute:number;monthly:number};
export type BudgetPolicy={providerMinuteLimit:number;providerMonthlyLimit:number;operating:Capacity;monitoringReserve:Capacity;monitoringMaximum:Capacity;optionalCeiling:Capacity;concurrent:number;queueLimit:number;reservationMs:number;ownershipMs:number};
export type BudgetPeriod={id:string;start:number;end:number};
export type BudgetPeriods={month:BudgetPeriod};
export type ReservationRequest={id:string;cost:number;kind:'request'|'retry'|'fallback';priority:MarketPriority};
export type Reservation=ReservationRequest & {status:'QUEUED'|'RESERVED'|'OWNED'|'DISPATCHED'|'SETTLED'|'CANCELLED';reservedAt:number;dispatchedAt?:number;ownershipUntil?:number;periods?:BudgetPeriods;policyKey?:string;outcome?:'success'|'failure'};
export type BudgetState={lastTime:number;periods?:BudgetPeriods;reservations:Readonly<Record<string,Reservation>>};
export type BudgetReason='POLICY_UNAVAILABLE'|'POLICY_CHANGED'|'INVALID_REQUEST'|'CLOCK_OR_PERIOD'|'DUPLICATE_OPERATION'|'INVALID_TRANSITION'|'RESERVATION_EXPIRED'|'OWNERSHIP_EXPIRED'|'MINUTE_LIMIT'|'CONCURRENT_LIMIT'|'MONTHLY_LIMIT'|'MONITORING_LIMIT'|'OPTIONAL_LIMIT'|'QUEUE_LIMIT';
export type BudgetDecision={ok:true;state:BudgetState;reason?:never}|{ok:false;state:BudgetState;reason:BudgetReason};
export const emptyBudgetState=():BudgetState=>({lastTime:0,reservations:{}});
const integer=(n:number)=>Number.isSafeInteger(n)&&n>=0;
const deny=(state:BudgetState,reason:BudgetReason):BudgetDecision=>({ok:false,state,reason});
const rowAt=(s:BudgetState,id:string)=>Object.hasOwn(s.reservations,id)?s.reservations[id]:undefined;
function validPolicy(p:BudgetPolicy|undefined):p is BudgetPolicy {
 if(!p||![p.providerMinuteLimit,p.providerMonthlyLimit,p.concurrent,p.queueLimit,p.reservationMs,p.ownershipMs].every(n=>integer(n)&&n>0))return false;
 return (['minute','monthly'] as const).every(k=>{
 const ceiling=p.operating?.[k],reserve=p.monitoringReserve?.[k],max=p.monitoringMaximum?.[k],optional=p.optionalCeiling?.[k];
 return [ceiling,reserve,max,optional].every(integer)&&ceiling>0&&ceiling<=(k==='minute'?p.providerMinuteLimit:p.providerMonthlyLimit)&&reserve<=max&&max<ceiling&&optional<=ceiling-reserve;
 });
}
const policyKey=(p:BudgetPolicy)=>JSON.stringify([p.providerMinuteLimit,p.providerMonthlyLimit,p.operating.minute,p.operating.monthly,p.monitoringReserve.minute,p.monitoringReserve.monthly,p.monitoringMaximum.minute,p.monitoringMaximum.monthly,p.optionalCeiling.minute,p.optionalCeiling.monthly,p.concurrent,p.queueLimit,p.reservationMs,p.ownershipMs]);
const validClock=(s:BudgetState,now:number)=>integer(now)&&now>=s.lastTime;
function validTime(s:BudgetState,periods:BudgetPeriods,now:number){
 if(!validClock(s,now))return false;
 const next=periods?.month,previous=s.periods?.month;
 if(!next||!/^[A-Za-z0-9_-]{1,80}$/.test(next.id)||!integer(next.start)||!integer(next.end)||next.start>now||next.end<=now)return false;
 return !previous||(next.id===previous.id?next.start===previous.start&&next.end===previous.end:next.start>=previous.end);
}
const validRequest=(r:ReservationRequest)=>/^[A-Za-z0-9_-]{1,100}$/.test(r.id)&&integer(r.cost)&&r.cost>0&&['request','retry','fallback'].includes(r.kind)&&['interactive','refresh','optional','monitoring'].includes(r.priority);
function put(s:BudgetState,row:Reservation,now:number,periods=s.periods):BudgetDecision {
 return {ok:true,state:{lastTime:now,periods:periods?{month:{...periods.month}}:undefined,reservations:{...s.reservations,[row.id]:row}}};
}
function admit(s:BudgetState,p:BudgetPolicy,periods:BudgetPeriods,r:ReservationRequest,now:number):BudgetReason|undefined {
 const charged=Object.values(s.reservations).filter(r=>!['QUEUED','CANCELLED'].includes(r.status));
 for(const k of ['minute','monthly'] as const){
 const rows=charged.filter(r=>r.status==='RESERVED'||r.status==='OWNED'||(k==='minute'?r.dispatchedAt!>now-60000:r.periods?.month.id===periods.month.id));
 const cost=(row:ReservationRequest)=>k==='minute'?1:row.cost;
 const sum=(rows:Reservation[])=>rows.reduce((n,row)=>n+cost(row),0);
 const n=cost(r),limit=k==='minute'?'MINUTE_LIMIT':'MONTHLY_LIMIT';
 if(r.priority==='monitoring'){
 if(sum(rows.filter(row=>row.priority==='monitoring'))+n>p.monitoringMaximum[k])return 'MONITORING_LIMIT';
 }else{
 if(sum(rows.filter(row=>row.priority!=='monitoring'))+n>p.operating[k]-p.monitoringReserve[k])return limit;
 if((r.priority==='optional'||r.priority==='refresh')&&sum(rows)+n>p.optionalCeiling[k])return 'OPTIONAL_LIMIT';
 }
 if(sum(rows)+n>p.operating[k])return limit;
 }
}
export function enqueue(s:BudgetState,p:BudgetPolicy|undefined,r:ReservationRequest,now:number):BudgetDecision {
 if(!validPolicy(p))return deny(s,'POLICY_UNAVAILABLE');
 if(!validClock(s,now))return deny(s,'CLOCK_OR_PERIOD');
 if(!validRequest(r))return deny(s,'INVALID_REQUEST');
 if(rowAt(s,r.id))return deny(s,'DUPLICATE_OPERATION');
 if(Object.values(s.reservations).filter(r=>r.status==='QUEUED').length>=p.queueLimit)return deny(s,'QUEUE_LIMIT');
 return put(s,{...r,status:'QUEUED',reservedAt:now},now);
}
export function reserve(s:BudgetState,p:BudgetPolicy|undefined,periods:BudgetPeriods,r:ReservationRequest,now:number):BudgetDecision {
 if(!validPolicy(p))return deny(s,'POLICY_UNAVAILABLE');
 if(!validTime(s,periods,now))return deny(s,'CLOCK_OR_PERIOD');
 if(!validRequest(r))return deny(s,'INVALID_REQUEST');
 const old=rowAt(s,r.id);
 if(old&&(old.status!=='QUEUED'||old.cost!==r.cost||old.priority!==r.priority||old.kind!==r.kind))return deny(s,'DUPLICATE_OPERATION');
 const reason=admit(s,p,periods,r,now);if(reason)return deny(s,reason);
 return put(s,{id:r.id,cost:r.cost,kind:r.kind,priority:r.priority,status:'RESERVED',reservedAt:now,periods:{month:{...periods.month}},policyKey:policyKey(p)},now,periods);
}
function eligible(s:BudgetState,p:BudgetPolicy|undefined,periods:BudgetPeriods,id:string,now:number,status:Reservation['status']):BudgetReason|undefined {
 if(!validPolicy(p))return 'POLICY_UNAVAILABLE';
 if(!validTime(s,periods,now))return 'CLOCK_OR_PERIOD';
 const row=rowAt(s,id);if(!row||row.status!==status)return 'INVALID_TRANSITION';
 if(row.policyKey!==policyKey(p))return 'POLICY_CHANGED';
 if(row.periods?.month.id!==periods.month.id||now-row.reservedAt>=p.reservationMs)return 'RESERVATION_EXPIRED';
}
export function ownDispatch(s:BudgetState,p:BudgetPolicy|undefined,periods:BudgetPeriods,id:string,now:number):BudgetDecision {
 const reason=eligible(s,p,periods,id,now,'RESERVED');if(reason)return deny(s,reason);
 // Never free DISPATCHED slots on a timer: uncertain I/O must settle before replacement.
 if(Object.values(s.reservations).filter(r=>r.status==='OWNED'||r.status==='DISPATCHED').length>=p!.concurrent)return deny(s,'CONCURRENT_LIMIT');
 return put(s,{...rowAt(s,id)!,status:'OWNED',ownershipUntil:now+p!.ownershipMs},now,periods);
}
export function markDispatched(s:BudgetState,p:BudgetPolicy|undefined,periods:BudgetPeriods,id:string,now:number):BudgetDecision {
 const reason=eligible(s,p,periods,id,now,'OWNED');if(reason)return deny(s,reason);
 const row=rowAt(s,id)!;if(now>=row.ownershipUntil!)return deny(s,'OWNERSHIP_EXPIRED');
 // Capacity was already held. Re-admission here would retroactively revoke accepted work.
 return put(s,{...row,status:'DISPATCHED',dispatchedAt:now},now,periods);
}
export function settle(s:BudgetState,id:string,outcome:'success'|'failure',now:number):BudgetDecision {
 if(!validClock(s,now))return deny(s,'CLOCK_OR_PERIOD');
 const row=rowAt(s,id);if(!row||row.status!=='DISPATCHED'||!['success','failure'].includes(outcome))return deny(s,'INVALID_TRANSITION');
 return put(s,{...row,status:'SETTLED',outcome},now);
}
export function cancelUndispatched(s:BudgetState,id:string,now:number):BudgetDecision {
 if(!validClock(s,now))return deny(s,'CLOCK_OR_PERIOD');
 const row=rowAt(s,id);if(!row||!['QUEUED','RESERVED','OWNED'].includes(row.status))return deny(s,'INVALID_TRANSITION');
 return put(s,{...row,status:'CANCELLED'},now);
}
