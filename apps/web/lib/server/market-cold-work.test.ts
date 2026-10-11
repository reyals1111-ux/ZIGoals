import {test,expect} from 'vitest';
import {DurableMarketAccount,type AtomicMarketStorage} from './durable-market-account';
// Session U Part 2f: the public Alpha has no sign-in, so the new works its callers may start per UTC day are capped for
// all of them together (default: an eighth of the daily row budget; MARKET_POLICY.publicColdWorks overrides it), on top
// of each client's share. Cache hits and followers never count; the acceptance app ("friends") is not capped by it.
class Storage implements AtomicMarketStorage{
 rows=new Map<string,unknown>();
 async get<T>(key:string){return structuredClone(this.rows.get(key)) as T|undefined;}
 async put(key:string,value:unknown){this.rows.set(key,structuredClone(value));}
 async delete(key:string){return this.rows.delete(key);}
 async transaction<T>(fn:(tx:AtomicMarketStorage)=>Promise<T>):Promise<T>{const tx=new Storage();tx.rows=structuredClone(this.rows);const result=await fn(tx);this.rows=tx.rows;return result;}
}
const now=Date.parse('2026-10-05T10:00:00Z'),day='market-day:2026-10-05';
const policy={providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:90,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:80,monthly:800},concurrent:2,queueLimit:16,reservationMs:20000,ownershipMs:10000};
const config=(extra:Record<string,unknown>={})=>JSON.stringify({policy,calendar:{timeZone:'UTC',confirmed:true},quoteCost:1,leaseMs:20000,maxAttempts:128,maxWorks:64,dailyRowBudget:1000,...extra});
const quote=(id:string)=>({operation:'quote',pair:{marketRef:{provider:'coingecko',kind:'coin',id},currency:'USD'}});
const price=(id:string)=>({base:{network:'coingecko-coin',denom:id,decimals:0},marketRef:quote(id).pair.marketRef,currency:'USD',price:'2',priceDecimals:0,source:'CoinGecko',providerAssetId:id,verification:'VERIFIED',observedAt:new Date(now).toISOString(),fetchedAt:new Date(now).toISOString()});
const request=(ids:string[],client:string)=>({action:'acquire-many',works:ids.map(quote),groups:[{charge:'quote',members:ids.map((_,i)=>i)}],client});
const ids=(prefix:string,n:number)=>Array.from({length:n},(_,i)=>`${prefix}-${i}`);
type Reply={results:{ok?:boolean;status?:string;reason?:string}[];attempts:{id:string}[]};
const statuses=(reply:unknown)=>[...new Set((reply as Reply).results.map(r=>r.status??r.reason))];

test('the default cap is an eighth of the daily row budget, all public callers together; a refusal writes nothing',async()=>{
 const storage=new Storage(),account=new DurableMarketAccount(storage,()=>now,config());
 expect(await account.apply({action:'inspect'})).toMatchObject({publicWorksToday:0,publicWorkCap:125});
 storage.rows.set(day,{rows:300,buckets:{},publicWorks:120});
 // 120 + 8 > 125: the whole request is refused, without a row written.
 expect(statuses(await account.apply(request(ids('a',8),'v4:192.0.2.1'),{caller:'public'}))).toEqual(['DAILY_LIMIT']);
 expect(storage.rows.get(day)).toEqual({rows:300,buckets:{},publicWorks:120});
 // Unlabelled is public too.
 expect(statuses(await account.apply(request(ids('a',8),'v4:192.0.2.1')))).toEqual(['DAILY_LIMIT']);
 // 120 + 5 = 125 fits; then nothing more for any public client.
 expect(statuses(await account.apply(request(ids('b',5),'v4:192.0.2.2'),{caller:'public'}))).toEqual(['OWNER']);
 expect((storage.rows.get(day) as {publicWorks:number}).publicWorks).toBe(125);
 expect(statuses(await account.apply(request(['c-0'],'v4:192.0.2.3'),{caller:'public'}))).toEqual(['DAILY_LIMIT']);
 // The acceptance app is not counted or capped by it.
 expect(statuses(await account.apply(request(ids('d',8),'v4:192.0.2.4'),{caller:'friends'}))).toEqual(['OWNER']);
 expect((storage.rows.get(day) as {publicWorks:number}).publicWorks).toBe(125);
 expect(await account.apply({action:'inspect'})).toMatchObject({publicWorksToday:125,publicWorkCap:125});
});

test('cache hits and followers stay free after the cap is spent',async()=>{
 const storage=new Storage(),account=new DurableMarketAccount(storage,()=>now,config({publicColdWorks:2}));
 // The acceptance app fetches and publishes bitcoin, and has ethereum in flight (a live lease).
 const owner=await account.apply(request(['bitcoin'],'v4:192.0.2.9'),{caller:'friends'}) as Reply;
 expect(await account.apply({action:'complete',id:owner.attempts[0]!.id,outcome:'success',publish:[{work:quote('bitcoin'),value:price('bitcoin')}]},{caller:'friends'})).toMatchObject({ok:true});
 expect(statuses(await account.apply(request(['ethereum'],'v4:192.0.2.9'),{caller:'friends'}))).toEqual(['OWNER']);
 storage.rows.set(day,{...(storage.rows.get(day) as object),publicWorks:2});
 expect(statuses(await account.apply(request(['solana'],'v4:192.0.2.5'),{caller:'public'}))).toEqual(['DAILY_LIMIT']);
 expect(statuses(await account.apply(request(['bitcoin'],'v4:192.0.2.5'),{caller:'public'}))).toEqual(['CACHE_HIT']);
 expect(statuses(await account.apply({...request(['ethereum'],'v4:192.0.2.5'),follow:{waitMs:1000}},{caller:'public'}))).toEqual(['WAITING']);
 expect((storage.rows.get(day) as {publicWorks:number}).publicWorks).toBe(2);
});

test('MARKET_POLICY.publicColdWorks overrides the default; an invalid value is not a policy',async()=>{
 const storage=new Storage(),account=new DurableMarketAccount(storage,()=>now,config({publicColdWorks:10}));
 expect(statuses(await account.apply(request(ids('e',11),'v4:192.0.2.6'),{caller:'public'}))).toEqual(['DAILY_LIMIT']);
 expect(statuses(await account.apply(request(ids('e',10),'v4:192.0.2.6'),{caller:'public'}))).toEqual(['OWNER']);
 for(const publicColdWorks of [0,-1,1.5,'10',10000001])expect(await new DurableMarketAccount(new Storage(),()=>now,config({publicColdWorks})).apply({action:'inspect'})).toEqual({ok:false,reason:'POLICY_UNAVAILABLE'});
});
