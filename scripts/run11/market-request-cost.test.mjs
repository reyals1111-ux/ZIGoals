import {marketRuntimeBundles} from './market-runtime-fixture.mjs';
import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// Q-WRK-01's packaged reproduction (docs/security/review-2026-10/FINDINGS.md): the real app routes in the installed
// OpenNext request context, the real QuoteService and account object in workerd with SQLite storage, and a synthetic
// provider. A test-only wrapper (market-count-fixture.ts) counts Durable Object requests and committed storage
// operations; nothing reaches a live provider or Cloudflare.
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url)),{Miniflare,convertV4MiniflareOptions}=require('miniflare'),{build}=require('esbuild');
const policy={providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:90,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:80,monthly:800},concurrent:2,queueLimit:16,reservationMs:20000,ownershipMs:10000};
const coin=(id,currency='USD')=>({marketRef:{provider:'coingecko',kind:'coin',id},currency});
let bundles;
async function runtime({hold}={}){
 bundles??={...await marketRuntimeBundles(),counted:(await build({entryPoints:[new URL('./market-count-fixture.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers']})).outputFiles[0].text};
 const now=Date.now(),calls=[],persist=await mkdtemp(join(tmpdir(),'run11-market-cost-'));
 const config={policy,month:{id:'cost-fixture',start:now-1000,end:now+3600000},quoteCost:3,operationCosts:{catalog:2,history:4,insights:5,token:6,rwa:7},leaseMs:20000,maxAttempts:128,maxWorks:64};
 const mf=new Miniflare({...convertV4MiniflareOptions({workers:[
  {name:'app',modules:true,script:bundles.app,compatibilityDate:'2026-09-13',compatibilityFlags:['nodejs_compat'],bindings:{ZIGOALS_MARKET_QUOTES_MODE:'durable-v1'},serviceBindings:{MARKET_QUOTES:{name:'market',entrypoint:'QuoteService'}},outboundService:()=>{throw Error('The app must never bypass the named binding');}},
  {name:'market',modules:true,script:bundles.counted,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'CountingAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'cost-account',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(config),COINGECKO_DEMO_API_KEY:'fixture-key'},outboundService:async request=>{
   const url=new URL(request.url),ids=(url.searchParams.get('ids')??'').split(',').filter(Boolean),t=Date.now();calls.push(url.pathname+':'+ids.length);await hold?.();
   if(url.pathname.endsWith('/coins/markets'))return Response.json(ids.map(id=>({id,last_updated:new Date(t).toISOString(),price_change_percentage_24h:1.5,sparkline_in_7d:{price:Array.from({length:168},(_,i)=>1+i/1000)}})));
   if(url.pathname.endsWith('/simple/price'))return Response.json(Object.fromEntries(ids.map(id=>[id,{usd:2,eur:3,last_updated_at:Math.floor(t/1000)}])));
   if(url.pathname.endsWith('/market_chart'))return Response.json({prices:[[t-1000,2],[t,3]]});
   throw Error('Unexpected provider path');
  }}]}),resourcePersistencePath:persist});
 const object=async path=>{const ns=await mf.getDurableObjectNamespace('MARKETS','market');return (await ns.get(ns.idFromName('cost-account')).fetch('https://internal'+path,{method:'POST',body:'{}'})).json();};
 const post=async(path,body,ip='192.0.2.10')=>{const response=await mf.dispatchFetch('https://app/api/market-'+path,{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':ip},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};};
 /** What one HTTP request cost the account object. */
 const measure=async run=>{await object('/test/counts');const result=await run();return {result,cost:await object('/test/counts')};};
 return {mf,calls,post,measure,object};
}
const pairs=Array.from({length:64},(_,i)=>coin(`coin-${i}`,i%2?'EUR':'USD'));

test.fails('real app route: a 64-pair insights request costs at most two Durable Object requests cold and one cached, with no write; 65 pairs cost none',async()=>{
 const r=await runtime();try{
  const cold=await r.measure(()=>r.post('insights',{requests:pairs}));
  expect(cold.result.status).toBe(200);expect(cold.result.body.entries).toHaveLength(64);expect(r.calls).toEqual(['/api/v3/coins/markets:32','/api/v3/coins/markets:32']);
  expect(cold.cost.requests,JSON.stringify(cold.cost.actions)).toBeLessThanOrEqual(2);
  expect(cold.cost.writes+cold.cost.deletes).toBeLessThanOrEqual(64*2+32);
  const warm=await r.measure(()=>r.post('insights',{requests:pairs}));
  expect(warm.result.status).toBe(200);expect(warm.result.body.entries).toHaveLength(64);expect(r.calls).toHaveLength(2);
  expect(warm.cost.requests,JSON.stringify(warm.cost.actions)).toBeLessThanOrEqual(1);expect(warm.cost.writes+warm.cost.deletes).toBe(0);
  const many=await r.measure(()=>r.post('insights',{requests:[...pairs,coin('coin-64')]}));
  expect(many.result.status).toBe(400);expect(many.cost.requests).toBe(0);expect(r.calls).toHaveLength(2);
 }finally{await r.mf.dispose();}
},60000);

test.fails('load: concurrent clients, cold and cached, stay within a bounded cost per HTTP request',async()=>{
 const r=await runtime();try{
  const clients=['192.0.2.21','192.0.2.22','192.0.2.23','198.51.100.4'];
  // Every client asks for the same 16 pairs and for 8 pairs of its own, at the same time, twice.
  const shared=pairs.slice(0,16),own=client=>Array.from({length:8},(_,i)=>coin(`own-${client}-${i}`));
  const cold=await r.measure(()=>Promise.all(clients.flatMap((ip,client)=>[r.post('insights',{requests:[...shared,...own(client)]},ip),r.post('insights',{requests:[...shared,...own(client)]},ip)])));
  for(const {status,body} of cold.result){expect(status).toBe(200);expect(body.entries).toHaveLength(24);}
  // Shared pairs are fetched once and every client's own pairs once: never once per request or per pair.
  const fetched=r.calls.map(call=>Number(call.split(':')[1])).reduce((sum,n)=>sum+n,0);expect(fetched).toBe(16+4*8);
  expect(cold.cost.requests/cold.result.length,JSON.stringify(cold.cost.actions)).toBeLessThanOrEqual(6);
  expect(cold.cost.writes+cold.cost.deletes).toBeLessThanOrEqual((16+4*8)*3+64);
  const warm=await r.measure(()=>Promise.all(Array.from({length:40},(_,i)=>r.post('insights',{requests:[...shared,...own(i%4)]},clients[i%4]))));
  for(const {status,body} of warm.result){expect(status).toBe(200);expect(body.entries).toHaveLength(24);}
  expect(warm.cost.requests).toBeLessThanOrEqual(40);expect(warm.cost.writes+warm.cost.deletes).toBe(0);
 }finally{await r.mf.dispose();}
},90000);
