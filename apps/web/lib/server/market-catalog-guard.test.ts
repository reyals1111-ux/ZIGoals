import {test,expect} from 'vitest';
import {DurableMarketAccount,type AtomicMarketStorage} from './durable-market-account';
import {durableCatalog,durableHistory,durableInsights} from './market-durable-data';
import {dispatchDurableQuotes} from './durable-quote-dispatch';
// Session S Part 2, FIX_PLAN C2 (Q-WRK-02's rest): the real account authority and the real QuoteService orchestration
// with every committed storage write, every account command and every provider read counted, as in Session R1's
// market-request-cost.test.ts. The provider is a local fake; nothing leaves the process.
// Part 2a: failing first (`test.fails`): each case shows today's gap. Part 2b fixes the account and flips them.
class CountingStorage implements AtomicMarketStorage{
 rows=new Map<string,unknown>();writes=0;private gate=Promise.resolve();
 async get<T>(key:string){return structuredClone(this.rows.get(key)) as T|undefined;}
 async put(key:string,value:unknown){this.writes++;this.rows.set(key,structuredClone(value));}
 async delete(key:string){this.writes++;return this.rows.delete(key);}
 async transaction<T>(fn:(tx:AtomicMarketStorage)=>Promise<T>):Promise<T>{let release!:()=>void;const previous=this.gate;this.gate=new Promise(r=>{release=r;});await previous;const tx=new CountingStorage();tx.rows=structuredClone(this.rows);try{const result=await fn(tx);this.rows=tx.rows;this.writes+=tx.writes;return result;}finally{release();}}
}
const policy={providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:90,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:80,monthly:800},concurrent:2,queueLimit:16,reservationMs:20000,ownershipMs:10000};
const coin=(id:string,currency:'USD'|'EUR'='USD')=>({marketRef:{provider:'coingecko' as const,kind:'coin' as const,id},currency});
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(condition:()=>boolean,ms=5000){for(const end=Date.now()+ms;!condition();){if(Date.now()>end)throw Error('condition not reached');await sleep(5);}}
function deferred(){let resolve!:()=>void;const promise=new Promise<void>(r=>{resolve=r;});return {promise,resolve};}
/** A catalog large enough to be authoritative: 1,200 coins (coin-0 … coin-1199) and 20 RWAs. */
const COINS=Array.from({length:1200},(_,i)=>({id:`coin-${i}`,name:`Coin ${i}`,symbol:`c${i}`,platforms:{}}));
const RWAS=Array.from({length:20},(_,i)=>({id:`rwa-${i}`,name:`RWA ${i}`,symbol:`r${i}`,asset_type:'stock'}));
function account(overrides:Record<string,unknown>={}){
 const storage=new CountingStorage(),start=Date.now();
 const authority=new DurableMarketAccount(storage,()=>Date.now(),JSON.stringify({policy,month:{id:'guard-fixture',start:start-1000,end:start+3600000},quoteCost:3,operationCosts:{catalog:2,history:4,insights:5,token:6,rwa:7},leaseMs:20000,maxAttempts:128,maxWorks:64,...overrides}));
 const caller=()=>{const actions:string[]=[];return {actions,command:async(c:unknown)=>{actions.push(String((c as {action?:unknown}).action));return authority.apply(JSON.parse(JSON.stringify(c)));}};};
 const credits=async()=>Number((await authority.apply({action:'inspect'})).chargedCredits);
 return {storage,authority,caller,credits};
}
/** `notFound` coins answer 404 on their history; `hold` delays history reads only. */
function provider({notFound=[] as string[],hold}:{notFound?:string[];hold?:()=>Promise<void>}={}){
 const calls:string[]=[],ids:string[][]=[];
 const fetcher=(async(input:RequestInfo|URL)=>{
  const url=new URL(String(input)),requested=(url.searchParams.get('ids')??'').split(',').filter(Boolean),now=Date.now();calls.push(url.pathname);ids.push(requested);
  if(url.pathname.endsWith('/coins/list'))return json(COINS);
  if(url.pathname.endsWith('/rwas/list'))return json(RWAS);
  if(url.pathname.endsWith('/market_chart')){await hold?.();return notFound.some(id=>url.pathname.includes(`/coins/${id}/`))?json({error:'coin not found'},404):json({prices:[[now-1000,2],[now,3]]});}
  if(url.pathname.endsWith('/coins/markets'))return json(requested.map(id=>({id,last_updated:new Date(now).toISOString(),price_change_percentage_24h:1.5,sparkline_in_7d:{price:Array.from({length:168},(_,i)=>1+i/1000)}})));
  if(url.pathname.endsWith('/simple/price'))return json(Object.fromEntries(requested.map(id=>[id,{usd:2,eur:3,last_updated_at:Math.floor(now/1000)}])));
  throw Error('Unexpected provider path');
 }) as typeof fetch;
 return {calls,ids,fetcher};
}
async function withCatalog(a:ReturnType<typeof account>,p:ReturnType<typeof provider>){
 const catalog=await durableCatalog({command:a.caller().command,key:'fixture-key',fetcher:p.fetcher});
 expect(catalog.assets).toHaveLength(COINS.length+RWAS.length);expect(catalog.error).toBeNull();
}

test.fails('random asset IDs are refused against the server-held catalog: no provider call, no charge, no row written',async()=>{
 const a=account(),p=provider();await withCatalog(a,p);
 const calls=p.calls.length,credits=await a.credits(),writes=a.storage.writes;
 const random=Array.from({length:8},(_,i)=>coin(`random-${i}-${Math.random().toString(36).slice(2,8)}`));
 const quotes=await dispatchDurableQuotes(random,{command:a.caller().command,key:'fixture-key',fetcher:p.fetcher});
 const insights=await durableInsights(random,{command:a.caller().command,key:'fixture-key',fetcher:p.fetcher});
 const history=await durableHistory({...random[0]!,range:'1d'},{command:a.caller().command,key:'fixture-key',fetcher:p.fetcher});
 expect(quotes.quotes).toEqual([]);expect(quotes.results.map(r=>r.failure)).toEqual(random.map(()=>'UNSUPPORTED'));
 expect(insights.entries).toEqual([]);expect(history.history).toBeNull();
 expect(p.calls).toHaveLength(calls);expect(await a.credits()).toBe(credits);expect(a.storage.writes-writes).toBe(0);
},20000);

test.fails('a mixed request sends only the catalog IDs to the provider',async()=>{
 const a=account(),p=provider();await withCatalog(a,p);
 const result=await dispatchDurableQuotes([coin('coin-7'),coin('not-a-listed-coin')],{command:a.caller().command,key:'fixture-key',fetcher:p.fetcher});
 expect(result.results.map(r=>r.failure)).toEqual([null,'UNSUPPORTED']);
 expect(p.ids.at(-1)).toEqual(['coin-7']);
},20000);

test.fails('a repeated provider 404 uses one provider read and one charge',async()=>{
 const a=account(),p=provider({notFound:['coin-404']});await withCatalog(a,p);
 const credits=await a.credits(),charts=()=>p.calls.filter(path=>path.endsWith('/market_chart')).length;
 const first=await durableHistory({...coin('coin-404'),range:'1d'},{command:a.caller().command,key:'fixture-key',fetcher:p.fetcher});
 expect(first.history).toBeNull();expect(charts()).toBe(1);expect(await a.credits()).toBe(credits+4);
 const writes=a.storage.writes;
 for(const range of ['1d','7d','1d'] as const){
  const again=await durableHistory({...coin('coin-404'),range},{command:a.caller().command,key:'fixture-key',fetcher:p.fetcher});
  expect(again.history).toBeNull();
 }
 expect(charts()).toBe(1);expect(await a.credits()).toBe(credits+4);expect(a.storage.writes-writes).toBe(0);
},20000);

test.fails('history that saturates its share cannot block a quote',async()=>{
 const a=account(),gate=deferred(),p=provider({hold:()=>gate.promise});await withCatalog(a,p);
 try{
  // Three slow history reads (different coins, one client each) are started before the quote.
  const reads=[1,2,3].map(i=>durableHistory({...coin(`coin-${i}`),range:'1d'},{command:a.caller().command,key:'fixture-key',fetcher:p.fetcher,client:`v4:192.0.2.${i}`}));
  await until(()=>p.calls.filter(path=>path.endsWith('/market_chart')).length>=1);await sleep(100);
  const quote=await dispatchDurableQuotes([coin('coin-50')],{command:a.caller().command,key:'fixture-key',fetcher:p.fetcher,client:'v4:198.51.100.9'});
  expect(quote.results.map(r=>r.failure)).toEqual([null]);expect(quote.quotes).toHaveLength(1);
  gate.resolve();await Promise.all(reads);
 }finally{gate.resolve();}
},20000);
