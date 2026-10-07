import {test,expect} from 'vitest';
import {DurableMarketAccount,type AtomicMarketStorage} from './durable-market-account';
import {durableDetails,durableInsights} from './market-durable-data';
import {evictMarketWorks} from './market-cache-storage';
import {publicMarketWorkKey} from './market-coordinator';
import {marketInsightSchema} from '../market-insights';
import {DETAIL_NOT_PROVIDED,DETAIL_UNAVAILABLE} from '../market-detail';
// Session W Part 15: QuoteService /insights-detail through the real account authority (the harness of
// market-request-cost.test.ts). Details are admitted and charged as insights (their cost, priority, endpoint and breakers),
// cached under their own `detail` work key; insights rows and reads are unchanged. The provider is a local fake.
class CountingStorage implements AtomicMarketStorage{
 rows=new Map<string,unknown>();writes=0;private gate=Promise.resolve();
 async get<T>(key:string){return structuredClone(this.rows.get(key)) as T|undefined;}
 async put(key:string,value:unknown){this.writes++;this.rows.set(key,structuredClone(value));}
 async delete(key:string){this.writes++;return this.rows.delete(key);}
 async transaction<T>(fn:(tx:AtomicMarketStorage)=>Promise<T>):Promise<T>{let release!:()=>void;const previous=this.gate;this.gate=new Promise(r=>{release=r;});await previous;const tx=new CountingStorage();tx.rows=structuredClone(this.rows);try{const result=await fn(tx);this.rows=tx.rows;this.writes+=tx.writes;return result;}finally{release();}}
}
const policy={providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:90,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:80,monthly:800},concurrent:4,queueLimit:16,reservationMs:20000,ownershipMs:10000};
const coin=(id:string,currency:'USD'|'EUR'='USD')=>({marketRef:{provider:'coingecko' as const,kind:'coin' as const,id},currency});
const json=(value:unknown)=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
function account(overrides:Record<string,unknown>={}){
 const storage=new CountingStorage(),start=Date.now();
 const authority=new DurableMarketAccount(storage,()=>Date.now(),JSON.stringify({policy,month:{id:'cost-fixture',start:start-1000,end:start+3600000},quoteCost:3,operationCosts:{history:4,insights:5,token:6,rwa:7},leaseMs:20000,maxAttempts:128,maxWorks:64,...overrides}));
 /** One caller's view: each call is what QuoteService sends as one Durable Object request. */
 const caller=()=>{const actions:string[]=[],done:string[]=[];return {actions,done,command:async(c:unknown)=>{const action=String((c as {action?:unknown}).action);actions.push(action);const result=await authority.apply(JSON.parse(JSON.stringify(c)));done.push(action);return result;}};};
 return {storage,authority,caller};
}
function provider(hold?:()=>Promise<void>){
 const calls:string[]=[];
 const fetcher=(async(input:RequestInfo|URL)=>{
  const url=new URL(String(input)),ids=(url.searchParams.get('ids')??'').split(',').filter(Boolean),now=Date.now();calls.push(url.pathname+url.search);await hold?.();
  if(url.pathname.endsWith('/coins/markets'))return url.searchParams.get('price_change_percentage')==='1h,24h,7d'?json(ids.map(id=>({id,last_updated:new Date(now).toISOString(),price_change_percentage_1h_in_currency:0.5,price_change_percentage_24h_in_currency:1.5,price_change_percentage_7d_in_currency:-3,market_cap:1000000,total_volume:250000,circulating_supply:900,total_supply:1000,max_supply:null}))):json(ids.map(id=>({id,last_updated:new Date(now).toISOString(),price_change_percentage_24h:1.5,sparkline_in_7d:{price:Array.from({length:168},(_,i)=>1+i/1000)}})));
  if(url.pathname.endsWith('/simple/price'))return json(Object.fromEntries(ids.map(id=>[id,{usd:2,eur:3,last_updated_at:Math.floor(now/1000)}])));
  if(url.pathname.endsWith('/market_chart'))return json({prices:[[now-1000,2],[now,3]]});
  throw Error('Unexpected provider path');
 }) as typeof fetch;
 return {calls,fetcher};
}
const DETAIL_QUERY='?vs_currency=usd&ids=coin-a%2Ccoin-b&per_page=250&page=1&sparkline=false&price_change_percentage=1h%2C24h%2C7d&precision=full';

test('cold: one read per currency at the documented address, charged as insights; warm: no read and no write',async()=>{
 const a=account(),p=provider(),cold=a.caller();
 const first=await durableDetails([coin('coin-a'),coin('coin-b'),coin('coin-c','EUR')],{command:cold.command,key:'fixture-key',fetcher:p.fetcher});
 expect(p.calls).toEqual(['/api/v3/coins/markets'+DETAIL_QUERY,'/api/v3/coins/markets?vs_currency=eur&ids=coin-c&per_page=250&page=1&sparkline=false&price_change_percentage=1h%2C24h%2C7d&precision=full']);
 expect(cold.actions).toEqual(['acquire-many','complete','complete']);
 expect(first.error).toBeNull();
 expect(first.results['coingecko:coin:coin-a:USD']).toMatchObject({error:null,stale:false,detail:{change1h:'0.5',change24h:'1.5',change7d:'-3',marketCap:{value:'1000000',decimals:0},volume24h:{value:'250000',decimals:0},circulatingSupply:{value:'900',decimals:0},totalSupply:{value:'1000',decimals:0},maxSupply:null}});
 const budget=a.storage.rows.get('budget') as {reservations:Record<string,{cost:number;priority:string}>};
 expect(Object.values(budget.reservations).map(r=>[r.cost,r.priority])).toEqual([[5,'optional'],[5,'optional']]);
 const attempts=[...a.storage.rows].filter(([key])=>key.startsWith('attempt:')).map(([,value])=>(value as {endpoint?:string}).endpoint);
 expect(attempts).toEqual(['insights:shared','insights:shared']);
 expect([...a.storage.rows.keys()].filter(key=>key.startsWith('work:')).sort()).toEqual(['work:["detail","coingecko","coin","coin-a","USD"]','work:["detail","coingecko","coin","coin-b","USD"]','work:["detail","coingecko","coin","coin-c","EUR"]']);
 const warm=a.caller(),writes=a.storage.writes;
 const second=await durableDetails([coin('coin-a'),coin('coin-b'),coin('coin-c','EUR')],{command:warm.command,key:'fixture-key',fetcher:p.fetcher});
 expect(second.results).toEqual(first.results);expect(p.calls).toHaveLength(2);expect(warm.actions).toEqual(['acquire-many']);expect(a.storage.writes-writes).toBe(0);
});

test('insights are untouched: details never answer them, and their rows keep exactly the insight shape',async()=>{
 const a=account(),p=provider();
 await durableDetails([coin('coin-a')],{command:a.caller().command,key:'fixture-key',fetcher:p.fetcher});
 const insights=await durableInsights([coin('coin-a')],{command:a.caller().command,key:'fixture-key',fetcher:p.fetcher});
 expect(p.calls[1]).toBe('/api/v3/coins/markets?ids=coin-a&per_page=250&page=1&sparkline=true&price_change_percentage=24h&precision=full&vs_currency=usd');
 expect(insights.entries).toHaveLength(1);
 const row=a.storage.rows.get('work:'+publicMarketWorkKey({operation:'insights',pair:coin('coin-a')})) as {evidence:{value:unknown}};
 expect(marketInsightSchema.parse(row.evidence.value)).toEqual(row.evidence.value);
 expect(Object.keys(row.evidence.value as object).sort()).toEqual(['change24h','currency','fetchedAt','logoUrl','marketBasis','marketRef','observedAt','source','sparkline']);
});

test('without a provider key nothing is read or charged; more than 64 pairs ask nothing; a tokenized RWA is not provided',async()=>{
 const a=account(),p=provider(),c=a.caller();
 const unkeyed=await durableDetails([coin('coin-a')],{command:c.command,fetcher:p.fetcher});
 expect(p.calls).toEqual([]);expect(unkeyed.results['coingecko:coin:coin-a:USD']).toMatchObject({detail:null,error:DETAIL_UNAVAILABLE});
 expect(Object.keys((a.storage.rows.get('budget') as {reservations?:object}|undefined)?.reservations??{})).toEqual([]);
 const many=a.caller(),result=await durableDetails(Array.from({length:65},(_,i)=>coin(`m-${i}`)),{command:many.command,key:'fixture-key',fetcher:p.fetcher});
 expect(many.actions).toEqual([]);expect(result.error).toBe(DETAIL_UNAVAILABLE);
 const rwa={marketRef:{provider:'coingecko' as const,kind:'rwa' as const,id:'tsla',assetType:'stock' as const},currency:'USD' as const};
 const r=a.caller(),answer=await durableDetails([rwa],{command:r.command,key:'fixture-key',fetcher:p.fetcher});
 expect(answer.results['coingecko:rwa:tsla:USD']).toEqual({detail:null,error:DETAIL_NOT_PROVIDED,stale:true});expect(r.actions).toEqual([]);expect(p.calls).toEqual([]);
});

test('the account takes details only in a group of their own under the insights charge',async()=>{
 const a=account(),c=a.caller(),works=[{operation:'detail',pair:coin('coin-a')},{operation:'insights',pair:coin('coin-b')}];
 expect(await c.command({action:'acquire-many',works,groups:[{charge:'insights',members:[0,1]}],follow:{waitMs:1000}})).toMatchObject({ok:false,reason:'MALFORMED'});
 expect(await c.command({action:'acquire-many',works:[works[0]],groups:[{charge:'history',members:[0]}],follow:{waitMs:1000}})).toMatchObject({ok:false,reason:'MALFORMED'});
});

test('an older coordinator\'s eviction treats a detail row like any other work it does not read',async()=>{
 const storage=new CountingStorage(),key=publicMarketWorkKey({operation:'detail',pair:coin('coin-a')}),other=publicMarketWorkKey({operation:'insights',pair:coin('coin-b')});
 await storage.put('work:'+key,{lastTime:1});await storage.put('work:'+other,{lastTime:2});
 const result=await evictMarketWorks(storage,[key,other],10,['["insights","coingecko","coin","coin-c","USD"]'],2);
 expect(result.index).toEqual([other]);expect(storage.rows.has('work:'+key)).toBe(false);
});
