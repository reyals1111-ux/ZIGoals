import {afterAll,beforeAll,test,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {marketRuntimeBundles} from './market-runtime-fixture.mjs';
import {doProbe,doProbeWorker} from './do-probe.mjs';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const webRequire=createRequire(new URL('../../apps/web/package.json',import.meta.url)),{chromium}=webRequire('@playwright/test');
// A CI run once hit the 30 s test timeout here with no stack. Name the step that stalls instead: every
// setup await is a named step too, and cleanup closes the page before awaiting the requests, so an
// unsettled in-page request can no longer hold the test until its timeout and hide the failing step.
const step=(label,promise,ms=10000)=>{let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' did not finish within '+ms+' ms')),ms);})]).finally(()=>clearTimeout(timer));};
// Setup steps get what is left of the case's 30 s budget (less 2 s to report), so naming them sets no tighter limit.
const within=deadline=>(label,promise)=>step(label,promise,Math.max(1,deadline-Date.now()));
// Built and started once for both cases, outside each case's 30 s budget. Named, Chrome's cold start on a busy
// CI runner was the step that stalled (#53): it took more than 10 s, and inside the case it had surfaced only as
// "Test timed out in 30000ms".
// Session X Part 6: it still stalled now and then (runs 37604132447 and earlier), because this was the one file that
// starts Chrome inside `pnpm test`, beside some 450 other files in three forks. It now runs, like every other
// browser file, only when RUN11_MARKET_BROWSER=1: in CI's integration job, one file at a time. Playwright's default
// launch timeout is 180 s (playwright-core 1.63's DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT; its type comment, and this
// comment before, said 30 s), longer than the hook's 45 s, so a slow launch ended as a bare hook timeout; the launch
// now gives up at 40 s itself and reports Chrome's own log.
const enabled=process.env.RUN11_MARKET_BROWSER==='1';
let bundles,browser;
beforeAll(async()=>{if(enabled)bundles=await marketRuntimeBundles();},60000);
beforeAll(async()=>{if(enabled)browser=await chromium.launch({channel:'chrome',headless:true,timeout:40000});},45000);
afterAll(async()=>{await browser?.close();});
test.runIf(enabled).each(['abort','navigation'])('%s of an actual app request forgets its follower without cancelling the shared provider owner',async mode=>{
 const code={...bundles},now=Date.now();let release,entered,calls=0;const traces=[];
 // Use the shipped client cancellation path: this local ingress does not emit
 // Request.signal abort. Retain the strict 500ms durable cleanup and owner checks.
 code.app=code.app.replace('fetch(request, env, ctx) {',()=>`fetch(request, env, ctx) { if(new URL(request.url).pathname==="/")return new Response(${JSON.stringify('<html><title>Controlled disconnect</title><script>'+code.client+'</script></html>')},{headers:{"content-type":"text/html"}});if(new URL(request.url).pathname.endsWith("/cancel"))ctx.waitUntil(env.SIGNAL_TRACE.fetch("https://signal/app-cancel"));`);
 expect(code.app).toContain('SIGNAL_TRACE.fetch');
 const trace=async request=>{traces.push(new URL(request.url).pathname);return Response.json({});};
 const held=new Promise(resolve=>{release=resolve;}),started=new Promise(resolve=>{entered=resolve;});
 const policy={providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:90,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:80,monthly:800},concurrent:1,queueLimit:16,reservationMs:20000,ownershipMs:10000};
 const config={policy,month:{id:'disconnect-fixture',start:now-1000,end:now+300000},quoteCost:3,leaseMs:20000,maxAttempts:128,maxWorks:64};
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'app',unsafeDirectSockets:[{host:'127.0.0.1',port:0,entrypoint:'default',proxy:false}],modules:true,script:code.app,compatibilityDate:'2026-09-13',compatibilityFlags:['nodejs_compat','enable_request_signal','request_signal_passthrough'],bindings:{ZIGOALS_MARKET_QUOTES_MODE:'durable-v1'},serviceBindings:{SIGNAL_TRACE:trace,MARKET_QUOTES:{name:'market',entrypoint:'QuoteService'}}},{name:'market',modules:true,script:code.market,serviceBindings:{SIGNAL_TRACE:trace},compatibilityDate:'2026-09-13',compatibilityFlags:['enable_request_signal','request_signal_passthrough'],durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'disconnect-fixture',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(config),COINGECKO_DEMO_API_KEY:'fixture-key'},outboundService:async()=>{calls++;entered();await held;return Response.json({bitcoin:{usd:2,last_updated_at:Math.floor(now/1000)}});}},doProbeWorker({className:'MarketAccount',scriptName:'market'})]}));
 const body=JSON.stringify({requests:[{marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'}]}),load=async signal=>fetch(new URL('/api/market-quotes',await mf.unsafeGetDirectURL('app')),{method:'POST',headers:{'content-type':'application/json'},body,signal});
 const inspect=async()=>{const ns=await doProbe(mf);return(await ns.get(ns.idFromName('disconnect-fixture')).fetch('https://internal',{method:'POST',body:'{"action":"inspect"}'})).json();};
 let context,owner,follower;const setup=within(Date.now()+28000);
 try{
  const appUrl=String(await setup('local app and market Workers start',mf.unsafeGetDirectURL('app')));
  context=await setup('test page open',browser.newContext());const page=await setup('test page open',context.newPage());await setup('test page load',page.goto(appUrl));
  owner=load();await step('provider dispatch of the owner request',started);await step('follower request start',page.evaluate(body=>{window.fixtureAbort=new AbortController();window.fixtureFollower=MarketClient.fetchPublicMarketQuotes(JSON.parse(body).requests,false,fetch,window.fixtureAbort.signal).then(()=>window.fixtureAbort.signal.aborted);},body));
  let state;for(let i=0;i<40;i++){state=await inspect();if(state.followers===1)break;await new Promise(resolve=>setTimeout(resolve,5));}expect(state).toMatchObject({followers:1,dispatched:1,chargedCredits:3});
  const wrong=await fetch(new URL('/api/market-quotes/cancel',await mf.unsafeGetDirectURL('app')),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({cancelToken:crypto.randomUUID()})});expect(wrong.status).toBe(204);expect((await inspect()).followers).toBe(1);await vi.waitFor(()=>expect(traces).toEqual(['/app-cancel']));traces.length=0;
  const malformed=await fetch(new URL('/api/market-quotes/cancel',await mf.unsafeGetDirectURL('app')),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({cancelToken:'guess'})});expect(malformed.status).toBe(400);await vi.waitFor(()=>expect(traces).toEqual(['/app-cancel']));traces.length=0;
  const stopped=performance.now();if(mode==='abort'){follower=page.evaluate(()=>{window.fixtureAbort.abort();return window.fixtureFollower;});expect(await step('aborted follower settling',follower)).toBe(true);}else await step('navigation away',page.goto('about:blank'));
  while(performance.now()-stopped<500){state=await inspect();if(state.followers===0)break;await new Promise(resolve=>setTimeout(resolve,10));}
  // The durable follower cleanup must finish within the 500 ms window above. The '/app-cancel'
  // trace is sent by the cancel route through ctx.waitUntil after it responds, so under load it
  // can land after the follower is gone: wait for it separately (as above) and compare a copy.
  expect(state).toMatchObject({followers:0,dispatched:1,chargedCredits:3});await vi.waitFor(()=>expect([...traces]).toEqual(['/app-cancel']));expect(calls).toBe(1);release();expect((await(await step('owner response',owner)).json()).results[0].status).toBe('VERIFIED_FRESH');
 }finally{release();await context?.close();await step('owner and follower settle after cleanup',Promise.allSettled([owner,follower])).catch(()=>{});await mf.dispose();}
},30000);
