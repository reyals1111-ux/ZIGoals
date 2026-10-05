import {marketRuntimeBundles} from './market-runtime-fixture.mjs';
import {test,expect,beforeAll} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// Session U Part 2e: two apps share one coordinator, as the public Alpha and the acceptance app do. The real app routes
// (installed OpenNext request context) label themselves from their own bindings: the acceptance app has PRIVATE_SYNC
// ("friends"), the Alpha does not ("public"). With MARKET_POLICY.partition the public Alpha stops at its share of the
// day's rows and the acceptance app keeps the rest. Synthetic provider; nothing reaches a network or Cloudflare.
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url)),{Miniflare,convertV4MiniflareOptions}=require('miniflare');
const policy={providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:90,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:80,monthly:800},concurrent:2,queueLimit:16,reservationMs:20000,ownershipMs:10000};
const coin=id=>({marketRef:{provider:'coingecko',kind:'coin',id},currency:'USD'});
let bundles;
beforeAll(async()=>{bundles=await marketRuntimeBundles();},60000);
async function runtime(partition){
 const now=Date.now(),persist=await mkdtemp(join(tmpdir(),'run11-market-partition-'));
 const config={policy,month:{id:'partition-fixture',start:now-1000,end:now+3600000},quoteCost:1,leaseMs:20000,maxAttempts:128,maxWorks:64,dailyRowBudget:1000,...(partition?{partition}:{})};
 const provider=async request=>{const url=new URL(request.url),ids=(url.searchParams.get('ids')??'').split(',').filter(Boolean);if(!url.pathname.endsWith('/simple/price'))throw Error('Unexpected provider path');return Response.json(Object.fromEntries(ids.map(id=>[id,{usd:2,last_updated_at:Math.floor(Date.now()/1000)}])));};
 const app=(name,extra)=>({name,modules:true,script:bundles.app,compatibilityDate:'2026-09-13',compatibilityFlags:['nodejs_compat'],bindings:{ZIGOALS_MARKET_QUOTES_MODE:'durable-v1'},serviceBindings:{MARKET_QUOTES:{name:'market',entrypoint:'QuoteService'},...extra},outboundService:()=>{throw Error('The app must never bypass the named binding');}});
 const mf=new Miniflare({...convertV4MiniflareOptions({workers:[
  app('alpha',{}),
  app('acceptance',{PRIVATE_SYNC:{name:'sync'}}),
  {name:'sync',modules:true,script:'export default {fetch(){return new Response(null,{status:404});}}',compatibilityDate:'2026-09-13'},
  {name:'direct',modules:true,script:'export default {fetch(request,env){return env.MARKET_QUOTES.fetch(request);}}',compatibilityDate:'2026-09-13',serviceBindings:{MARKET_QUOTES:{name:'market',entrypoint:'QuoteService'}}},
  {name:'market',modules:true,script:bundles.market,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'partition-account',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(config),COINGECKO_DEMO_API_KEY:'fixture-key'},outboundService:provider},
 ]}),resourcePersistencePath:persist});
 let n=0;
 const quotes=async(worker,count,extra={})=>{
  const ids=Array.from({length:count},()=>`coin-${++n}`),ip=`192.0.2.${n%250}`;
  const response=await (await mf.getWorker(worker)).fetch('https://app/api/market-quotes',{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':ip,...extra},body:JSON.stringify({requests:ids.map(coin)})});
  const body=await response.json();return [...new Set(body.results.map(r=>r.failure??r.status))];
 };
 return {mf,quotes};
}

test('the public Alpha stops at its share (LOCAL_BUDGET) while the acceptance app is still served; a spoofed label changes nothing',async()=>{
 const r=await runtime({publicPercent:10});try{
  // 10% of 1,000 rows: four cold 12-pair requests (about 35 rows each) spend the public share.
  const answers=[];for(let i=0;i<4;i++)answers.push(await r.quotes('alpha',12));
  expect(answers[0]).toEqual(['VERIFIED_FRESH']);expect(answers[3]).toEqual(['LOCAL_BUDGET']);
  // The browser cannot claim to be the acceptance app: the Alpha labels itself from its own bindings.
  expect(await r.quotes('alpha',4,{'x-market-caller':'friends'})).toEqual(['LOCAL_BUDGET']);
  expect(await r.quotes('acceptance',4)).toEqual(['VERIFIED_FRESH']);
 }finally{await r.mf.dispose();}
},120000);

test('without a partition, the same traffic is served for both apps; QuoteService refuses a label it does not know',async()=>{
 const r=await runtime();try{
  // The same four requests that spent the public share above (52 works with the next one, within maxWorks 64).
  for(let i=0;i<4;i++)expect(await r.quotes('alpha',12)).toEqual(['VERIFIED_FRESH']);
  expect(await r.quotes('acceptance',4)).toEqual(['VERIFIED_FRESH']);
  const direct=await (await r.mf.getWorker('direct')).fetch('https://market.internal/quotes',{method:'POST',headers:{'content-type':'application/json','x-market-caller':'admin'},body:JSON.stringify({version:1,requests:[coin('bitcoin')]})});
  expect(direct.status).toBe(400);expect(await direct.json()).toEqual({error:'INVALID_MARKET_REQUEST'});
 }finally{await r.mf.dispose();}
},120000);
