import type {AtomicMarketStorage} from './durable-market-account';
import {publicMarketWorkKey,type PublicMarketWork} from './market-coordinator';
import type {WorkState,WorkLease} from './market-work-fence';
import {loadCacheValue} from './market-cache-storage';
import {validateWorkEvidence,workEvidenceStale} from './market-evidence';
/** `client` is a hashed client bucket (market-client-limits.ts), never an address. */
type Follower={id:string;work:PublicMarketWork;owner:string;deadline:number;cancelToken?:string;client?:string};
export async function liveFollowers(tx:AtomicMarketStorage,now:number){
 const old=await tx.get<Follower[]>('followers')??[],live=old.filter(row=>now<row.deadline);if(live.length!==old.length)await tx.put('followers',live);return live;
}
/** `admitTombstone` (Session S) bounds new cancellation fences per day and client bucket; it runs only when a new fence
 * would be written, after the matching followers are removed and a replay is answered. */
export async function followerCommand(tx:AtomicMarketStorage,command:{action:'follow';work:PublicMarketWork;waitMs:number;cancelToken?:string}|{action:'cancel-followers';cancelToken:string}|{action:'poll'|'forget';id:string},now:number,admitTombstone?:()=>Promise<string|undefined>){
 const rows=await liveFollowers(tx,now);
 const cancelled=(await tx.get<{token:string;deadline:number}[]>('follower-cancellations')??[]).filter(row=>now<row.deadline);
 await tx.put('follower-cancellations',cancelled);
 if(command.action==='cancel-followers'){
  // The unpredictable request capability authorizes only follower removal. Never
  // mutate owner leases, attempts or evidence. Retain the fence for arrival races.
  await tx.put('followers',rows.filter(row=>row.cancelToken!==command.cancelToken));
  if(cancelled.some(row=>row.token===command.cancelToken))return {ok:true};
  if(cancelled.length>=128)return {ok:false,reason:'FOLLOWER_LIMIT'};
  const refused=await admitTombstone?.();if(refused)return {ok:false,reason:refused};
  await tx.put('follower-cancellations',[...cancelled,{token:command.cancelToken,deadline:now+30000}]);return {ok:true};
 }
 if(command.action==='follow'&&command.cancelToken&&cancelled.some(row=>row.token===command.cancelToken))return {ok:false,reason:'WAITER_CANCELLED'};
 if(command.action==='forget'){await tx.put('followers',rows.filter(row=>row.id!==command.id));return {ok:true};}
 const existing=command.action==='poll'?rows.find(row=>row.id===command.id):undefined;
 if(command.action==='poll'&&!existing)return {ok:false,reason:'FOLLOWER_EXPIRED'};
 const work=command.action==='follow'?command.work:existing!.work,key=publicMarketWorkKey(work),state=await tx.get<WorkState<unknown>>(`work:${key}`);
 const evidence=state?.evidence?validateWorkEvidence(work,await loadCacheValue(tx,state.evidence.value),now):null;
 const value=work.operation==='quote'?{quote:evidence}:{value:evidence};
 const retire=async()=>{if(existing)await tx.put('followers',rows.filter(row=>row.id!==existing.id));};
 if(existing&&state?.lease?.token!==existing.owner){await retire();return {ok:false,reason:'FENCED',...value};}
 if(state?.evidence?.complete&&state.evidence.generation===state.lease?.generation){await retire();return {ok:true,status:'CACHE_HIT',...value};}
 if(!state?.lease||now>=Math.min(state.lease.deadline,state.lease.expiresAt)){await retire();return {ok:false,reason:'FOLLOWER_EXPIRED',...value};}
 if(existing)return {ok:true,status:'WAITING',id:existing.id,...value};
 if(rows.length>=128||rows.filter(row=>publicMarketWorkKey(row.work)===key).length>=8)return {ok:false,reason:'FOLLOWER_LIMIT',...value};
 if(command.action!=='follow')return {ok:false,reason:'FOLLOWER_EXPIRED'};
 const follower={id:crypto.randomUUID(),work,...(command.cancelToken?{cancelToken:command.cancelToken}:{}),owner:state.lease.token,deadline:Math.min(now+command.waitMs,state.lease.deadline,state.lease.expiresAt)};
 await tx.put('followers',[...rows,follower]);return {ok:true,status:'WAITING',id:follower.id,...value};
}
type Cancellation={token:string;deadline:number};
/** Registers followers of waiting works in the caller's transaction, with `follow`'s checks: the cancellation fence,
 * 128 followers in all, 8 per work, and a client bucket's share. */
export async function registerFollowers(tx:AtomicMarketStorage,items:{index:number;work:PublicMarketWork;lease:WorkLease}[],now:number,{waitMs,cancelToken,client,clientShare}:{waitMs:number;cancelToken?:string;client?:string;clientShare:number}){
 const rows=await liveFollowers(tx,now),out:Record<number,{id?:string;reason?:string}>={};
 const cancelled=(await tx.get<Cancellation[]>('follower-cancellations')??[]).filter(row=>now<row.deadline);
 const next=[...rows];
 for(const {index,work,lease} of items){
  if(cancelToken&&cancelled.some(row=>row.token===cancelToken)){out[index]={reason:'WAITER_CANCELLED'};continue;}
  const key=publicMarketWorkKey(work);
  if(next.length>=128||next.filter(row=>publicMarketWorkKey(row.work)===key).length>=8||client&&next.filter(row=>row.client===client).length>=clientShare){out[index]={reason:'FOLLOWER_LIMIT'};continue;}
  const follower:Follower={id:crypto.randomUUID(),work,...(cancelToken?{cancelToken}:{}),...(client?{client}:{}),owner:lease.token,deadline:Math.min(now+waitMs,lease.deadline,lease.expiresAt)};
  next.push(follower);out[index]={id:follower.id};
 }
 await tx.put('followers',next);return out;
}
/** Polls many followers at once. A waiting follower changes nothing, so a poll that only waits writes no row; a
 * terminal one (published, fenced, expired or cancelled) is retired, which frees its place at once. Published
 * evidence wins over an elapsed registration, so a publication just before a follower's last poll is never
 * reported as a timeout. */
export async function pollFollowers(tx:AtomicMarketStorage,items:{id:string;work:PublicMarketWork}[],now:number,cancelToken?:string){
 const stored=await tx.get<Follower[]>('followers')??[],retired=new Set<string>();
 const cancelled=cancelToken&&(await tx.get<Cancellation[]>('follower-cancellations')??[]).some(row=>row.token===cancelToken&&now<row.deadline);
 const results=[];
 for(const {id,work} of items){
  const row=stored.find(entry=>entry.id===id),state=await tx.get<WorkState<unknown>>(`work:${publicMarketWorkKey(work)}`);
  const evidence=state?.evidence?validateWorkEvidence(work,await loadCacheValue(tx,state.evidence.value),now):null;
  const value=work.operation==='quote'?{quote:evidence}:{value:evidence},terminal=(result:Record<string,unknown>)=>{retired.add(id);results.push({...result,...value});};
  const published=!!state?.evidence?.complete&&state.evidence.generation===state.lease?.generation;
  if(row&&state?.lease?.token!==row.owner)terminal({ok:false,reason:'FENCED'});
  else if(published&&(row||!workEvidenceStale(work,evidence,now)))terminal({ok:true,status:'CACHE_HIT'});
  else if(cancelled)terminal({ok:false,reason:'WAITER_CANCELLED'});
  else if(!row||now>=row.deadline||!state?.lease||now>=Math.min(state.lease.deadline,state.lease.expiresAt))terminal({ok:false,reason:'FOLLOWER_EXPIRED'});
  else results.push({ok:true,status:'WAITING',id,...value});
 }
 // Unchanged when nothing was retired, so the command buffer drops the write. Lapsed registrations are pruned by
 // the next registration or forget.
 if(retired.size)await tx.put('followers',stored.filter(row=>!retired.has(row.id)));
 return results;
}
export async function forgetFollowers(tx:AtomicMarketStorage,ids:string[],now:number){
 const rows=await liveFollowers(tx,now);await tx.put('followers',rows.filter(row=>!ids.includes(row.id)));return {ok:true};
}
