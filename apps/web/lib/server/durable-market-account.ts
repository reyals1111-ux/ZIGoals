import {marketTelemetryPolicy,readMarketTelemetry,recordMarketTelemetry} from './market-telemetry';
import {liveFollowers,followerCommand,registerFollowers,pollFollowers,forgetFollowers} from './market-followers';
import {pairBlocked,pairScope,breakerKey} from './market-pair-breaker';
import {z} from 'zod';
import {admitMarketBreakers,settleMarketBreakers} from './market-breaker-storage';
import {maintainMarketAccount,rememberAttempt,releaseCancelledWork,type RetainedAttempt} from './market-retention';
import {publicMarketWorkSchema,publicMarketWorkKey,createProviderAttempt,publishAttemptWork,type ProviderAttempt,type PublicMarketWork} from './market-coordinator';
import {emptyBudgetState,validTime,nextReservedDispatch,enqueue,reserve,ownDispatch,markDispatched,settle,cancelUndispatched,type BudgetState,type BudgetPeriod,type MarketPriority} from './market-budget-policy';
import {acquireWork,emptyWorkState,type WorkState,type WorkLease} from './market-work-fence';
import type {MarketQuote} from '../market-quotes';
import {validateWorkEvidence,workEvidenceStale,workEvidenceTime} from './market-evidence';
import {loadCacheValue,storeCacheValue,removeCacheValue,evictMarketWork,evictMarketWorks,cacheValueBytes} from './market-cache-storage';
import {admitBreaker,emptyBreaker,type BreakerState} from './market-breaker';
import {BufferedMarketStorage} from './market-storage-buffer';
import {MARKET_CLIENT_GROUP} from './market-client-address';
import {assetRefusal,catalogIndexed,recordNotFound,writeCatalogIndex,type CatalogIds,type CatalogKind} from './market-catalog-guard';
import {DEFAULT_DAILY_ROW_BUDGET,cancelQuota,clientLimits,clientBucket,newClientKey,clientKeyRow,utcDay,dayRow,readDay,pruneDays,clientUsage,publicRowCap,type ClientKey,type ClientLimits,type MarketDay,type MarketCaller} from './market-client-limits';
const uint=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),positive=uint.positive();
const capacity=z.object({minute:uint,monthly:uint}).strict();
const category=z.enum(['THROTTLED','UPSTREAM_5XX','TIMEOUT','NETWORK','AUTHENTICATION','ENTITLEMENT','MALFORMED','UNSUPPORTED','LOCAL_BUDGET','LOCAL_QUEUE','UNKNOWN']);
const chargedOperation=z.enum(['catalog','history','insights','token','rwa']);
const configSchema=z.object({telemetry:marketTelemetryPolicy.optional(),policy:z.object({providerMinuteLimit:positive,providerMonthlyLimit:positive,operating:capacity,monitoringReserve:capacity,monitoringMaximum:capacity,optionalCeiling:capacity,concurrent:positive,queueLimit:positive,reservationMs:positive,ownershipMs:positive}).strict(),month:z.object({id:z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),start:uint,end:uint}).strict().optional(),calendar:z.object({timeZone:z.literal('UTC'),confirmed:z.literal(true)}).strict().optional(),operationCosts:z.partialRecord(chargedOperation,positive).optional(),quoteCost:positive,leaseMs:positive.max(60000),maxAttempts:positive.max(128),maxWorks:positive.max(64),maxCacheBytes:positive.max(32*1024*1024).optional(),retryRetentionMs:positive.min(60000).max(86400000).optional(),dailyRowBudget:positive.min(1000).max(10000000).optional(),partition:z.object({publicPercent:positive.min(10).max(90)}).strict().optional(),publicColdWorks:positive.max(10000000).optional(),accountThrottle:z.object({distinctEndpoints:positive.min(2).max(8),windowMs:positive.max(60000)}).strict().optional(),breaker:z.object({threshold:positive.max(100),windowMs:positive.max(3600000),cooldownMs:positive,maxCooldownMs:positive,halfOpenProbes:positive.max(8)}).strict().refine(p=>p.maxCooldownMs>=p.cooldownMs).optional()}).strict().refine(c=>Boolean(c.month)!==Boolean(c.calendar),'Exactly one confirmed accounting period source is required.').refine(c=>!c.accountThrottle||!!c.breaker,'Throttle correlation requires a breaker policy.');
const work=publicMarketWorkSchema;
const lease=z.object({token:z.string().min(1).max(100),generation:positive,fence:positive,acquiredAt:uint,deadline:uint,expiresAt:uint}).strict();
const id=z.string().uuid();
const association=z.object({work,lease}).strict();
/** One provider read: `quote` is /simple/price or the RWA quote read, the others the reads of that name. */
const charge=z.enum(['quote','catalog','history','insights']);
const client=z.string().regex(MARKET_CLIENT_GROUP);
const member=z.number().int().min(0).max(63);
const commandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('acquire'),work}).strict(),
 z.object({action:z.literal('follow'),work,waitMs:positive.max(1000),cancelToken:id.optional()}).strict(),
 z.object({action:z.literal('cancel-followers'),cancelToken:id,client:client.optional()}).strict(),
 ...(['poll','forget'] as const).map(action=>z.object({action:z.literal(action),id}).strict()),
 z.object({action:z.literal('enqueue-read'),operation:chargedOperation,parentId:id.optional(),associations:z.array(association).min(1).max(64).optional()}).strict(),
 z.object({action:z.literal('enqueue'),priority:z.enum(['interactive','refresh','optional','monitoring']),kind:z.enum(['request','retry','fallback']),associations:z.array(association).min(1).max(64)}).strict(),
 ...(['reserve','own','dispatch','cancel'] as const).map(action=>z.object({action:z.literal(action),id}).strict()),
 z.object({action:z.literal('settle'),id,outcome:z.enum(['success','failure']),category:category.optional(),pairFailures:z.array(work).max(64).optional()}).strict(),
 z.object({action:z.literal('publish'),id,work,quote:z.unknown()}).strict(),
 z.object({action:z.literal('publish-data'),id,work,value:z.unknown()}).strict(),
 z.object({action:z.literal('inspect')}).strict(),
 z.object({action:z.literal('inspect-metrics')}).strict(),
 // Batched protocol: one command per phase of an HTTP request, never one per pair.
 z.object({action:z.literal('acquire-many'),works:z.array(work).min(1).max(64),groups:z.array(z.object({charge,members:z.array(member).min(1).max(64)}).strict()).max(64).optional(),follow:z.object({waitMs:positive.max(1000),cancelToken:id.optional()}).strict().optional(),client:client.optional()}).strict(),
 z.object({action:z.literal('admit'),id}).strict(),
 z.object({action:z.literal('admit-group'),charge,associations:z.array(association).min(1).max(64),client:client.optional()}).strict(),
 z.object({action:z.literal('complete'),id,outcome:z.enum(['success','failure']),category:category.optional(),pairFailures:z.array(work).max(64).optional(),publish:z.array(z.object({work,value:z.unknown()}).strict()).max(64),fallback:z.literal(true).optional(),notFound:z.literal(true).optional(),next:z.object({charge,associations:z.array(association).min(1).max(64)}).strict().optional()}).strict(),
 z.object({action:z.literal('poll-many'),followers:z.array(z.object({id,work}).strict()).min(1).max(64),cancelToken:id.optional()}).strict(),
 z.object({action:z.literal('forget-many'),ids:z.array(id).min(1).max(64)}).strict(),
]);
type Config=z.infer<typeof configSchema>;type Command=z.infer<typeof commandSchema>;
/** Session U Part 2d: when the configured accounting period ends (an exact window: its end; a confirmed UTC calendar:
 * the next month's start), or null for a missing or invalid policy. After it, every command is refused
 * (CLOCK_OR_PERIOD), cached prices included, until the owner sets the next period's policy. Read by QuoteService's
 * /status, which never calls the account object. */
export function marketPolicyWindowEnd(raw:string|undefined,now:number):number|null{
 let config:Config;try{config=configSchema.parse(JSON.parse(raw??'null'));}catch{return null;}
 if(config.month)return config.month.end;
 const date=new Date(now);return Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1);
}
type Observation=Parameters<typeof recordMarketTelemetry>[2];
type Association={work:PublicMarketWork;lease:WorkLease};
type Outcome={result:Record<string,unknown>;commit:boolean|'auto'};
export interface AtomicMarketStorage {get<T>(key:string):Promise<T|undefined>;put(key:string,value:unknown):Promise<void>;delete(key:string):Promise<unknown>;transaction<T>(fn:(transaction:AtomicMarketStorage)=>Promise<T>):Promise<T>}
/** Rows a commit may change without the command itself having changed anything: the clock high-water mark,
 * telemetry, the per-day accounting and the client key. They never make a read write. */
const bookkeeping=(key:string)=>key==='last-time'||key==='telemetry'||key===clientKeyRow||key==='market-days'||key.startsWith('market-day:');
/** Everything one command needs, read once inside its transaction. */
class Run {
 private maintainedBudget?:BudgetState;
 readonly observations:Observation[]=[];
 readonly periods:{month:BudgetPeriod};readonly limits:ClientLimits;readonly rowBudget:number;
 constructor(readonly tx:BufferedMarketStorage,readonly config:Config,readonly now:number,readonly month:BudgetPeriod,private original:BudgetState,readonly bucket:string|undefined,readonly catalogIds:Map<CatalogKind,CatalogIds>,readonly caller:MarketCaller='public'){
  this.periods={month};this.rowBudget=config.dailyRowBudget??DEFAULT_DAILY_ROW_BUDGET;this.limits=clientLimits(config,this.rowBudget);
 }
 /** Maintenance runs in the buffer for every command that reads budget state; it persists only with a commit. */
 async budget(){return this.maintainedBudget??=await maintainMarketAccount(this.tx,this.original,this.month,this.now,this.config.leaseMs,this.config.policy.reservationMs,this.config.retryRetentionMs??3600000,this.config.breaker);}
 setBudget(state:BudgetState){this.maintainedBudget=state;}
 observe(row:Observation){this.observations.push(row);}
 async day():Promise<MarketDay>{return readDay(this.tx,utcDay(this.now));}
 /** The day's row budget is spent for this caller: all of it, or (Session U Part 2e) the public share when the policy
  * partitions it. Without `partition` the caller changes nothing. */
 /** Session U Part 2f: new works the public callers may start per UTC day, all of them together (on top of each
  * client's share): MARKET_POLICY.publicColdWorks, by default an eighth of the daily row budget. */
 get publicWorkCap(){return this.config.publicColdWorks??Math.floor(this.rowBudget/8);}
 rowsSpent(day:MarketDay){return day.rows>=this.rowBudget||!!this.config.partition&&this.caller==='public'&&(day.publicRows??0)>=publicRowCap(this.rowBudget,this.config.partition.publicPercent);}
 /** Why this cold work is refused before any lease or charge (market-catalog-guard.ts), or undefined. */
 assetRefusal(work:PublicMarketWork){return assetRefusal(this.tx,work,this.now,this.catalogIds);}
}
/** Account authority shared by quote publication and all supported endpoint reads. Each
 * operation commits its budget/lease mutation before returning permission. There is
 * no provider I/O here. Maintenance retains monthly charges and replay receipts;
 * expired dispatched work is settled conservatively without refund.
 * Every command runs against a buffer and writes only rows that change: cache hits, waiting and denials
 * write nothing. The rows written per UTC day are counted and bound new cold work (`dailyRowBudget`). */
export class DurableMarketAccount {
 private telemetry:{row:Observation;at:number}[]=[];
 private key?:Promise<ClientKey&{stored:boolean}>;
 /** Parsed catalog ID indexes, by their stored version (market-catalog-guard.ts). */
 private catalogIds=new Map<CatalogKind,CatalogIds>();
 constructor(private storage:AtomicMarketStorage,private clock:()=>number,private rawConfig:string|undefined){}
 /** The day's client key, created in memory when absent and stored with the first commit that uses it. */
 private async clientKey(now:number):Promise<ClientKey&{stored:boolean}>{
  const day=utcDay(now),current=await this.key;if(current?.day===day)return current;
  this.key=(async()=>{const stored=await this.storage.get<ClientKey>(clientKeyRow);return stored?.day===day&&/^[0-9a-f]{64}$/.test(stored.key)?{...stored,stored:true}:{day,key:newClientKey(),stored:false};})();
  try{return await this.key;}catch(error){this.key=undefined;throw error;}
 }
 /** `caller` (Session U Part 2e) is the calling app's label, set by QuoteService from the app's own bindings; anything
  * but 'friends' is public. */
 async apply(raw:unknown,{caller}:{caller?:MarketCaller}={}):Promise<Record<string,unknown>>{
  let config:Config,command:Command;
  try{config=configSchema.parse(JSON.parse(this.rawConfig??'null'));}catch{return {ok:false,reason:'POLICY_UNAVAILABLE'};}
  try{command=commandSchema.parse(raw);}catch{return {ok:false,reason:'MALFORMED'};}
  const group='client' in command?command.client:undefined;let key:(ClientKey&{stored:boolean})|undefined,bucket:string|undefined;
  try{if(group){key=await this.clientKey(this.clock());bucket=await clientBucket(key.key,group);}}catch{return {ok:false,reason:'STORAGE_UNAVAILABLE'};}
  const buffered=this.telemetry.slice();let committed=false,observations:Observation[]=[],at=0;
  try{
   const result=await this.storage.transaction(async real=>{
    const tx=new BufferedMarketStorage(real),now=this.clock();at=now;
    const original=await tx.get<BudgetState>('budget')??emptyBudgetState(),lastTime=await tx.get<number>('last-time')??0;
    if(!Number.isSafeInteger(now)||now<Math.max(original.lastTime,lastTime))return {ok:false,reason:'CLOCK_OR_PERIOD'};
    const date=new Date(now),month=config.month??{id:date.toISOString().slice(0,7),start:Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1),end:Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1)};
    if(!validTime(original,{month},now))return {ok:false,reason:'CLOCK_OR_PERIOD'};
    if(key&&key.day!==utcDay(now))return {ok:false,reason:'CLOCK_OR_PERIOD'};
    const run=new Run(tx,config,now,month,original,bucket,this.catalogIds,caller==='friends'?'friends':'public');
    if(command.action==='inspect-metrics'){
     for(const entry of buffered)if(config.telemetry)await recordMarketTelemetry(tx,config.telemetry,entry.row,entry.at);
     const metrics=await readMarketTelemetry(tx,config.telemetry,now);
     committed=(await tx.changes()).length>0;if(committed)await tx.flush();return metrics;
    }
    const outcome=await execute(run,command);observations=run.observations;
    committed=outcome.commit===true||outcome.commit==='auto'&&(await tx.changes()).some(([changed])=>!bookkeeping(changed));
    if(!committed)return outcome.result;
    if(config.telemetry){for(const entry of [...buffered.map(entry=>[entry.row,entry.at] as const),...observations.map(row=>[row,now] as const)])await recordMarketTelemetry(tx,config.telemetry,entry[0],entry[1]);}
    else await tx.delete('telemetry');
    if(now>lastTime)await tx.put('last-time',now);
    if(key&&!key.stored&&bucket&&(await tx.get<ClientKey>(clientKeyRow))?.key!==key.key)await tx.put(clientKeyRow,{day:key.day,key:key.key});
    await pruneDays(tx,now);
    // The day's row counts every row this commit writes, itself included.
    const day=await run.day(),changes=await tx.changes(),rows=changes.length+(changes.some(([changed])=>changed===dayRow(utcDay(now)))?0:1);
    await tx.put(dayRow(utcDay(now)),{...day,rows:day.rows+rows,...(config.partition&&run.caller==='public'?{publicRows:(day.publicRows??0)+rows}:{})});
    await tx.flush();return outcome.result;
   });
   if(committed){this.telemetry.splice(0,buffered.length);if(key&&bucket)key.stored=true;}
   // Counts from commands that wrote nothing wait in memory for the next commit or inspect-metrics.
   else if(config.telemetry)for(const row of observations)if(this.telemetry.length<2000)this.telemetry.push({row,at});
   return result;
  }catch{return {ok:false,reason:'STORAGE_UNAVAILABLE'};}
 }
}
/** Session S: a new cancellation fence is a committed row, so it is bounded like other public work. It is refused with no
 * write once the day's row budget is spent, or the day's fence quota, in all or for this client bucket (cancelQuota). */
async function admitTombstone(run:Run):Promise<string|undefined>{
 const day=await run.day();if(run.rowsSpent(day))return 'DAILY_LIMIT';
 const quota=cancelQuota(run.rowBudget),cancels=day.cancels??{n:0,buckets:{}},used=run.bucket?cancels.buckets[run.bucket]??0:0;
 if(cancels.n>=quota.total||run.bucket&&used>=quota.client)return 'FOLLOWER_LIMIT';
 await run.tx.put(dayRow(utcDay(run.now)),{...day,cancels:{n:cancels.n+1,buckets:run.bucket?{...cancels.buckets,[run.bucket]:used+1}:cancels.buckets}});
}
async function execute(run:Run,command:Command):Promise<Outcome>{
 const {tx,now}=run;
 if(command.action==='follow'||command.action==='poll'||command.action==='forget'||command.action==='cancel-followers'){const result=await followerCommand(tx,command,now,command.action==='cancel-followers'?()=>admitTombstone(run):undefined);run.observe(observation(command,result));return {result,commit:'auto'};}
 if(command.action==='poll-many'){const followers=await pollFollowers(tx,command.followers,now,command.cancelToken);return {result:{ok:true,followers},commit:'auto'};}
 if(command.action==='forget-many')return {result:await forgetFollowers(tx,command.ids,now),commit:'auto'};
 if(command.action==='acquire')return acquireOne(run,command.work);
 if(command.action==='acquire-many')return acquireMany(run,command);
 if(command.action==='inspect'){
  const budget=await run.budget(),followers=await liveFollowers(tx,now),index=await tx.get<string[]>('work-index')??[],rows=Object.values(budget.reservations),day=await run.day();
  return {result:{ok:true,followers:followers.length,attempts:rows.length,archivedAttempts:budget.archived?.attempts??0,workKeys:index.length,queued:rows.filter(r=>r.status==='QUEUED').length,dispatched:rows.filter(r=>r.status==='DISPATCHED').length,currentPeriodCredits:Object.values(budget.archived?.credits??{}).reduce((sum,n)=>sum+n,0)+rows.filter(r=>(r.status==='DISPATCHED'||r.status==='SETTLED')&&r.periods?.month.id===run.month.id).reduce((sum,r)=>sum+r.cost,0),chargedCredits:(budget.archived?.lifetimeCredits??0)+rows.filter(r=>r.status==='DISPATCHED'||r.status==='SETTLED').reduce((sum,r)=>sum+r.cost,0),rowsToday:day.rows,dailyRowBudget:run.rowBudget,...(run.config.partition?{publicRowsToday:day.publicRows??0,publicRowBudget:publicRowCap(run.rowBudget,run.config.partition.publicPercent)}:{}),publicWorksToday:day.publicWorks??0,publicWorkCap:run.publicWorkCap},commit:false};
 }
 if(command.action==='admit'){const result=await admitAttempt(run,command.id);return {result,commit:'auto'};}
 if(command.action==='admit-group'){const result=await admitGroup(run,{charge:command.charge,associations:command.associations,bucket:run.bucket,checkFence:true});return {result,commit:'auto'};}
 if(command.action==='complete')return {result:await complete(run,command),commit:'auto'};
 // Every other action was answered above (the poll/forget schema shares one object type, so tsc cannot narrow it).
 const result=await legacy(run,command as Parameters<typeof legacy>[1]);
 const budget=await run.budget(),attempt='id' in command?await tx.get<RetainedAttempt>(`attempt:${command.id}`):undefined,row='id' in command?budget.reservations[command.id]:undefined;
 run.observe({action:command.action,workClass:'work' in command?command.work.operation:attempt?.endpoint?.split(':')[0],priority:attempt?.reservation.priority,status:typeof result.status==='string'?result.status:undefined,reason:typeof result.reason==='string'?result.reason:undefined,ok:result.ok===true,replay:result.replay===true,cost:attempt?.reservation.cost,outcome:'outcome' in command?command.outcome:undefined,category:'category' in command?command.category:undefined,waitMs:attempt?.createdAt===undefined?undefined:now-attempt.createdAt,durationMs:row?.dispatchedAt===undefined?undefined:now-row.dispatchedAt});
 return {result,commit:'auto'};
}
const observation=(command:{action:string;work?:PublicMarketWork},result:Record<string,unknown>):Observation=>({action:command.action,workClass:command.work?.operation,status:typeof result.status==='string'?result.status:undefined,reason:typeof result.reason==='string'?result.reason:undefined,ok:result.ok===true,replay:result.replay===true});
const evidenceOf=(work:PublicMarketWork,value:unknown)=>work.operation==='quote'?{quote:value}:{value};
async function storedEvidence(run:Run,work:PublicMarketWork,state:WorkState<unknown>){return state.evidence?validateWorkEvidence(work,await loadCacheValue(run.tx,state.evidence.value),run.now):null;}
const live=(lease:WorkLease|undefined,now:number)=>!!lease&&now<Math.min(lease.deadline,lease.expiresAt);
/** The single-key acquire: a hit or a wait writes nothing; only a new lease commits. */
async function acquireOne(run:Run,item:PublicMarketWork):Promise<Outcome>{
 const {tx,now,config}=run,key=publicMarketWorkKey(item);let current=await tx.get<WorkState<unknown>>(`work:${key}`)??emptyWorkState<unknown>();
 let value=await storedEvidence(run,item,current);
 const done=(result:Record<string,unknown>,commit=false):Outcome=>{run.observe(observation({action:'acquire',work:item},result));return {result,commit};};
 if(current.evidence?.complete&&!workEvidenceStale(item,value,now)&&await catalogIndexed(tx,item,current))return done({ok:true,status:'CACHE_HIT',...evidenceOf(item,value)});
 // Not a hit: maintenance may release an abandoned owner's lease, exactly as before.
 await run.budget();current=await tx.get<WorkState<unknown>>(`work:${key}`)??emptyWorkState<unknown>();value=await storedEvidence(run,item,current);
 const evidence=evidenceOf(item,value);
 if(await pairBlocked(tx,config.breaker,item,now))return done({ok:false,reason:'PAIR_BREAKER_OPEN',...evidence});
 const refused=await run.assetRefusal(item);if(refused)return done({ok:false,reason:refused,...evidence});
 const index=await tx.get<string[]>('work-index')??[];
 const capacity=await evictMarketWork(tx,index,now,key,0,config.maxCacheBytes??16*1024*1024,config.maxWorks);if(!capacity.ok)return done({ok:false,reason:'CACHE_CAPACITY'});
 const next=acquireWork(current,crypto.randomUUID(),now,now+config.leaseMs,now+config.leaseMs);
 if(!next)return done({ok:true,status:'WAITING',retryAt:current.lease?.expiresAt,...evidence,degraded:true});
 await tx.put(`work:${key}`,next);if(!capacity.index.includes(key))await tx.put('work-index',[...capacity.index,key]);
 return done({ok:true,status:'OWNER',lease:next.lease,...evidence,degraded:!!current.evidence},true);
}
/** Many keys in one transaction (at most 64). Hits and waits write nothing. Cold keys get leases only if the first
 * provider group with cold keys can be admitted now: a denied request writes no row. */
async function acquireMany(run:Run,command:Extract<Command,{action:'acquire-many'}>):Promise<Outcome>{
 const {tx,now,config}=run,{works}=command,keys=works.map(publicMarketWorkKey),groups=command.groups??[];
 const membership=new Map<number,number>();
 for(const [g,entry] of groups.entries())for(const m of entry.members){if(m>=works.length||membership.has(m))return {result:{ok:false,reason:'MALFORMED'},commit:false};membership.set(m,g);}
 if(new Set(keys).size!==keys.length||groups.some(entry=>!chargeFits(entry.charge,entry.members.map(m=>works[m]!))))return {result:{ok:false,reason:'MALFORMED'},commit:false};
 const results:Record<string,unknown>[]=works.map(()=>({}));const pending:number[]=[];
 const states=await Promise.all(keys.map(async key=>await tx.get<WorkState<unknown>>(`work:${key}`)??emptyWorkState<unknown>()));
 for(const [i,item] of works.entries()){const value=await storedEvidence(run,item,states[i]!);if(states[i]!.evidence?.complete&&!workEvidenceStale(item,value,now)&&await catalogIndexed(tx,item,states[i]!))results[i]={ok:true,status:'CACHE_HIT',...evidenceOf(item,value)};else pending.push(i);}
 const done=(commit:boolean,extra:Record<string,unknown>={}):Outcome=>{for(const [i,item] of works.entries())run.observe(observation({action:'acquire',work:item},results[i]!));return {result:{ok:true,results,...extra},commit};};
 if(!pending.length)return done(false);
 await run.budget();
 const cold:number[]=[],waiting:{index:number;work:PublicMarketWork;lease:WorkLease}[]=[];
 for(const i of pending){
  const item=works[i]!,state=await tx.get<WorkState<unknown>>(`work:${keys[i]}`)??emptyWorkState<unknown>();states[i]=state;
  const value=await storedEvidence(run,item,state),evidence=evidenceOf(item,value);
  // Before following a live owner too: a coin whose history just answered 404 has nothing to wait for.
  const refused=await run.assetRefusal(item);if(refused){results[i]={ok:false,reason:refused,...evidence};continue;}
  if(await pairBlocked(tx,config.breaker,item,now)){results[i]={ok:false,reason:'PAIR_BREAKER_OPEN',...evidence};continue;}
  if(live(state.lease,now)){
   // The current owner already published, but stale: the follower's answer at once, as `follow` gives it.
   if(state.evidence?.complete&&state.evidence.generation===state.lease!.generation)results[i]={ok:true,status:'CACHE_HIT',...evidence};
   else{results[i]={ok:true,status:'WAITING',retryAt:state.lease!.expiresAt,...evidence,degraded:true};waiting.push({index:i,work:item,lease:state.lease!});}
   continue;
  }
  cold.push(i);
 }
 let changed=false;const attempts:Record<string,unknown>[]=[];
 if(cold.length){
  const first=groups.findIndex(entry=>entry.members.some(m=>cold.includes(m)));
  // Leases only when the request can start: a global or client limit, or a refusal of its first group, denies every
  // cold key without a write. A refusal specific to a later group's endpoint is met when that group starts.
  const refusal=await admissionRefusal(run,first<0?undefined:{charge:groups[first]!.charge,works:groups[first]!.members.filter(m=>cold.includes(m)).map(m=>works[m]!)},cold.length);
  if(refusal)for(const i of cold)results[i]={ok:false,reason:refusal,...evidenceOf(works[i]!,await storedEvidence(run,works[i]!,states[i]!))};
  else{
   // The first group's keys first, so a full cache never strands the read that starts now.
   const order=first<0?cold:[...cold.filter(i=>groups[first]!.members.includes(i)),...cold.filter(i=>!groups[first]!.members.includes(i))];
   const index=await tx.get<string[]>('work-index')??[],room=await evictMarketWorks(tx,index,now,order.map(i=>keys[i]!),config.maxWorks);
   const leased:number[]=[];let next=[...room.index];
   for(const [n,i] of order.entries()){
    const item=works[i]!,state=states[i]!,evidence=evidenceOf(item,await storedEvidence(run,item,state));
    if(n>=room.fit){results[i]={ok:false,reason:'CACHE_CAPACITY',...evidence};continue;}
    const granted=acquireWork(state,crypto.randomUUID(),now,now+config.leaseMs,now+config.leaseMs);
    if(!granted){results[i]={ok:true,status:'WAITING',retryAt:state.lease?.expiresAt,...evidence,degraded:true};continue;}
    await tx.put(`work:${keys[i]}`,granted);if(!next.includes(keys[i]!))next=[...next,keys[i]!];leased.push(i);
    results[i]={ok:true,status:'OWNER',lease:granted.lease,...evidence,degraded:!!state.evidence};
   }
   if(leased.length){
    changed=true;await tx.put('work-index',next);
    if(run.bucket||run.caller==='public'){const day=await run.day(),usage:[number,number]=run.bucket?day.buckets[run.bucket]??[0,0]:[0,0];await tx.put(dayRow(utcDay(now)),{...day,...(run.bucket?{buckets:{...day.buckets,[run.bucket]:[usage[0],usage[1]+leased.length]}}:{}),...(run.caller==='public'?{publicWorks:(day.publicWorks??0)+leased.length}:{})});}
    const members=first<0?[]:groups[first]!.members.filter(m=>leased.includes(m));
    if(members.length){
     const admitted=await admitGroup(run,{charge:groups[first]!.charge,associations:members.map(m=>({work:works[m]!,lease:(results[m] as {lease:WorkLease}).lease})),bucket:run.bucket,checkFence:false});
     if(admitted.ok===true)attempts.push({group:first,...admitted});
     else for(const m of members)results[m]={ok:false,reason:admitted.reason,...evidenceOf(works[m]!,await storedEvidence(run,works[m]!,states[m]!))};
    }
   }
  }
 }
 if(waiting.length&&command.follow){
  const registered=await registerFollowers(tx,waiting,now,{...command.follow,client:run.bucket,clientShare:run.limits.followers});
  for(const {index} of waiting){const entry=registered[index]!;if(entry.id){results[index]={...results[index],follower:entry.id};changed=true;}else results[index]={...results[index],ok:false,reason:entry.reason};}
 }
 return done(changed,{attempts});
}
function chargeFits(name:z.infer<typeof charge>,items:PublicMarketWork[]){
 if(!items.length)return false;
 if(name==='quote')return items.every(item=>item.operation==='quote')&&new Set(items.map(item=>item.operation==='quote'?item.pair.marketRef.kind:'')).size===1;
 return items.every(item=>item.operation===name)&&(name!=='history'||items.length===1)&&(name!=='catalog'||items.length===1);
}
type Charge={cost:number|undefined;priority:MarketPriority;kind:'request'|'fallback';endpoint:string;operation:string;pool?:'history'};
function chargeOf(config:Config,name:z.infer<typeof charge>|'token',items:PublicMarketWork[]):Charge{
 if(name==='quote'){const rwa=items[0]?.operation==='quote'&&items[0].pair.marketRef.kind==='rwa';return {cost:rwa?config.operationCosts?.rwa:config.quoteCost,priority:'interactive',kind:'request',endpoint:rwa?'quote:rwa':'quote:coin',operation:'quote'};}
 return {cost:config.operationCosts?.[name],priority:name==='catalog'?'refresh':name==='insights'?'optional':'interactive',kind:name==='token'?'fallback':'request',endpoint:`${name}:${items[0]?.operation==='catalog'?items[0].kind:'shared'}`,operation:name,...(name==='history'?{pool:'history' as const}:{})};
}
/** Read-only admission checks, in order: the day's row budget, the client's fair share, then the first group's own
 * cost, retention, queue, budget and breakers. Returns the reason to refuse, or undefined. */
async function admissionRefusal(run:Run,firstGroup:{charge:z.infer<typeof charge>;works:PublicMarketWork[]}|undefined,newWorks:number){
 const {config,now}=run,day=await run.day();
 if(run.rowsSpent(day))return 'DAILY_LIMIT';
 // Session U Part 2f: the public callers' new works today, all together; cache hits and followers never count.
 if(run.caller==='public'&&(day.publicWorks??0)+newWorks>run.publicWorkCap)return 'DAILY_LIMIT';
 if(run.bucket){
  const usage=clientUsage(await run.budget(),run.bucket,now),today=day.buckets[run.bucket]??[0,0];
  if(usage.held+newWorks>run.limits.held||today[1]+newWorks>run.limits.works)return 'CLIENT_LIMIT';
  if(firstGroup&&(usage.active+1>run.limits.active||usage.minute+1>run.limits.minute||today[0]+(chargeOf(config,firstGroup.charge,firstGroup.works).cost??0)>run.limits.credits))return 'CLIENT_LIMIT';
 }
 if(!firstGroup)return undefined;
 const spec=chargeOf(config,firstGroup.charge,firstGroup.works);if(!spec.cost)return 'POLICY_UNAVAILABLE';
 const budget=await run.budget();if(Object.keys(budget.reservations).length>=config.maxAttempts)return 'RETENTION_CAPACITY';
 const probe={id:'admission-probe',cost:spec.cost,priority:spec.priority,kind:spec.kind,...(spec.pool?{pool:spec.pool}:{})},queued=enqueue(budget,config.policy,probe,now);if(!queued.ok)return queued.reason;
 const reserved=reserve(queued.state,config.policy,run.periods,probe,now);if(!reserved.ok)return reserved.reason;
 return await breakersRefuse(run,spec.endpoint,firstGroup.works)?'BREAKER_OPEN':undefined;
}
/** The same denials as admitBreaker, without writing: an open scope before its retry time, a half-open scope with
 * every probe issued, or a full pair index. */
async function breakersRefuse(run:Run,endpoint:string,items:PublicMarketWork[]){
 const policy=run.config.breaker;if(!policy)return false;
 const scopes=[{kind:'account-authentication' as const},{kind:'account-throttle' as const},{kind:'endpoint-availability' as const,endpoint},{kind:'endpoint-integrity' as const,endpoint},...items.filter(w=>w.operation!=='catalog').map(w=>pairScope(endpoint,w))];
 const index=await run.tx.get<string[]>('pair-breaker-index')??[],pairs=scopes.filter(s=>s.kind==='pair').map(breakerKey);
 if(new Set([...index,...pairs]).size>256){
  // As retainPairScopes: quiet closed scopes would be pruned first.
  const kept=[];for(const key of index){const state=await run.tx.get<BreakerState>(key);if(state&&!(state.phase==='CLOSED'&&!Object.keys(state.pending).length&&run.now-state.lastTime>=policy.windowMs))kept.push(key);}
  if(new Set([...kept,...pairs]).size>256)return true;
 }
 for(const scope of scopes){const state=await run.tx.get<BreakerState>(breakerKey(scope))??emptyBreaker();if(!admitBreaker(state,policy,scope,'admission-probe',run.now).ok)return true;}
 return false;
}
/** Creates one provider attempt for leased works and moves it as far as it can go now: queued, reserved, owned, and
 * dispatched when it is next in line and a slot is free. Every check of `enqueue`, `reserve`, `own` and `dispatch`
 * applies, plus the day's row budget and the client's share. */
async function admitGroup(run:Run,{charge:name,associations,bucket,checkFence,parent}:{charge:z.infer<typeof charge>|'token';associations:Association[];bucket?:string;checkFence:boolean;parent?:string}):Promise<Record<string,unknown>>{
 const {tx,config,now}=run,items=associations.map(a=>a.work);
 if(new Set(items.map(publicMarketWorkKey)).size!==items.length||name!=='token'&&!chargeFits(name,items))return {ok:false,reason:'MALFORMED'};
 if(checkFence)for(const a of associations){const current=await tx.get<WorkState<unknown>>(`work:${publicMarketWorkKey(a.work)}`);if(!current?.lease||JSON.stringify(current.lease)!==JSON.stringify(a.lease)||now>=Math.min(a.lease.deadline,a.lease.expiresAt))return {ok:false,reason:'FENCED'};}
 const spec=chargeOf(config,name,items),day=await run.day();
 const deny=(reason:string)=>{run.observe({action:'enqueue',workClass:spec.operation,ok:false,reason});return {ok:false,reason};};
 if(run.rowsSpent(day))return deny('DAILY_LIMIT');
 if(!spec.cost)return deny('POLICY_UNAVAILABLE');
 let budget=await run.budget();
 if(bucket){const usage=clientUsage(budget,bucket,now),today=day.buckets[bucket]??[0,0];if(usage.active+1>run.limits.active||usage.minute+1>run.limits.minute||usage.held+items.length>run.limits.held||today[0]+spec.cost>run.limits.credits)return deny('CLIENT_LIMIT');}
 if(Object.keys(budget.reservations).length>=config.maxAttempts)return deny('RETENTION_CAPACITY');
 if(await breakersRefuse(run,spec.endpoint,items))return deny('BREAKER_OPEN');
 const attempt:ProviderAttempt=createProviderAttempt({id:crypto.randomUUID(),cost:spec.cost,priority:spec.priority,kind:spec.kind,...(bucket?{client:bucket}:{}),works:items.length,...(spec.pool?{pool:spec.pool}:{})},associations);
 const queued=enqueue(budget,config.policy,attempt.reservation,now);if(!queued.ok)return deny(queued.reason);
 const reserved=reserve(queued.state,config.policy,run.periods,attempt.reservation,now);if(!reserved.ok)return deny(reserved.reason);
 budget=reserved.state;run.setBudget(budget);await tx.put('budget',budget);
 await rememberAttempt(tx,attempt,now,spec.endpoint);if(parent)await tx.put(`fallback:${parent}`,attempt.id);
 if(bucket){const usage=day.buckets[bucket]??[0,0];await tx.put(dayRow(utcDay(now)),{...day,buckets:{...day.buckets,[bucket]:[usage[0]+spec.cost,usage[1]]}});}
 run.observe({action:'reserve',workClass:spec.operation,priority:spec.priority,ok:true,cost:spec.cost});
 const progressed=await advance(run,attempt.id);
 return {ok:true,id:attempt.id,state:progressed.state,...(progressed.reason?{reason:progressed.reason}:{})};
}
/** Owns and dispatches a reserved or owned attempt when it is next in line and a slot is free. */
async function advance(run:Run,attemptId:string):Promise<{state:string;reason?:string;ok:boolean}>{
 const {tx,config,now,periods}=run;let budget=await run.budget();
 const attempt=await tx.get<RetainedAttempt>(`attempt:${attemptId}`),row=budget.reservations[attemptId];if(!attempt||!row)return {ok:false,state:'MISSING',reason:'INVALID_TRANSITION'};
 const fenced=async()=>{for(const a of attempt.associations){const current=await tx.get<WorkState<MarketQuote>>(`work:${publicMarketWorkKey(a.work)}`);if(!current?.lease||current.lease.token!==a.lease.token||current.lease.fence!==a.lease.fence||now>=Math.min(current.lease.deadline,current.lease.expiresAt))return true;}return false;};
 if(row.status==='RESERVED'){
  if(await fenced())return {ok:false,state:'RESERVED',reason:'FENCED'};
  const owned=ownDispatch(budget,config.policy,periods,attemptId,now);
  if(!owned.ok){run.observe({action:'own',ok:false,reason:owned.reason});return {ok:false,state:'RESERVED',reason:owned.reason};}
  if(nextReservedDispatch(budget,config.policy,periods,now)!==attemptId){run.observe({action:'own',ok:false,reason:'QUEUE_WAIT'});return {ok:false,state:'RESERVED',reason:'QUEUE_WAIT'};}
  budget=owned.state;run.setBudget(budget);await tx.put('budget',budget);
 }
 if(budget.reservations[attemptId]?.status==='OWNED'){
  if(await fenced())return {ok:false,state:'OWNED',reason:'FENCED'};
  const dispatched=markDispatched(budget,config.policy,periods,attemptId,now);if(!dispatched.ok)return {ok:false,state:'OWNED',reason:dispatched.reason};
  const permits=await admitMarketBreakers(tx,config.breaker,attemptId,attempt.endpoint??'quote:coin',now,attempt.associations.map(a=>a.work));if(!permits)return {ok:false,state:'OWNED',reason:'BREAKER_OPEN'};
  await tx.put(`attempt:${attemptId}`,{...attempt,breakers:permits});budget=dispatched.state;run.setBudget(budget);await tx.put('budget',budget);
  run.observe({action:'dispatch',workClass:attempt.endpoint?.split(':')[0],priority:attempt.reservation.priority,ok:true,cost:attempt.reservation.cost,waitMs:attempt.createdAt===undefined?undefined:now-attempt.createdAt});
  return {ok:true,state:'DISPATCHED'};
 }
 const status=budget.reservations[attemptId]?.status??'MISSING';
 return {ok:status==='DISPATCHED',state:status,...(status==='DISPATCHED'?{}:{reason:'INVALID_TRANSITION'})};
}
/** Polled while a slot is busy: reserves a queued attempt, then owns and dispatches it in one transaction. */
async function admitAttempt(run:Run,attemptId:string):Promise<Record<string,unknown>>{
 const {config,now,periods,tx}=run,budget=await run.budget(),row=budget.reservations[attemptId],attempt=await tx.get<RetainedAttempt>(`attempt:${attemptId}`);
 if(!row||!attempt)return {ok:false,reason:'INVALID_TRANSITION'};
 if(row.status==='DISPATCHED')return {ok:true,state:'DISPATCHED',replay:true};
 if(row.status==='QUEUED'){const reserved=reserve(budget,config.policy,periods,attempt.reservation,now);if(!reserved.ok){run.observe({action:'reserve',ok:false,reason:reserved.reason});return {ok:false,reason:reserved.reason};}run.setBudget(reserved.state);await tx.put('budget',reserved.state);run.observe({action:'reserve',workClass:attempt.endpoint?.split(':')[0],priority:attempt.reservation.priority,ok:true,cost:attempt.reservation.cost});}
 const progressed=await advance(run,attemptId);
 return {ok:progressed.ok,state:progressed.state,...(progressed.reason?{reason:progressed.reason}:{})};
}
/** After one provider read: settles its attempt, publishes what it verified, and starts the request's next read
 * (the next group, or the documented ZIG token fallback) in the same transaction. */
async function complete(run:Run,command:Extract<Command,{action:'complete'}>):Promise<Record<string,unknown>>{
 const {tx}=run,settled=await legacy(run,{action:'settle',id:command.id,outcome:command.outcome,...(command.category?{category:command.category}:{}),...(command.pairFailures?{pairFailures:command.pairFailures}:{})});
 const attempt=await tx.get<RetainedAttempt>(`attempt:${command.id}`),budget=await run.budget(),row=budget.reservations[command.id];
 run.observe({action:'settle',workClass:attempt?.endpoint?.split(':')[0],priority:attempt?.reservation.priority,ok:settled.ok===true,replay:settled.replay===true,reason:typeof settled.reason==='string'?settled.reason:undefined,cost:attempt?.reservation.cost,outcome:command.outcome,category:command.category,durationMs:row?.dispatchedAt===undefined?undefined:run.now-row.dispatchedAt});
 // A history 404 (Session S): the coin is refused for 15 minutes, so a repeated unknown ID costs one read.
 const history=attempt?.associations[0]?.work;
 if(command.notFound&&command.outcome==='failure'&&settled.ok===true&&settled.replay!==true&&attempt?.endpoint==='history:shared'&&history?.operation==='history'&&history.pair.marketRef.kind==='coin')await recordNotFound(tx,history.pair.marketRef.id,run.now);
 const published=[];
 for(const item of command.publish)published.push(await legacy(run,item.work.operation==='quote'?{action:'publish',id:command.id,work:item.work,quote:item.value}:{action:'publish-data',id:command.id,work:item.work,value:item.value}));
 let next:Record<string,unknown>|undefined;
 const bucket=row?.client;
 if(command.fallback&&command.outcome==='failure'&&settled.ok===true&&attempt)next=await fallbackAttempt(run,attempt,bucket);
 else if(command.next)next=await admitGroup(run,{charge:command.next.charge,associations:command.next.associations,bucket,checkFence:true});
 return {ok:settled.ok===true,settled,published,...(next?{next}:{})};
}
/** The documented ZIG token fallback after a failed /simple/price read, with `enqueue-read`'s parent checks. */
async function fallbackAttempt(run:Run,parent:RetainedAttempt,bucket?:string):Promise<Record<string,unknown>>{
 const {tx,now}=run,budget=await run.budget(),row=budget.reservations[parent.id];
 if(row?.status!=='SETTLED'||row.outcome!=='failure')return {ok:false,reason:'INVALID_TRANSITION'};
 if(await tx.get(`fallback:${parent.id}`))return {ok:false,reason:'DUPLICATE_OPERATION'};
 for(const a of parent.associations){const current=await tx.get<WorkState<MarketQuote>>(`work:${publicMarketWorkKey(a.work)}`);if(a.work.operation!=='quote'||a.work.pair.marketRef.kind!=='coin'||a.work.pair.marketRef.id!=='zignaly'||JSON.stringify(current?.lease)!==JSON.stringify(a.lease)||now>=Math.min(a.lease.deadline,a.lease.expiresAt))return {ok:false,reason:'FENCED'};}
 return admitGroup(run,{charge:'token',associations:parent.associations.map(a=>({work:a.work,lease:a.lease})),bucket,checkFence:false,parent:parent.id});
}
/** The original single-step commands, unchanged in what they decide. */
async function legacy(run:Run,command:Exclude<Command,{action:'acquire'|'acquire-many'|'follow'|'poll'|'forget'|'cancel-followers'|'inspect'|'inspect-metrics'|'admit'|'admit-group'|'complete'|'poll-many'|'forget-many'}>):Promise<Record<string,unknown>>{
 const {tx,config,now,periods}=run;let budget=await run.budget();const index=await tx.get<string[]>('work-index')??[];
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
  // The day's row budget also bounds the old path, including the ZIG fallback (its parent's client share applies).
  if(run.rowsSpent(await run.day()))return {ok:false,reason:'DAILY_LIMIT'};
  const client=command.parentId?budget.reservations[command.parentId]?.client:undefined;
  const attempt:ProviderAttempt={id:crypto.randomUUID(),reservation:{id:'',cost,priority:command.operation==='catalog'?'refresh':command.operation==='insights'?'optional':'interactive',kind:command.operation==='token'?'fallback':'request',...(client?{client}:{}),...(command.operation==='history'?{pool:'history' as const}:{})},associations:command.associations??[]};attempt.reservation.id=attempt.id;
  if(client){const usage=clientUsage(budget,client,now),today=(await run.day()).buckets[client]??[0,0];if(usage.active+1>run.limits.active||usage.minute+1>run.limits.minute||today[0]+cost>run.limits.credits)return {ok:false,reason:'CLIENT_LIMIT'};}
  const result=enqueue(budget,config.policy,attempt.reservation,now);if(!result.ok)return {ok:false,reason:result.reason};
  await tx.put('budget',result.state);run.setBudget(result.state);await rememberAttempt(tx,attempt,now,`${command.operation}:${command.associations?.[0]?.work.operation==='catalog'?command.associations[0].work.kind:'shared'}`);if(command.parentId)await tx.put(`fallback:${command.parentId}`,attempt.id);else for(const a of attempt.associations)await tx.put(`owner:${publicMarketWorkKey(a.work)}`,{token:a.lease.token,id:attempt.id});
  if(client){const day=await run.day(),usage=day.buckets[client]??[0,0];await tx.put(dayRow(utcDay(now)),{...day,buckets:{...day.buckets,[client]:[usage[0]+cost,usage[1]]}});}
  return {ok:true,id:attempt.id};
 }
 if(command.action==='enqueue'){
  if(new Set(command.associations.map(a=>publicMarketWorkKey(a.work))).size!==command.associations.length)return {ok:false,reason:'MALFORMED'};
  if(Object.keys(budget.reservations).length>=config.maxAttempts)return {ok:false,reason:'RETENTION_CAPACITY'};
  for(const association of command.associations){const current=await tx.get<WorkState<MarketQuote>>(`work:${publicMarketWorkKey(association.work)}`);if(!current?.lease||JSON.stringify(current.lease)!==JSON.stringify(association.lease)||now>=Math.min(current.lease.deadline,current.lease.expiresAt))return {ok:false,reason:'FENCED'};}
  for(const association of command.associations){const owner=await tx.get<{generation:number}>(`owner:${publicMarketWorkKey(association.work)}`);if(owner?.generation===association.lease.generation)return {ok:false,reason:'DUPLICATE_OPERATION'};}
  const kinds=new Set(command.associations.map(a=>a.work.operation==='quote'?a.work.pair.marketRef.kind:''));if(kinds.size!==1)return {ok:false,reason:'MALFORMED'};const cost=kinds.has('rwa')?config.operationCosts?.rwa:config.quoteCost;if(!cost)return {ok:false,reason:'POLICY_UNAVAILABLE'};
  if(run.rowsSpent(await run.day()))return {ok:false,reason:'DAILY_LIMIT'};
  const attempt=createProviderAttempt({id:crypto.randomUUID(),cost,priority:command.priority,kind:command.kind},command.associations);
  const result=enqueue(budget,config.policy,attempt.reservation,now);if(!result.ok)return {ok:false,reason:result.reason};
  await tx.put('budget',result.state);run.setBudget(result.state);await rememberAttempt(tx,attempt,now,kinds.has('rwa')?'quote:rwa':'quote:coin');for(const association of command.associations)await tx.put(`owner:${publicMarketWorkKey(association.work)}`,{generation:association.lease.generation,id:attempt.id});return {ok:true,id:attempt.id};
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
  // The catalog's ID index travels with its evidence (market-catalog-guard.ts).
  if(command.work.operation==='catalog')await writeCatalogIndex(tx,command.work.kind,(value as {assets:{ref:{id:string}}[]}).assets.map(asset=>asset.ref.id),result.state.lease!.generation);
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
  await tx.put('budget',result.state);budget=result.state;run.setBudget(budget);
  if(command.action==='cancel')await releaseCancelledWork(tx,attempt,now);
  if(command.action==='settle'||command.action==='cancel')await settleMarketBreakers(tx,config.breaker,attempt.breakers,command.action==='settle'?(command.outcome==='success'?'VERIFIED':command.category??'UNKNOWN'):'UNKNOWN',now,{endpoint:attempt.endpoint,accountThrottle:config.accountThrottle,pairFailures:command.action==='settle'?command.pairFailures:undefined});
  if(command.action==='settle'||command.action==='cancel')await tx.put(`attempt:${command.id}`,{...attempt,finishedAt:now,...(command.action==='settle'?{outcome:command.outcome,pairFailures:(command.pairFailures??[]).map(publicMarketWorkKey).sort()}:{cancelled:true})});}
 return {ok:result.ok,...(result.reason?{reason:result.reason}:{})};
}
