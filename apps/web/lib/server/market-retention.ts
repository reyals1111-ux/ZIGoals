import {settleMarketBreakers,type StoredPermit} from './market-breaker-storage';
import type {BreakerPolicy} from './market-breaker';
import type {AtomicMarketStorage} from './durable-market-account';
import {cancelUndispatched,settle,type BudgetState,type BudgetPeriod} from './market-budget-policy';
import type {ProviderAttempt} from './market-coordinator';
export type RetainedAttempt=ProviderAttempt & {endpoint?:string;breakers?:StoredPermit[];createdAt?:number;finishedAt?:number;outcome?:'success'|'failure';cancelled?:boolean;recovered?:boolean};
const MINUTE=60000;
/** Receipt lifetime is an internal retry contract, not a provider quota. Current
 * monthly credits are folded by priority; minute attempts stay uncompressed until
 * the entire minute window passed. UUIDs are never caller-selected or recreated. */
export async function maintainMarketAccount(tx:AtomicMarketStorage,input:BudgetState,month:BudgetPeriod,now:number,leaseMs:number,reservationMs:number,retryMs:number,breaker?:BreakerPolicy):Promise<BudgetState>{
 let state=input;
 const archived={month:month.id,credits:{interactive:0,refresh:0,optional:0,monitoring:0},attempts:input.archived?.attempts??0,lifetimeCredits:input.archived?.lifetimeCredits??0};
 if(input.archived?.month===month.id)archived.credits={...input.archived.credits};
 for(const [id,row] of Object.entries(state.reservations)){
  let result;
  // A lease and the hard HTTP deadline have both elapsed. A crashed sender is
  // settled conservatively as failure; charged credits are never refunded.
  if(row.status==='DISPATCHED'&&now-row.dispatchedAt!>=Math.max(leaseMs,10000))result=settle(state,id,'failure',now);
  if(['QUEUED','RESERVED','OWNED'].includes(row.status)&&now-row.reservedAt>=reservationMs)result=cancelUndispatched(state,id,now);
  if(result?.ok){state=result.state;const attempt=await tx.get<RetainedAttempt>(`attempt:${id}`);if(attempt){await settleMarketBreakers(tx,breaker,attempt.breakers,'UNKNOWN',now);await tx.put(`attempt:${id}`,{...attempt,finishedAt:now,...(row.status==='DISPATCHED'?{outcome:'failure',recovered:true}:{cancelled:true})});}}
 }
 const retained={...state.reservations};
 for(const [id,row] of Object.entries(retained)){
  if(!['SETTLED','CANCELLED'].includes(row.status)||now-(row.dispatchedAt??row.reservedAt)<MINUTE)continue;
  if(row.status==='SETTLED'){if(row.periods?.month.id===month.id)archived.credits[row.priority]+=row.cost;archived.attempts++;archived.lifetimeCredits+=row.cost;}
  delete retained[id];
 }
 state={...state,archived,reservations:retained};
 const buckets=await tx.get<number[]>('attempt-buckets')??[],keep:number[]=[];
 for(const bucket of buckets){
  if(now-(bucket+1)*MINUTE<retryMs){keep.push(bucket);continue;}
  const ids=await tx.get<string[]>(`attempt-bucket:${bucket}`)??[],pending:string[]=[];
  for(const id of ids){const attempt=await tx.get<RetainedAttempt>(`attempt:${id}`);if(state.reservations[id]||attempt&&(attempt.finishedAt===undefined||now-attempt.finishedAt<retryMs)){pending.push(id);continue;}await tx.delete(`attempt:${id}`);await tx.delete(`fallback:${id}`);}
  if(pending.length){await tx.put(`attempt-bucket:${bucket}`,pending);keep.push(bucket);}else await tx.delete(`attempt-bucket:${bucket}`);
 }
 if(keep.length!==buckets.length)await tx.put('attempt-buckets',keep);
 await tx.put('budget',state);return state;
}
export async function rememberAttempt(tx:AtomicMarketStorage,attempt:ProviderAttempt,now:number,endpoint:string){
 const bucket=Math.floor(now/MINUTE),buckets=await tx.get<number[]>('attempt-buckets')??[],ids=await tx.get<string[]>(`attempt-bucket:${bucket}`)??[];
 await tx.put(`attempt:${attempt.id}`,{...attempt,createdAt:now,endpoint});await tx.put(`attempt-bucket:${bucket}`,[...ids,attempt.id]);if(!buckets.includes(bucket))await tx.put('attempt-buckets',[...buckets,bucket]);
}
