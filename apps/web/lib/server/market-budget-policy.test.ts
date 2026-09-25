import {expect,it} from 'vitest';
import {emptyBudgetState,reserve,markDispatched,settle,cancelUndispatched,enqueue,ownDispatch,type BudgetPolicy,type BudgetPeriods,type BudgetState} from './market-budget-policy';
const policy:BudgetPolicy={providerMinuteLimit:10,providerMonthlyLimit:100,operating:{minute:8,monthly:80},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:2,monthly:20},optionalCeiling:{minute:3,monthly:30},concurrent:1,queueLimit:2,reservationMs:100,ownershipMs:50};
const periods:BudgetPeriods={month:{id:'2026-09',start:0,end:100000}};
const req=(id:string,cost=10,priority:'interactive'|'monitoring'|'optional'='interactive')=>({id,cost,priority,kind:'request' as const});
const dispatch=(s:BudgetState,id:string,t:number)=>markDispatched(ownDispatch(s,policy,periods,id,t).state,policy,periods,id,t);
it('accepts real account shape without a daily allowance and rejects invalid configuration',()=>{
 expect(reserve(emptyBudgetState(),policy,periods,req('a'),1).ok).toBe(true);
 expect(reserve(emptyBudgetState(),undefined,periods,req('a'),1).reason).toBe('POLICY_UNAVAILABLE');
 expect(reserve(emptyBudgetState(),{...policy,operating:{minute:11,monthly:80}},periods,req('a'),1).ok).toBe(false);
 expect(reserve(emptyBudgetState(),{...policy,monitoringMaximum:{minute:8,monthly:80}},periods,req('a'),1).ok).toBe(false);
});
it.each([false,true])('keeps accepted interactive capacity stable, monitoring first=%s',first=>{
 let s=emptyBudgetState();
 for(const r of first?[req('m',20,'monitoring'),req('i',60)]:[req('i',60),req('m',20,'monitoring')]){const d=reserve(s,policy,periods,r,1);expect(d.ok).toBe(true);s=d.state;}
 const m=dispatch(s,'m',2);expect(m.ok).toBe(true);s=settle(m.state,'m','success',3).state;
 expect(dispatch(s,'i',4).ok).toBe(true);
 expect(reserve(s,policy,periods,req('more',1,'monitoring'),4).reason).toBe('MONITORING_LIMIT');
});
it('optional yields before interactive and monitoring reserve stays available',()=>{
 let s=reserve(emptyBudgetState(),policy,periods,req('i',40),1).state;
 expect(reserve(s,policy,periods,req('o',1,'optional'),2).reason).toBe('OPTIONAL_LIMIT');
 const i=reserve(s,policy,periods,req('i2',20),2);expect(i.ok).toBe(true);s=i.state;
 expect(reserve(s,policy,periods,req('i3',1),3).reason).toBe('MONTHLY_LIMIT');
 expect(reserve(s,policy,periods,req('m',20,'monitoring'),3).ok).toBe(true);
});
it('counts one attempt per minute independently of weighted credits and retains failed costs',()=>{
 let s=emptyBudgetState();const p={...policy,providerMinuteLimit:3,operating:{minute:3,monthly:80},monitoringReserve:{minute:1,monthly:20},monitoringMaximum:{minute:1,monthly:20},optionalCeiling:{minute:1,monthly:30}};
 for(let i=0;i<2;i++){s=reserve(s,p,periods,req('a'+i,1),i+1).state;s=ownDispatch(s,p,periods,'a'+i,i+1).state;s=markDispatched(s,p,periods,'a'+i,i+1).state;s=settle(s,'a'+i,'failure',i+1).state;}
 expect(reserve(s,p,periods,req('b',1),3).reason).toBe('MINUTE_LIMIT');
 expect(reserve(s,p,periods,req('c',1),60003).ok).toBe(true);
 expect(settle(s,'a0','success',3).ok).toBe(false);
 expect(reserve(s,p,periods,req('a0'),3).reason).toBe('DUPLICATE_OPERATION');
});
it('bounded queued items and reservations occupy no dispatch slot; no double dispatch',()=>{
 let s=enqueue(emptyBudgetState(),policy,req('a'),1).state;s=enqueue(s,policy,req('b'),1).state;
 expect(enqueue(s,policy,req('c'),1).reason).toBe('QUEUE_LIMIT');
 expect(ownDispatch(s,policy,periods,'a',2).ok).toBe(false);
 s=reserve(s,policy,periods,req('a'),2).state;s=reserve(s,policy,periods,req('b'),2).state;
 expect(markDispatched(s,policy,periods,'a',3).ok).toBe(false);
 s=ownDispatch(s,policy,periods,'a',3).state;
 expect(ownDispatch(s,policy,periods,'b',3).reason).toBe('CONCURRENT_LIMIT');
 s=markDispatched(s,policy,periods,'a',4).state;
 expect(markDispatched(s,policy,periods,'a',4).ok).toBe(false);
 s=settle(s,'a','success',5).state;expect(ownDispatch(s,policy,periods,'b',6).ok).toBe(true);
});
it('cancellation releases queued/reserved/owned cost, never dispatched cost',()=>{
 for(const stage of ['queued','reserved','owned']){
 let s=enqueue(emptyBudgetState(),policy,req('a',60),1).state;
 if(stage!=='queued')s=reserve(s,policy,periods,req('a',60),2).state;
 if(stage==='owned')s=ownDispatch(s,policy,periods,'a',3).state;
 s=cancelUndispatched(s,'a',4).state;expect(reserve(s,policy,periods,req('b',60),5).ok).toBe(true);
 }
 const s=dispatch(reserve(emptyBudgetState(),policy,periods,req('a'),1).state,'a',2).state;
 expect(cancelUndispatched(s,'a',3).ok).toBe(false);
});
it('expires holds/ownership at the exact boundary and rejects changed policy/periods',()=>{
 const s=reserve(emptyBudgetState(),policy,periods,req('a'),1).state;
 expect(ownDispatch(s,policy,periods,'a',101).reason).toBe('RESERVATION_EXPIRED');
 const owned=ownDispatch(s,policy,periods,'a',2).state;
 expect(markDispatched(owned,policy,periods,'a',52).reason).toBe('OWNERSHIP_EXPIRED');
 expect(ownDispatch(s,{...policy,concurrent:2},periods,'a',2).reason).toBe('POLICY_CHANGED');
 expect(ownDispatch(s,policy,{month:{id:'2026-10',start:100000,end:200000}},'a',100001).ok).toBe(false);
 expect(reserve(s,policy,{month:{id:'fake',start:2,end:100001}},req('b'),2).reason).toBe('CLOCK_OR_PERIOD');
});
it('new calendar period restores credits, while stale undispatched holds still reserve capacity',()=>{
 let s=reserve(emptyBudgetState(),policy,periods,req('a',60),1).state;
 expect(reserve(s,policy,periods,req('b'),1000).ok).toBe(false);
 s=dispatch(s,'a',2).state;s=settle(s,'a','failure',3).state;
 expect(reserve(s,policy,periods,req('b'),61000).reason).toBe('MONTHLY_LIMIT');
 expect(reserve(s,policy,{month:{id:'2026-10',start:100000,end:200000}},req('b',60),100001).ok).toBe(true);
});
it('requires independent retry/fallback attempts and never mutates inputs',()=>{
 const original=emptyBudgetState();let s=original;
 for(const [i,kind] of (['request','retry','fallback'] as const).entries())s=reserve(s,policy,periods,{...req('a'+i,20),kind},1).state;
 expect(original.reservations).toEqual({});expect(reserve(s,policy,periods,req('extra',1),2).ok).toBe(false);
});
