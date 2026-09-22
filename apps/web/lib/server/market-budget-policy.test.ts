import {expect,it} from 'vitest';
import {emptyBudgetState,reserve,markDispatched,settle,cancelUndispatched,type BudgetPolicy,type BudgetPeriods} from './market-budget-policy';
const policy:BudgetPolicy={rolling:{windowMs:100,allowance:10},concurrent:2,dailyAllowance:20,monthlyAllowance:30,monitoringReserve:{rolling:2,daily:3,monthly:4}};
const periods:BudgetPeriods={day:{id:'d1',start:0,end:1000},month:{id:'m1',start:0,end:10000}};
const request=(id:string,cost=1,priority:'interactive'|'optional'|'monitoring'='interactive')=>({id,cost,priority,kind:'request' as const});
it('fails closed for missing/invalid policy without guessing account limits',()=>{
 expect(reserve(emptyBudgetState(),undefined,periods,request('a'),1).reason).toBe('POLICY_UNAVAILABLE');
 expect(reserve(emptyBudgetState(),{...policy,dailyAllowance:NaN},periods,request('a'),1).ok).toBe(false);
 expect(reserve(emptyBudgetState(),policy,periods,request('a',0),1).ok).toBe(false);
});
it('charges once, keeps failed dispatched attempts charged and forbids double settlement',()=>{
 const a=reserve(emptyBudgetState(),policy,periods,request('a',4),1);expect(a.ok).toBe(true);
 const b=markDispatched(a.state,policy,periods,'a',2);expect(b.ok).toBe(true);
 const c=settle(b.state,'a','failure',3);expect(c.ok).toBe(true);
 expect(settle(c.state,'a','success',4).ok).toBe(false);
 expect(reserve(c.state,policy,periods,request('a',4),5).ok).toBe(false);
 expect(reserve(c.state,policy,periods,request('b',5),5).reason).toBe('ROLLING_LIMIT');
});
it('cancels only undispatched reservations and charges uncertain dispatch conservatively',()=>{
 const a=reserve(emptyBudgetState(),policy,periods,request('a',8),1);
 const cancelled=cancelUndispatched(a.state,'a',2);expect(cancelled.ok).toBe(true);
 const b=reserve(cancelled.state,policy,periods,request('b',8),3);expect(b.ok).toBe(true);
 const sent=markDispatched(b.state,policy,periods,'b',4);
 expect(cancelUndispatched(sent.state,'b',5).ok).toBe(false);
 expect(reserve(sent.state,policy,periods,request('c'),6).ok).toBe(false);
});
it('requires independent charged reservations for retries and fallbacks',()=>{
 let state=emptyBudgetState();
 for(const [index,kind] of (['request','retry','fallback'] as const).entries()){
 const id=String(index);state=reserve(state,policy,periods,{...request(id,2),kind},index*3+1).state;
 state=markDispatched(state,policy,periods,id,index*3+2).state;state=settle(state,id,'failure',index*3+3).state;
 }
 expect(Object.values(state.reservations).reduce((sum,r)=>sum+r.cost,0)).toBe(6);
 expect(reserve(state,policy,periods,request('next',3),10).ok).toBe(false);
});
it('protects monitoring reserve within total allowance, including from optional work',()=>{
 const a=reserve(emptyBudgetState(),policy,periods,request('a',8,'optional'),1);
 expect(reserve(a.state,policy,periods,request('b',1,'optional'),2).reason).toBe('ROLLING_LIMIT');
 const m=reserve(a.state,policy,periods,request('m',2,'monitoring'),2);expect(m.ok).toBe(true);
 const done=settle(markDispatched(m.state,policy,periods,'m',3).state,'m','success',4);
 expect(reserve(done.state,policy,periods,request('m2',1,'monitoring'),5).reason).toBe('ROLLING_LIMIT');
});
it('enforces concurrent, daily and monthly injected allowances',()=>{
 let state=reserve(emptyBudgetState(),policy,periods,request('a'),1).state;state=reserve(state,policy,periods,request('b'),2).state;
 expect(reserve(state,policy,periods,request('c'),3).reason).toBe('CONCURRENT_LIMIT');
 const p={...policy,rolling:{windowMs:10,allowance:100},dailyAllowance:5,monthlyAllowance:6,monitoringReserve:{rolling:0,daily:0,monthly:0}};
 state=reserve(emptyBudgetState(),p,periods,request('x',5),1).state;state=markDispatched(state,p,periods,'x',2).state;state=settle(state,'x','success',3).state;
 expect(reserve(state,p,periods,request('y'),20).reason).toBe('DAILY_LIMIT');
 const next={...periods,day:{id:'d2',start:1000,end:2000}};
 expect(reserve(state,p,next,request('z',2),1001).reason).toBe('MONTHLY_LIMIT');
});
it('rolls periods forward without resurrecting old allowance or accepting changed/overlapping boundaries',()=>{
 let state=reserve(emptyBudgetState(),policy,periods,request('a',8),1).state;state=markDispatched(state,policy,periods,'a',2).state;state=settle(state,'a','success',3).state;
 expect(reserve(state,policy,{...periods,day:{id:'fake',start:3,end:1001}},request('b'),4).ok).toBe(false);
 const next={day:{id:'d2',start:1000,end:2000},month:periods.month};const rolled=reserve(state,policy,next,request('b',8),1001);expect(rolled.ok).toBe(true);
 expect(reserve(rolled.state,policy,periods,request('c'),5).reason).toBe('CLOCK_OR_PERIOD');
 expect(reserve(rolled.state,policy,next,request('a'),1002).ok).toBe(false);
});
it('rechecks expired holds at dispatch and never dispatches using a previous period reservation',()=>{
 const a=reserve(emptyBudgetState(),policy,periods,request('a',8),1);
 const next={day:{id:'d2',start:1000,end:2000},month:periods.month};
 expect(markDispatched(a.state,policy,next,'a',1001).reason).toBe('RESERVATION_EXPIRED');
 expect(cancelUndispatched(a.state,'a',1001).ok).toBe(true);
});
it('does not mutate input state and rejects repeated dispatch',()=>{
 const original=emptyBudgetState();const a=reserve(original,policy,periods,request('a'),1);expect(original.reservations).toEqual({});const b=markDispatched(a.state,policy,periods,'a',2);expect(a.state.reservations.a?.status).toBe('RESERVED');expect(markDispatched(b.state,policy,periods,'a',3).ok).toBe(false);
});
it('denies partial mandatory configuration and resets only a real new month',()=>{
 expect(reserve(emptyBudgetState(),{} as BudgetPolicy,periods,request('a'),1).reason).toBe('POLICY_UNAVAILABLE');
 const p={...policy,rolling:{windowMs:10,allowance:30},dailyAllowance:30,monthlyAllowance:5,monitoringReserve:{rolling:0,daily:0,monthly:0}};
 let state=reserve(emptyBudgetState(),p,periods,request('a',5),1).state;
 state=markDispatched(state,p,periods,'a',2).state;state=settle(state,'a','failure',3).state;
 expect(reserve(state,p,periods,request('b'),20).reason).toBe('MONTHLY_LIMIT');
 const next={day:{id:'d10',start:10000,end:11000},month:{id:'m2',start:10000,end:20000}};
 const fresh=reserve(state,p,next,request('b',5),10001);expect(fresh.ok).toBe(true);
 expect(reserve(fresh.state,p,next,request('c'),10002).reason).toBe('MONTHLY_LIMIT');
 expect(settle(fresh.state,'a','failure',10002).ok).toBe(false);
});
