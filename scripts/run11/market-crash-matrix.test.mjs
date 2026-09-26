import {test,expect,beforeAll} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),{build}=require('esbuild');
const now=Date.parse('2026-09-30T23:59:59Z');
const policy={providerMinuteLimit:20,providerMonthlyLimit:100,operating:{minute:18,monthly:90},monitoringReserve:{minute:1,monthly:10},monitoringMaximum:{minute:2,monthly:20},optionalCeiling:{minute:15,monthly:70},concurrent:1,queueLimit:4,reservationMs:10000,ownershipMs:2000};
const work={operation:'quote',pair:{marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'}};
const quote={base:{network:'coingecko-coin',denom:'bitcoin',decimals:0},marketRef:work.pair.marketRef,currency:'USD',price:'1234567890123456789',priceDecimals:12,source:'CoinGecko',providerAssetId:'bitcoin',verification:'VERIFIED',observedAt:new Date(now).toISOString(),fetchedAt:new Date(now).toISOString()};
let code;
 beforeAll(async()=>{code=(await build({entryPoints:[new URL('../../workers/market-coordinator/worker.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers']})).outputFiles[0].text;});
async function fixture(){
 const persist=await mkdtemp(join(tmpdir(),'run11-market-crash-'));let mf;
 const restart=async clock=>{await mf?.dispose();mf=new Miniflare({...convertV4MiniflareOptions({modules:true,script:code,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{ISOLATED_FIXTURE:'true',LOCAL_TEST_NOW:String(clock),MARKET_POLICY:JSON.stringify({policy,calendar:{timeZone:'UTC',confirmed:true},quoteCost:3,leaseMs:1000,maxAttempts:16,maxWorks:8,retryRetentionMs:120000})},outboundService:()=>{throw Error('Authority matrix forbids provider I/O');}}),resourcePersistencePath:persist});};
 const call=async command=>{const ns=await mf.getDurableObjectNamespace('MARKETS');return(await ns.get(ns.idFromName('crash-matrix')).fetch('https://internal',{method:'POST',body:JSON.stringify(command)})).json();};
 await restart(now);return {call,restart,dispose:()=>mf.dispose()};
}
for(const stage of ['acquired','queued','reserved','owned','dispatched','settled','published','published-settled'])test(`persistent restart at ${stage}: no duplicate permission, forged evidence, refund or lost receipt`,async()=>{
 const f=await fixture();const charged=['dispatched','settled','published','published-settled'].includes(stage),published=stage.startsWith('published');let id;
 try{
  const initial=await f.call({action:'acquire',work});expect(initial.status).toBe('OWNER');
  if(stage!=='acquired'){id=(await f.call({action:'enqueue',priority:'interactive',kind:'request',associations:[{work,lease:initial.lease}]})).id;expect(id).toBeTypeOf('string');}
  if(!['acquired','queued'].includes(stage))expect(await f.call({action:'reserve',id})).toMatchObject({ok:true});
  if(!['acquired','queued','reserved'].includes(stage))expect(await f.call({action:'own',id})).toMatchObject({ok:true});
  if(charged)expect(await f.call({action:'dispatch',id})).toMatchObject({ok:true});
  if(stage==='settled'||stage==='published-settled')expect(await f.call({action:'settle',id,outcome:'success'})).toMatchObject({ok:true});
  if(published)expect(await f.call({action:'publish',id,work,quote})).toMatchObject({ok:true}); // Lose publication acknowledgement at the caller.
  await f.restart(now);
  expect(await f.call({action:'inspect'})).toMatchObject({chargedCredits:charged?3:0,currentPeriodCredits:charged?3:0});
  if(charged){expect(await f.call({action:'cancel',id})).toMatchObject({ok:false});expect(await f.call({action:'dispatch',id})).toMatchObject({ok:false});}
  if(published){expect(await f.call({action:'publish',id,work,quote})).toMatchObject({ok:true,replay:true});expect(await f.call({action:'acquire',work})).toMatchObject({status:'CACHE_HIT',quote});}
  if(stage==='settled'){expect(await f.call({action:'settle',id,outcome:'success'})).toMatchObject({ok:true,replay:true});expect(await f.call({action:'publish',id,work,quote})).toMatchObject({ok:true});}
  await f.restart(now+2000); // Lease expires and the confirmed accounting month changes.
  expect(await f.call({action:'inspect'})).toMatchObject({chargedCredits:charged?3:0,currentPeriodCredits:0});
  const next=await f.call({action:'acquire',work});expect(next.status).toBe(published||stage==='settled'?'CACHE_HIT':'OWNER');
  if(!published&&stage!=='settled'){expect(next.lease.token).not.toBe(initial.lease.token);if(id)expect(await f.call({action:'publish',id,work,quote})).toMatchObject({ok:false});}
  if(id&&!charged)expect(await f.call({action:'cancel',id})).toMatchObject({ok:true,replay:true});
  await f.restart(now+10000);expect(await f.call({action:'inspect'})).toMatchObject({chargedCredits:charged?3:0,dispatched:0,currentPeriodCredits:0});
  if(charged){const outcome=stage==='settled'||stage==='published-settled'?'success':'failure';expect(await f.call({action:'settle',id,outcome})).toMatchObject({ok:true,replay:true});expect(await f.call({action:'settle',id,outcome:outcome==='success'?'failure':'success'})).toMatchObject({ok:false});}
  await f.restart(now+61000);expect(await f.call({action:'inspect'})).toMatchObject({chargedCredits:charged?3:0,currentPeriodCredits:0,archivedAttempts:charged?1:0});
  if(charged){const outcome=stage==='settled'||stage==='published-settled'?'success':'failure';expect(await f.call({action:'settle',id,outcome})).toMatchObject({ok:true,replay:true});}
 }finally{await f.dispose();}
},30000);
test('backwards restart clock cannot mutate previously durable accounting or allow another dispatch',async()=>{
 const f=await fixture();try{const owner=await f.call({action:'acquire',work}),row=await f.call({action:'enqueue',priority:'interactive',kind:'request',associations:[{work,lease:owner.lease}]});for(const action of ['reserve','own','dispatch'])expect(await f.call({action,id:row.id})).toMatchObject({ok:true});await f.restart(now-1);expect(await f.call({action:'inspect'})).toMatchObject({reason:'CLOCK_OR_PERIOD'});await f.restart(now);expect(await f.call({action:'inspect'})).toMatchObject({chargedCredits:3,dispatched:1});}finally{await f.dispose();}
},30000);
