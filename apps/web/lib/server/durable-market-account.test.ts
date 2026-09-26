import {test,expect} from 'vitest';
import type {BudgetState} from './market-budget-policy';
import {DurableMarketAccount,type AtomicMarketStorage} from './durable-market-account';
class Storage implements AtomicMarketStorage{
 rows=new Map<string,unknown>();fail=false;private gate=Promise.resolve();
 async get<T>(key:string){return structuredClone(this.rows.get(key)) as T|undefined;}async put(key:string,value:unknown){if(this.fail)throw Error('injected storage failure');this.rows.set(key,structuredClone(value));}
 async delete(key:string){this.rows.delete(key);}
 async transaction<T>(fn:(tx:AtomicMarketStorage)=>Promise<T>):Promise<T>{let release!:()=>void;const previous=this.gate;this.gate=new Promise(r=>{release=r;});await previous;const tx=new Storage();tx.rows=structuredClone(this.rows);tx.fail=this.fail;try{const result=await fn(tx);this.rows=tx.rows;return result;}finally{release();}}
}
const policy={providerMinuteLimit:10,providerMonthlyLimit:100,operating:{minute:8,monthly:80},monitoringReserve:{minute:1,monthly:10},monitoringMaximum:{minute:1,monthly:10},optionalCeiling:{minute:5,monthly:50},concurrent:1,queueLimit:4,reservationMs:10000,ownershipMs:2000};
const work=(id:string)=>({operation:'quote',pair:{marketRef:{provider:'coingecko',kind:'coin',id},currency:'USD'}});
const config={policy,month:{id:'synthetic',start:0,end:100000},quoteCost:3,leaseMs:1000,maxAttempts:16,maxWorks:8};
function setup(overrides={}){const storage=new Storage();let now=100;const account=new DurableMarketAccount(storage,()=>now,JSON.stringify({...config,...overrides}));return {storage,account,advance:(n:number)=>{now=n;}};}
async function attempt(account:DurableMarketAccount,ids=['bitcoin']){const associations=[];for(const id of ids){const acquired=await account.apply({action:'acquire',work:work(id)});associations.push({work:work(id),lease:acquired.lease});}const response=await account.apply({action:'enqueue',priority:'interactive',kind:'request',associations});return {associations,...response,id:response.id};}
test('missing mandatory policy and private fields fail closed without writes',async()=>{const s=new Storage();expect(await new DurableMarketAccount(s,()=>100,undefined).apply({action:'inspect'})).toMatchObject({ok:false,reason:'POLICY_UNAVAILABLE'});const {account}=setup();expect(await account.apply({action:'acquire',work:{...work('bitcoin'),wallet:'private'}})).toMatchObject({reason:'MALFORMED'});expect(s.rows.size).toBe(0);});
test('a lease cannot enqueue twice; expiration prevents dispatch and late publication',async()=>{const {account,advance}=setup();const a=await attempt(account);expect(await account.apply({action:'enqueue',priority:'interactive',kind:'request',associations:[...a.associations,...a.associations]})).toMatchObject({reason:'MALFORMED'});expect(await account.apply({action:'enqueue',priority:'interactive',kind:'request',associations:a.associations})).toMatchObject({reason:'DUPLICATE_OPERATION'});await account.apply({action:'reserve',id:a.id});await account.apply({action:'own',id:a.id});advance(1100);expect(await account.apply({action:'dispatch',id:a.id})).toMatchObject({reason:'FENCED'});expect(await account.apply({action:'cancel',id:a.id})).toMatchObject({ok:true});});
test('many public keys charge one configured attempt; holds and dispatched failures remain distinct',async()=>{const {account}=setup();const a=await attempt(account,['bitcoin','ethereum','solana']);await account.apply({action:'reserve',id:a.id});expect(await account.apply({action:'inspect'})).toMatchObject({chargedCredits:0,attempts:1});await account.apply({action:'own',id:a.id});await account.apply({action:'dispatch',id:a.id});await account.apply({action:'settle',id:a.id,outcome:'failure'});expect(await account.apply({action:'inspect'})).toMatchObject({chargedCredits:3,attempts:1});expect(await account.apply({action:'cancel',id:a.id})).toMatchObject({ok:false});expect(await account.apply({action:'settle',id:a.id,outcome:'failure'})).toMatchObject({ok:true,replay:true});expect(await account.apply({action:'settle',id:a.id,outcome:'success'})).toMatchObject({ok:false});});
test('clock regression, fixed period expiry and bounded retention never recreate allowance',async()=>{const {account,advance}=setup({maxAttempts:1,maxWorks:2});const a=await attempt(account);expect(await account.apply({action:'cancel',id:a.id})).toMatchObject({ok:true});expect(await attempt(account,['ethereum'])).toMatchObject({reason:'RETENTION_CAPACITY'});advance(99);expect(await account.apply({action:'inspect'})).toMatchObject({reason:'CLOCK_OR_PERIOD'});const b=setup();const op=await attempt(b.account);b.advance(100000);expect(await b.account.apply({action:'reserve',id:op.id})).toMatchObject({reason:'CLOCK_OR_PERIOD'});});
test('shared key capacity and storage failure deny new ownership instead of losing accounting',async()=>{const {account,storage}=setup({maxWorks:1});await account.apply({action:'acquire',work:work('bitcoin')});expect(await account.apply({action:'acquire',work:work('ethereum')})).toMatchObject({reason:'CACHE_CAPACITY'});const before=structuredClone(storage.rows);storage.fail=true;expect(await account.apply({action:'acquire',work:work('solana')})).toMatchObject({reason:'STORAGE_UNAVAILABLE'});expect(storage.rows).toEqual(before);});
test('an expired owner cannot publish after a successor',async()=>{
 const {account,advance}=setup();const a=await attempt(account);await account.apply({action:'reserve',id:a.id});await account.apply({action:'own',id:a.id});await account.apply({action:'dispatch',id:a.id});
 const quote={base:{network:'coingecko-coin',denom:'bitcoin',decimals:0},marketRef:work('bitcoin').pair.marketRef,currency:'USD',price:'123',priceDecimals:2,source:'CoinGecko',providerAssetId:'bitcoin',verification:'VERIFIED',fetchedAt:new Date(100).toISOString()};
 advance(1100);expect(await account.apply({action:'acquire',work:work('bitcoin')})).toMatchObject({status:'OWNER'});expect(await account.apply({action:'publish',id:a.id,work:work('bitcoin'),quote})).toMatchObject({ok:false,reason:'FENCED'});
});
test('refresh cannot overwrite retained evidence with an older provider observation',async()=>{
 const {account,advance}=setup({month:{id:'long-fixture',start:0,end:10000000}});const quote={base:{network:'coingecko-coin',denom:'bitcoin',decimals:0},marketRef:work('bitcoin').pair.marketRef,currency:'USD',price:'123',priceDecimals:2,source:'CoinGecko',providerAssetId:'bitcoin',verification:'VERIFIED',fetchedAt:new Date(100).toISOString()};
 async function dispatch(){const a=await attempt(account);for(const action of ['reserve','own','dispatch'])expect(await account.apply({action,id:a.id})).toMatchObject({ok:true});return a;}
 const first=await dispatch();expect(await account.apply({action:'publish',id:first.id,work:work('bitcoin'),quote})).toMatchObject({ok:true});await account.apply({action:'settle',id:first.id,outcome:'success'});
 advance(900101);const second=await dispatch();expect(await account.apply({action:'publish',id:second.id,work:work('bitcoin'),quote:{...quote,fetchedAt:new Date(50).toISOString()}})).toMatchObject({reason:'STALE_EVIDENCE'});expect(await account.apply({action:'acquire',work:work('bitcoin')})).toMatchObject({status:'WAITING',degraded:true,quote});
});

test('every physical endpoint read reserves its configured cost in the same authority; missing costs are a setup gate',async()=>{
 const {account}=setup({operationCosts:{catalog:2,history:4,insights:5,token:6,rwa:7}});
 for(const [operation,cost] of [['catalog',2],['history',4],['insights',5],['token',6],['rwa',7]] as const){
  const a=await account.apply({action:'enqueue-read',operation});expect(a.ok).toBe(true);
  for(const action of ['reserve','own','dispatch'])expect(await account.apply({action,id:a.id})).toMatchObject({ok:true});
  expect(await account.apply({action:'settle',id:a.id,outcome:'failure'})).toMatchObject({ok:true});
  expect((await account.apply({action:'inspect'})).chargedCredits).toBe([2,6,11,17,24][['catalog','history','insights','token','rwa'].indexOf(operation)]);
  expect(cost).toBeGreaterThan(0);
 }
 expect(await setup().account.apply({action:'enqueue-read',operation:'history'})).toMatchObject({ok:false,reason:'POLICY_UNAVAILABLE'});
 expect(await account.apply({action:'enqueue-read',operation:'arbitrary-url'})).toMatchObject({ok:false,reason:'MALFORMED'});
});
test('confirmed UTC calendar rolls periods; unconfirmed reset never invents monthly allowance',async()=>{
 const storage=new Storage();let now=Date.parse('2026-09-30T23:59:59Z');
 const raw={...config,month:undefined,calendar:{timeZone:'UTC',confirmed:true},operationCosts:{history:2}};
 const account=new DurableMarketAccount(storage,()=>now,JSON.stringify(raw));
 async function send(){const a=await account.apply({action:'enqueue-read',operation:'history'});for(const action of ['reserve','own','dispatch'])expect(await account.apply({action,id:a.id})).toMatchObject({ok:true});return a.id;}
 const first=await send();now+=2000;expect(await account.apply({action:'settle',id:first,outcome:'failure'})).toMatchObject({ok:true});await send();
 expect((await storage.get<BudgetState>('budget'))?.periods?.month.id).toBe('2026-10');
 expect(await new DurableMarketAccount(new Storage(),()=>now,JSON.stringify({...raw,calendar:{timeZone:'UTC',confirmed:false}})).apply({action:'inspect'})).toMatchObject({reason:'POLICY_UNAVAILABLE'});
});

test('ZIG token fallback and RWA quote own distinct charged attempts and publish only their immutable associations',async()=>{
 const {dispatchDurableQuotes}=await import('./durable-quote-dispatch');
 const {account}=setup({operationCosts:{token:6,rwa:7}}),seen:string[]=[];
 const requests=[{marketRef:{provider:'coingecko' as const,kind:'coin' as const,id:'zignaly'},currency:'USD' as const},{marketRef:{provider:'coingecko' as const,kind:'rwa' as const,id:'gold',assetType:'commodity' as const},currency:'USD' as const}];
 const fetcher:typeof fetch=async input=>{const url=new URL(String(input));seen.push(url.pathname);if(url.pathname.includes('/simple/price'))return new Response('{}',{headers:{'content-type':'application/json'}});if(url.pathname.includes('token_price'))return Response.json({'0xb2617246d0c6c0087f18703d576831899ca94f01':{usd:2,last_updated_at:1}});return Response.json([{id:'gold',asset_type:'commodity',tokenized_market_data:{current_price:3}}]);};
 const first=await dispatchDurableQuotes(requests,{command:body=>account.apply(body),key:'fixture',clock:()=>1000,fetcher});
 expect(first.complete).toBe(true);expect(first.quotes.map(q=>q.price)).toEqual(['2','3']);expect(seen).toEqual(['/api/v3/simple/price','/api/v3/simple/token_price/ethereum','/api/v3/rwas/markets']);expect(await account.apply({action:'inspect'})).toMatchObject({attempts:3,chargedCredits:16});
 const second=await dispatchDurableQuotes(requests,{command:body=>account.apply(body),key:'fixture',clock:()=>1000,fetcher});expect(second.quotes).toEqual(first.quotes);expect(seen).toHaveLength(3);
});

test('nonquote evidence is durably fenced, coalesced and retained at its original freshness',async()=>{
 const {account,advance}=setup({operationCosts:{history:4},month:{id:'long',start:0,end:10000000}});
 const work={operation:'history',pair:{marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'},range:'1d'};
 const owner=await account.apply({action:'acquire',work});expect(owner.status).toBe('OWNER');expect(await account.apply({action:'acquire',work})).toMatchObject({status:'WAITING'});
 const attempt=await account.apply({action:'enqueue-read',operation:'history',associations:[{work,lease:owner.lease}]});expect(attempt.ok).toBe(true);
 for(const action of ['reserve','own','dispatch'])expect(await account.apply({action,id:attempt.id})).toMatchObject({ok:true});
 const value={...work.pair,range:'1d',source:'CoinGecko',fetchedAt:new Date(100).toISOString(),points:[]};
 expect(await account.apply({action:'publish-data',id:attempt.id,work,value})).toMatchObject({ok:true});
 expect(await account.apply({action:'acquire',work})).toMatchObject({status:'CACHE_HIT',value});
 advance(900101);const successor=await account.apply({action:'acquire',work});expect(successor).toMatchObject({status:'OWNER',value,degraded:true});
 expect(await account.apply({action:'publish-data',id:attempt.id,work,value})).toMatchObject({ok:false,reason:'FENCED'});
});

test('history followers do not dispatch, stale evidence survives failure, and LRU reuse fences old publications',async()=>{
 const {durableHistory}=await import('./market-durable-data');const {account,advance}=setup({operationCosts:{history:4},maxWorks:1,month:{id:'long',start:0,end:10000000}});
 const request={marketRef:{provider:'coingecko' as const,kind:'coin' as const,id:'bitcoin'},currency:'USD' as const,range:'1d' as const};let now=100,calls=0,release!:()=>void,sent!:()=>void;
 const started=new Promise<void>(r=>{sent=r;}),held=new Promise<void>(r=>{release=r;});let failed=false;
 const context={command:(c:unknown)=>account.apply(c),key:'fixture',clock:()=>now,fetcher:async()=>{calls++;sent();await held;return failed?new Response('',{status:503}):Response.json({prices:[[50,2],[100,3]]});}};
 const owner=durableHistory(request,context);await started;const follower=await durableHistory(request,context);expect(follower.history).toBeNull();expect(calls).toBe(1);release();const first=await owner;expect(first.history?.fetchedAt).toBe(new Date(100).toISOString());
 now=900101;advance(now);failed=true;const stale=await durableHistory(request,context);expect(stale.history).toEqual(first.history);expect(stale.stale).toBe(true);expect(stale.error).toBeTruthy();expect(calls).toBe(2);
 now+=1001;advance(now);const other={operation:'history',pair:{...request,marketRef:{...request.marketRef,id:'ethereum'},range:undefined},range:'1d'};delete (other.pair as {range?:unknown}).range;
 expect(await account.apply({action:'acquire',work:other})).toMatchObject({status:'OWNER'});expect(await account.apply({action:'inspect'})).toMatchObject({workKeys:1});
});

test('terminal compaction preserves monthly credits and retry receipts; pruning never recreates authority',async()=>{
 const tiny={...policy,providerMonthlyLimit:10,operating:{minute:8,monthly:4},monitoringReserve:{minute:1,monthly:1},monitoringMaximum:{minute:1,monthly:1},optionalCeiling:{minute:5,monthly:3}};
 const {account,advance}=setup({policy:tiny,operationCosts:{history:2},maxAttempts:1,retryRetentionMs:60000,month:{id:'long',start:0,end:10000000}});
 const a=await account.apply({action:'enqueue-read',operation:'history'});for(const action of ['reserve','own','dispatch'])expect(await account.apply({action,id:a.id})).toMatchObject({ok:true});await account.apply({action:'settle',id:a.id,outcome:'success'});
 advance(60200);expect(await account.apply({action:'inspect'})).toMatchObject({attempts:0,archivedAttempts:1,chargedCredits:2});expect(await account.apply({action:'settle',id:a.id,outcome:'success'})).toMatchObject({ok:true,replay:true});
 const b=await account.apply({action:'enqueue-read',operation:'history'});expect(await account.apply({action:'reserve',id:b.id})).toMatchObject({ok:false,reason:'MONTHLY_LIMIT'});
 advance(120101);expect(await account.apply({action:'settle',id:a.id,outcome:'success'})).toMatchObject({ok:false,reason:'INVALID_TRANSITION'});expect(await account.apply({action:'inspect'})).toMatchObject({chargedCredits:2});
});
test('crashed dispatched work releases concurrency only after its hard horizon while remaining charged',async()=>{
 const {account,advance}=setup({operationCosts:{history:2}});const a=await account.apply({action:'enqueue-read',operation:'history'});for(const action of ['reserve','own','dispatch'])await account.apply({action,id:a.id});advance(10100);
 expect(await account.apply({action:'inspect'})).toMatchObject({dispatched:0,chargedCredits:2});expect(await account.apply({action:'settle',id:a.id,outcome:'success'})).toMatchObject({ok:false});expect(await account.apply({action:'settle',id:a.id,outcome:'failure'})).toMatchObject({ok:true,replay:true});
});
test('persisted account-authentication breaker blocks other endpoints; one budgeted recovery probe survives restart',async()=>{
 const breaker={threshold:1,windowMs:10000,cooldownMs:2000,maxCooldownMs:8000,halfOpenProbes:1};
 const {account,storage,advance}=setup({operationCosts:{history:2,insights:3},breaker});
 async function prepared(operation:string){const a=await account.apply({action:'enqueue-read',operation});for(const action of ['reserve','own'])expect(await account.apply({action,id:a.id})).toMatchObject({ok:true});return a;}
 const first=await prepared('history');expect(await account.apply({action:'dispatch',id:first.id})).toMatchObject({ok:true});await account.apply({action:'settle',id:first.id,outcome:'failure',category:'AUTHENTICATION'});
 const next=await prepared('insights');expect(await account.apply({action:'dispatch',id:next.id})).toMatchObject({ok:false,reason:'BREAKER_OPEN'});await account.apply({action:'cancel',id:next.id});expect(await account.apply({action:'inspect'})).toMatchObject({chargedCredits:2});
 advance(2100);const restarted=new DurableMarketAccount(storage,()=>2100,JSON.stringify({...config,operationCosts:{history:2,insights:3},breaker}));
 const recovery=await restarted.apply({action:'enqueue-read',operation:'insights'});for(const action of ['reserve','own','dispatch'])expect(await restarted.apply({action,id:recovery.id})).toMatchObject({ok:true});await restarted.apply({action:'settle',id:recovery.id,outcome:'success'});
 expect(await restarted.apply({action:'inspect'})).toMatchObject({chargedCredits:5});
});

test('evicted work-slot reuse cannot authorize a former UUID lease even when numeric generation restarts',async()=>{
 const {account,advance}=setup({maxWorks:1});const first=await attempt(account);for(const action of ['reserve','own','dispatch'])await account.apply({action,id:first.id});
 const quote={base:{network:'coingecko-coin',denom:'bitcoin',decimals:0},marketRef:work('bitcoin').pair.marketRef,currency:'USD',price:'123',priceDecimals:2,source:'CoinGecko',providerAssetId:'bitcoin',verification:'VERIFIED',fetchedAt:new Date(100).toISOString()};
 expect(await account.apply({action:'publish',id:first.id,work:work('bitcoin'),quote})).toMatchObject({ok:true});expect(await account.apply({action:'publish',id:first.id,work:work('bitcoin'),quote})).toMatchObject({ok:true,replay:true});await account.apply({action:'settle',id:first.id,outcome:'success'});
 advance(1101);expect(await account.apply({action:'acquire',work:work('ethereum')})).toMatchObject({status:'OWNER'});advance(2102);const successor=await account.apply({action:'acquire',work:work('bitcoin')});expect(successor).toMatchObject({status:'OWNER'});expect(successor.lease).not.toEqual(first.associations[0]?.lease);
 expect(await account.apply({action:'publish',id:first.id,work:work('bitcoin'),quote})).toMatchObject({ok:false,reason:'FENCED'});
});
