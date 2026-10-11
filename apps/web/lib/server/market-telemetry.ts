import * as z from 'zod';
import type {AtomicMarketStorage} from './durable-market-account';
export const marketTelemetryPolicy=z.object({enabled:z.literal(true),build:z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),retentionHours:z.number().int().min(1).max(168)}).strict();
type Policy=z.infer<typeof marketTelemetryPolicy>;
type Bucket={hour:number;counts:Record<string,number>;saturated?:true};
type State={version:1;build:string;buckets:Bucket[]};
type Observation={action:string;workClass?:string;priority?:string;status?:string;reason?:string;ok?:boolean;replay?:boolean;cost?:number;outcome?:string;category?:string;waitMs?:number;durationMs?:number};
const operations=new Set(['quote','catalog','history','insights','detail','token','rwa']);
const reasons=new Set(['HISTORY_LIMIT','UNKNOWN_ASSET','NOT_FOUND_RECENTLY','POLICY_UNAVAILABLE','POLICY_CHANGED','INVALID_REQUEST','CLOCK_OR_PERIOD','DUPLICATE_OPERATION','INVALID_TRANSITION','RESERVATION_EXPIRED','OWNERSHIP_EXPIRED','MINUTE_LIMIT','CONCURRENT_LIMIT','MONTHLY_LIMIT','MONITORING_LIMIT','OPTIONAL_LIMIT','QUEUE_LIMIT','QUEUE_WAIT','PAIR_BREAKER_OPEN','BREAKER_OPEN','RETENTION_CAPACITY','CACHE_CAPACITY','FENCED','MALFORMED','STALE_EVIDENCE','CLIENT_LIMIT','DAILY_LIMIT']);
const outcomes=new Set(['THROTTLED','UPSTREAM_5XX','TIMEOUT','NETWORK','AUTHENTICATION','ENTITLEMENT','MALFORMED','UNSUPPORTED','LOCAL_BUDGET','LOCAL_QUEUE','UNKNOWN']);
const duration=(ms:number)=>ms<100?'0-99ms':ms<1000?'100-999ms':ms<10000?'1-9s':'10s-plus';
/** One current-build aggregate, at most seven days of hourly bounded-label buckets.
 * No event logs or public work/pair identities. Expired buckets are removed on every
 * access; disabling or changing build clears the prior aggregate. No external sink. */
export async function readMarketTelemetry(tx:AtomicMarketStorage,policy:Policy|undefined,now:number):Promise<{enabled:false}|({enabled:true}&State)>{
 if(!policy){await tx.delete('telemetry');return {enabled:false};}
 const prior=await tx.get<State>('telemetry'),hour=Math.floor(now/3600000),state:State={version:1,build:policy.build,buckets:prior?.build===policy.build?prior.buckets.filter(b=>b.hour>hour-policy.retentionHours&&b.hour<=hour):[]};
 await tx.put('telemetry',state);return {enabled:true,...state};
}
export async function recordMarketTelemetry(tx:AtomicMarketStorage,policy:Policy|undefined,row:Observation,now:number){
 if(!policy)return;const state=await readMarketTelemetry(tx,policy,now);if(!state.enabled)return;
 const hour=Math.floor(now/3600000);let bucket=state.buckets.find(b=>b.hour===hour);if(!bucket){bucket={hour,counts:{}};state.buckets.push(bucket);}
 const add=(key:string,n=1)=>{if(!Number.isSafeInteger(n)||n<0)return;const sum=(bucket!.counts[key]??0)+n;if(!Number.isSafeInteger(sum)){bucket!.counts[key]=Number.MAX_SAFE_INTEGER;bucket!.saturated=true;}else bucket!.counts[key]=sum;};
 const workClass=operations.has(row.workClass??'')?row.workClass:'other';
 if(row.action==='acquire'){add('work.'+workClass);if(row.status==='CACHE_HIT')add('cache.hit');else if(row.status==='OWNER')add('cache.miss');else if(row.status==='WAITING')add('cache.coalesced');}
 if(row.ok===false)add('admission.'+(reasons.has(row.reason??'')?row.reason:'OTHER'));
 if(!row.replay&&row.ok){
  if(row.action==='reserve'){add('reserve.attempts');add('reserve.credits',row.cost??0);}
  if(row.action==='dispatch'){add('dispatch.attempts');add('dispatch.credits',row.cost??0);add('dispatch.'+workClass);if(['interactive','refresh','optional','monitoring'].includes(row.priority??''))add('priority.'+row.priority);if(Number.isFinite(row.waitMs)&&row.waitMs!>=0)add('wait.'+duration(row.waitMs!));}
  if(row.action==='settle'){add('outcome.'+(row.outcome==='success'?'VERIFIED':outcomes.has(row.category??'')?row.category:'UNKNOWN'));if(Number.isFinite(row.durationMs)&&row.durationMs!>=0)add('duration.'+duration(row.durationMs!));}
  if(row.action==='cancel')add('cancel.undispatched');
 }
 await tx.put('telemetry',{version:1,build:state.build,buckets:state.buckets});
}
