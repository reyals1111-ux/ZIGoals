import {marketRuntimeBundles} from './market-runtime-fixture.mjs';
import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// Session U Part 2a: why the public Alpha answered BTC with PROVIDER_UNAVAILABLE/UNKNOWN while ZIG was VERIFIED.
// CoinGecko refuses a request that has no User-Agent with 403 and this body (real provider, keyless, 2026-10-04 22:36
// UTC), and Workers' fetch sends no User-Agent. A 403 is UNKNOWN by design (provider-failure.ts). /simple/price is
// served by a different CoinGecko backend than /simple/token_price, and in production only the ZIG token fallback got
// through. The provider below refuses exactly like that, so this is the live failure in workerd: the real app routes
// in the installed OpenNext request context, the real QuoteService and account object, SQLite storage.
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url)),{Miniflare,convertV4MiniflareOptions}=require('miniflare');
const USER_AGENT='ZIGoals/1.0 (+https://zigoals.app)';
const refusal={status:{error_code:403,error_message:'Please add a descriptive User-Agent to your request. For higher rate limits & stable integration, please subscribe to a paid plan.'}};
const policy={providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:90,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:80,monthly:800},concurrent:2,queueLimit:16,reservationMs:20000,ownershipMs:10000};
const coin=(id,currency='USD')=>({marketRef:{provider:'coingecko',kind:'coin',id},currency});
let bundles;
/** `strict`: every provider path refuses a missing User-Agent (CoinGecko's keyless behaviour). Otherwise only
 * /simple/price does, as the production answers showed for the coordinator's key. */
async function runtime({strict}={}){
 bundles??=await marketRuntimeBundles();
 const now=Date.now(),calls=[],persist=await mkdtemp(join(tmpdir(),'run11-market-ua-'));
 const config={policy,month:{id:'ua-fixture',start:now-1000,end:now+3600000},quoteCost:1,operationCosts:{catalog:1,history:1,insights:1,token:1,rwa:1},leaseMs:20000,maxAttempts:128,maxWorks:64};
 const provider=async request=>{
  const url=new URL(request.url),ids=(url.searchParams.get('ids')??'').split(',').filter(Boolean),t=Date.now(),agent=request.headers.get('user-agent');
  calls.push({path:url.pathname,agent});
  if(!agent&&(strict||url.pathname.endsWith('/simple/price')))return Response.json(refusal,{status:403});
  if(url.pathname.endsWith('/simple/price'))return Response.json(Object.fromEntries(ids.map(id=>[id,{usd:86584.85,eur:76897.82,last_updated_at:Math.floor(t/1000)}])));
  if(url.pathname.endsWith('/simple/token_price/ethereum'))return Response.json({'0xb2617246d0c6c0087f18703d576831899ca94f01':{usd:0.0573,last_updated_at:Math.floor(t/1000)}});
  if(url.pathname.endsWith('/coins/markets'))return Response.json(ids.map(id=>({id,last_updated:new Date(t).toISOString(),price_change_percentage_24h:1.5,sparkline_in_7d:{price:Array.from({length:168},(_,i)=>1+i/1000)}})));
  if(url.pathname.endsWith('/market_chart'))return Response.json({prices:[[t-86400000,2],[t,3]]});
  if(url.pathname.endsWith('/coins/list'))return Response.json([{id:'bitcoin',symbol:'btc',name:'Bitcoin',platforms:{}},{id:'zignaly',symbol:'zig',name:'ZIGChain',platforms:{ethereum:'0xb2617246d0c6c0087f18703d576831899ca94f01'}}]);
  if(url.pathname.endsWith('/rwas/list'))return Response.json([]);
  throw Error('Unexpected provider path');
 };
 const mf=new Miniflare({...convertV4MiniflareOptions({workers:[
  {name:'app',modules:true,script:bundles.app,compatibilityDate:'2026-09-13',compatibilityFlags:['nodejs_compat'],bindings:{ZIGOALS_MARKET_QUOTES_MODE:'durable-v1'},serviceBindings:{MARKET_QUOTES:{name:'market',entrypoint:'QuoteService'}},outboundService:()=>{throw Error('The app must never bypass the named binding');}},
  {name:'market',modules:true,script:bundles.market,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'ua-account',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(config),COINGECKO_DEMO_API_KEY:'fixture-key'},outboundService:provider}]}),resourcePersistencePath:persist});
 const post=async(path,body)=>{const response=await mf.dispatchFetch('https://app/api/market-'+path,{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':'192.0.2.10'},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};};
 const get=async path=>{const response=await mf.dispatchFetch('https://app/api/market-'+path,{headers:{'cf-connecting-ip':'192.0.2.10'}});return {status:response.status,body:await response.json()};};
 return {mf,calls,post,get};
}
const states=body=>body.results.map(r=>`${r.request.marketRef.id}/${r.request.currency}:${r.status}:${r.failure}`);

test('the deploy probe (BTC/USD, then BTC/EUR) and the ZIG GET are VERIFIED, each from one /simple/price read that names the app',async()=>{
 const r=await runtime();try{
  const usd=await r.post('quotes',{requests:[coin('bitcoin')]});
  expect({status:usd.status,states:states(usd.body),error:usd.body.error}).toEqual({status:200,states:['bitcoin/USD:VERIFIED_FRESH:null'],error:null});
  const eur=await r.post('quotes',{requests:[coin('bitcoin','EUR')]});
  expect({status:eur.status,states:states(eur.body)}).toEqual({status:200,states:['bitcoin/EUR:VERIFIED_FRESH:null']});
  const zig=await r.get('quotes');
  expect({status:zig.status,states:states(zig.body)}).toEqual({status:200,states:['zignaly/USD:VERIFIED_FRESH:null']});
  // No token fallback: /simple/price answered ZIG itself.
  expect(r.calls).toEqual(['/api/v3/simple/price','/api/v3/simple/price','/api/v3/simple/price'].map(path=>({path,agent:USER_AGENT})));
 }finally{await r.mf.dispose();}
},60000);

test('every provider read (quotes, the ZIG fallback, insights, history, catalog) carries the same descriptive User-Agent',async()=>{
 const r=await runtime({strict:true});try{
  expect(states((await r.post('quotes',{requests:[coin('bitcoin'),coin('zignaly')]})).body)).toEqual(['bitcoin/USD:VERIFIED_FRESH:null','zignaly/USD:VERIFIED_FRESH:null']);
  const insights=await r.post('insights',{requests:[coin('bitcoin')]});expect(insights.status).toBe(200);expect(insights.body.entries).toHaveLength(1);
  const history=await r.post('history',{request:{marketRef:coin('bitcoin').marketRef,currency:'USD',range:'7d'}});expect(history.status).toBe(200);expect(history.body.error).toBeNull();
  const catalog=await r.get('assets');expect(catalog.status).toBe(200);expect(catalog.body.assets.map(a=>a.ref.id)).toEqual(['bitcoin','zignaly']);
  expect(new Set(r.calls.map(c=>c.path))).toEqual(new Set(['/api/v3/simple/price','/api/v3/coins/markets','/api/v3/coins/bitcoin/market_chart','/api/v3/coins/list','/api/v3/rwas/list']));
  expect(r.calls.every(c=>c.agent===USER_AGENT)).toBe(true);
 }finally{await r.mf.dispose();}
},60000);
