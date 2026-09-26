import {liveFollowers,followerCommand} from './market-followers';
import {pairBlocked} from './market-pair-breaker';
import {z} from 'zod';
import {admitMarketBreakers,settleMarketBreakers} from './market-breaker-storage';
import {maintainMarketAccount,rememberAttempt,releaseCancelledWork,type RetainedAttempt} from './market-retention';
import {publicMarketWorkSchema,publicMarketWorkKey,createProviderAttempt,publishAttemptWork,type ProviderAttempt} from './market-coordinator';
import {emptyBudgetState,validTime,nextReservedDispatch,enqueue,reserve,ownDispatch,markDispatched,settle,cancelUndispatched,type BudgetState} from './market-budget-policy';
import {acquireWork,emptyWorkState,type WorkState} from './market-work-fence';
import type {MarketQuote} from '../market-quotes';
import {validateWorkEvidence,workEvidenceStale,workEvidenceTime} from './market-evidence';
import {loadCacheValue,storeCacheValue,removeCacheValue,evictMarketWork,cacheValueBytes} from './market-cache-storage';
const uint=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),positive=uint.positive();
const capacity=z.object({minute:uint,monthly:uint}).strict();
const category=z.enum(['THROTTLED','UPSTREAM_5XX','TIMEOUT','NETWORK','AUTHENTICATION','ENTITLEMENT','MALFORMED','UNSUPPORTED','LOCAL_BUDGET','LOCAL_QUEUE','UNKNOWN']);
const chargedOperation=z.enum(['catalog','history','insights','token','rwa']);
const configSchema=z.object({policy:z.object({providerMinuteLimit:positive,providerMonthlyLimit:positive,operating:capacity,monitoringReserve:capacity,monitoringMaximum:capacity,optionalCeiling:capacity,concurrent:positive,queueLimit:positive,reservationMs:positive,ownershipMs:positive}).strict(),month:z.object({id:z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),start:uint,end:uint}).strict().optional(),calendar:z.object({timeZone:z.literal('UTC'),confirmed:z.literal(true)}).strict().optional(),operationCosts:z.partialRecord(chargedOperation,positive).optional(),quoteCost:positive,leaseMs:positive.max(60000),maxAttempts:positive.max(128),maxWorks:positive.max(64),maxCacheBytes:positive.max(32*1024*1024).optional(),retryRetentionMs:positive.min(60000).max(86400000).optional(),accountThrottle:z.object({distinctEndpoints:positive.min(2).max(8),windowMs:positive.max(60000)}).strict().optional(),breaker:z.object({threshold:positive.max(100),windowMs:positive.max(3600000),cooldownMs:positive,maxCooldownMs:positive,halfOpenProbes:positive.max(8)}).strict().refine(p=>p.maxCooldownMs>=p.cooldownMs).optional()}).strict().refine(c=>Boolean(c.month)!==Boolean(c.calendar),'Exactly one confirmed accounting period source is required.').refine(c=>!c.accountThrottle||!!c.breaker,'Throttle correlation requires a breaker policy.');
const work=publicMarketWorkSchema;
const lease=z.object({token:z.string().min(1).max(100),generation:positive,fence:positive,acquiredAt:uint,deadline:uint,expiresAt:uint}).strict();
const id=z.string().uuid();
const commandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('acquire'),work}).strict(),
 z.object({action:z.literal('follow'),work,waitMs:positive.max(1000),cancelToken:id.optional()}).strict(),
 z.object({action:z.literal('cancel-followers'),cancelToken:id}).strict(),
 ...(['poll','forget'] as const).map(action=>z.object({action:z.literal(action),id}).strict()),
 z.object({action:z.literal('enqueue-read'),operation:chargedOperation,parentId:id.optional(),associations:z.array(z.object({work,lease}).strict()).min(1).max(64).optional()}).strict(),
 z.object({action:z.literal('enqueue'),priority:z.enum(['interactive','refresh','optional','monitoring']),kind:z.enum(['request','retry','fallback']),associations:z.array(z.object({work,lease}).strict()).min(1).max(64)}).strict(),
 ...(['reserve','own','dispatch','cancel'] as const).map(action=>z.object({action:z.literal(action),id}).strict()),
 z.object({action:z.literal('settle'),id,outcome:z.enum(['success','failure']),category:category.optional(),pairFailures:z.array(work).max(64).optional()}).strict(),
 z.object({action:z.literal('publish'),id,work,quote:z.unknown()}).strict(),
 z.object({action:z.literal('publish-data'),id,work,value:z.unknown()}).strict(),
 z.object({action:z.literal('inspect')}).strict(),
]);
export interface AtomicMarketStorage {get<T>(key:string):Promise<T|undefined>;put(key:string,value:unknown):Promise<void>;delete(key:string):Promise<unknown>;transaction<T>(fn:(transaction:AtomicMarketStorage)=>Promise<T>):Promise<T>}
/** Account authority shared by quote publication and all supported endpoint reads. Each
 * operation commits its budget/lease mutation before returning permission. There is
 * no provider I/O here. Maintenance retains monthly charges and replay receipts;
 * expired dispatched work is settled conservatively without refund. */
export class DurableMarketAccount {
 constructor(private storage:AtomicMarketStorage,private clock:()=>number,private rawConfig:string|undefined){}
 async apply(raw:unknown):Promise<Record<string,unknown>>{
  let config:z.infer<typeof configSchema>,command:z.infer<typeof commandSchema>;
  try{config=configSchema.parse(JSON.parse(this.rawConfig??'null'));}catch{return {ok:false,reason:'POLICY_UNAVAILABLE'};}
  try{command=commandSchema.parse(raw);}catch{return {ok:false,reason:'MALFORMED'};}
  try{return await this.storage.transaction(async tx=>{
   const now=this.clock(),original=await tx.get<BudgetState>('budget')??emptyBudgetState(),lastTime=await tx.get<number>('last-time')??0;
   if(!Number.isSafeInteger(now)||now<Math.max(original.lastTime,lastTime))return {ok:false,reason:'CLOCK_OR_PERIOD'};
   await tx.put('last-time',now);
   const date=new Date(now),month=config.month??{id:date.toISOString().slice(0,7),start:Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1),end:Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1)};
   if(!validTime(original,{month},now))return {ok:false,reason:'CLOCK_OR_PERIOD'};
   const budget=await maintainMarketAccount(tx,original,month,now,config.leaseMs,config.policy.reservationMs,config.retryRetentionMs??3600000,config.breaker);
   const followers=await liveFollowers(tx,now);
   if(command.action==='follow'||command.action==='poll'||command.action==='forget'||command.action==='cancel-followers')return followerCommand(tx,command,now);
   const periods={month},index=await tx.get<string[]>('work-index')??[];
   if(command.action==='inspect'){const rows=Object.values(budget.reservations);return {ok:true,followers:followers.length,attempts:rows.length,archivedAttempts:budget.archived?.attempts??0,workKeys:index.length,queued:rows.filter(r=>r.status==='QUEUED').length,dispatched:rows.filter(r=>r.status==='DISPATCHED').length,currentPeriodCredits:Object.values(budget.archived?.credits??{}).reduce((sum,n)=>sum+n,0)+rows.filter(r=>(r.status==='DISPATCHED'||r.status==='SETTLED')&&r.periods?.month.id===month.id).reduce((sum,r)=>sum+r.cost,0),chargedCredits:(budget.archived?.lifetimeCredits??0)+rows.filter(r=>r.status==='DISPATCHED'||r.status==='SETTLED').reduce((sum,r)=>sum+r.cost,0)};}
   if(command.action==='acquire'){
    const key=publicMarketWorkKey(command.work),current=await tx.get<WorkState<unknown>>(`work:${key}`)??emptyWorkState<unknown>();
    const value=current.evidence?validateWorkEvidence(command.work,await loadCacheValue(tx,current.evidence.value),now):null;
    const evidence=command.work.operation==='quote'?{quote:value}:{value};
    if(current.evidence?.complete&&!workEvidenceStale(command.work,value,now)){await tx.put(`work:${key}`,{...current,lastTime:now});return {ok:true,status:'CACHE_HIT',...evidence};}
    if(await pairBlocked(tx,config.breaker,command.work,now))return {ok:false,reason:'PAIR_BREAKER_OPEN',...evidence};
    const capacity=await evictMarketWork(tx,index,now,key,0,config.maxCacheBytes??16*1024*1024,config.maxWorks);if(!capacity.ok)return {ok:false,reason:'CACHE_CAPACITY'};
    const next=acquireWork(current,crypto.randomUUID(),now,now+config.leaseMs,now+config.leaseMs);
    if(!next)return {ok:true,status:'WAITING',retryAt:current.lease?.expiresAt,...evidence,degraded:true};
    await tx.put(`work:${key}`,next);if(!capacity.index.includes(key))await tx.put('work-index',[...capacity.index,key]);return {ok:true,status:'OWNER',lease:next.lease,...evidence,degraded:!!current.evidence};
   }
   if(command.action==='enqueue-read'){
    const cost=config.operationCosts?.[command.operation];if(!cost)return {ok:false,reason:'POLICY_UNAVAILABLE'};
    if(Object.keys(budget.reservations).length>=config.maxAttempts)return {ok:false,reason:'RETENTION_CAPACITY'};
    if(command.parentId&&!command.associations||command.parentId&&command.operation!=='token')return {ok:false,reason:'MALFORMED'};
    if(command.parentId&&command.associations){
     const parent=await tx.get<ProviderAttempt>(`attempt:${command.parentId}`),row=budget.reservations[command.parentId];
     if(!parent||row?.status!=='SETTLED'||row.outcome!=='failure')return {ok:false,reason:'INVALID_TRANSITION'};
     if(await tx.get(`fallback:${command.parentId}`))return {ok:false,reason:'DUPLICATE_OPERATION'};
     for(const a of command.associations){const current=await tx.get<WorkState<MarketQuote>>(`work:${publicMarketWorkKey(a.work)}`);if(a.work.operation!=='quote'||a.work.pair.marketRef.kind!=='coin'||a.work.pair.marketRef.id!=='zignaly'||!parent.associations.some(p=>publicMarketWorkKey(p.work)===publicMarketWorkKey(a.work)&&JSON.stringify(p.lease)===JSON.stringify(a.lease))||JSON.stringify(current?.lease)!==JSON.stringify(a.lease)||now>=Math.min(a.lease.deadline,a.lease.expiresAt))return {ok:false,reason:'FENCED'};}
    }
    if(command.associations&&!command.parentId){
     if(new Set(command.associations.map(a=>publicMarketWorkKey(a.work))).size!==command.associations.length)return {ok:false,reason:'MALFORMED'};
     for(const a of command.associations){if(a.work.operation!==command.operation)return {ok:false,reason:'MALFORMED'};const current=await tx.get<WorkState<unknown>>(`work:${publicMarketWorkKey(a.work)}`);if(JSON.stringify(current?.lease)!==JSON.stringify(a.lease)||now>=Math.min(a.lease.deadline,a.lease.expiresAt))return {ok:false,reason:'FENCED'};const owner=await tx.get<{token:string}>(`owner:${publicMarketWorkKey(a.work)}`);if(owner?.token===a.lease.token)return {ok:false,reason:'DUPLICATE_OPERATION'};}
    }
    const attempt:ProviderAttempt={id:crypto.randomUUID(),reservation:{id:'',cost,priority:command.operation==='catalog'?'refresh':command.operation==='insights'?'optional':'interactive',kind:command.operation==='token'?'fallback':'request'},associations:command.associations??[]};attempt.reservation.id=attempt.id;
    const result=enqueue(budget,config.policy,attempt.reservation,now);if(!result.ok)return {ok:false,reason:result.reason};
    await tx.put('budget',result.state);await rememberAttempt(tx,attempt,now,`${command.operation}:${command.associations?.[0]?.work.operation==='catalog'?command.associations[0].work.kind:'shared'}`);if(command.parentId)await tx.put(`fallback:${command.parentId}`,attempt.id);else for(const a of attempt.associations)await tx.put(`owner:${publicMarketWorkKey(a.work)}`,{token:a.lease.token,id:attempt.id});return {ok:true,id:attempt.id};
   }
   if(command.action==='enqueue'){
    if(new Set(command.associations.map(a=>publicMarketWorkKey(a.work))).size!==command.associations.length)return {ok:false,reason:'MALFORMED'};
    if(Object.keys(budget.reservations).length>=config.maxAttempts)return {ok:false,reason:'RETENTION_CAPACITY'};
    for(const association of command.associations){const current=await tx.get<WorkState<MarketQuote>>(`work:${publicMarketWorkKey(association.work)}`);if(!current?.lease||JSON.stringify(current.lease)!==JSON.stringify(association.lease)||now>=Math.min(current.lease.deadline,current.lease.expiresAt))return {ok:false,reason:'FENCED'};}
    for(const association of command.associations){const owner=await tx.get<{generation:number}>(`owner:${publicMarketWorkKey(association.work)}`);if(owner?.generation===association.lease.generation)return {ok:false,reason:'DUPLICATE_OPERATION'};}
    const kinds=new Set(command.associations.map(a=>a.work.operation==='quote'?a.work.pair.marketRef.kind:''));if(kinds.size!==1)return {ok:false,reason:'MALFORMED'};const cost=kinds.has('rwa')?config.operationCosts?.rwa:config.quoteCost;if(!cost)return {ok:false,reason:'POLICY_UNAVAILABLE'};
    const attempt=createProviderAttempt({id:crypto.randomUUID(),cost,priority:command.priority,kind:command.kind},command.associations);
    const result=enqueue(budget,config.policy,attempt.reservation,now);if(!result.ok)return {ok:false,reason:result.reason};
    await tx.put('budget',result.state);await rememberAttempt(tx,attempt,now,kinds.has('rwa')?'quote:rwa':'quote:coin');for(const association of command.associations)await tx.put(`owner:${publicMarketWorkKey(association.work)}`,{generation:association.lease.generation,id:attempt.id});return {ok:true,id:attempt.id};
   }
   const attempt=await tx.get<RetainedAttempt>(`attempt:${command.id}`);if(!attempt)return {ok:false,reason:'INVALID_TRANSITION'};
   if(command.action==='publish'||command.action==='publish-data'){
    if(command.action==='publish'&&command.work.operation!=='quote'||command.action==='publish-data'&&command.work.operation==='quote')return {ok:false,reason:'MALFORMED'};
    let value:unknown;try{value=validateWorkEvidence(command.work,command.action==='publish'?command.quote:command.value,now);}catch{return {ok:false,reason:'MALFORMED'};}
    const workKey=publicMarketWorkKey(command.work),key=`work:${workKey}`,state=await tx.get<WorkState<unknown>>(key)??emptyWorkState<unknown>();
    const previous=state.evidence?await loadCacheValue(tx,state.evidence.value):null;if(previous&&workEvidenceTime(value)<workEvidenceTime(previous))return {ok:false,reason:'STALE_EVIDENCE'};
    const association=attempt.associations.find(a=>publicMarketWorkKey(a.work)===workKey);if(state.evidence?.complete&&association?.lease.token===state.lease?.token&&state.evidence.generation===association?.lease.generation&&JSON.stringify(previous)===JSON.stringify(value))return {ok:true,replay:true};
    const result=publishAttemptWork(attempt,budget,command.work,state,value,now,now);if(!result.ok)return {ok:false,reason:result.reason??'FENCED'};
    const bytes=cacheValueBytes(value)-(state.evidence?cacheValueBytes(state.evidence.value):0);
    const capacity=await evictMarketWork(tx,index,now,workKey,bytes,config.maxCacheBytes??16*1024*1024,config.maxWorks);if(!capacity.ok)return {ok:false,reason:'CACHE_CAPACITY'};
    if(state.evidence)await removeCacheValue(tx,state.evidence.value);
    if(command.work.operation!=='quote')result.state.evidence!.value=await storeCacheValue(tx,workKey,result.state.lease!.generation,value);
    await tx.put(key,result.state);return {ok:true};
   }
   if(command.action==='own'||command.action==='dispatch'){for(const association of attempt.associations){const current=await tx.get<WorkState<MarketQuote>>(`work:${publicMarketWorkKey(association.work)}`);if(!current?.lease||current.lease.token!==association.lease.token||current.lease.fence!==association.lease.fence||now>=Math.min(current.lease.deadline,current.lease.expiresAt))return {ok:false,reason:'FENCED'};}}
   if(command.action==='cancel'&&(budget.reservations[command.id]?.status==='CANCELLED'||!budget.reservations[command.id]&&attempt.cancelled))return {ok:true,replay:true};
   if(command.action==='settle'&&command.pairFailures){if(command.outcome==='failure'&&command.category!=='MALFORMED'||new Set(command.pairFailures.map(publicMarketWorkKey)).size!==command.pairFailures.length||command.pairFailures.some(w=>w.operation==='catalog'||!attempt.associations.some(a=>publicMarketWorkKey(a.work)===publicMarketWorkKey(w))))return {ok:false,reason:'MALFORMED'};}
   if(command.action==='settle'){const previous=budget.reservations[command.id];if(previous?.status==='SETTLED'&&previous.outcome===command.outcome||!previous&&attempt.outcome===command.outcome)return JSON.stringify(attempt.pairFailures??[])===JSON.stringify((command.pairFailures??[]).map(publicMarketWorkKey).sort())?{ok:true,replay:true}:{ok:false,reason:'INVALID_TRANSITION'};}
   const result=command.action==='reserve'?reserve(budget,config.policy,periods,attempt.reservation,now):command.action==='own'?ownDispatch(budget,config.policy,periods,command.id,now):command.action==='dispatch'?markDispatched(budget,config.policy,periods,command.id,now):command.action==='settle'?settle(budget,command.id,command.outcome,now):cancelUndispatched(budget,command.id,now);
   if(result.ok){
    if(command.action==='own'&&nextReservedDispatch(budget,config.policy,periods,now)!==command.id)return {ok:false,reason:'QUEUE_WAIT'};
    if(command.action==='dispatch'){const permits=await admitMarketBreakers(tx,config.breaker,command.id,attempt.endpoint??'quote:coin',now,attempt.associations.map(a=>a.work));if(!permits)return {ok:false,reason:'BREAKER_OPEN'};await tx.put(`attempt:${command.id}`,{...attempt,breakers:permits});}
    await tx.put('budget',result.state);
    if(command.action==='cancel')await releaseCancelledWork(tx,attempt,now);
    if(command.action==='settle'||command.action==='cancel')await settleMarketBreakers(tx,config.breaker,attempt.breakers,command.action==='settle'?(command.outcome==='success'?'VERIFIED':command.category??'UNKNOWN'):'UNKNOWN',now,{endpoint:attempt.endpoint,accountThrottle:config.accountThrottle,pairFailures:command.action==='settle'?command.pairFailures:undefined});
    if(command.action==='settle'||command.action==='cancel')await tx.put(`attempt:${command.id}`,{...attempt,finishedAt:now,...(command.action==='settle'?{outcome:command.outcome,pairFailures:(command.pairFailures??[]).map(publicMarketWorkKey).sort()}:{cancelled:true})});}return {ok:result.ok,...(result.reason?{reason:result.reason}:{})};
  });}catch{return {ok:false,reason:'STORAGE_UNAVAILABLE'};}
 }
}
