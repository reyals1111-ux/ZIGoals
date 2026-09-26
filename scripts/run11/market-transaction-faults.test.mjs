import {test,expect,beforeAll,afterAll} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url)),{Miniflare,convertV4MiniflareOptions}=require('miniflare'),{build}=require('esbuild');
const now=Date.parse('2026-09-30T23:59:59Z'),pair={marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'},work={operation:'quote',pair};
const quote={base:{network:'coingecko-coin',denom:'bitcoin',decimals:0},marketRef:pair.marketRef,currency:'USD',price:'1000000000000',priceDecimals:12,source:'CoinGecko',providerAssetId:'bitcoin',verification:'VERIFIED',observedAt:new Date(now).toISOString(),fetchedAt:new Date(now).toISOString()};
const config={policy:{providerMinuteLimit:20,providerMonthlyLimit:100,operating:{minute:18,monthly:90},monitoringReserve:{minute:1,monthly:10},monitoringMaximum:{minute:2,monthly:20},optionalCeiling:{minute:15,monthly:70},concurrent:1,queueLimit:4,reservationMs:10000,ownershipMs:2000},calendar:{timeZone:'UTC',confirmed:true},quoteCost:3,leaseMs:1000,maxAttempts:16,maxWorks:8,retryRetentionMs:120000};
let code;const receipts=[];
beforeAll(async()=>{code=(await build({entryPoints:[new URL('./market-fault-fixture.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers']})).outputFiles[0].text;});
afterAll(async()=>{const artifact=await mkdtemp(join(tmpdir(),'run11-market-fault-summary-'));await writeFile(join(artifact,'evidence.json'),JSON.stringify({version:1,recordedAt:new Date().toISOString(),fixtureBundleSha256:createHash('sha256').update(code).digest('hex'),expectedCases:20,completedCases:receipts.length,receipts},null,2)+'\n');console.log('MARKET_FAULT_SUMMARY',join(artifact,'evidence.json'));});
async function fixture(){
 const artifact=await mkdtemp(join(tmpdir(),'run11-market-transaction-fault-'));let mf,calls=0;
 const call=async(body,path='/')=>{const ns=await mf.getDurableObjectNamespace('MARKETS','fault-market');return(await ns.get(ns.idFromName('fault-account')).fetch('https://internal'+path,{method:'POST',body:JSON.stringify(body)})).json();};
 const restart=async clock=>{await mf?.dispose();mf=new Miniflare({...convertV4MiniflareOptions({workers:[{name:'fault-app',modules:true,script:'export default {fetch(request,env){return env.QUOTES.fetch(request)}}',compatibilityDate:'2026-09-13',serviceBindings:{QUOTES:{name:'fault-market',entrypoint:'QuoteService'}}},{name:'fault-market',modules:true,script:code,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'FaultAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'fault-account',MARKET_QUOTE_DISPATCH:'durable-v1',ISOLATED_FIXTURE:'true',LOCAL_TEST_NOW:String(clock),MARKET_POLICY:JSON.stringify(config),COINGECKO_DEMO_API_KEY:'synthetic'},outboundService:async request=>{expect(new URL(request.url).origin).toBe('https://api.coingecko.com');calls++;expect(await call({action:'inspect'})).toMatchObject({dispatched:1,chargedCredits:3});return Response.json({bitcoin:{usd:1,last_updated_at:Math.floor(now/1000)}});}}]}),resourcePersistencePath:join(artifact,'state')});};
 await restart(now);
 return {call,restart,arm:plan=>call(plan,'/test/arm'),snapshot:id=>call({id},'/test/snapshot'),report:()=>call({},'/test/report'),calls:()=>calls,load:async()=>{const app=await mf.getWorker('fault-app');return(await app.fetch('https://app/quotes',{method:'POST',body:JSON.stringify({version:1,requests:[pair]})})).json();},dispose:()=>mf.dispose(),receipt:async result=>{receipts.push(result);await writeFile(join(artifact,'evidence.json'),JSON.stringify({version:1,fixtureBundleSha256:createHash('sha256').update(code).digest('hex'),runtime:'actual local workerd and SQLite durable storage; synthetic injected interruption, not hosted process kill',...result},null,2)+'\n');console.log('MARKET_TRANSACTION_FAULT_EVIDENCE',join(artifact,'evidence.json'));}};
}
const boundaries=[['reserve','budget'],['own','budget'],['dispatch','budget'],['settle','budget'],['settle','receipt'],['publish','work']];
for(const [action,target] of boundaries)for(const point of ['after-write','after-commit'])test(`${action}/${target}/${point}: real durable rollback or lost acknowledgement survives restart without refund`,async()=>{
 const f=await fixture();try{
  const owner=await f.call({action:'acquire',work}),{id}=await f.call({action:'enqueue',priority:'interactive',kind:'request',associations:[{work,lease:owner.lease}]});
  const order=['reserve','own','dispatch','settle','publish'];
  for(const prior of order.slice(0,order.indexOf(action)))expect(await f.call({action:prior,id,...(prior==='settle'?{outcome:'success'}:{})})).toMatchObject({ok:true});
  const before=await f.snapshot(id),command={action,id,...(action==='settle'?{outcome:'success'}:action==='publish'?{work,quote}:{})};
  await f.arm({action,target,point});expect(await f.call(command)).toEqual({ok:false,reason:'STORAGE_UNAVAILABLE'});expect(await f.report()).toMatchObject({action,target,point,hit:true});
  await f.restart(now);const after=await f.snapshot(id),committed=point==='after-commit';
  if(!committed)expect(after).toEqual(before);
  else expect(after.budget.reservations[id].status).toBe({reserve:'RESERVED',own:'OWNED',dispatch:'DISPATCHED',settle:'SETTLED',publish:'SETTLED'}[action]);
  const charged=['settle','publish'].includes(action)||action==='dispatch'&&committed;
  expect(await f.call({action:'inspect'})).toMatchObject({chargedCredits:charged?3:0});
  if(charged){expect(await f.call({action:'cancel',id})).toMatchObject({ok:false});expect(await f.call({action:'dispatch',id})).toMatchObject({ok:false});}
  if(action==='settle'){
   expect(after.budget.reservations[id].status).toBe(committed?'SETTLED':'DISPATCHED');
   expect(after.receipt.outcome).toBe(committed?'success':undefined);
   expect(await f.call(command)).toMatchObject(committed?{ok:true,replay:true}:{ok:true});
   expect(await f.call({...command,outcome:'failure'})).toMatchObject({ok:false});
  }
  if(action==='publish'){
   expect(after.works[0][1].evidence?.complete??false).toBe(committed);
   expect(await f.call(command)).toMatchObject(committed?{ok:true,replay:true}:{ok:true});
   expect(await f.call({action:'acquire',work})).toMatchObject({status:'CACHE_HIT',quote});
  }
  await f.restart(now+10000);expect(await f.call({action:'inspect'})).toMatchObject({chargedCredits:charged?3:0,currentPeriodCredits:0,dispatched:0});
  if(action!=='publish'){const successor=await f.call({action:'acquire',work});expect(successor.status).toBe('OWNER');expect(successor.lease.token).not.toBe(owner.lease.token);expect(await f.call({action:'publish',id,work,quote})).toMatchObject({ok:false});}
  expect(f.calls()).toBe(0);await f.receipt({action,target,point,chargedCredits:charged?3:0,providerCalls:0,rollback:!committed});
 }finally{await f.dispose();}
},30000);
for(const action of ['reserve','dispatch','settle','publish'])for(const point of ['after-write','after-commit'])test(`actual quote dispatch ${action}/${point}: send count, charge and publication remain consistent`,async()=>{
 const f=await fixture();try{
  await f.arm({action,point,target:action==='publish'?'work':'budget'});const response=await f.load(),report=await f.report();expect(report).toMatchObject({action,point,hit:true});
  const sent=['settle','publish'].includes(action),charged=sent||action==='dispatch'&&point==='after-commit',published=action==='publish'&&point==='after-commit';
  expect(f.calls()).toBe(sent?1:0);expect(response.complete).toBe(false);
  await f.restart(now);expect(await f.call({action:'inspect'})).toMatchObject({chargedCredits:charged?3:0});
  if(charged){expect(await f.call({action:'cancel',id:report.id})).toMatchObject({ok:false});expect(await f.call({action:'dispatch',id:report.id})).toMatchObject({ok:false});}
  if(published){const cached=await f.load();expect(cached.complete).toBe(true);expect(cached.quotes).toHaveLength(1);expect(f.calls()).toBe(1);}
  await f.restart(now+10000);expect(await f.call({action:'inspect'})).toMatchObject({chargedCredits:charged?3:0,dispatched:0,currentPeriodCredits:0});
  if(!published)expect(await f.call({action:'publish',id:report.id,work,quote})).toMatchObject({ok:false});
  await f.receipt({action,point,providerCalls:f.calls(),chargedCredits:charged?3:0,published,transport:'real named Worker service binding, production dispatcher and actual durable transactions'});
 }finally{await f.dispose();}
},30000);
