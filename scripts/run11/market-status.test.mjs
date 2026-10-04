import {test,expect,beforeAll} from 'vitest';
import {createRequire} from 'node:module';
import {marketRuntimeBundles} from './market-runtime-fixture.mjs';
// Session U Part 2d: QuoteService /status names when the coordinator's MARKET_POLICY period ends. The real coordinator
// bundle in workerd, called through a named service binding exactly as the app calls it; nothing reaches a network.
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url)),{Miniflare,convertV4MiniflareOptions}=require('miniflare');
const policy={policy:{providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:90,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:80,monthly:800},concurrent:2,queueLimit:16,reservationMs:20000,ownershipMs:10000},quoteCost:1,leaseMs:20000,maxAttempts:128,maxWorks:64};
const windowPolicy={...policy,month:{id:'plan-window',start:Date.UTC(2026,9,1,16),end:Date.UTC(2026,9,31,16)}};
const calendarPolicy={...policy,calendar:{timeZone:'UTC',confirmed:true}};
let market;
beforeAll(async()=>{market=(await marketRuntimeBundles()).market;},60000);
async function coordinator(bindings){
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[
  {name:'caller',modules:true,script:'export default {fetch(request,env){return env.MARKET_QUOTES.fetch(request);}}',compatibilityDate:'2026-09-13',serviceBindings:{MARKET_QUOTES:{name:'market',entrypoint:'QuoteService'}}},
  {name:'market',modules:true,script:market,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_ACCOUNT_ID:'status-account',...bindings},outboundService:()=>{throw Error('No provider read for /status');}},
 ]}));
 const call=async(path,init={method:'POST',body:'{"version":1}'})=>{const response=await mf.dispatchFetch('https://market.internal'+path,init);const text=await response.text();return {status:response.status,cache:response.headers.get('cache-control'),body:text?JSON.parse(text):null};};
 return {mf,call};
}

test('an exact window answers its end; a confirmed UTC calendar answers the next month start',async()=>{
 for(const [bindings,end] of [[{MARKET_POLICY:JSON.stringify(windowPolicy)},'2026-10-31T16:00:00.000Z'],[{MARKET_POLICY:JSON.stringify(calendarPolicy),ISOLATED_FIXTURE:'true',LOCAL_TEST_NOW:String(Date.UTC(2026,11,31,23,59))},'2027-01-01T00:00:00.000Z']]){
  const c=await coordinator(bindings);try{
   expect(await c.call('/status')).toEqual({status:200,cache:'no-store',body:{version:1,policyWindowEnd:end}});
   // A client group is checked first, as on every path; a valid one changes nothing.
   expect((await c.call('/status',{method:'POST',headers:{'x-market-client':'v4:192.0.2.10'},body:'{}'})).body).toEqual({version:1,policyWindowEnd:end});
   expect((await c.call('/status',{method:'POST',headers:{'x-market-client':'not a group'},body:'{}'})).status).toBe(400);
  }finally{await c.mf.dispose();}
 }
},60000);

test('a missing or invalid policy reports no end; an unconfigured coordinator keeps its setup gate; only POST /status exists',async()=>{
 for(const MARKET_POLICY of [undefined,'not json',JSON.stringify({...policy}),JSON.stringify({...windowPolicy,calendar:calendarPolicy.calendar})]){
  const c=await coordinator(MARKET_POLICY===undefined?{}:{MARKET_POLICY});try{
   expect(await c.call('/status')).toEqual({status:200,cache:'no-store',body:{version:1,policyWindowEnd:null}});
  }finally{await c.mf.dispose();}
 }
 const c=await coordinator({MARKET_POLICY:JSON.stringify(windowPolicy)});try{
  expect((await c.call('/status',{method:'GET'})).status).toBe(404);
  expect((await c.call('/status?detail=1')).status).toBe(404);
  expect((await c.call('/status/usage')).status).toBe(404);
 }finally{await c.mf.dispose();}
 const gate=await coordinator({MARKET_POLICY:JSON.stringify(windowPolicy),MARKET_QUOTE_DISPATCH:'off'});try{
  expect(await gate.call('/status')).toEqual({status:503,cache:'no-store',body:{error:'MARKET_SETUP_REQUIRED'}});
 }finally{await gate.mf.dispose();}
},60000);
