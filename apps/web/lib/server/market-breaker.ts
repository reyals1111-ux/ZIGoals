import type {ProviderFailureCategory} from './provider-failure';
export type BreakerScope={kind:'account-authentication'|'account-throttle'}|{kind:'endpoint-availability'|'endpoint-integrity';endpoint:string}|{kind:'pair';workKey:string}|{kind:'local-budget'|'local-queue'|'runner-blocked'};
export type BreakerPolicy={threshold:number;windowMs:number;cooldownMs:number;maxCooldownMs:number;halfOpenProbes:number};
export type BreakerPermit={id:string;scopeKey:string;generation:number;probe:boolean};
export type BreakerState={phase:'CLOSED'|'OPEN'|'HALF_OPEN';scopeKey?:string;lastTime:number;generation:number;failures:readonly number[];retryAt:number;trips:number;issued:number;successes:number;pending:Readonly<Record<string,BreakerPermit>>;seen:readonly string[]};
export const emptyBreaker=():BreakerState=>({phase:'CLOSED',lastTime:0,generation:0,failures:[],retryAt:0,trips:0,issued:0,successes:0,pending:{},seen:[]});
const local=(s:BreakerScope)=>s.kind==='local-budget'||s.kind==='local-queue'||s.kind==='runner-blocked';
const key=(s:BreakerScope)=>JSON.stringify([s.kind,...('endpoint' in s?[s.endpoint]:'workKey' in s?[s.workKey]:[])]);
const integer=(n:number)=>Number.isSafeInteger(n)&&n>=0;
const valid=(p:BreakerPolicy)=>[p.threshold,p.windowMs,p.cooldownMs,p.maxCooldownMs,p.halfOpenProbes].every(n=>integer(n)&&n>0)&&p.maxCooldownMs>=p.cooldownMs;
/** Independent evidence is required before promoting an endpoint 429 to account-wide.
 * UNKNOWN/programming failures do not implicate the provider. Local scopes never trip. */
export function scopeForFailure(failure:ProviderFailureCategory|'BLOCKED',context:{endpoint:string;provenAccountThrottle?:boolean;pairKey?:string}):BreakerScope|null {
 if(failure==='LOCAL_BUDGET')return {kind:'local-budget'};
 if(failure==='LOCAL_QUEUE')return {kind:'local-queue'};
 if(failure==='BLOCKED')return {kind:'runner-blocked'};
 if(failure==='AUTHENTICATION')return {kind:'account-authentication'};
 if(failure==='THROTTLED'&&context.provenAccountThrottle)return {kind:'account-throttle'};
 if(failure==='UNKNOWN'||failure==='ENTITLEMENT')return null;
 if(context.pairKey)return {kind:'pair',workKey:context.pairKey};
 if(failure==='MALFORMED')return {kind:'endpoint-integrity',endpoint:context.endpoint};
 if(['THROTTLED','UPSTREAM_5XX','NETWORK','TIMEOUT'].includes(failure))return {kind:'endpoint-availability',endpoint:context.endpoint};
 return null;
}
/** Pure transition model. Future adapter serializes per scope and persists permits.
 * Seen attempt IDs are tombstones; pruning/restart recovery require durable design.
 * A probe lost to cancellation must be explicitly settled as failed, never auto-success. */
export function admitBreaker(s:BreakerState,p:BreakerPolicy,scope:BreakerScope,id:string,now:number):{ok:boolean;state:BreakerState;permit?:BreakerPermit}{
 const scopeKey=key(scope);
 if(!valid(p)||!integer(now)||now<s.lastTime||!/^[A-Za-z0-9_-]{1,100}$/.test(id)||s.scopeKey&&s.scopeKey!==scopeKey||s.seen.includes(id))return {ok:false,state:s};
 if(local(scope))return {ok:true,state:s,permit:{id,scopeKey,generation:s.generation,probe:false}};
 if(s.phase==='OPEN'&&now<s.retryAt)return {ok:false,state:s};
 let next=s.phase==='OPEN'?{...s,phase:'HALF_OPEN' as const,issued:0,successes:0,pending:{}}:s;
 if(next.phase==='HALF_OPEN'&&next.issued>=p.halfOpenProbes)return {ok:false,state:s};
 const permit:BreakerPermit={id,scopeKey,generation:next.generation,probe:next.phase==='HALF_OPEN'};
 next={...next,scopeKey,lastTime:now,issued:next.issued+(permit.probe?1:0),pending:{...next.pending,[id]:permit},seen:[...next.seen,id]};
 return {ok:true,state:next,permit};
}
export function settleBreaker(s:BreakerState,p:BreakerPolicy,permit:BreakerPermit,outcome:'VERIFIED'|ProviderFailureCategory|'BLOCKED',now:number):BreakerState {
 if(!valid(p)||!integer(now)||now<s.lastTime||s.scopeKey!==permit.scopeKey||s.generation!==permit.generation)return s;
 const held=Object.hasOwn(s.pending,permit.id)?s.pending[permit.id]:undefined;
 if(!held||held.scopeKey!==permit.scopeKey||held.generation!==permit.generation||held.probe!==permit.probe)return s;
 const pending={...s.pending};delete pending[permit.id];
 const failures=s.failures.filter(at=>at>now-p.windowMs);
 const next={...s,lastTime:now,pending,failures};
 if(['LOCAL_BUDGET','LOCAL_QUEUE','BLOCKED','UNKNOWN','UNSUPPORTED','ENTITLEMENT'].includes(outcome)){
 // An ignored half-open outcome frees its probe entitlement without counting recovery.
 return {...next,issued:next.issued-(permit.probe?1:0)};
 }
 if(outcome==='VERIFIED'){
 if(!permit.probe)return next;
 const successes=s.successes+1;
 return successes===p.halfOpenProbes?{...next,phase:'CLOSED',trips:0,failures:[],issued:0,successes:0,generation:s.generation+1,pending:{}}:{...next,successes};
 }
 failures.push(now);
 if(!permit.probe&&failures.length<p.threshold)return next;
 const delay=Math.min(p.maxCooldownMs,p.cooldownMs*2**Math.min(s.trips,52));
 return {...next,phase:'OPEN',generation:s.generation+1,trips:s.trips+1,retryAt:now+delay,issued:0,successes:0,pending:{}};
}
