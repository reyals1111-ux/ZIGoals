import {z} from 'zod';
import {publicMarketWorkSchema,publicMarketWorkKey,createProviderAttempt,publishAttemptWork,type ProviderAttempt} from './market-coordinator';
import {emptyBudgetState,enqueue,reserve,ownDispatch,markDispatched,settle,cancelUndispatched,type BudgetState} from './market-budget-policy';
import {acquireWork,emptyWorkState,type WorkState} from './market-work-fence';
import {quoteIsStale,type MarketQuote} from '../market-quotes';
import {marketPairEnvelope} from './market-pair-result';
const uint=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),positive=uint.positive();
const capacity=z.object({minute:uint,monthly:uint}).strict();
const configSchema=z.object({policy:z.object({providerMinuteLimit:positive,providerMonthlyLimit:positive,operating:capacity,monitoringReserve:capacity,monitoringMaximum:capacity,optionalCeiling:capacity,concurrent:positive,queueLimit:positive,reservationMs:positive,ownershipMs:positive}).strict(),month:z.object({id:z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),start:uint,end:uint}).strict(),quoteCost:positive,leaseMs:positive.max(60000),maxAttempts:positive.max(128),maxWorks:positive.max(64)}).strict();
const work=publicMarketWorkSchema.refine(w=>w.operation==='quote','Only quote persistence is supported in this isolated adapter.');
const lease=z.object({token:z.string().min(1).max(100),generation:positive,fence:positive,acquiredAt:uint,deadline:uint,expiresAt:uint}).strict();
const id=z.string().uuid();
const commandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('acquire'),work}).strict(),
 z.object({action:z.literal('enqueue'),priority:z.enum(['interactive','refresh','optional','monitoring']),kind:z.enum(['request','retry','fallback']),associations:z.array(z.object({work,lease}).strict()).min(1).max(64)}).strict(),
 ...(['reserve','own','dispatch','cancel'] as const).map(action=>z.object({action:z.literal(action),id}).strict()),
 z.object({action:z.literal('settle'),id,outcome:z.enum(['success','failure'])}).strict(),
 z.object({action:z.literal('publish'),id,work,quote:z.unknown()}).strict(),
 z.object({action:z.literal('inspect')}).strict(),
]);
export interface AtomicMarketStorage {get<T>(key:string):Promise<T|undefined>;put(key:string,value:unknown):Promise<void>;transaction<T>(fn:(transaction:AtomicMarketStorage)=>Promise<T>):Promise<T>}
/** Isolated durable quote coordinator. Production routes do not call it yet. Each
 * operation commits its budget/lease mutation before returning permission. There is
 * deliberately no provider I/O here and no automatic recovery/refund or pruning. */
export class DurableMarketAccount {
 constructor(private storage:AtomicMarketStorage,private clock:()=>number,private rawConfig:string|undefined){}
 async apply(raw:unknown):Promise<Record<string,unknown>>{
  let config:z.infer<typeof configSchema>,command:z.infer<typeof commandSchema>;
  try{config=configSchema.parse(JSON.parse(this.rawConfig??'null'));}catch{return {ok:false,reason:'POLICY_UNAVAILABLE'};}
  try{command=commandSchema.parse(raw);}catch{return {ok:false,reason:'MALFORMED'};}
  try{return await this.storage.transaction(async tx=>{
   const now=this.clock(),budget=await tx.get<BudgetState>('budget')??emptyBudgetState(),lastTime=await tx.get<number>('last-time')??0;
   if(!Number.isSafeInteger(now)||now<Math.max(budget.lastTime,lastTime))return {ok:false,reason:'CLOCK_OR_PERIOD'};
   await tx.put('last-time',now);
   const periods={month:config.month},index=await tx.get<string[]>('work-index')??[];
   if(command.action==='inspect'){const rows=Object.values(budget.reservations);return {ok:true,attempts:rows.length,workKeys:index.length,queued:rows.filter(r=>r.status==='QUEUED').length,dispatched:rows.filter(r=>r.status==='DISPATCHED').length,chargedCredits:rows.filter(r=>r.status==='DISPATCHED'||r.status==='SETTLED').reduce((sum,r)=>sum+r.cost,0)};}
   if(command.action==='acquire'){
    const key=publicMarketWorkKey(command.work),current=await tx.get<WorkState<MarketQuote>>(`work:${key}`)??emptyWorkState<MarketQuote>();
    if(current.evidence?.complete){const result=marketPairEnvelope([command.work.operation==='quote'?command.work.pair:neverWork()], [current.evidence.value],[],now);if(!quoteIsStale(result.quotes[0]!,now))return {ok:true,status:'CACHE_HIT',quote:result.quotes[0]};}
    if(!index.includes(key)&&index.length>=config.maxWorks)return {ok:false,reason:'CACHE_CAPACITY'};
    const next=acquireWork(current,crypto.randomUUID(),now,now+config.leaseMs,now+config.leaseMs);
    if(!next)return {ok:true,status:'WAITING',retryAt:current.lease?.expiresAt,quote:current.evidence?.value??null,degraded:true};
    await tx.put(`work:${key}`,next);if(!index.includes(key))await tx.put('work-index',[...index,key]);return {ok:true,status:'OWNER',lease:next.lease,quote:current.evidence?.value??null,degraded:!!current.evidence};
   }
   if(command.action==='enqueue'){
    if(new Set(command.associations.map(a=>publicMarketWorkKey(a.work))).size!==command.associations.length)return {ok:false,reason:'MALFORMED'};
    if(Object.keys(budget.reservations).length>=config.maxAttempts)return {ok:false,reason:'RETENTION_CAPACITY'};
    for(const association of command.associations){const current=await tx.get<WorkState<MarketQuote>>(`work:${publicMarketWorkKey(association.work)}`);if(!current?.lease||JSON.stringify(current.lease)!==JSON.stringify(association.lease)||now>=Math.min(current.lease.deadline,current.lease.expiresAt))return {ok:false,reason:'FENCED'};}
    for(const association of command.associations){const owner=await tx.get<{generation:number}>(`owner:${publicMarketWorkKey(association.work)}`);if(owner?.generation===association.lease.generation)return {ok:false,reason:'DUPLICATE_OPERATION'};}
    const attempt=createProviderAttempt({id:crypto.randomUUID(),cost:config.quoteCost,priority:command.priority,kind:command.kind},command.associations);
    const result=enqueue(budget,config.policy,attempt.reservation,now);if(!result.ok)return {ok:false,reason:result.reason};
    await tx.put('budget',result.state);await tx.put(`attempt:${attempt.id}`,attempt);for(const association of command.associations)await tx.put(`owner:${publicMarketWorkKey(association.work)}`,{generation:association.lease.generation,id:attempt.id});return {ok:true,id:attempt.id};
   }
   const attempt=await tx.get<ProviderAttempt>(`attempt:${command.id}`);if(!attempt)return {ok:false,reason:'INVALID_TRANSITION'};
   if(command.action==='publish'){
    if(command.work.operation!=='quote')return {ok:false,reason:'MALFORMED'};
    let value:MarketQuote;try{value=marketPairEnvelope([command.work.pair],[command.quote as MarketQuote],[],now).quotes[0]!;}catch{return {ok:false,reason:'MALFORMED'};}
    const key=`work:${publicMarketWorkKey(command.work)}`,state=await tx.get<WorkState<MarketQuote>>(key)??emptyWorkState<MarketQuote>();
    const previous=state.evidence?.value;if(previous&&Date.parse(value.observedAt??value.fetchedAt??'')<Date.parse(previous.observedAt??previous.fetchedAt??''))return {ok:false,reason:'STALE_EVIDENCE'};
    const result=publishAttemptWork(attempt,budget,command.work,state,value,now,now);if(!result.ok)return {ok:false,reason:result.reason??'FENCED'};
    await tx.put(key,result.state);return {ok:true};
   }
   if(command.action==='own'||command.action==='dispatch'){for(const association of attempt.associations){const current=await tx.get<WorkState<MarketQuote>>(`work:${publicMarketWorkKey(association.work)}`);if(!current?.lease||current.lease.token!==association.lease.token||current.lease.fence!==association.lease.fence||now>=Math.min(current.lease.deadline,current.lease.expiresAt))return {ok:false,reason:'FENCED'};}}
   const result=command.action==='reserve'?reserve(budget,config.policy,periods,attempt.reservation,now):command.action==='own'?ownDispatch(budget,config.policy,periods,command.id,now):command.action==='dispatch'?markDispatched(budget,config.policy,periods,command.id,now):command.action==='settle'?settle(budget,command.id,command.outcome,now):cancelUndispatched(budget,command.id,now);
   if(result.ok)await tx.put('budget',result.state);return {ok:result.ok,...(result.reason?{reason:result.reason}:{})};
  });}catch{return {ok:false,reason:'STORAGE_UNAVAILABLE'};}
 }
}
function neverWork():never{throw Error('Unsupported work.');}
