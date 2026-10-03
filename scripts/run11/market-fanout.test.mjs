import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),{build}=require('esbuild');
const pair=id=>({marketRef:{provider:'coingecko',kind:'coin',id},currency:'USD'});
const percentiles=values=>{const sorted=[...values].sort((a,b)=>a-b);return {p50Ms:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]};};
test('synthetic concurrent cold, warm and restarted callers share one physical batch and preserve identical evidence',async()=>{
 const built=await build({entryPoints:[new URL('../../workers/market-coordinator/worker.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers']}),code=built.outputFiles[0].text;
 const artifact=await mkdtemp(join(tmpdir(),'run11-market-fanout-')),now=Date.now();let mf,calls=0,gate,persist;
 /** One held provider call per attempt: `started` when the coordinator dispatches it, answered on `release`. */
 const holdGate=()=>{const g={};g.hold=new Promise(resolve=>{g.release=resolve;});g.started=new Promise(resolve=>{g.entered=resolve;});return g;};
 const policy={providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:90,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:80,monthly:800},concurrent:1,queueLimit:16,reservationMs:20000,ownershipMs:10000};
 const config={policy,month:{id:'fanout-fixture',start:now-1000,end:now+300000},quoteCost:3,leaseMs:20000,maxAttempts:128,maxWorks:64};
 const runtime=()=>new Miniflare({...convertV4MiniflareOptions({workers:[{name:'app',modules:true,script:'export default {fetch(request,env){return env.MARKET_QUOTES.fetch(request)}}',compatibilityDate:'2026-09-13',serviceBindings:{MARKET_QUOTES:{name:'market',entrypoint:'QuoteService'}}},{name:'market',modules:true,script:code,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'fanout-fixture',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(config),COINGECKO_DEMO_API_KEY:'fixture-key'},outboundService:async request=>{calls++;expect(new URL(request.url).searchParams.get('ids')).toBe('bitcoin,ethereum');gate.entered();await gate.hold;return Response.json({bitcoin:{usd:2,last_updated_at:Math.floor(now/1000)},ethereum:{usd:3,last_updated_at:Math.floor(now/1000)}});}}]}),resourcePersistencePath:persist});
 const inspect=async()=>{const ns=await mf.getDurableObjectNamespace('MARKETS','market');return(await ns.get(ns.idFromName('fanout-fixture')).fetch('https://internal',{method:'POST',body:JSON.stringify({action:'inspect'})})).json();};
 const load=async()=>{const start=performance.now(),response=await mf.dispatchFetch('https://app/quotes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({version:1,requests:[pair('bitcoin'),pair('ethereum')]})});return {body:await response.json(),ms:Math.round((performance.now()-start)*100)/100};};
 // A follower waits at most 1,000 ms (apps/web/lib/server/market-follow-work.ts), a fixed runtime limit, and an
 // expired follower correctly answers with a degraded result. On a busy runner the time from the followers' start to
 // the owner's publication can pass that limit (Session L, PR #59: once in CI web checks). Such a cold wave proves
 // nothing about sharing, so it is measured, named in the log and repeated in a fresh runtime, at most 3 attempts; a
 // degraded result well inside the limit fails at once. Every assertion is unchanged and applies in full.
 const LIFETIME_MS=1000,MARGIN_MS=100,ATTEMPTS=3,slow=[];let pending,cold;
 try{
  for(let attempt=1;;attempt++){
   persist=join(artifact,`workers-${attempt}`);calls=0;gate=holdGate();mf=runtime();
   const owner=load();await gate.started;const dispatched=performance.now(),followers=Array.from({length:7},load);
   for(let i=0;i<60;i++){pending=await inspect();if(pending.followers===14)break;await new Promise(resolve=>setTimeout(resolve,10));}
   expect(pending).toMatchObject({followers:14,dispatched:1,attempts:1,chargedCredits:3});expect(calls).toBe(1);gate.release();
   cold=await Promise.all([owner,...followers]);const elapsed=Math.round(performance.now()-dispatched),shared=cold.every(r=>r.body.complete&&!r.body.degraded);
   if(!shared&&elapsed>=LIFETIME_MS-MARGIN_MS){
    slow.push(elapsed);console.log(`MARKET_FANOUT_SLOW_RUNNER attempt ${attempt} of ${ATTEMPTS}: the batch was published ${elapsed} ms after the followers started, past their ${LIFETIME_MS} ms lifetime`);
    await mf.dispose();mf=undefined;
    if(attempt<ATTEMPTS)continue;
    throw Error(`runner too slow: in ${ATTEMPTS} of ${ATTEMPTS} attempts the shared batch was published ${slow.join(', ')} ms after the followers started, past their ${LIFETIME_MS} ms lifetime. No assertion was relaxed.`);
   }
   expect(shared).toBe(true);for(const r of cold)expect(r.body).toEqual(cold[0].body);break;
  }
  const warm=await Promise.all(Array.from({length:8},load));for(const r of warm)expect(r.body).toEqual(cold[0].body);
  await mf.dispose();mf=runtime();const restart=await Promise.all(Array.from({length:8},load));for(const r of restart)expect(r.body).toEqual(cold[0].body);
  const final=await inspect();expect(final).toMatchObject({followers:0,attempts:1,dispatched:0,chargedCredits:3});expect(calls).toBe(1);
  const evidence={version:1,recordedAt:new Date().toISOString(),fixture:'local workerd; controlled provider; no live provider',coldAttempts:slow.length+1,slowColdAttemptsMs:slow,workerBundleSha256:createHash('sha256').update(code).digest('hex'),clientsPerWave:8,pairsPerClient:2,waves:3,publicRequests:24,verifiedPairResults:48,providerCalls:calls,chargedCredits:final.chargedCredits,peakFollowers:pending.followers,peakProviderDispatches:pending.dispatched,cold:percentiles(cold.map(r=>r.ms)),warm:percentiles(warm.map(r=>r.ms)),restart:percentiles(restart.map(r=>r.ms))};
  await writeFile(join(artifact,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');console.log('MARKET_FANOUT_EVIDENCE',JSON.stringify({path:join(artifact,'evidence.json'),...evidence}));
 }finally{gate?.release();await mf?.dispose();}
},60000);
