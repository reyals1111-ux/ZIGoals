import {test,expect} from 'vitest';
import {DurableMarketAccount,type AtomicMarketStorage} from './durable-market-account';
import {durableInsights,durableHistory} from './market-durable-data';
import {dispatchDurableQuotes} from './durable-quote-dispatch';
// Q-WRK-01's safe reproduction (docs/security/review-2026-10/FINDINGS.md): the real account authority and the real
// QuoteService orchestration, with every committed storage write counted and every call that would be one Durable
// Object request counted per HTTP request. The provider is a local fake; nothing leaves the process.
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
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(condition:()=>boolean,ms=5000){for(const end=Date.now()+ms;!condition();){if(Date.now()>end)throw Error('condition not reached');await sleep(5);}}
function deferred(){let resolve!:()=>void;const promise=new Promise<void>(r=>{resolve=r;});return {promise,resolve};}
function account(overrides:Record<string,unknown>={}){
 const storage=new CountingStorage(),start=Date.now();
 const authority=new DurableMarketAccount(storage,()=>Date.now(),JSON.stringify({policy,month:{id:'cost-fixture',start:start-1000,end:start+3600000},quoteCost:3,operationCosts:{history:4,insights:5,token:6,rwa:7},leaseMs:20000,maxAttempts:128,maxWorks:64,...overrides}));
 /** One caller's view: each call is what QuoteService sends as one Durable Object request. */
 const caller=()=>{const actions:string[]=[];return {actions,command:async(c:unknown)=>{actions.push(String((c as {action?:unknown}).action));return authority.apply(JSON.parse(JSON.stringify(c)));}};};
 return {storage,authority,caller};
}
function provider(hold?:()=>Promise<void>){
 const calls:string[]=[];
 const fetcher=(async(input:RequestInfo|URL)=>{
  const url=new URL(String(input)),ids=(url.searchParams.get('ids')??'').split(',').filter(Boolean),now=Date.now();calls.push(url.pathname);await hold?.();
  if(url.pathname.endsWith('/coins/markets'))return json(ids.map(id=>({id,last_updated:new Date(now).toISOString(),price_change_percentage_24h:1.5,sparkline_in_7d:{price:Array.from({length:168},(_,i)=>1+i/1000)}})));
  if(url.pathname.endsWith('/simple/price'))return json(Object.fromEntries(ids.map(id=>[id,{usd:2,eur:3,last_updated_at:Math.floor(now/1000)}])));
  if(url.pathname.endsWith('/market_chart'))return json({prices:[[now-1000,2],[now,3]]});
  throw Error('Unexpected provider path');
 }) as typeof fetch;
 return {calls,fetcher};
}
const pairs=Array.from({length:64},(_,i)=>coin(`coin-${i}`,i%2?'EUR':'USD'));

test('one 64-pair insights request: cold it costs one Durable Object request plus one per provider read and bounded rows, cached one request and no write',async()=>{
 const a=account(),p=provider(),cold=a.caller();let writes=a.storage.writes;
 const first=await durableInsights(pairs,{command:cold.command,key:'fixture-key',fetcher:p.fetcher});
 // Two provider reads (USD and EUR): acquire-many, then one complete per read, which also starts the next read.
 expect(first.entries).toHaveLength(64);expect(p.calls).toHaveLength(2);
 expect(cold.actions,cold.actions.join()).toEqual(['acquire-many','complete','complete']);
 // About two rows per pair (its lease, then its evidence) plus a fixed overhead; Session Q counted about 800 before.
 expect(a.storage.writes-writes).toBeLessThanOrEqual(64*2+32);
 const warm=a.caller();writes=a.storage.writes;
 const second=await durableInsights(pairs,{command:warm.command,key:'fixture-key',fetcher:p.fetcher});
 expect(second.entries).toHaveLength(64);expect(second.error).toBeNull();expect(p.calls).toHaveLength(2);
 expect(warm.actions.length,warm.actions.join()).toBeLessThanOrEqual(1);expect(a.storage.writes-writes).toBe(0);
},20000);

test('more than 64 insight pairs are refused before any Durable Object request',async()=>{
 const a=account(),p=provider(),c=a.caller(),many=Array.from({length:65},(_,i)=>coin(`many-${i}`));
 const result=await durableInsights(many,{command:c.command,key:'fixture-key',fetcher:p.fetcher});
 expect(c.actions).toEqual([]);expect(p.calls).toEqual([]);expect(result.entries).toEqual([]);expect(result.error).toBeTruthy();
});

test('cached quotes, history and a single cached acquire write nothing',async()=>{
 const a=account(),p=provider(),quotes=pairs.slice(0,32).map(pair=>coin(pair.marketRef.id)),history={...coin('bitcoin'),range:'1d' as const};
 await dispatchDurableQuotes(quotes,{command:a.caller().command,key:'fixture-key',fetcher:p.fetcher});
 await durableHistory(history,{command:a.caller().command,key:'fixture-key',fetcher:p.fetcher});
 const calls=p.calls.length,warm=a.caller(),writes=a.storage.writes;
 expect((await dispatchDurableQuotes(quotes,{command:warm.command,key:'fixture-key',fetcher:p.fetcher})).complete).toBe(true);
 expect((await durableHistory(history,{command:warm.command,key:'fixture-key',fetcher:p.fetcher})).history).not.toBeNull();
 expect(await warm.command({action:'acquire',work:{operation:'history',pair:coin('bitcoin'),range:'1d'}})).toMatchObject({status:'CACHE_HIT'});
 expect(p.calls).toHaveLength(calls);expect(warm.actions.length,warm.actions.join()).toBeLessThanOrEqual(3);expect(a.storage.writes-writes).toBe(0);
},20000);

test('a follower polls at most every 250 ms, and its waiting writes nothing',async()=>{
 const a=account(),gate=deferred(),p=provider(()=>gate.promise),two=pairs.slice(0,2).map(pair=>coin(pair.marketRef.id));
 const owner=durableInsights(two,{command:a.caller().command,key:'fixture-key',fetcher:p.fetcher});await until(()=>p.calls.length===1);
 const follower=a.caller(),following=durableInsights(two,{command:follower.command,key:'fixture-key',fetcher:p.fetcher});
 await until(()=>follower.actions.length>0);await sleep(100);const writes=a.storage.writes;
 await sleep(750);const waitingWrites=a.storage.writes-writes;gate.resolve();
 const [owned,followed]=await Promise.all([owner,following]);
 expect(owned.entries).toHaveLength(2);expect(followed.entries).toHaveLength(2);expect(p.calls).toHaveLength(1);
 expect(follower.actions.filter(action=>action.startsWith('poll')).length,follower.actions.join()).toBeLessThanOrEqual(4);expect(waitingWrites).toBe(0);
},20000);

test('a queued attempt polls for dispatch at most every 250 ms, and its waiting writes nothing',async()=>{
 const a=account({policy:{...policy,concurrent:1}}),gate=deferred(),p=provider(()=>gate.promise);
 const first=durableHistory({...coin('bitcoin'),range:'1d'},{command:a.caller().command,key:'fixture-key',fetcher:p.fetcher});await until(()=>p.calls.length===1);
 const queued=a.caller(),second=durableHistory({...coin('ethereum'),range:'1d'},{command:queued.command,key:'fixture-key',fetcher:p.fetcher});
 await until(()=>queued.actions.length>0);await sleep(100);const writes=a.storage.writes;
 await sleep(1000);const waitingWrites=a.storage.writes-writes;gate.resolve();
 const [one,two]=await Promise.all([first,second]);
 expect(one.history).not.toBeNull();expect(two.history).not.toBeNull();
 expect(queued.actions.filter(action=>['own','admit'].includes(action)).length,queued.actions.join()).toBeLessThanOrEqual(6);expect(waitingWrites).toBe(0);
},20000);
