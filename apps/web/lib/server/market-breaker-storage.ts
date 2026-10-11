import {pairScope,breakerKey,retainPairScopes} from './market-pair-breaker';
import type {PublicMarketWork} from './market-coordinator';
import type {AtomicMarketStorage} from './durable-market-account';
import {admitBreaker,settleBreaker,emptyBreaker,type BreakerPolicy,type BreakerState,type BreakerPermit,type BreakerScope} from './market-breaker';
import type {ProviderFailureCategory} from './provider-failure';
export type StoredPermit={key:string;scope:BreakerScope;permit:BreakerPermit};
export async function admitMarketBreakers(tx:AtomicMarketStorage,policy:BreakerPolicy|undefined,id:string,endpoint:string,now:number,works:PublicMarketWork[]=[]):Promise<StoredPermit[]|null>{
 if(!policy)return [];
 const scopes:BreakerScope[]=[{kind:'account-authentication'},{kind:'account-throttle'},{kind:'endpoint-availability',endpoint},{kind:'endpoint-integrity',endpoint},...works.filter(w=>w.operation!=='catalog').map(w=>pairScope(endpoint,w))];
 if(!await retainPairScopes(tx,policy,scopes,now))return null;
 const updates=[];
 for(const scope of scopes){const key=breakerKey(scope),state=await tx.get<BreakerState>(key)??emptyBreaker(),result=admitBreaker(state,policy,scope,id,now);if(!result.ok)return null;updates.push({key,scope,permit:result.permit!,state:result.state});}
 for(const update of updates)await tx.put(update.key,update.state);return updates.map(({key,scope,permit})=>({key,scope,permit}));
}
export async function settleMarketBreakers(tx:AtomicMarketStorage,policy:BreakerPolicy|undefined,permits:StoredPermit[]|undefined,outcome:'VERIFIED'|ProviderFailureCategory,now:number,{endpoint,accountThrottle,pairFailures=[]}:{endpoint?:string;pairFailures?:PublicMarketWork[];accountThrottle?:{distinctEndpoints:number;windowMs:number}}={}){
 if(!policy||!permits)return;
 // A single 429 is endpoint evidence only. Promotion is an explicit synthetic/
 // owner policy requiring distinct provider endpoints inside a bounded window.
 // Keep only the latest observation per endpoint, never attempt IDs or bodies.
 let correlated=false;
 if(accountThrottle&&endpoint&&outcome==='THROTTLED'){
  const prior=await tx.get<{endpoint:string;at:number}[]>('throttle-observations')??[];
  const observations=[...prior.filter(row=>row.at>now-accountThrottle.windowMs&&row.endpoint!==endpoint),{endpoint,at:now}].slice(-16);
  await tx.put('throttle-observations',observations);correlated=new Set(observations.map(row=>row.endpoint)).size>=accountThrottle.distinctEndpoints;
 }
 for(const {key,scope,permit}of permits){const state=await tx.get<BreakerState>(key);if(!state)continue;
  const relevant=outcome==='VERIFIED'||scope.kind==='account-throttle'&&outcome==='THROTTLED'&&correlated||scope.kind==='account-authentication'&&outcome==='AUTHENTICATION'||scope.kind==='endpoint-integrity'&&outcome==='MALFORMED'&&!pairFailures.length||scope.kind==='endpoint-availability'&&['THROTTLED','UPSTREAM_5XX','NETWORK','TIMEOUT'].includes(outcome);
  const pairFailed=scope.kind==='pair'&&endpoint&&pairFailures.some(work=>JSON.stringify(pairScope(endpoint,work))===JSON.stringify(scope));
  const evidence=scope.kind==='pair'?(pairFailed?'MALFORMED':outcome==='VERIFIED'?'VERIFIED':'UNKNOWN'):(relevant?outcome:'UNKNOWN');
  const next=settleBreaker(state,policy,permit,evidence,now);
  // The durable attempt receipt owns replay eligibility. Settled IDs cannot return
  // to OWNED, so a separate unbounded breaker tombstone list is unnecessary.
  await tx.put(key,{...next,seen:next.seen.filter(id=>id!==permit.id)});
  if(scope.kind==='account-throttle'&&permit.probe&&outcome==='VERIFIED'&&next!==state&&next.phase==='CLOSED')await tx.delete('throttle-observations');
 }
}
