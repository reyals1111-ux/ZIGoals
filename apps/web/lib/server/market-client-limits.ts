import type {AtomicMarketStorage} from './durable-market-account';
import type {BudgetState} from './market-budget-policy';
/** The default for MARKET_POLICY.dailyRowBudget: the rows the account object may write per UTC day before it
 * refuses new cold work. 20,000 is a fifth of Workers Free's 100,000 daily rows written. */
export const DEFAULT_DAILY_ROW_BUDGET=20000;
/** Fair per-client shares of the shared budget, all derived from the policy. */
export type ClientLimits={minute:number;active:number;held:number;followers:number;credits:number;works:number};
export function clientLimits(config:{policy:{operating:{minute:number;monthly:number};queueLimit:number};maxWorks:number},rowBudget:number):ClientLimits{
 const share=(n:number,d:number)=>Math.max(1,Math.floor(n/d));
 return {minute:share(config.policy.operating.minute,4),active:share(config.policy.queueLimit,4),held:share(config.maxWorks,2),followers:32,credits:share(config.policy.operating.monthly,31),works:share(rowBudget,16)};
}
/** A client is a bucket, one of 4,096: the first 12 bits of an HMAC-SHA256 of its address group under a random
 * key that changes every UTC day. Neither the address nor the group is stored, the bucket cannot be targeted
 * without the key, and the key's rows are deleted with the day rows. A shared bucket only makes limits stricter. */
export const CLIENT_BUCKET=/^b[0-9a-f]{3}$/;
export const clientKeyRow='market-client-key';
export type ClientKey={day:string;key:string};
export async function clientBucket(key:string,group:string):Promise<string>{
 const bytes=new Uint8Array(key.match(/../g)!.map(h=>parseInt(h,16)));
 const hmac=await crypto.subtle.importKey('raw',bytes,{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const mac=new Uint8Array(await crypto.subtle.sign('HMAC',hmac,new TextEncoder().encode(group)));
 return 'b'+((mac[0]!<<4)|(mac[1]!>>4)).toString(16).padStart(3,'0');
}
export function newClientKey(){return [...crypto.getRandomValues(new Uint8Array(32))].map(v=>v.toString(16).padStart(2,'0')).join('');}
export const utcDay=(now:number)=>new Date(now).toISOString().slice(0,10);
/** Per UTC day: the rows this object wrote, and each client bucket's [credits, new works]. `cancels` (Session S, additive)
 * counts new cancellation fences: in all, and per client bucket. */
export type MarketDay={rows:number;buckets:Record<string,[number,number]>;cancels?:{n:number;buckets:Record<string,number>};publicRows?:number;publicWorks?:number};
/** Session U Part 2e: the calling app. 'friends' is the acceptance app (it has the private sync binding), 'public' the
 * public Alpha; an unlabelled caller is public. With `MARKET_POLICY.partition`, the public caller's commits are counted
 * in `publicRows` and stop admitting new work at `publicPercent` of the day's rows, so the public Alpha can never spend
 * the acceptance app's share. Without it the label changes nothing. */
export type MarketCaller='public'|'friends';
export const publicRowCap=(rowBudget:number,publicPercent:number)=>Math.floor(rowBudget*publicPercent/100);
/** New cancellation fences per UTC day: a 64th of the row budget in all, and an eighth of that per client bucket. A cancel
 * without a client (local runtimes, or an app older than Session S) counts only toward the total. */
export function cancelQuota(rowBudget:number){const total=Math.max(1,Math.floor(rowBudget/64));return {total,client:Math.max(1,Math.floor(total/8))};}
export const dayRow=(day:string)=>`market-day:${day}`;
const dayIndex='market-days';
export async function readDay(tx:AtomicMarketStorage,day:string):Promise<MarketDay>{return await tx.get<MarketDay>(dayRow(day))??{rows:0,buckets:{}};}
/** Retention: day rows older than the previous UTC day are deleted, at most `limit` per call, so none outlives
 * about 48 hours of commits. Returns the index after pruning. */
export async function pruneDays(tx:AtomicMarketStorage,now:number,limit=4){
 const today=utcDay(now),yesterday=utcDay(now-86400000),index=await tx.get<string[]>(dayIndex)??[];
 const old=index.filter(day=>day<yesterday).slice(0,limit);
 for(const day of old)await tx.delete(dayRow(day));
 const next=[...new Set([...index.filter(day=>!old.includes(day)),today])].sort();
 await tx.put(dayIndex,next);
}
/** Idle retention (Session S, FIX_PLAN C7): pruneDays runs only with a commit, so an object that goes quiet would keep its
 * last day rows and client key. The account's alarm calls this: day rows older than yesterday and an earlier day's key
 * are deleted. Returns how many retained rows remain, so the alarm re-arms only while there are some. */
export async function sweepClientRows(storage:AtomicMarketStorage,now:number):Promise<number>{
 return storage.transaction(async tx=>{
  const today=utcDay(now),yesterday=utcDay(now-86400000),index=await tx.get<string[]>(dayIndex)??[],old=index.filter(day=>day<yesterday);
  for(const day of old)await tx.delete(dayRow(day));
  if(old.length)await tx.put(dayIndex,index.filter(day=>!old.includes(day)));
  const key=await tx.get<ClientKey>(clientKeyRow);if(key&&key.day<today)await tx.delete(clientKeyRow);
  return index.length-old.length+(key&&key.day>=today?1:0);
 });
}
/** Budget rows of this bucket: attempts in the rolling minute, attempts not yet finished, and the works they hold. */
export function clientUsage(budget:BudgetState,bucket:string,now:number){
 const rows=Object.values(budget.reservations).filter(row=>row.client===bucket);
 const active=rows.filter(row=>['QUEUED','RESERVED','OWNED','DISPATCHED'].includes(row.status));
 return {minute:rows.filter(row=>(row.dispatchedAt??row.reservedAt)>now-60000).length,active:active.length,held:active.reduce((n,row)=>n+(row.works??0),0)};
}
