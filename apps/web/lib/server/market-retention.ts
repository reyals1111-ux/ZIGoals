import {settleMarketBreakers,type StoredPermit} from './market-breaker-storage';
import type {BreakerPolicy} from './market-breaker';
import type {AtomicMarketStorage} from './durable-market-account';
import {cancelUndispatched,settle,type BudgetState,type BudgetPeriod} from './market-budget-policy';
import {publicMarketWorkKey,type ProviderAttempt} from './market-coordinator';
import type {WorkState} from './market-work-fence';
export type RetainedAttempt=ProviderAttempt & {endpoint?:string;breakers?:StoredPermit[];createdAt?:number;finishedAt?:number;outcome?:'success'|'failure';cancelled?:boolean;recovered?:boolean;pairFailures?:string[]};
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
  const receipt=await tx.get<RetainedAttempt>(`attempt:${id}`);
  // A lease and the hard HTTP deadline have both elapsed. A crashed sender is
  // settled conservatively as failure; charged credits are never refunded.
  if(row.status==='DISPATCHED'&&now-row.dispatchedAt!>=Math.max(leaseMs,10000))result=settle(state,id,'failure',now);
  if(['QUEUED','RESERVED','OWNED'].includes(row.status)&&(now-row.reservedAt>=reservationMs||row.periods&&row.periods.month.id!==month.id||row.status==='OWNED'&&now>=row.ownershipUntil!||receipt?.associations.some(a=>now>=Math.min(a.lease.deadline,a.lease.expiresAt))))result=cancelUndispatched(state,id,now);
  if(result?.ok){state=result.state;const attempt=await tx.get<RetainedAttempt>(`attempt:${id}`);if(attempt){if(row.status!=='DISPATCHED')await releaseCancelledWork(tx,attempt,now);await settleMarketBreakers(tx,breaker,attempt.breakers,'UNKNOWN',now);await tx.put(`attempt:${id}`,{...attempt,finishedAt:now,...(row.status==='DISPATCHED'?{outcome:'failure',recovered:true}:{cancelled:true})});}}
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

/** Cancellation releases only this exact owner, retaining its generation fence and
 * original cached evidence. It never releases a successor or refunds a send. */
export async function releaseCancelledWork(tx:AtomicMarketStorage,attempt:ProviderAttempt,now:number){
 for(const association of attempt.associations){const key=`work:${publicMarketWorkKey(association.work)}`,state=await tx.get<WorkState<unknown>>(key);if(state?.lease?.token===association.lease.token&&state.lease.fence===association.lease.fence)await tx.put(key,{...state,lastTime:now,lease:{...state.lease,expiresAt:Math.min(state.lease.expiresAt,now)}});}
}
