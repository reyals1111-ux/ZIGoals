import {test,expect} from 'vitest';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fixtureToken,ACCOUNT} from './private-runtime.mjs';
import {createPackagedRecords,receiveAndCorrectPackagedRecords,armPackagedSync,waitPackagedSync,protectAndRestorePackagedRecords,verifyPackagedPresets} from './packaged-consumer-journey.mjs';
import {verifyPackagedGoalJourneys,verifySourceGoalControls} from './packaged-goal-journey.mjs';
import {hermeticWorkerOptions} from './hermetic-wrangler.mjs';
import {createVault} from '../../apps/web/lib/vault/crypto';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),{build}=require('esbuild');
const {unstable_getMiniflareWorkerOptions}=require('wrangler');
const webRequire=createRequire(new URL('../../apps/web/package.json',import.meta.url)),{chromium}=webRequire('@playwright/test');
const root=new URL('../../',import.meta.url).pathname;
const pair=id=>({marketRef:{provider:'coingecko',kind:'coin',id},currency:'USD'});
// Requires a generated OpenNext build and Wrangler dry-run bundle. This test never
// deploys, loads owner credentials, or forwards a request to an external network.
test.runIf(process.env.RUN11_PACKAGED==='1')('full generated OpenNext artifact uses local named account, market and food services across restart',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'run11-package-')),bundlePath=process.env.RUN11_PACKAGE_BUNDLE??'/tmp/zigoals-run11-package-bundle/worker.js';
 const script=await readFile(bundlePath,'utf8'),now=Date.now();let mf,calls=[];
 const bundle=async path=>(await build({entryPoints:[resolve(root,path)],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers']})).outputFiles[0].text;
 const codes=await Promise.all(['workers/private-sync/worker.mjs','workers/private-sync/lifecycle.mjs','workers/market-coordinator/worker.ts','workers/food-lookup/worker.mjs','workers/auth-abuse/worker.mjs'].map(bundle));
 const policy={providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:90,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:80,monthly:800},concurrent:2,queueLimit:16,reservationMs:20000,ownershipMs:10000};
 let origin,browser;const browserErrors=[];const server=createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);const response=await mf.dispatchFetch(origin+req.url,{method:req.method,headers:{...req.headers,'cf-connecting-ip':'192.0.2.1'},...(body.length?{body}:{})});res.statusCode=response.status;for(const [name,value]of response.headers)if(!['set-cookie','content-length','transfer-encoding'].includes(name))res.setHeader(name,value);const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('set-cookie',cookies);res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(502);res.end('Local package fixture failed');}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://localhost:'+server.address().port;const cfg={policy,month:{id:'fixture',start:now-1000,end:now+3600000},quoteCost:3,operationCosts:{catalog:2,history:4,insights:5},leaseMs:20000,maxAttempts:128,maxWorks:64};
 const upstream=async request=>{
  const url=new URL(request.url);calls.push(url.pathname);
  if(url.origin==='https://fixture.supabase.co'){
   if(url.pathname==='/auth/v1/user')return Response.json({id:ACCOUNT});
   if(url.pathname==='/auth/v1/otp')return Response.json({});
   if(url.pathname==='/auth/v1/verify'){const body=await request.json();return Response.json({access_token:fixtureToken('packaged-'+body.email),refresh_token:'fixture-refresh',expires_in:3600,user:{id:ACCOUNT}});}
   if(url.pathname==='/auth/v1/logout')return Response.json({});
  }
  if(url.origin==='https://api.coingecko.com'){
   expect(request.headers.get('cookie')).toBeNull();expect(request.headers.get('authorization')).toBeNull();
   if(url.pathname.endsWith('/simple/price'))return Response.json({bitcoin:{usd:2,last_updated_at:Math.floor(now/1000)}});
   if(url.pathname.endsWith('/simple/token_price/ethereum'))return new Response('',{status:503});
   if(url.pathname.endsWith('/coins/list'))return Response.json([{id:'bitcoin',symbol:'btc',name:'Bitcoin',platforms:{}}]);
   if(url.pathname.endsWith('/rwas/list'))return Response.json([]);
   if(url.pathname.endsWith('/market_chart'))return Response.json({prices:[[now-1000,2],[now,3]]});
   if(url.pathname.endsWith('/coins/markets'))return Response.json([{id:'bitcoin',last_updated:new Date(now).toISOString(),price_change_percentage_24h:2}]);
  }
  if(url.origin==='https://world.openfoodfacts.org')return Response.json({status:'success',product:{code:'12345678',product_name:'Fixture oats',nutriments:{'energy-kcal_100g':100,proteins_100g:4,carbohydrates_100g:20,fat_100g:2}}});
  throw Error('Outbound fixture refused '+url.origin+url.pathname);
 };
 async function runtime(enabled=true){
  // Hermetic: a developer's apps/web/.env.local or .dev.vars must not add bindings (it changed the request count).
  const app=hermeticWorkerOptions(unstable_getMiniflareWorkerOptions,resolve(root,'apps/web/wrangler.run11.local.jsonc')).workerOptions;
  return new Miniflare({...convertV4MiniflareOptions({workers:[
   {compatibilityDate:app.compatibilityDate,compatibilityFlags:app.compatibilityFlags,assets:app.assets,name:'zigoals-run11-local',modules:true,script,bindings:{...app.bindings,...(enabled?{ZIGOALS_AUTH_ORIGIN:'https://fixture.supabase.co',ZIGOALS_AUTH_PUBLIC_KEY:'fixture-public',ZIGOALS_SYNC_ORIGIN:'https://fixture.workers.dev'}:{})},serviceBindings:enabled?app.serviceBindings:{WORKER_SELF_REFERENCE:{name:'zigoals-run11-local'}},outboundService:upstream},
   {name:'zigoals-private-sync-local',modules:true,script:codes[0],compatibilityDate:'2026-09-13',durableObjects:{VAULTS:{className:'PrivateVault',useSQLite:true}},serviceBindings:{LIFECYCLE:{name:'life',entrypoint:'LifecycleService'}},bindings:{AUTH_ORIGIN:'https://fixture.supabase.co',AUTH_PUBLIC_KEY:'fixture-public',APP_ORIGIN:origin},outboundService:upstream},
   {name:'life',modules:true,script:codes[1],compatibilityDate:'2026-09-13',durableObjects:{LIFECYCLES:{className:'LifecycleAuthority',useSQLite:true}},bindings:{RECOVERY_MODE:'serve'},outboundService:upstream},
   {name:'zigoals-market-coordinator-local',modules:true,script:codes[2],compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'fixture-account',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(cfg),COINGECKO_DEMO_API_KEY:'fixture-key'},outboundService:upstream},
   {name:'zigoals-food-lookup-local',modules:true,script:codes[3],compatibilityDate:'2026-09-13',durableObjects:{FOOD_BUDGET:{className:'FoodBudget',useSQLite:true}},bindings:{FOOD_USER_AGENT:'ZIGoals/isolated-local-fixture'},outboundService:upstream},
   {name:'zigoals-auth-abuse-local',modules:true,script:codes[4],compatibilityDate:'2026-09-13',durableObjects:{ADMISSION:{className:'AdmissionAuthority',useSQLite:true}},bindings:{AUTH_ADMISSION_KEY:'fixture-secret-00000000000000000000'},outboundService:upstream},
  ]}),resourcePersistencePath:persist});
 }
 let cookie='';const call=(path,body,headers={})=>mf.dispatchFetch(origin+path,{method:body?'POST':'GET',headers:{host:new URL(origin).host,origin,'cf-connecting-ip':'192.0.2.1','content-type':'application/json',cookie,'x-zigoals-account':ACCOUNT,...headers},...(body?{body:JSON.stringify(body)}:{})});
 try{
  mf=await runtime();const page=await call('/app/settings');expect(page.status).toBe(200);const html=await page.text();expect(html).toContain('Settings');const asset=html.match(/src="([^\"]+\.js[^\"]*)"/);expect(asset).not.toBeNull();expect((await call(asset[1].replaceAll('&amp;','&'))).status).toBe(200);
  expect((await call('/api/private-account',{action:'send',email:'fictional@example.invalid'},{origin:'https://attacker.invalid','x-zigoals-origin':'https://attacker.invalid'})).status).toBe(403);
  const sent=await call('/api/private-account',{action:'send',email:'fictional@example.invalid'}),sentBody=await sent.json();if(sent.status!==200)console.log('Fixture send failure',sentBody);expect({status:sent.status,body:sentBody}).toMatchObject({status:200});
  const loginResponse=await call('/api/private-account',{action:'verify',email:'fictional@example.invalid',code:'123456'});expect(loginResponse.status).toBe(200);cookie=loginResponse.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');expect(cookie).toContain('zigoals_session=');
  const vault=await createVault();const operation={protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest};
  expect((await call('/api/private-account',{action:'sync',operation})).status).toBe(200);expect(await(await call('/api/private-account')).json()).toMatchObject({manifest:vault.manifest,revision:1});
  const quote=await call('/api/market-quotes',{requests:[pair('bitcoin'),pair('zignaly')]});expect(quote.status).toBe(200);expect((await quote.json()).quotes[0].price).toBe('2');
  expect((await call('/api/market-assets')).status).toBe(200);expect((await call('/api/market-history',{request:{...pair('bitcoin'),range:'1d'}})).status).toBe(200);expect((await call('/api/market-insights',{requests:[pair('bitcoin')]})).status).toBe(200);
  expect(await(await call('/api/food-lookup?code=12345678')).json()).toMatchObject({name:'Fixture oats',source:'Open Food Facts'});
  const publicCalls=calls.filter(p=>!p.startsWith('/auth/')).length;
  await mf.dispose();mf=await runtime();expect(await(await call('/api/private-account')).json()).toMatchObject({revision:1,manifest:vault.manifest});expect((await call('/api/market-quotes',{requests:[pair('bitcoin')]})).status).toBe(200);expect((await call('/api/food-lookup?code=12345678')).status).toBe(200);expect(calls.filter(p=>!p.startsWith('/auth/'))).toHaveLength(publicCalls);
  // Real browser renders the full generated package through the unmodified
  // route/Worker topology. Only outbound provider responses are intercepted.
  browser=await chromium.launch({channel:'chrome',headless:true});const a=await browser.newContext(),b=await browser.newContext({viewport:{width:390,height:844},isMobile:true}),pa=await a.newPage(),pb=await b.newPage();
  for(const [label,page]of [['A',pa],['B',pb]]){page.on('pageerror',error=>browserErrors.push({label,type:'pageerror',message:error.message}));page.on('console',message=>{if(message.type()==='error')browserErrors.push({label,type:'console',message:message.text()});});}
  const login=async(page,email)=>{await page.goto(origin+'/app/settings');await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByRole('button',{name:'Send email code',exact:true}).click();await page.getByLabel('Email code',{exact:true}).fill('123456');await page.getByRole('button',{name:'Verify email code',exact:true}).click();await page.getByLabel('Vault recovery secret',{exact:true}).waitFor();await page.getByLabel('Sync my Health records with this account.',{exact:false}).check();await page.getByLabel('Vault recovery secret',{exact:true}).fill(vault.recovery);const synced1=await armPackagedSync(page);await page.getByRole('button',{name:'Unlock account vault',exact:true}).click();await waitPackagedSync(page,synced1);};
  await login(pa,'packaged-a@example.invalid');const cookies=await a.cookies();expect(cookies.filter(v=>v.name.startsWith('zigoals_')).every(v=>v.httpOnly)).toBe(true);expect(await pa.evaluate(()=>document.cookie)).not.toContain('zigoals_session');
  await createPackagedRecords(pa);await login(pb,'packaged-b@example.invalid');await receiveAndCorrectPackagedRecords(pb);const synced2=await armPackagedSync(pa);await pa.getByRole('button',{name:'Sync now',exact:true}).click();await waitPackagedSync(pa,synced2);await pa.getByRole('link',{name:'Today',exact:true}).first().click();await pa.getByRole('article',{name:'Breakfast today',exact:true}).getByText('300 kcal',{exact:false}).waitFor();await pb.reload();await pb.getByRole('link',{name:'Settings',exact:true}).first().click();await pb.getByLabel('Sync my Health records with this account.',{exact:false}).check();await pb.getByLabel('Vault recovery secret',{exact:true}).fill(vault.recovery);const synced3=await armPackagedSync(pb);await pb.getByRole('button',{name:'Unlock account vault',exact:true}).click();await waitPackagedSync(pb,synced3);const restored=await browser.newContext();const restoredPage=await restored.newPage();await protectAndRestorePackagedRecords(pa,restoredPage,origin);await verifyPackagedPresets(pa,pb,restoredPage,origin,vault.recovery,persist);await verifyPackagedGoalJourneys(pa,pb,persist);await browser.close();browser=undefined;
  await mf.dispose();mf=await runtime(false);const before=calls.length;expect((await call('/api/private-account?action=status')).status).toBe(503);expect((await call('/api/food-lookup?code=12345678')).status).toBe(503);expect((await call('/api/market-quotes',{requests:[pair('bitcoin')]})).status).toBe(503);expect(calls).toHaveLength(before);
  await writeFile(join(persist,'evidence.json'),JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),applicationBuild:JSON.parse(await readFile(resolve(root,'apps/web/.open-next/alpha-build.json'),'utf8')),workerBundleSha256:codes.map(code=>createHash('sha256').update(code).digest('hex')),testSha256:createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),consumerTestSha256:createHash('sha256').update(await readFile(new URL('./packaged-consumer-journey.mjs',import.meta.url))).digest('hex'),goalTestSha256:createHash('sha256').update(await readFile(new URL('./packaged-goal-journey.mjs',import.meta.url))).digest('hex'),valueQuantityProjectUiJourneys:true,bundleSha256:createHash('sha256').update(script).digest('hex'),at:new Date().toISOString(),upstreamPaths:calls,externalRequests:0,services:5,generatedArtifact:true,independentBrowserProfiles:3,packagedBrowserGoalPlanHabitFundingHealthRecipeWidgetCorrection:true,protectedExportAndFourDomainRestore:true,fourEditedPresetsSecondClientAndProtectedRestore:true},null,2));console.log('Packaged runtime receipt: '+join(persist,'evidence.json'));
 }catch(error){
  const pages=[];for(const context of browser?.contexts()??[])for(const page of context.pages())pages.push({url:page.url(),state:await page.evaluate(()=>({body:document.body.innerText,now:new Date().toString(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,local:Object.fromEntries(Object.keys(localStorage).filter(key=>key.includes('health')||key.includes('settings')).map(key=>{try{const data=JSON.parse(localStorage.getItem(key));return [key,{schemaVersion:data?.schemaVersion,keys:Object.keys(data??{}),diary:data?.diary?.map(row=>({date:row.date,meal:row.meal,quantityMilli:row.quantityMilli})),preset:data?.preset,widgets:data?.widgets?.map(row=>({kind:row.kind,metric:row.metric,entity:row.entity,title:row.title}))}];}catch{return [key,'unreadable'];}}))})).catch(()=>null)});
  const path=join(persist,'failure.json');await writeFile(path,JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),at:new Date().toISOString(),message:error.message,browserErrors,pages},null,2));console.log('Packaged failure diagnostics: '+path);throw error;
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await mf?.dispose();}
},240000);

// Session R1 (Q-WRK-01) on the generated package: the app sends a coordinator at most 32 pairs at a time, so 64
// insight pairs are two coordinator requests with one provider read each, and 65 pairs are a 400 before any market
// work. Only the market service is attached; nothing leaves the process.
test.runIf(process.env.RUN11_PACKAGED==='1')('generated artifact: 64 insight pairs are two bounded coordinator requests and 65 are refused before any market work',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'run11-package-market-')),bundlePath=process.env.RUN11_PACKAGE_BUNDLE??'/tmp/zigoals-run11-package-bundle/worker.js';
 const script=await readFile(bundlePath,'utf8'),market=(await build({entryPoints:[resolve(root,'workers/market-coordinator/worker.ts')],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers']})).outputFiles[0].text;
 const calls=[],now=Date.now(),app=hermeticWorkerOptions(unstable_getMiniflareWorkerOptions,resolve(root,'apps/web/wrangler.run11.local.jsonc')).workerOptions;
 const cfg={policy:{providerMinuteLimit:100,providerMonthlyLimit:1000,operating:{minute:90,monthly:900},monitoringReserve:{minute:2,monthly:20},monitoringMaximum:{minute:3,monthly:30},optionalCeiling:{minute:80,monthly:800},concurrent:2,queueLimit:16,reservationMs:20000,ownershipMs:10000},calendar:{timeZone:'UTC',confirmed:true},quoteCost:3,operationCosts:{insights:5},leaseMs:20000,maxAttempts:128,maxWorks:64};
 const mf=new Miniflare({...convertV4MiniflareOptions({workers:[
  {compatibilityDate:app.compatibilityDate,compatibilityFlags:app.compatibilityFlags,assets:app.assets,name:'zigoals-run11-local',modules:true,script,bindings:app.bindings,serviceBindings:{WORKER_SELF_REFERENCE:{name:'zigoals-run11-local'},MARKET_QUOTES:{name:'zigoals-market-coordinator-local',entrypoint:'QuoteService'}},outboundService:request=>{throw Error('Outbound fixture refused '+new URL(request.url).origin);}},
  {name:'zigoals-market-coordinator-local',modules:true,script:market,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'fixture-account',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(cfg),COINGECKO_DEMO_API_KEY:'fixture-key'},outboundService:async request=>{const url=new URL(request.url),ids=(url.searchParams.get('ids')??'').split(',').filter(Boolean);calls.push(url.pathname+':'+ids.length);if(url.origin==='https://api.coingecko.com'&&url.pathname.endsWith('/coins/markets'))return Response.json(ids.map(id=>({id,last_updated:new Date(now).toISOString(),price_change_percentage_24h:2})));throw Error('Outbound fixture refused '+url.origin+url.pathname);}},
 ]}),resourcePersistencePath:persist});
 try{
  const requests=Array.from({length:65},(_,i)=>pair(`asset-${i}`)),insights=body=>mf.dispatchFetch('https://zigoals.test/api/market-insights',{method:'POST',headers:{host:'zigoals.test',origin:'https://zigoals.test','content-type':'application/json','cf-connecting-ip':'192.0.2.1'},body:JSON.stringify(body)});
  const answered=await insights({requests:requests.slice(0,64)});expect(answered.status).toBe(200);expect((await answered.json()).entries).toHaveLength(64);
  expect(calls).toEqual(['/api/v3/coins/markets:32','/api/v3/coins/markets:32']);
  expect((await insights({requests})).status).toBe(400);expect(calls).toHaveLength(2);
 }finally{await mf.dispose();}
},120000);

// Deliberate pre-build check; has no authentication or second-client claim.
test.runIf(process.env.RUN11_GOAL_SOURCE==='1')('all supported Goal controls work in the source preview before package generation',async()=>{
 const evidence=await mkdtemp(join(tmpdir(),'run11-goal-source-'));const browser=await chromium.launch({channel:'chrome',headless:true});
 try{const page=await browser.newPage();page.setDefaultTimeout(15000);await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'Fictional offline source-preview fixture'}}));await page.goto((process.env.RUN11_GOAL_ORIGIN??'http://127.0.0.1:3113')+'/app');await verifySourceGoalControls(page,evidence);console.log('Source Goal controls receipt: '+evidence+'/source-goal-controls.json');}
 finally{await browser.close();}
},120000);
