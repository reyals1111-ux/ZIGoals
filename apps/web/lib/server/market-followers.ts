import type {AtomicMarketStorage} from './durable-market-account';
import {publicMarketWorkKey,type PublicMarketWork} from './market-coordinator';
import type {WorkState} from './market-work-fence';
import {loadCacheValue} from './market-cache-storage';
import {validateWorkEvidence} from './market-evidence';
type Follower={id:string;work:PublicMarketWork;owner:string;deadline:number};
export async function liveFollowers(tx:AtomicMarketStorage,now:number){
 const old=await tx.get<Follower[]>('followers')??[],live=old.filter(row=>now<row.deadline);if(live.length!==old.length)await tx.put('followers',live);return live;
}
export async function followerCommand(tx:AtomicMarketStorage,command:{action:'follow';work:PublicMarketWork;waitMs:number}|{action:'poll'|'forget';id:string},now:number){
 const rows=await liveFollowers(tx,now);
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
 const follower={id:crypto.randomUUID(),work,owner:state.lease.token,deadline:Math.min(now+command.waitMs,state.lease.deadline,state.lease.expiresAt)};
 await tx.put('followers',[...rows,follower]);return {ok:true,status:'WAITING',id:follower.id,...value};
}
