import {test,expect,beforeAll} from 'vitest';
import {createRequire} from 'node:module';
import {marketRuntimeBundles} from './market-runtime-fixture.mjs';
// Session W Part 15: coins' market details through the real app route in the installed OpenNext request context, the
// real QuoteService /insights-detail and account object in workerd with SQLite storage, and a synthetic provider. Nothing
// reaches a live provider or Cloudflare. A coordinator without the path answers 404 and the app says "not provided";
// /api/market-insights answers exactly as before.
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url)),{Miniflare,convertV4MiniflareOptions}=require('miniflare');
const policy={providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:90,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:80,monthly:800},concurrent:2,queueLimit:16,reservationMs:20000,ownershipMs:10000};
const coin=(id,currency='USD')=>({marketRef:{provider:'coingecko',kind:'coin',id},currency});
const NOT_PROVIDED='This market service does not provide these details yet.';
let bundles;
beforeAll(async()=>{bundles=await marketRuntimeBundles();},60000);
const app=()=>({name:'app',modules:true,script:bundles.app,compatibilityDate:'2026-09-13',compatibilityFlags:['nodejs_compat'],bindings:{ZIGOALS_MARKET_QUOTES_MODE:'durable-v1'},serviceBindings:{MARKET_QUOTES:{name:'market',entrypoint:'QuoteService'}},outboundService:()=>{throw Error('The app must never bypass the named binding');}});
async function runtime(market){
 const calls=[],observed=new Date(Date.now()-30000).toISOString(),now=Date.now();
 const config={policy,month:{id:'detail-fixture',start:now-1000,end:now+3600000},quoteCost:3,operationCosts:{catalog:2,history:4,insights:5,token:6,rwa:7},leaseMs:20000,maxAttempts:128,maxWorks:64};
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[app(),market??{name:'market',modules:true,script:bundles.market,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'detail-account',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(config),COINGECKO_DEMO_API_KEY:'fixture-key'},outboundService:async request=>{
  const url=new URL(request.url),ids=(url.searchParams.get('ids')??'').split(',').filter(Boolean);calls.push(url.pathname+url.search);
  // Raw JSON text, so the numeric lexemes are exactly the provider's.
  if(url.pathname==='/api/v3/coins/markets'&&url.searchParams.get('price_change_percentage')==='1h,24h,7d')return new Response(`[${ids.map(id=>`{"id":"${id}","last_updated":"${observed}","price_change_percentage_1h_in_currency":0.25,"price_change_percentage_24h_in_currency":-1.5,"price_change_percentage_7d_in_currency":12.125,"market_cap":1234567890123.5,"total_volume":0,"circulating_supply":1.9e7,"total_supply":21000000,"max_supply":null}`).join(',')}]`,{headers:{'content-type':'application/json'}});
  if(url.pathname==='/api/v3/coins/markets')return new Response(`[${ids.map(id=>`{"id":"${id}","last_updated":"${observed}","price_change_percentage_24h":1.5,"sparkline_in_7d":{"price":[1,2.5,3]}}`).join(',')}]`,{headers:{'content-type':'application/json'}});
  throw Error('Unexpected provider path '+url.pathname);
 }}]}));
 const post=async(path,body)=>{const response=await mf.dispatchFetch('https://app/api/market-'+path,{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':'192.0.2.10'},body:JSON.stringify(body)});return {status:response.status,text:await response.text()};};
 return {mf,calls,post,observed};
}

test('details: one read per currency at the documented address, exact figures, "not provided" for a 0 or a null; asked again, the coordinator answers without a read',async()=>{
 const r=await runtime();try{
  const asked={requests:[coin('bitcoin'),coin('ethereum'),coin('bitcoin','EUR')]},first=await r.post('detail',asked);
  expect(first.status).toBe(200);
  expect(r.calls).toEqual(['/api/v3/coins/markets?vs_currency=usd&ids=bitcoin%2Cethereum&per_page=250&page=1&sparkline=false&price_change_percentage=1h%2C24h%2C7d&precision=full','/api/v3/coins/markets?vs_currency=eur&ids=bitcoin&per_page=250&page=1&sparkline=false&price_change_percentage=1h%2C24h%2C7d&precision=full']);
  const body=JSON.parse(first.text);
  expect(body.error).toBeNull();expect(Object.keys(body.results).sort()).toEqual(['coingecko:coin:bitcoin:EUR','coingecko:coin:bitcoin:USD','coingecko:coin:ethereum:USD']);
  expect(body.results['coingecko:coin:bitcoin:USD']).toEqual({error:null,stale:false,detail:{...coin('bitcoin'),source:'CoinGecko',change1h:'0.25',change24h:'-1.5',change7d:'12.125',marketCap:{value:'12345678901235',decimals:1},volume24h:null,circulatingSupply:{value:'19000000',decimals:0},totalSupply:{value:'21000000',decimals:0},maxSupply:null,observedAt:r.observed,fetchedAt:body.results['coingecko:coin:bitcoin:USD'].detail.fetchedAt}});
  const second=await r.post('detail',asked);
  expect(JSON.parse(second.text).results).toEqual(body.results);expect(r.calls).toHaveLength(2);
 }finally{await r.mf.dispose();}
},60000);

test('insights answer exactly as before, at the same address, even after details for the same coin were cached',async()=>{
 const r=await runtime();try{
  await r.post('detail',{requests:[coin('bitcoin')]});
  const insights=await r.post('insights',{requests:[coin('bitcoin')]});
  expect(insights.status).toBe(200);
  expect(r.calls[1]).toBe('/api/v3/coins/markets?ids=bitcoin&per_page=250&page=1&sparkline=true&price_change_percentage=24h&precision=full&vs_currency=usd');
  const fetched=JSON.parse(insights.text).entries[0].fetchedAt;
  expect(insights.text).toBe(`{"entries":[{"marketRef":{"provider":"coingecko","kind":"coin","id":"bitcoin"},"currency":"USD","source":"CoinGecko","marketBasis":"coin","logoUrl":null,"change24h":"1.5","observedAt":"${r.observed}","fetchedAt":"${fetched}","sparkline":{"range":"7d","timestamps":"unavailable","fetchedAt":"${fetched}","prices":[{"value":"1","decimals":0},{"value":"25","decimals":1},{"value":"3","decimals":0}]}}],"error":null,"results":{"coingecko:coin:bitcoin:USD":{"insight":{"marketRef":{"provider":"coingecko","kind":"coin","id":"bitcoin"},"currency":"USD","source":"CoinGecko","marketBasis":"coin","logoUrl":null,"change24h":"1.5","observedAt":"${r.observed}","fetchedAt":"${fetched}","sparkline":{"range":"7d","timestamps":"unavailable","fetchedAt":"${fetched}","prices":[{"value":"1","decimals":0},{"value":"25","decimals":1},{"value":"3","decimals":0}]}},"error":null,"stale":false}}}`);
 }finally{await r.mf.dispose();}
},60000);

test('an older coordinator (no /insights-detail, 404) makes every pair "not provided"; nothing else is asked',async()=>{
 const seen=[];
 const older={name:'market',modules:true,compatibilityDate:'2026-09-13',script:"import {WorkerEntrypoint} from 'cloudflare:workers';export class QuoteService extends WorkerEntrypoint{async fetch(request){const path=new URL(request.url).pathname;if(!['/quotes','/catalog','/history','/insights','/cancel','/status'].includes(path))return new Response(null,{status:404,headers:{'cache-control':'no-store'}});return Response.json({error:'MARKET_SETUP_REQUIRED'},{status:503});}}export default {fetch(){return new Response('Not found',{status:404});}}",outboundService:request=>{seen.push(request.url);throw Error('No provider read');}};
 const r=await runtime(older);try{
  const answer=await r.post('detail',{requests:[coin('bitcoin'),coin('solana','EUR')]});
  expect(answer.status).toBe(200);
  expect(JSON.parse(answer.text)).toEqual({results:{'coingecko:coin:bitcoin:USD':{detail:null,error:NOT_PROVIDED,stale:true},'coingecko:coin:solana:EUR':{detail:null,error:NOT_PROVIDED,stale:true}},error:NOT_PROVIDED});
  expect(seen).toEqual([]);
 }finally{await r.mf.dispose();}
},60000);
