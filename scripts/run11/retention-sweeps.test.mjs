import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {doProbe,doProbeWorker} from './do-probe.mjs';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {build}=require('esbuild'),{Miniflare,convertV4MiniflareOptions}=require('miniflare');

// Session S Part 4 (FIX_PLAN C7, Q-PRIV-03): the food and market objects delete what has outlived its use even when no
// request comes. Real Workers in Miniflare with SQLite storage; the fixture clock moves by restarting on the same storage;
// the alarm spacing is shortened only under the fixture flag. Test-only wrappers add a row-listing route; the production
// classes are unchanged.
const root=new URL('../../',import.meta.url).pathname;
const wrap=async(contents,resolveDir)=>(await build({stdin:{contents,resolveDir,loader:'ts'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers']})).outputFiles[0].text;
const listing="async fetch(request){if(new URL(request.url).pathname==='/test/rows')return Response.json(Object.fromEntries(await this.rowsState.storage.list()));return super.fetch(request);}";
const foodCode=await wrap(`import worker,{FoodBudget as Base} from './worker.mjs';export default worker;export class FoodBudget extends Base{constructor(state,env){super(state,env);this.rowsState=state;}${listing}}`,root+'workers/food-lookup');
const marketCode=await wrap(`import worker,{MarketAccount as Base,QuoteService} from './worker.ts';export default worker;export {QuoteService};export class MarketAccount extends Base{constructor(state,env){super(state,env);this.rowsState=state;}${listing}}`,root+'workers/market-coordinator');
const until=async(check,ms=5000)=>{for(const end=Date.now()+ms;;){if(await check())return;if(Date.now()>end)throw Error('condition not reached');await new Promise(r=>setTimeout(r,100));}};
const T0=Date.UTC(2026,9,4,9);

function foodRuntime(){
 let persist,provider='ok';
 const at=async(time,sweep)=>{
  persist??=await mkdtemp(join(tmpdir(),'run11-food-retention-'));
  const mf=new Miniflare({...convertV4MiniflareOptions({workers:[{name:'main',modules:true,script:foodCode,compatibilityDate:'2026-09-13',durableObjects:{FOOD_BUDGET:{className:'FoodBudget',useSQLite:true}},bindings:{FOOD_USER_AGENT:'ZIGoals/0.1.0 (alpha-contact@example.invalid)',ISOLATED_FIXTURE:'true',LOCAL_TEST_NOW:String(time),...(sweep?{LOCAL_SWEEP_MS:String(sweep)}:{})},outboundService:async request=>{const code=new URL(request.url).pathname.split('/').at(-1);return provider==='down'?new Response('down',{status:500}):code==='00000000'?new Response('{}',{status:404}):Response.json({code,product:{product_name:'Fixture'}});}},doProbeWorker({className:'FoodBudget',scriptName:'main'})]}),resourcePersistencePath:persist});
  const lookup=(code,client)=>mf.dispatchFetch('https://food.test/lookup?code='+code,{headers:client?{'x-food-client':client}:{}}).then(async r=>{await r.text();return r.status;});
  const rows=async()=>{const ns=await doProbe(mf);return (await ns.get(ns.idFromName('shared-provider-budget-v1')).fetch('https://internal/test/rows')).json();};
  return {mf,lookup,rows};
 };
 return {at,down:()=>{provider='down';}};
}
const expiring=rows=>Object.keys(rows).filter(key=>key.startsWith('cache:')||key.startsWith('food-day:')||key==='food-client-key');

test('food: cached answers, day rows and old client keys are swept when nobody looks up anything',async()=>{
 const f=foodRuntime();
 let run=await f.at(T0,150);
 try{
  expect(await run.lookup('11111111','v4:192.0.2.7')).toBe(200);
  await run.mf.dispose();run=await f.at(T0+13000,150);expect(await run.lookup('00000000','v4:192.0.2.7')).toBe(404);
  expect(expiring(await run.rows()).sort()).toEqual(['cache:00000000','cache:11111111','food-client-key','food-day:2026-10-04']);
  // Nothing has expired yet, so a sweep keeps everything.
  await new Promise(r=>setTimeout(r,500));expect(expiring(await run.rows()).length).toBe(4);
  // Two days on, with no request at all, the pending alarm deletes all of it.
  await run.mf.dispose();run=await f.at(T0+2*86400000+60000,150);
  await until(async()=>expiring(await run.rows()).length===0);
  expect((await run.rows())['food-days']).toEqual([]);
 }finally{await run.mf.dispose();}
},30000);

test('food: an expired answer is deleted when it is read, even if the provider then fails',async()=>{
 const f=foodRuntime();
 let run=await f.at(T0);
 try{
  expect(await run.lookup('11111111')).toBe(200);expect(Object.keys(await run.rows())).toContain('cache:11111111');
  await run.mf.dispose();f.down();run=await f.at(T0+86400000+1000);
  expect(await run.lookup('11111111')).toBe(502);expect(Object.keys(await run.rows())).not.toContain('cache:11111111');
 }finally{await run.mf.dispose();}
},30000);

test('market: an idle account deletes its client key and day rows',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'run11-market-retention-'));
 const policy={providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:90,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:80,monthly:800},concurrent:2,queueLimit:16,reservationMs:20000,ownershipMs:10000};
 const config={policy,calendar:{timeZone:'UTC',confirmed:true},quoteCost:3,leaseMs:20000,maxAttempts:128,maxWorks:64};
 const start=(time,sweep)=>new Miniflare({...convertV4MiniflareOptions({workers:[{name:'main',modules:true,script:marketCode,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_POLICY:JSON.stringify(config),ISOLATED_FIXTURE:'true',LOCAL_TEST_NOW:String(time),...(sweep?{LOCAL_SWEEP_MS:String(sweep)}:{})}},doProbeWorker({className:'MarketAccount',scriptName:'main'})]}),resourcePersistencePath:persist});
 const object=async(mf,path,body)=>{const ns=await doProbe(mf);return (await ns.get(ns.idFromName('fixture-account')).fetch('https://internal'+path,{method:'POST',body:JSON.stringify(body??{})})).json();};
 const retained=rows=>Object.keys(rows).filter(key=>key==='market-client-key'||key.startsWith('market-day:'));
 let mf=start(T0,150);
 try{
  const work={operation:'quote',pair:{marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'}};
  const acquired=await object(mf,'/',{action:'acquire-many',works:[work],groups:[{charge:'quote',members:[0]}],client:'v4:192.0.2.7'});
  expect(acquired.ok).toBe(true);
  expect(retained(await object(mf,'/test/rows')).sort()).toEqual(['market-client-key','market-day:2026-10-04']);
  await mf.dispose();mf=start(T0+3*86400000,150);
  // The object is never asked anything: the alarm armed by the first command removes both.
  await until(async()=>retained(await object(mf,'/test/rows')).length===0);
 }finally{await mf.dispose();}
},30000);
