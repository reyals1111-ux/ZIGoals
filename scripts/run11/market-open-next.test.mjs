import {marketRuntimeBundles as bundles} from './market-runtime-fixture.mjs';
import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const pair=id=>({marketRef:{provider:'coingecko',kind:'coin',id},currency:'USD'});
const policy={providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:90,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:80,monthly:800},concurrent:2,queueLimit:16,reservationMs:20000,ownershipMs:10000};
test('installed OpenNext production runtime → real routes → named service → one durable account → controlled provider',async()=>{
 const code=await bundles(),now=Date.now(),persist=await mkdtemp(join(tmpdir(),'run11-market-'));let mf,calls=[];
 const config={policy,month:{id:'fixture-month',start:now-1000,end:now+300000},quoteCost:3,operationCosts:{catalog:2,history:4,insights:5,token:6,rwa:7},leaseMs:20000,maxAttempts:128,maxWorks:64};
 async function inspect(){const ns=await mf.getDurableObjectNamespace('MARKETS','market');return (await ns.get(ns.idFromName('fixture-account')).fetch('https://internal',{method:'POST',body:JSON.stringify({action:'inspect'})})).json();}
 async function runtime(key='fixture-key',enabled=true){return new Miniflare({...convertV4MiniflareOptions({workers:[{name:'app',modules:true,script:code.app,compatibilityDate:'2026-09-13',compatibilityFlags:['nodejs_compat'],bindings:enabled?{ZIGOALS_MARKET_QUOTES_MODE:'durable-v1'}:{},serviceBindings:enabled?{MARKET_QUOTES:{name:'market',entrypoint:'QuoteService'}}:{},outboundService:()=>{throw Error('App must never bypass named binding');}},{name:'market',modules:true,script:code.market,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'fixture-account',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(config),COINGECKO_DEMO_API_KEY:key},outboundService:async request=>{
  const url=new URL(request.url);calls.push(url.pathname);expect(url.origin).toBe('https://api.coingecko.com');expect(request.headers.get('cookie')).toBeNull();expect(request.headers.get('authorization')).toBeNull();expect((await inspect()).dispatched).toBeGreaterThan(0);
  if(request.headers.get('x-cg-demo-api-key')!=='fixture-key')return new Response('private-auth-detail',{status:401});
  if(url.pathname.endsWith('/simple/price')){const id=url.searchParams.get('ids');return id==='bitcoin'?Response.json({bitcoin:{usd:2,last_updated_at:Math.floor(now/1000)}}):new Response('private-failure',{status:503});}
  if(url.pathname.endsWith('/simple/token_price/ethereum'))return new Response('private-fallback-failure',{status:503});
  if(url.pathname.endsWith('/coins/list'))return Response.json(Array.from({length:8000},(_,i)=>({id:'coin-'+i,name:'Synthetic catalog asset '+i,symbol:'c'+i,platforms:{ethereum:'0x'+'1'.repeat(40)}})));
  if(url.pathname.endsWith('/rwas/list'))return Response.json([{id:'gold',name:'Gold',symbol:'gold',asset_type:'commodity'}]);
  if(url.pathname.endsWith('/market_chart'))return Response.json({prices:[[now-1000,2],[now,3]]});
  if(url.pathname.endsWith('/coins/markets'))return Response.json([{id:'bitcoin',last_updated:new Date(now).toISOString(),price_change_percentage_24h:2}]);
  throw Error('Unexpected endpoint');
 }}]}),resourcePersistencePath:persist});}
 const call=async(path,body)=>{const response=await mf.dispatchFetch('https://app/api/market-'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',cookie:'private',authorization:'private'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()};};
 mf=await runtime();try{
  const result=await call('quotes',{requests:[pair('bitcoin'),pair('zignaly')]});expect(result.status).toBe(200);expect(result.body.results.map(r=>r.failure)).toEqual([null,'UPSTREAM_5XX']);expect(result.body.quotes[0].price).toBe('2');
  const catalog=await call('assets');expect(catalog.status).toBe(200);expect(catalog.body.assets).toHaveLength(8001);
  expect((await call('history',{request:{...pair('bitcoin'),range:'1d'}})).status).toBe(200);
  expect((await call('insights',{requests:[pair('bitcoin')]})).status).toBe(200);
  expect(calls).toHaveLength(7);expect(await inspect()).toMatchObject({chargedCredits:25,dispatched:0});
  expect(JSON.stringify(result.body)).not.toContain('private');
  await mf.dispose();mf=await runtime();expect((await call('quotes',{requests:[pair('bitcoin')]})).status).toBe(200);expect((await call('assets')).body).toEqual(catalog.body);expect((await call('history',{request:{...pair('bitcoin'),range:'1d'}})).status).toBe(200);expect((await call('insights',{requests:[pair('bitcoin')]})).status).toBe(200);expect(calls).toHaveLength(7);
  await mf.dispose();mf=await runtime('');expect((await call('quotes',{requests:[pair('ethereum')]})).status).toBe(503);expect(calls).toHaveLength(7);
  await mf.dispose();mf=await runtime('wrong');const wrong=await call('quotes',{requests:[pair('ethereum')]});expect(wrong.body.results[0].failure).toBe('AUTHENTICATION');expect(calls).toHaveLength(8);
  await mf.dispose();mf=await runtime('fixture-key',false);expect((await call('quotes',{requests:[pair('bitcoin')]})).status).toBe(503);expect(calls).toHaveLength(8);
 }finally{await mf.dispose();}
},30000);

test('named service bounds malformed, throttled, timed-out and interrupted provider responses without uncharged retries',async()=>{
 const code=await bundles(),now=Date.now(),persist=await mkdtemp(join(tmpdir(),'run11-market-failures-'));let calls=0;
 const modes=['auth','throttle','media','body','stream','timeout'];
 const config={policy,month:{id:'fixture-month',start:now-1000,end:now+300000},quoteCost:3,operationCosts:{catalog:2,history:4,insights:5},leaseMs:20000,maxAttempts:128,maxWorks:64};
 const mf=new Miniflare({...convertV4MiniflareOptions({workers:[{name:'app',modules:true,script:code.app,compatibilityDate:'2026-09-13',compatibilityFlags:['nodejs_compat'],bindings:{ZIGOALS_MARKET_QUOTES_MODE:'durable-v1'},serviceBindings:{MARKET_QUOTES:{name:'market',entrypoint:'QuoteService'}},outboundService:()=>{throw Error('Bypass forbidden');}},{name:'market',modules:true,script:code.market,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'fixture-account',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(config),COINGECKO_DEMO_API_KEY:'fixture-key'},outboundService:async request=>{
  calls++;const mode=new URL(request.url).searchParams.get('ids');
  if(mode==='auth')return new Response('private detail',{status:401});
  if(mode==='throttle')return new Response('private detail',{status:429});
  if(mode==='media')return new Response('{}',{headers:{'content-type':'text/html'}});
  if(mode==='body')return new Response('not-json',{headers:{'content-type':'application/json'}});
  if(mode==='stream')return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{'));setTimeout(()=>c.error(Error('fixture interrupted')),20);}}),{headers:{'content-type':'application/json'}});
  if(mode==='timeout')return new Promise(()=>{});
  throw Error('unexpected fixture');
 }}]}),resourcePersistencePath:persist});
 try{
  const results=[];
  for(const mode of modes){const response=await mf.dispatchFetch('https://app/api/market-quotes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({requests:[pair(mode)]})});expect(response.status).toBe(503);results.push((await response.json()).results[0].failure);}
  expect(results.slice(0,4)).toEqual(['AUTHENTICATION','THROTTLED','MALFORMED','MALFORMED']);expect(results[4]).toBe('MALFORMED'); // Miniflare's outbound bridge exposes the interrupted stream as a truncated JSON body.
  expect(results[5]).toBe('TIMEOUT');expect(calls).toBe(6);
  const ns=await mf.getDurableObjectNamespace('MARKETS','market');const state=await (await ns.get(ns.idFromName('fixture-account')).fetch('https://internal',{method:'POST',body:JSON.stringify({action:'inspect'})})).json();expect(state).toMatchObject({chargedCredits:18,dispatched:0});
 }finally{await mf.dispose();}
},30000);

test('real account breaker survives restart, blocks cross-endpoint sends and charges its recovery probe',async()=>{
 const code=await bundles(),now=Date.now(),persist=await mkdtemp(join(tmpdir(),'run11-market-breaker-'));let mf,calls=0;
 const config={policy,month:{id:'fixture-month',start:now-1000,end:now+300000},quoteCost:3,operationCosts:{history:4},leaseMs:1000,maxAttempts:128,maxWorks:64,breaker:{threshold:1,windowMs:10000,cooldownMs:2000,maxCooldownMs:8000,halfOpenProbes:1}};
 const runtime=clock=>new Miniflare({...convertV4MiniflareOptions({workers:[{name:'app',modules:true,script:'export default {fetch(request,env){return env.MARKET_QUOTES.fetch(request)}}',compatibilityDate:'2026-09-13',serviceBindings:{MARKET_QUOTES:{name:'market',entrypoint:'QuoteService'}}},{name:'market',modules:true,script:code.market,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'fixture-account',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(config),COINGECKO_DEMO_API_KEY:'fixture-key',ISOLATED_FIXTURE:'true',LOCAL_TEST_NOW:String(clock)},outboundService:async request=>{calls++;if(calls===1)return new Response('',{status:401});const id=new URL(request.url).searchParams.get('ids');return Response.json({[id]:{usd:2,last_updated_at:Math.floor(now/1000)}});}}]}),resourcePersistencePath:persist});
 const call=async(path,body)=>(await mf.dispatchFetch('https://app/'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({version:1,...body})})).json();
 try{
  mf=runtime(now);expect((await call('quotes',{requests:[pair('auth-failed')]})).results[0].failure).toBe('AUTHENTICATION');
  expect((await call('history',{request:{...pair('bitcoin'),range:'1d'}})).history).toBeNull();expect(calls).toBe(1);
  await mf.dispose();mf=runtime(now+2000);expect((await call('quotes',{requests:[pair('bitcoin')]})).results[0].status).toBe('VERIFIED_FRESH');expect(calls).toBe(2);
  const ns=await mf.getDurableObjectNamespace('MARKETS','market');const state=await(await ns.get(ns.idFromName('fixture-account')).fetch('https://internal',{method:'POST',body:JSON.stringify({action:'inspect'})})).json();expect(state).toMatchObject({chargedCredits:6,dispatched:0});
 }finally{await mf?.dispose();}
},30000);

test('real named service queues independent endpoint work without holding provider slots or replacing accepted reservations',async()=>{
 const code=await bundles(),now=Date.now();let calls=0,active=0,peak=0,release,entered;
 const blocked=new Promise(resolve=>{release=resolve;}),started=new Promise(resolve=>{entered=resolve;});
 const config={policy:{...policy,concurrent:1},month:{id:'queue-fixture',start:now-1000,end:now+300000},quoteCost:3,operationCosts:{history:4},leaseMs:20000,maxAttempts:128,maxWorks:64};
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'app',modules:true,script:'export default {fetch(request,env){return env.MARKET_QUOTES.fetch(request)}}',compatibilityDate:'2026-09-13',serviceBindings:{MARKET_QUOTES:{name:'market',entrypoint:'QuoteService'}}},{name:'market',modules:true,script:code.market,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'queue-fixture',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(config),COINGECKO_DEMO_API_KEY:'fixture-key'},outboundService:async request=>{
  calls++;active++;peak=Math.max(peak,active);try{const url=new URL(request.url);if(url.pathname.endsWith('/simple/price')){entered();await blocked;return Response.json({bitcoin:{usd:2,last_updated_at:Math.floor(Date.now()/1000)}});}return Response.json({prices:[[Date.now()-1000,2],[Date.now(),3]]});}finally{active--;}
 }}]}));
 const call=async(path,body)=>(await mf.dispatchFetch('https://app/'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({version:1,...body})})).json();
 try{
  const quote=call('quotes',{requests:[pair('bitcoin')]});await started;const history=call('history',{request:{...pair('ethereum'),range:'1d'}});
  const ns=await mf.getDurableObjectNamespace('MARKETS','market'),stub=ns.get(ns.idFromName('queue-fixture'));
  let waiting;for(let i=0;i<50;i++){waiting=await(await stub.fetch('https://internal',{method:'POST',body:JSON.stringify({action:'inspect'})})).json();if(waiting.attempts===2)break;await new Promise(r=>setTimeout(r,10));}
  expect(waiting).toMatchObject({attempts:2,dispatched:1,chargedCredits:3});expect(calls).toBe(1);release();
  expect((await quote).results[0].status).toBe('VERIFIED_FRESH');expect((await history).history).not.toBeNull();expect(peak).toBe(1);expect(calls).toBe(2);
  expect(await(await stub.fetch('https://internal',{method:'POST',body:JSON.stringify({action:'inspect'})})).json()).toMatchObject({attempts:2,dispatched:0,chargedCredits:7});
 }finally{release();await mf.dispose();}
},30000);

test('distinct endpoint throttle evidence opens a persisted account gate and recovery uses real budget',async()=>{
 const code=await bundles(),now=Date.now(),persist=await mkdtemp(join(tmpdir(),'run11-market-throttle-'));let mf,calls=0;
 const config={policy,month:{id:'throttle-fixture',start:now-1000,end:now+300000},quoteCost:3,operationCosts:{history:4,catalog:2},leaseMs:1000,maxAttempts:128,maxWorks:64,breaker:{threshold:1,windowMs:10000,cooldownMs:2000,maxCooldownMs:8000,halfOpenProbes:1},accountThrottle:{distinctEndpoints:2,windowMs:1000}};
 const runtime=clock=>new Miniflare({...convertV4MiniflareOptions({workers:[{name:'app',modules:true,script:'export default {fetch(request,env){return env.MARKET_QUOTES.fetch(request)}}',compatibilityDate:'2026-09-13',serviceBindings:{MARKET_QUOTES:{name:'market',entrypoint:'QuoteService'}}},{name:'market',modules:true,script:code.market,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'throttle-fixture',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(config),COINGECKO_DEMO_API_KEY:'fixture-key',ISOLATED_FIXTURE:'true',LOCAL_TEST_NOW:String(clock)},outboundService:async request=>{calls++;if(calls<=2)return new Response('',{status:429});const id=new URL(request.url).searchParams.get('ids');return Response.json({[id]:{usd:2,last_updated_at:Math.floor(now/1000)}});}}]}),resourcePersistencePath:persist});
 const call=async(path,body)=>(await mf.dispatchFetch('https://app/'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({version:1,...body})})).json();
 try{
  mf=runtime(now);expect((await call('quotes',{requests:[pair('bitcoin')]})).results[0].failure).toBe('THROTTLED');expect(calls).toBe(1);
  expect((await call('history',{request:{...pair('bitcoin'),range:'1d'}})).history).toBeNull();expect(calls).toBe(2);
  await mf.dispose();mf=runtime(now+500);expect((await call('catalog',{})).assets).toEqual([]);expect(calls).toBe(2);
  await mf.dispose();mf=runtime(now+2000);expect((await call('quotes',{requests:[pair('ethereum')]})).results[0].status).toBe('VERIFIED_FRESH');expect(calls).toBe(3);
  const ns=await mf.getDurableObjectNamespace('MARKETS','market');expect(await(await ns.get(ns.idFromName('throttle-fixture')).fetch('https://internal',{method:'POST',body:JSON.stringify({action:'inspect'})})).json()).toMatchObject({chargedCredits:10,dispatched:0});
 }finally{await mf?.dispose();}
},30000);

test('real route retains valid batch pairs and durable pair recovery never blocks unrelated assets',async()=>{
 const code=await bundles(),now=Date.now(),persist=await mkdtemp(join(tmpdir(),'run11-market-pair-'));let mf,calls=[];
 const config={policy,month:{id:'pair-fixture',start:now-1000,end:now+300000},quoteCost:3,leaseMs:1000,maxAttempts:128,maxWorks:64,breaker:{threshold:1,windowMs:10000,cooldownMs:2000,maxCooldownMs:8000,halfOpenProbes:1}};
 const runtime=clock=>new Miniflare({...convertV4MiniflareOptions({workers:[{name:'app',modules:true,script:code.app,compatibilityDate:'2026-09-13',compatibilityFlags:['nodejs_compat'],bindings:{ZIGOALS_MARKET_QUOTES_MODE:'durable-v1'},serviceBindings:{MARKET_QUOTES:{name:'market',entrypoint:'QuoteService'}}},{name:'market',modules:true,script:code.market,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'pair-fixture',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(config),COINGECKO_DEMO_API_KEY:'fixture-key',ISOLATED_FIXTURE:'true',LOCAL_TEST_NOW:String(clock)},outboundService:async request=>{const ids=new URL(request.url).searchParams.get('ids').split(',');calls.push(ids);return Response.json(Object.fromEntries(ids.map(id=>[id,{usd:id==='broken'&&calls.length===1?0:2,last_updated_at:Math.floor(now/1000)}])));}}]}),resourcePersistencePath:persist});
 const call=async ids=>(await mf.dispatchFetch('https://app/api/market-quotes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({requests:ids.map(pair)})})).json();
 try{
  mf=runtime(now);const first=await call(['bitcoin','broken']);expect(first.results.map(r=>r.failure)).toEqual([null,'MALFORMED']);expect(first.quotes.map(q=>q.providerAssetId)).toEqual(['bitcoin']);expect(calls).toEqual([['bitcoin','broken']]);
  await mf.dispose();mf=runtime(now+1000);const cached=await call(['bitcoin','broken','ethereum']);expect(cached.quotes.map(q=>q.providerAssetId)).toEqual(['bitcoin','ethereum']);expect(calls).toEqual([['bitcoin','broken'],['ethereum']]);expect(cached.quotes[0]).toEqual(first.quotes[0]);
  await mf.dispose();mf=runtime(now+2000);expect((await call(['broken'])).results[0].status).toBe('VERIFIED_FRESH');expect(calls).toEqual([['bitcoin','broken'],['ethereum'],['broken']]);
  const ns=await mf.getDurableObjectNamespace('MARKETS','market');expect(await(await ns.get(ns.idFromName('pair-fixture')).fetch('https://internal',{method:'POST',body:JSON.stringify({action:'inspect'})})).json()).toMatchObject({chargedCredits:9,dispatched:0});
 }finally{await mf?.dispose();}
},30000);
