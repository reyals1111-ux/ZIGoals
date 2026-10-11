import {expect,it} from 'vitest';
import {emptyBreaker,admitBreaker,settleBreaker,scopeForFailure,type BreakerPolicy} from './market-breaker';
const policy:BreakerPolicy={threshold:2,windowMs:100,cooldownMs:10,maxCooldownMs:40,halfOpenProbes:1};
const scope={kind:'endpoint-availability',endpoint:'quotes'} as const;
const fail=(s:ReturnType<typeof emptyBreaker>,id:string,now:number)=>{const a=admitBreaker(s,policy,scope,id,now);expect(a.ok).toBe(true);return settleBreaker(a.state,policy,a.permit!,'UPSTREAM_5XX',now);};
it('CLOSED opens at threshold; cooldown admits exactly one fenced half-open probe',()=>{
 let s=fail(emptyBreaker(),'a',0);expect(s.phase).toBe('CLOSED');s=fail(s,'b',1);expect(s.phase).toBe('OPEN');
 expect(admitBreaker(s,policy,scope,'early',10).ok).toBe(false);
 const probe=admitBreaker(s,policy,scope,'probe',11);expect(probe.ok).toBe(true);expect(probe.state.phase).toBe('HALF_OPEN');
 expect(admitBreaker(probe.state,policy,scope,'extra',11).ok).toBe(false);
 expect(settleBreaker(probe.state,policy,probe.permit!,'VERIFIED',12).phase).toBe('CLOSED');
});
it('failed probes escalate cooldown to the configured maximum and ignore late settlement',()=>{
 let s=fail(fail(emptyBreaker(),'a',0),'b',1);
 const p=admitBreaker(s,policy,scope,'p',11);s=settleBreaker(p.state,policy,p.permit!,'UPSTREAM_5XX',12);expect(s.retryAt).toBe(32);
 expect(settleBreaker(s,policy,p.permit!,'VERIFIED',13)).toEqual(s);
 const q=admitBreaker(s,policy,scope,'q',32);s=settleBreaker(q.state,policy,q.permit!,'UPSTREAM_5XX',33);expect(s.retryAt).toBe(73);
 const r=admitBreaker(s,policy,scope,'r',73);s=settleBreaker(r.state,policy,r.permit!,'UPSTREAM_5XX',74);expect(s.retryAt).toBe(114);
});
it('observation window expires and unrelated endpoint/pair cannot affect this breaker',()=>{
 let s=fail(emptyBreaker(),'a',0);s=fail(s,'b',101);expect(s.phase).toBe('CLOSED');
 expect(admitBreaker(s,policy,{kind:'endpoint-availability',endpoint:'history'},'c',102).ok).toBe(false);
 const pair={kind:'pair',workKey:'bitcoin-USD'} as const;const a=admitBreaker(emptyBreaker(),policy,pair,'a',1);
 const other=admitBreaker(emptyBreaker(),policy,{kind:'pair',workKey:'zignaly-USD'},'b',1);
 expect(settleBreaker(a.state,policy,other.permit!,'UPSTREAM_5XX',2)).toEqual(a.state);
});
it.each(['LOCAL_BUDGET','LOCAL_QUEUE','BLOCKED'] as const)('%s never increments a provider breaker',failure=>{
 const local=scopeForFailure(failure,{endpoint:'quotes'});expect(local?.kind).toMatch(/local|runner/);
 const a=admitBreaker(emptyBreaker(),policy,local!,'local',1);expect(a.ok).toBe(true);
 expect(settleBreaker(a.state,policy,a.permit!,'UPSTREAM_5XX',2).failures).toEqual([]);
});
it('account throttle requires independent proof, auth and integrity have distinct scopes',()=>{
 expect(scopeForFailure('THROTTLED',{endpoint:'quotes'})).toEqual(scope);
 expect(scopeForFailure('THROTTLED',{endpoint:'quotes',provenAccountThrottle:true})?.kind).toBe('account-throttle');
 expect(scopeForFailure('AUTHENTICATION',{endpoint:'quotes'})?.kind).toBe('account-authentication');
 expect(scopeForFailure('MALFORMED',{endpoint:'quotes'})?.kind).toBe('endpoint-integrity');
 expect(scopeForFailure('UNKNOWN',{endpoint:'quotes'})).toBeNull();
});
it('multi-probe recovery requires all configured successes, never over-issues',()=>{
 const p={...policy,threshold:1,halfOpenProbes:2};let s=admitBreaker(emptyBreaker(),p,scope,'a',0);let state=settleBreaker(s.state,p,s.permit!,'UPSTREAM_5XX',0);
 s=admitBreaker(state,p,scope,'b',10);state=settleBreaker(s.state,p,s.permit!,'VERIFIED',11);expect(state.phase).toBe('HALF_OPEN');
 const next=admitBreaker(state,p,scope,'c',11);expect(next.ok).toBe(true);expect(admitBreaker(next.state,p,scope,'d',11).ok).toBe(false);
 expect(settleBreaker(next.state,p,next.permit!,'VERIFIED',12).phase).toBe('CLOSED');
});
it('invalid config/time, duplicate admission and repeated settlement fail closed',()=>{
 expect(admitBreaker(emptyBreaker(),{...policy,threshold:0},scope,'a',0).ok).toBe(false);
 const a=admitBreaker(emptyBreaker(),policy,scope,'a',2);
 expect(admitBreaker(a.state,policy,scope,'a',3).ok).toBe(false);
 expect(admitBreaker(a.state,policy,scope,'b',1).ok).toBe(false);
 const s=settleBreaker(a.state,policy,a.permit!,'UPSTREAM_5XX',3);expect(settleBreaker(s,policy,a.permit!,'UPSTREAM_5XX',4)).toEqual(s);
});

it.each(['LOCAL_BUDGET','LOCAL_QUEUE','BLOCKED','UNKNOWN'] as const)('ignores %s even on an admitted provider probe',outcome=>{
 const p={...policy,threshold:1};const a=admitBreaker(emptyBreaker(),p,scope,'a',0);
 const opened=settleBreaker(a.state,p,a.permit!,'UPSTREAM_5XX',0);
 const probe=admitBreaker(opened,p,scope,'probe',10);
 const ignored=settleBreaker(probe.state,p,probe.permit!,outcome,11);
 expect(ignored.failures).toEqual([0]);expect(ignored.trips).toBe(1);expect(ignored.successes).toBe(0);
 expect(admitBreaker(ignored,p,scope,'replacement',12).ok).toBe(true);
});
