import type {AtomicMarketStorage} from './durable-market-account';
import {publicMarketWorkKey,type PublicMarketWork} from './market-coordinator';
import type {BreakerPolicy,BreakerScope,BreakerState} from './market-breaker';
export const workEndpoint=(work:PublicMarketWork)=>work.operation==='quote'?`quote:${work.pair.marketRef.kind}`:work.operation==='catalog'?`catalog:${work.kind}`:`${work.operation}:shared`;
export const pairScope=(endpoint:string,work:PublicMarketWork):BreakerScope=>({kind:'pair',workKey:JSON.stringify([endpoint,publicMarketWorkKey(work)])});
export const breakerKey=(scope:BreakerScope)=>'breaker:'+JSON.stringify(scope);
/** This read never issues a recovery permit. Admission after a real budget hold
 * remains authoritative; a warm cache may still serve original evidence. */
export async function pairBlocked(tx:AtomicMarketStorage,policy:BreakerPolicy|undefined,work:PublicMarketWork,now:number){
 if(!policy||work.operation==='catalog')return false;
 const state=await tx.get<BreakerState>(breakerKey(pairScope(workEndpoint(work),work)));
 return !!state&&(state.phase==='OPEN'&&now<state.retryAt||state.phase==='HALF_OPEN'&&state.issued>=policy.halfOpenProbes);
}
/** Pair health survives cache eviction. Closed, quiet scopes can retire after the
 * complete evidence window; open/probing scopes retain their recovery fence.
 * Exhaustion denies new pair admission instead of deleting active health. */
export async function retainPairScopes(tx:AtomicMarketStorage,policy:BreakerPolicy,scopes:BreakerScope[],now:number){
 const index=await tx.get<string[]>('pair-breaker-index')??[],keep:string[]=[];
 for(const key of index){const state=await tx.get<BreakerState>(key);if(!state)continue;if(state.phase==='CLOSED'&&!Object.keys(state.pending).length&&now-state.lastTime>=policy.windowMs)await tx.delete(key);else keep.push(key);}
 const next=[...new Set([...keep,...scopes.filter(s=>s.kind==='pair').map(breakerKey)])];
 await tx.put('pair-breaker-index',keep);if(next.length>256)return false;await tx.put('pair-breaker-index',next);return true;
}
