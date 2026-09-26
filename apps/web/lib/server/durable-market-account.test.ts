import {test,expect} from 'vitest';
import type {BudgetState} from './market-budget-policy';
import {DurableMarketAccount,type AtomicMarketStorage} from './durable-market-account';
class Storage implements AtomicMarketStorage{
 rows=new Map<string,unknown>();fail=false;private gate=Promise.resolve();
 async get<T>(key:string){return structuredClone(this.rows.get(key)) as T|undefined;}async put(key:string,value:unknown){if(this.fail)throw Error('injected storage failure');this.rows.set(key,structuredClone(value));}
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
