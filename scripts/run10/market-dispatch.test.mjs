import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),{build}=require('esbuild');
const pair=id=>({marketRef:{provider:'coingecko',kind:'coin',id},currency:'USD'});
test('real named Worker binding marks before fixture HTTP, coalesces, preserves partial results and survives restart',async()=>{
 const now=Date.now(),persist=await mkdtemp(join(tmpdir(),'run10-market-dispatch-'));const built=await build({entryPoints:[new URL('../../workers/market-coordinator/worker.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers']});
 const policy={providerMinuteLimit:10,providerMonthlyLimit:100,operating:{minute:8,monthly:80},monitoringReserve:{minute:1,monthly:10},monitoringMaximum:{minute:1,monthly:10},optionalCeiling:{minute:5,monthly:50},concurrent:1,queueLimit:4,reservationMs:20000,ownershipMs:10000};
 const config={policy,month:{id:'fixture-month',start:now-1000,end:now+300000},quoteCost:3,leaseMs:20000,maxAttempts:16,maxWorks:16};let mf,calls=0,release,observed;const sent=new Promise(r=>{observed=r;});const hold=new Promise(r=>{release=r;});
 async function inspect(){const ns=await mf.getDurableObjectNamespace('MARKETS','market');return (await ns.get(ns.idFromName('fixture-account')).fetch('https://internal',{method:'POST',body:JSON.stringify({action:'inspect'})})).json();}
 async function runtime(){return new Miniflare({...convertV4MiniflareOptions({workers:[{name:'app',modules:true,script:'export default {fetch(request,env){return env.QUOTES.fetch(request)}}',compatibilityDate:'2026-09-13',serviceBindings:{QUOTES:{name:'market',entrypoint:'QuoteService'}}},{name:'market',modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},durableObjectsPersist:persist,bindings:{MARKET_ACCOUNT_ID:'fixture-account',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(config),COINGECKO_DEMO_API_KEY:'synthetic-fixture-key'},outboundService:async request=>{calls++;expect(new URL(request.url).origin).toBe('https://api.coingecko.com');expect(request.headers.get('cookie')).toBeNull();expect(await inspect()).toMatchObject({dispatched:1});const ids=new URL(request.url).searchParams.get('ids');if(ids==='bitcoin'){observed();await hold;return new Response('{"bitcoin":{"usd":1.23456789123456789,"last_updated_at":'+Math.floor(now/1000)+'}}',{headers:{'content-type':'application/json'}});}return new Response('sanitized fixture failure',{status:503});}}]}),resourcePersistencePath:persist});}
 const load=async requests=>{const response=await mf.dispatchFetch('https://app/quotes',{method:'POST',headers:{'content-type':'application/json',cookie:'private'},body:JSON.stringify({version:1,requests})});return response.json();};
 mf=await runtime();try{
  const owner=load([pair('bitcoin'),pair('zignaly')]);await sent;
  const follower=await load([pair('bitcoin')]);expect(follower.results[0]).toMatchObject({quote:null,failure:'LOCAL_QUEUE'});expect(calls).toBe(1);release();
  const result=await owner;expect(result.results.map(r=>r.failure)).toEqual([null,'UPSTREAM_5XX']);expect(result.quotes[0].price).toBe('123456789123456789');expect(await inspect()).toMatchObject({chargedCredits:6,dispatched:0});
  expect((await load([{marketRef:{provider:'coingecko',kind:'rwa',id:'gold',assetType:'commodity'},currency:'USD'}])).results[0].failure).toBe('UNSUPPORTED');expect(calls).toBe(2);
  await mf.dispose();mf=await runtime();expect((await load([pair('bitcoin')])).results[0].status).toBe('VERIFIED_FRESH');expect(calls).toBe(2);expect(await inspect()).toMatchObject({chargedCredits:6});
 }finally{release();await mf.dispose();}
},30000);
