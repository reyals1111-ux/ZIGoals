import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {doProbe,doProbeWorker} from './do-probe.mjs';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url)),{Miniflare,convertV4MiniflareOptions}=require('miniflare'),{build}=require('esbuild');
test('real wall-clock follower expiry degrades only its response and preserves charged owner plus later fresh cache',async()=>{
 const now=Date.now(),code=(await build({entryPoints:[new URL('../../workers/market-coordinator/worker.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers']})).outputFiles[0].text;
 let release,entered,calls=0;const held=new Promise(r=>{release=r;}),started=new Promise(r=>{entered=r;}),config={policy:{providerMinuteLimit:20,providerMonthlyLimit:100,operating:{minute:18,monthly:90},monitoringReserve:{minute:1,monthly:10},monitoringMaximum:{minute:2,monthly:20},optionalCeiling:{minute:15,monthly:70},concurrent:1,queueLimit:4,reservationMs:10000,ownershipMs:2000},calendar:{timeZone:'UTC',confirmed:true},quoteCost:3,leaseMs:10000,maxAttempts:16,maxWorks:8};
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'deadline-app',modules:true,script:'export default {fetch(request,env){return env.QUOTES.fetch(request)}}',compatibilityDate:'2026-09-13',serviceBindings:{QUOTES:{name:'deadline-market',entrypoint:'QuoteService'}}},{name:'deadline-market',modules:true,script:code,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'deadline-account',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(config),COINGECKO_DEMO_API_KEY:'synthetic'},outboundService:async request=>{expect(new URL(request.url).origin).toBe('https://api.coingecko.com');calls++;entered();await held;return Response.json({bitcoin:{usd:1,last_updated_at:Math.floor(now/1000)}});}},doProbeWorker({className:'MarketAccount',scriptName:'deadline-market'})]}));
 const load=async()=>{const app=await mf.getWorker('deadline-app');return(await app.fetch('https://app/quotes',{method:'POST',body:JSON.stringify({version:1,requests:[{marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'}]})})).json();};
 const inspect=async()=>{const ns=await doProbe(mf);return(await ns.get(ns.idFromName('deadline-account')).fetch('https://internal',{method:'POST',body:JSON.stringify({action:'inspect'})})).json();};
 let owner,follower;try{
  owner=load();await started;follower=load();await expect.poll(async()=>(await inspect()).followers,{timeout:5000,interval:10}).toBe(1);
  const expired=await follower;expect(expired).toMatchObject({complete:false,degraded:true,quotes:[],results:[{quote:null,failure:'LOCAL_QUEUE',status:'PROVIDER_UNAVAILABLE'}]});
  expect(await inspect()).toMatchObject({followers:0,dispatched:1,chargedCredits:3});expect(calls).toBe(1);
  release();const published=await owner;expect(published).toMatchObject({complete:true,degraded:false,results:[{status:'VERIFIED_FRESH',failure:null}]});expect(published.quotes).toHaveLength(1);
  expect(await load()).toMatchObject({complete:true,degraded:false,results:[{status:'VERIFIED_FRESH',failure:null}]});expect(calls).toBe(1);expect(await inspect()).toMatchObject({followers:0,dispatched:0,chargedCredits:3});
 }finally{release();await Promise.allSettled([owner,follower]);await mf.dispose();}
},30000);
