import {test,expect,beforeAll} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {marketRuntimeBundles} from './market-runtime-fixture.mjs';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
// Session S Part 8a: the real coordinator Worker in workerd. QuoteService checks `x-market-client` before every path,
// `/cancel` included, and forwards a valid group to the account, which bounds new cancellation fences per client bucket.
// Outbound requests throw: cancellation never reaches a provider.
let bundles;
beforeAll(async()=>{bundles=await marketRuntimeBundles();},60000);
const policy={providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:90,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:80,monthly:800},concurrent:1,queueLimit:16,reservationMs:20000,ownershipMs:10000};

test('/cancel refuses a spoofed client header, and a valid group gets only its share of new fences',async()=>{
 const now=Date.now(),config={policy,month:{id:'cancel-fixture',start:now-1000,end:now+300000},quoteCost:3,leaseMs:20000,maxAttempts:16,maxWorks:8,dailyRowBudget:1024};
 const persist=await mkdtemp(join(tmpdir(),'run11-market-cancel-'));
 const mf=new Miniflare({...convertV4MiniflareOptions({workers:[
  {name:'app',modules:true,script:'export default {fetch(r,e){return e.MARKET_QUOTES.fetch(r)}}',compatibilityDate:'2026-09-13',serviceBindings:{MARKET_QUOTES:{name:'market',entrypoint:'QuoteService'}}},
  {name:'market',modules:true,script:bundles.market,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'cancel-fixture',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(config)},outboundService:()=>{throw Error('Cancellation must never call a provider');}},
 ]}),resourcePersistencePath:persist});
 const cancel=async(headers={})=>{const response=await mf.dispatchFetch('https://market.internal/cancel',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify({cancelToken:crypto.randomUUID()})});return {status:response.status,body:await response.json()};};
 const fences=async()=>{const ns=await mf.getDurableObjectNamespace('MARKETS','market');const response=await ns.get(ns.idFromName('cancel-fixture')).fetch('https://internal',{method:'POST',body:'{"action":"inspect"}'});return response.json();};
 try{
  for(const spoofed of ['192.0.2.1','v4:999.0.0.1','v6:2001:db8::1','v4:192.0.2.1, v4:198.51.100.1'])expect(await cancel({'x-market-client':spoofed})).toEqual({status:400,body:{error:'INVALID_MARKET_REQUEST'}});
  // Nothing reached the account: the first inspect sees an empty object.
  expect(await fences()).toMatchObject({ok:true,followers:0,attempts:0});
  // A budget of 1,024 rows allows 2 new fences a day per client bucket and 16 in all.
  expect((await cancel({'x-market-client':'v4:192.0.2.1'})).body).toEqual({ok:true});
  expect((await cancel({'x-market-client':'v4:192.0.2.1'})).body).toEqual({ok:true});
  expect((await cancel({'x-market-client':'v4:192.0.2.1'})).body).toEqual({ok:false,reason:'FOLLOWER_LIMIT'});
  // Another group gets its own share. Buckets come from a random daily key, so two groups share one 1 time in 4,096: try
  // the next candidate then (each refusal writes nothing).
  let other=0;for(const group of ['v6:2001:0db8:1234::/48','v4:198.51.100.7','v4:203.0.113.200','v6:2001:0db8:9999::/48']){if((await cancel({'x-market-client':group})).body.ok){other=1;break;}}
  expect(other).toBe(1);
  // Without a client (local runtimes, or an app older than Session S) only the total applies.
  for(let i=0;i<13;i++)expect((await cancel()).body).toEqual({ok:true});
  expect((await cancel()).body).toEqual({ok:false,reason:'FOLLOWER_LIMIT'});
  expect((await cancel({'x-market-client':'v4:203.0.113.5'})).body).toEqual({ok:false,reason:'FOLLOWER_LIMIT'});
 }finally{await mf.dispose();}
},60000);
