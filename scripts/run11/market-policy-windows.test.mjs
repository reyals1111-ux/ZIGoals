import {test,expect,beforeAll} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {doProbe,doProbeWorker} from './do-probe.mjs';
import {marketRuntimeBundles} from './market-runtime-fixture.mjs';
// Session U follow-up F2: the real coordinator bundle in workerd, its storage persisted across restarts, the fixture clock
// moved from before the 2026-10-31 16:00 UTC boundary to it and past it. A MARKET_POLICY with the current window and the
// next one hands over by itself; the day's rows and public new works carry on; outside both windows everything is
// refused; QuoteService /status names both ends. Nothing reaches a network.
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url)),{Miniflare,convertV4MiniflareOptions}=require('miniflare');
const boundary=Date.parse('2026-10-31T16:00:00Z'),startA=Date.parse('2026-10-01T16:00:00Z'),endB=Date.parse('2026-11-30T16:00:00Z');
const policy={providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:90,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:80,monthly:800},concurrent:2,queueLimit:16,reservationMs:20000,ownershipMs:10000};
const base={policy,quoteCost:1,leaseMs:20000,maxAttempts:128,maxWorks:64,dailyRowBudget:1000,publicColdWorks:3};
const MARKET_POLICY=JSON.stringify({windows:[{...base,month:{id:'period-2026-10-01',start:startA,end:boundary}},{...base,month:{id:'period-2026-10-31',start:boundary,end:endB}}]});
const quote=id=>({operation:'quote',pair:{marketRef:{provider:'coingecko',kind:'coin',id},currency:'USD'}});
const request=(ids,client)=>({action:'acquire-many',works:ids.map(quote),groups:[{charge:'quote',members:ids.map((_,i)=>i)}],client});
const statuses=reply=>reply.results.map(r=>r.status??r.reason);
let market;
beforeAll(async()=>{market=(await marketRuntimeBundles()).market;},60000);
async function fixture(){
 const persist=await mkdtemp(join(tmpdir(),'run11-market-windows-'));let mf;
 const restart=async clock=>{await mf?.dispose();mf=new Miniflare({...convertV4MiniflareOptions({workers:[
  {name:'caller',modules:true,script:'export default {fetch(request,env){return env.MARKET_QUOTES.fetch(request);}}',compatibilityDate:'2026-09-13',serviceBindings:{MARKET_QUOTES:{name:'market',entrypoint:'QuoteService'}}},
  {name:'market',modules:true,script:market,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{ISOLATED_FIXTURE:'true',LOCAL_TEST_NOW:String(clock),MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_ACCOUNT_ID:'windows-account',MARKET_POLICY},outboundService:()=>{throw Error('No provider read in this test');}},
  doProbeWorker({className:'MarketAccount',scriptName:'market'}),
 ]}),resourcePersistencePath:persist});};
 const call=async command=>{const ns=await doProbe(mf);return(await ns.get(ns.idFromName('windows-account')).fetch('https://internal',{method:'POST',body:JSON.stringify(command)})).json();};
 const status=async()=>(await mf.dispatchFetch('https://market.internal/status',{method:'POST',body:'{"version":1}'})).json();
 return {call,status,restart,dispose:()=>mf.dispose()};
}

test('before, at and after the boundary: one hand-over, the day\'s budget carried on, refusal after the last window',async()=>{
 const f=await fixture();
 try{
  await f.restart(boundary-3600000);
  expect(await f.status()).toEqual({version:1,policyWindowEnd:'2026-10-31T16:00:00.000Z',nextPolicyWindowEnd:'2026-11-30T16:00:00.000Z'});
  expect(statuses(await f.call(request(['coin-a','coin-b','coin-c'],'v4:192.0.2.1')))).toEqual(['OWNER','OWNER','OWNER']);
  const before=await f.call({action:'inspect'});expect(before).toMatchObject({ok:true,publicWorksToday:3});
  await f.restart(boundary);
  expect(await f.status()).toEqual({version:1,policyWindowEnd:'2026-11-30T16:00:00.000Z',nextPolicyWindowEnd:null});
  expect(await f.call({action:'inspect'})).toMatchObject({ok:true,rowsToday:before.rowsToday,publicWorksToday:3,currentPeriodCredits:0});
  // The cap spent at 15:00 UTC stays spent at 16:00 UTC: no second budget for the same day.
  expect(statuses(await f.call(request(['coin-d'],'v4:192.0.2.2')))).toEqual(['DAILY_LIMIT']);
  await f.restart(Date.parse('2026-11-01T00:00:01Z'));
  expect(statuses(await f.call(request(['coin-d'],'v4:192.0.2.2')))).toEqual(['OWNER']);
  await f.restart(endB);
  expect(await f.call({action:'inspect'})).toEqual({ok:false,reason:'CLOCK_OR_PERIOD'});
  expect(await f.call(request(['coin-a'],'v4:192.0.2.3'))).toEqual({ok:false,reason:'CLOCK_OR_PERIOD'});
 }finally{await f.dispose();}
},120000);

test('before the first window starts, everything is refused too',async()=>{
 const f=await fixture();
 try{await f.restart(startA-1);expect(await f.call({action:'inspect'})).toEqual({ok:false,reason:'CLOCK_OR_PERIOD'});}
 finally{await f.dispose();}
},60000);
