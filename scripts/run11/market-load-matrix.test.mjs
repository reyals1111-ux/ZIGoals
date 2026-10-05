import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {doProbe,doProbeWorker} from './do-probe.mjs';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url)),{Miniflare,convertV4MiniflareOptions}=require('miniflare'),{build}=require('esbuild');
const pair=id=>({marketRef:{provider:'coingecko',kind:'coin',id},currency:'USD'});
const percentile=(rows,n)=>[...rows].sort((a,b)=>a-b)[Math.min(rows.length-1,Math.floor(rows.length*n))];
test('four Worker callers share a 62-pair slow stream; mixed fallback, integrity failure and outage retain exact charges',async()=>{
 const artifact=await mkdtemp(join(tmpdir(),'run11-market-matrix-')),now=Date.now(),code=(await build({entryPoints:[new URL('../../workers/market-coordinator/worker.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers'],banner:{js:`Date.now=()=>${now}; // Test-only logical clock; real deadline behavior has a separate Worker regression.`}})).outputFiles[0].text;
 const config={policy:{providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:90,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:80,monthly:800},concurrent:1,queueLimit:16,reservationMs:30000,ownershipMs:10000},month:{id:'synthetic-matrix',start:now-1000,end:now+3600000},quoteCost:3,operationCosts:{token:6,rwa:7,catalog:2,history:4,insights:5},leaseMs:30000,maxAttempts:128,maxWorks:64,telemetry:{enabled:true,build:createHash('sha256').update(code).digest('hex'),retentionHours:2}};
 let calls=0,mf,release,entered,peakDispatch=0,peakFollowers=0;const start=new Promise(r=>{entered=r;}),hold=new Promise(r=>{release=r;}),latencies=[];
 const command=async body=>{const ns=await doProbe(mf);return(await ns.get(ns.idFromName('matrix-account')).fetch('https://internal',{method:'POST',body:JSON.stringify(body)})).json();};
 const memoryStart=process.memoryUsage().rss;
 const provider=async request=>{
  calls++;const status=await command({action:'inspect'});expect(status.dispatched).toBe(1);expect(status.chargedCredits).toBeGreaterThan(0);peakDispatch=Math.max(peakDispatch,status.dispatched);
  const url=new URL(request.url);expect(url.origin).toBe('https://api.coingecko.com');expect(request.headers.get('cookie')).toBeNull();expect(request.headers.get('authorization')).toBeNull();
  const ids=url.searchParams.get('ids')?.split(',')??[];
  if(url.pathname.includes('token_price'))return Response.json({'0xb2617246d0c6c0087f18703d576831899ca94f01':{usd:2,last_updated_at:Math.floor(now/1000)}});
  if(url.pathname.includes('/rwas/'))return Response.json([{id:'unexpected',asset_type:'commodity',tokenized_market_data:{current_price:3}}]);
  if(ids[0]==='zignaly'||ids[0]==='outage')return new Response('synthetic provider outage',{status:503});
  if(ids[0]==='brokenbody')return new Response('{',{headers:{'content-type':'application/json'}}); // Explicit truncated JSON boundary, not a simulated socket error.
  const text=JSON.stringify(Object.fromEntries(ids.map(id=>[id,{usd:1.25,last_updated_at:Math.floor(now/1000)}]))),mid=Math.floor(text.length/2);
  return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(text.slice(0,mid)));entered();void hold.then(()=>{c.enqueue(new TextEncoder().encode(text.slice(mid)));c.close();});}}),{headers:{'content-type':'application/json'}});
 };
 mf=new Miniflare({...convertV4MiniflareOptions({workers:[...Array.from({length:4},(_,i)=>({name:'matrix-app-'+i,modules:true,script:'export default {fetch(request,env){return env.MARKET_QUOTES.fetch(request)}}',compatibilityDate:'2026-09-13',serviceBindings:{MARKET_QUOTES:{name:'matrix-market',entrypoint:'QuoteService'}}})),{name:'matrix-market',modules:true,script:code,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'matrix-account',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(config),COINGECKO_DEMO_API_KEY:'synthetic'},outboundService:provider},doProbeWorker({className:'MarketAccount',scriptName:'matrix-market'})]}),resourcePersistencePath:join(artifact,'state')});
 const load=async(index,requests)=>{const t=performance.now(),app=await mf.getWorker('matrix-app-'+index),res=await app.fetch('https://app/quotes',{method:'POST',headers:{'content-type':'application/json',cookie:'private-fixture'},body:JSON.stringify({version:1,requests})});const result=await res.json();latencies.push(performance.now()-t);return result;};
 try{
  const coins=Array.from({length:60},(_,i)=>pair('fixture-'+String(i).padStart(3,'0'))),requests=[...coins,pair('zignaly'),{marketRef:{provider:'coingecko',kind:'rwa',id:'gold',assetType:'commodity'},currency:'USD'}],owner=load(0,requests);await start;
  const followers=[1,2,3].map(i=>load(i,coins.slice(0,16)));await expect.poll(async()=>{const row=await command({action:'inspect'});peakFollowers=Math.max(peakFollowers,row.followers);return row.followers;},{timeout:10000,interval:10}).toBe(48);
  expect(calls).toBe(1);release();const [mixed,...shared]=await Promise.all([owner,...followers]);expect(mixed.results).toHaveLength(62);expect(mixed.quotes).toHaveLength(61);expect(mixed.results.at(-1)).toMatchObject({failure:'MALFORMED',quote:null});expect(shared.map(row=>({complete:row.complete,degraded:row.degraded,quotes:row.quotes.length,failures:[...new Set(row.results.map(r=>r.failure).filter(Boolean))]}))).toEqual(Array.from({length:3},()=>({complete:true,degraded:false,quotes:16,failures:[]})));expect(calls).toBe(4);expect(await command({action:'inspect'})).toMatchObject({chargedCredits:19,dispatched:0,followers:0});
  const warm=await Promise.all([0,1,2,3].map(i=>load(i,coins)));expect(warm.every(row=>row.complete&&row.quotes.length===60)).toBe(true);expect(calls).toBe(4);
  expect((await load(1,[pair('outage')])).results[0].failure).toBe('UPSTREAM_5XX');expect((await load(2,[pair('brokenbody')])).results[0].failure).toBe('MALFORMED');expect(calls).toBe(6);expect(await command({action:'inspect'})).toMatchObject({chargedCredits:25,dispatched:0,followers:0,workKeys:64});
  const metrics=await command({action:'inspect-metrics'}),counts=metrics.buckets[0].counts;expect(counts).toMatchObject({'dispatch.attempts':6,'dispatch.credits':25,'outcome.UPSTREAM_5XX':2,'outcome.MALFORMED':2,'outcome.VERIFIED':2});expect(JSON.stringify(metrics)).not.toMatch(/fixture-0|zignaly|gold|private-fixture|synthetic provider/);
  const evidence={version:1,source:'actual local workerd with four app callers and one durable account; synthetic provider only',clock:'fixed logical clock isolates coalescing/charge correctness from hosted scheduling; wall-clock deadlines tested in market-follower-deadline.test.mjs; latency is real harness elapsed time',workerBundleSha256:config.telemetry.build,instances:4,ownerPairs:62,followerPairs:48,warmPairs:240,providerCalls:calls,chargedCredits:25,peakDispatch,peakFollowers,latency:{samples:latencies.length,p50Ms:percentile(latencies,.5),p95Ms:percentile(latencies,.95)},nodeHarnessRssDeltaBytes:process.memoryUsage().rss-memoryStart,memoryLimit:'RSS is Node harness/process evidence, not Worker isolate peak memory; storage/follower bounds asserted separately',metrics};await writeFile(join(artifact,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');console.log('MARKET_MATRIX_EVIDENCE',join(artifact,'evidence.json'));
 }finally{release();await mf.dispose();}
},30000);
