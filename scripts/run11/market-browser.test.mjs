import {test,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {emptyPlatform,positionSchema} from '../../apps/web/lib/positions.ts';
import {marketRuntimeBundles} from './market-runtime-fixture.mjs';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const webRequire=createRequire(new URL('../../apps/web/package.json',import.meta.url)),{chromium}=webRequire('@playwright/test');
// Requires an existing local preview; HTML/UI run there, public API interception
// executes real app handlers in installed OpenNext context and the named Worker.
// This is deliberately separate from proof of a complete generated deployment.
test.skipIf(process.env.RUN11_MARKET_BROWSER!=='1')('wealth browser consumes actual mixed-pair route evidence and retains Bitcoin through failed ZIG refresh',async()=>{
 const origin=process.env.RUN11_REVIEW_ORIGIN??'http://127.0.0.1:3112',code=await marketRuntimeBundles(),now=Date.now(),folder=await mkdtemp(join(tmpdir(),'run11-market-browser-')),calls=[],wire=[];
 const policy={providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:90,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:80,monthly:800},concurrent:2,queueLimit:16,reservationMs:20000,ownershipMs:10000};
 const config={policy,month:{id:'browser-fixture',start:now-1000,end:now+300000},quoteCost:3,operationCosts:{token:6,insights:5,catalog:2,history:4},leaseMs:20000,maxAttempts:128,maxWorks:64};
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'app',modules:true,script:code.app,compatibilityDate:'2026-09-13',compatibilityFlags:['nodejs_compat'],bindings:{ZIGOALS_MARKET_QUOTES_MODE:'durable-v1'},serviceBindings:{MARKET_QUOTES:{name:'market',entrypoint:'QuoteService'}},outboundService:()=>{throw Error('App provider bypass forbidden');}},{name:'market',modules:true,script:code.market,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'browser-fixture',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(config),COINGECKO_DEMO_API_KEY:'fixture-key'},outboundService:async request=>{
  const url=new URL(request.url);calls.push({path:url.pathname,ids:url.searchParams.get('ids')});expect(request.headers.get('cookie')).toBeNull();expect(request.headers.get('authorization')).toBeNull();
  if(url.pathname.endsWith('/simple/price'))return url.searchParams.get('ids')==='bitcoin'?Response.json({bitcoin:{usd:65000,last_updated_at:Math.floor(now/1000)}}):new Response('',{status:503});
  if(url.pathname.includes('/token_price/'))return new Response('',{status:503});
  if(url.pathname.endsWith('/coins/markets'))return Response.json([{id:'bitcoin',last_updated:new Date(now).toISOString(),price_change_percentage_24h:2}]);
  throw Error('Unexpected provider fixture endpoint');
 }}]}));
 const browser=await chromium.launch({channel:'chrome',headless:true}),inFlight=new Set();let context;
 try{
  context=await browser.newContext({viewport:{width:1280,height:900}});await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  await context.route('**/api/**',route=>route.fulfill({status:503,json:{error:'Unrelated local fixture unavailable'}}));
  await context.route('**/api/market-*',route=>{const pending=(async()=>{const r=route.request(),url=new URL(r.url());const response=await mf.dispatchFetch('https://app'+url.pathname,{method:r.method(),headers:{'content-type':'application/json'},...(r.postData()?{body:r.postData()}: {})});const text=await response.text();if(url.pathname==='/api/market-quotes'){const result=JSON.parse(text);if(result.version===1)wire.push(result);}await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:text});})();inFlight.add(pending);void pending.then(()=>inFlight.delete(pending),()=>inFlight.delete(pending));return pending;});
  const data=emptyPlatform();data.positions=['bitcoin','zignaly'].map(id=>positionSchema.parse({id:'fixture-'+id,providerId:id==='bitcoin'?'Fictional Bitcoin':'Fictional ZIG',sourceType:'MANUAL',network:'coingecko-coin',account:'local',asset:id==='bitcoin'?'BTC':'ZIG',denom:id,quantity:'100000000',decimals:8,assetClass:'Crypto',marketRef:{provider:'coingecko',kind:'coin',id},valuationMode:'automatic',quoteCurrency:'USD',liquidity:'LIQUID',verification:'MANUAL',sync:'MANUAL',observedAt:new Date(now).toISOString(),provenance:'Controlled browser fixture',executionAuthority:'NONE'}));
  await context.addInitScript(data=>{if(!localStorage.getItem('fixture-market-seeded')){localStorage.setItem('zigoals:platform:v1',JSON.stringify(data));localStorage.setItem('fixture-market-seeded','1');}},data);
  const page=await context.newPage();await page.goto(origin+'/app/wealth');
  const btc=page.locator('article.owned-asset-card').filter({has:page.getByRole('heading',{name:'Fictional Bitcoin',exact:true})}),zig=page.locator('article.owned-asset-card').filter({has:page.getByRole('heading',{name:'Fictional ZIG',exact:true})});
  await btc.getByText('Current · USD',{exact:true}).waitFor({timeout:20000});await zig.getByText('Needs valuation',{exact:true}).waitFor();expect(await btc.locator('.holding-unit-price strong').innerText()).toBe('$65000');expect(await zig.locator('.holding-unit-price strong').innerText()).toBe('Unavailable');
  const retained=await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:public-market-quotes:v1')).find(q=>q.providerAssetId==='bitcoin'));expect(retained.price).toBe('65000');expect(wire.some(r=>r.results.some(p=>p.request.marketRef.id==='bitcoin'&&p.status==='VERIFIED_FRESH')&&r.results.some(p=>p.request.marketRef.id==='zignaly'&&p.failure==='UPSTREAM_5XX'))).toBe(true);
  await page.getByRole('button',{name:'↻ Refresh prices',exact:true}).click();await page.getByRole('button',{name:'↻ Refresh prices',exact:true}).waitFor();await page.reload();await vi.waitFor(()=>expect(wire.length).toBeGreaterThanOrEqual(2),{timeout:10000});await page.getByRole('button',{name:'↻ Refresh prices',exact:true}).waitFor();await btc.getByText('Current · USD',{exact:true}).waitFor();await zig.getByText('Needs valuation',{exact:true}).waitFor();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:public-market-quotes:v1')).find(q=>q.providerAssetId==='bitcoin'))).toEqual(retained);expect(calls.filter(c=>c.path.endsWith('/simple/price')&&c.ids==='bitcoin')).toHaveLength(1);
  await page.screenshot({path:join(folder,'mixed-pair-wealth.png'),fullPage:true});await writeFile(join(folder,'evidence.json'),JSON.stringify({version:1,recordedAt:new Date().toISOString(),boundary:'real wealth UI -> actual app handler -> installed OpenNext context -> named local Worker -> controlled provider',bitcoin:retained,providerCalls:calls,versionedResponses:wire.length,liveProviderCalls:0},null,2)+'\n');
 }finally{await context?.close();await Promise.allSettled([...inFlight]);await browser.close();await mf.dispose();}
},60000);
