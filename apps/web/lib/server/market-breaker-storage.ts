import type {AtomicMarketStorage} from './durable-market-account';
import {admitBreaker,settleBreaker,emptyBreaker,type BreakerPolicy,type BreakerState,type BreakerPermit,type BreakerScope} from './market-breaker';
import type {ProviderFailureCategory} from './provider-failure';
export type StoredPermit={key:string;scope:BreakerScope;permit:BreakerPermit};
export async function admitMarketBreakers(tx:AtomicMarketStorage,policy:BreakerPolicy|undefined,id:string,endpoint:string,now:number):Promise<StoredPermit[]|null>{
 if(!policy)return [];
 const scopes:BreakerScope[]=[{kind:'account-authentication'},{kind:'endpoint-availability',endpoint},{kind:'endpoint-integrity',endpoint}];
 const updates=[];
 for(const scope of scopes){const key='breaker:'+JSON.stringify(scope),state=await tx.get<BreakerState>(key)??emptyBreaker(),result=admitBreaker(state,policy,scope,id,now);if(!result.ok)return null;updates.push({key,scope,permit:result.permit!,state:result.state});}
 for(const update of updates)await tx.put(update.key,update.state);return updates.map(({key,scope,permit})=>({key,scope,permit}));
}
export async function settleMarketBreakers(tx:AtomicMarketStorage,policy:BreakerPolicy|undefined,permits:StoredPermit[]|undefined,outcome:'VERIFIED'|ProviderFailureCategory,now:number){
 if(!policy||!permits)return;
 for(const {key,scope,permit}of permits){const state=await tx.get<BreakerState>(key);if(!state)continue;
  const relevant=outcome==='VERIFIED'||scope.kind==='account-authentication'&&outcome==='AUTHENTICATION'||scope.kind==='endpoint-integrity'&&outcome==='MALFORMED'||scope.kind==='endpoint-availability'&&['THROTTLED','UPSTREAM_5XX','NETWORK','TIMEOUT'].includes(outcome);
  const next=settleBreaker(state,policy,permit,relevant?outcome:'UNKNOWN',now);
  // The durable attempt receipt owns replay eligibility. Settled IDs cannot return
  // to OWNED, so a separate unbounded breaker tombstone list is unnecessary.
  await tx.put(key,{...next,seen:next.seen.filter(id=>id!==permit.id)});
 }
}
