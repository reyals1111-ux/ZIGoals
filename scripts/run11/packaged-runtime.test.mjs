import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fixtureToken,ACCOUNT} from './private-runtime.mjs';
import {createVault} from '../../apps/web/lib/vault/crypto';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),{build}=require('esbuild');
const {unstable_getMiniflareWorkerOptions}=require('wrangler');
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
 const origin='https://app.test',token=fixtureToken('packaged'),cfg={policy,month:{id:'fixture',start:now-1000,end:now+3600000},quoteCost:3,operationCosts:{catalog:2,history:4,insights:5},leaseMs:20000,maxAttempts:128,maxWorks:64};
 const upstream=async request=>{
  const url=new URL(request.url);calls.push(url.pathname);
  if(url.origin==='https://fixture.supabase.co'){
   if(url.pathname==='/auth/v1/user')return Response.json({id:ACCOUNT});
   if(url.pathname==='/auth/v1/otp')return Response.json({});
   if(url.pathname==='/auth/v1/verify')return Response.json({access_token:token,refresh_token:'fixture-refresh',expires_in:3600,user:{id:ACCOUNT}});
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
  const app=unstable_getMiniflareWorkerOptions(resolve(root,'apps/web/wrangler.run11.local.jsonc')).workerOptions;
  return new Miniflare({...convertV4MiniflareOptions({workers:[
   {compatibilityDate:app.compatibilityDate,compatibilityFlags:app.compatibilityFlags,assets:app.assets,name:'zigoals-run11-local',modules:true,script,bindings:{...app.bindings,...(enabled?{ZIGOALS_AUTH_ORIGIN:'https://fixture.supabase.co',ZIGOALS_AUTH_PUBLIC_KEY:'fixture-public',ZIGOALS_SYNC_ORIGIN:'https://fixture.workers.dev'}:{})},serviceBindings:enabled?app.serviceBindings:{WORKER_SELF_REFERENCE:{name:'zigoals-run11-local'}},outboundService:upstream},
   {name:'zigoals-private-sync-local',modules:true,script:codes[0],compatibilityDate:'2026-09-13',durableObjects:{VAULTS:{className:'PrivateVault',useSQLite:true}},serviceBindings:{LIFECYCLE:{name:'life',entrypoint:'LifecycleService'}},bindings:{AUTH_ORIGIN:'https://fixture.supabase.co',AUTH_PUBLIC_KEY:'fixture-public',APP_ORIGIN:origin},outboundService:upstream},
   {name:'life',modules:true,script:codes[1],compatibilityDate:'2026-09-13',durableObjects:{LIFECYCLES:{className:'LifecycleAuthority',useSQLite:true}},bindings:{RECOVERY_MODE:'serve'},outboundService:upstream},
   {name:'zigoals-market-coordinator-local',modules:true,script:codes[2],compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'fixture-account',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(cfg),COINGECKO_DEMO_API_KEY:'fixture-key'},outboundService:upstream},
   {name:'zigoals-food-lookup-local',modules:true,script:codes[3],compatibilityDate:'2026-09-13',durableObjects:{FOOD_BUDGET:{className:'FoodBudget',useSQLite:true}},bindings:{FOOD_USER_AGENT:'ZIGoals/isolated-local-fixture'},outboundService:upstream},
   {name:'zigoals-auth-abuse-local',modules:true,script:codes[4],compatibilityDate:'2026-09-13',durableObjects:{ADMISSION:{className:'AdmissionAuthority',useSQLite:true}},bindings:{AUTH_ADMISSION_KEY:'fixture-secret-00000000000000000000'},outboundService:upstream},
  ]}),resourcePersistencePath:persist});
 }
 let cookie='';const call=(path,body,headers={})=>mf.dispatchFetch(origin+path,{method:body?'POST':'GET',headers:{origin,host:'app.test','cf-connecting-ip':'192.0.2.1','content-type':'application/json',cookie,'x-zigoals-account':ACCOUNT,...headers},...(body?{body:JSON.stringify(body)}:{})});
 try{
  mf=await runtime();const page=await call('/app/settings');expect(page.status).toBe(200);const html=await page.text();expect(html).toContain('Settings');const asset=html.match(/src="([^\"]+\.js[^\"]*)"/);expect(asset).not.toBeNull();expect((await call(asset[1].replaceAll('&amp;','&'))).status).toBe(200);
  expect((await call('/api/private-account',{action:'send',email:'fictional@example.invalid'},{origin:'https://attacker.invalid','x-zigoals-origin':'https://attacker.invalid'})).status).toBe(403);
  const sent=await call('/api/private-account',{action:'send',email:'fictional@example.invalid'});expect({status:sent.status,body:await sent.json()}).toMatchObject({status:200});
  const login=await call('/api/private-account',{action:'verify',email:'fictional@example.invalid',code:'123456'});expect(login.status).toBe(200);cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');expect(cookie).toContain('zigoals_session=');
  const vault=await createVault();const operation={protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest};
  expect((await call('/api/private-account',{action:'sync',operation})).status).toBe(200);expect(await(await call('/api/private-account')).json()).toMatchObject({manifest:vault.manifest,revision:1});
  const quote=await call('/api/market-quotes',{requests:[pair('bitcoin'),pair('zignaly')]});expect(quote.status).toBe(200);expect((await quote.json()).quotes[0].price).toBe('2');
  expect((await call('/api/market-assets')).status).toBe(200);expect((await call('/api/market-history',{request:{...pair('bitcoin'),range:'1d'}})).status).toBe(200);expect((await call('/api/market-insights',{requests:[pair('bitcoin')]})).status).toBe(200);
  expect(await(await call('/api/food-lookup?code=12345678')).json()).toMatchObject({name:'Fixture oats',source:'Open Food Facts'});
  const publicCalls=calls.filter(p=>!p.startsWith('/auth/')).length;
  await mf.dispose();mf=await runtime();expect(await(await call('/api/private-account')).json()).toMatchObject({revision:1,manifest:vault.manifest});expect((await call('/api/market-quotes',{requests:[pair('bitcoin')]})).status).toBe(200);expect((await call('/api/food-lookup?code=12345678')).status).toBe(200);expect(calls.filter(p=>!p.startsWith('/auth/'))).toHaveLength(publicCalls);
  await mf.dispose();mf=await runtime(false);const before=calls.length;expect((await call('/api/private-account?action=status')).status).toBe(503);expect((await call('/api/food-lookup?code=12345678')).status).toBe(503);expect((await call('/api/market-quotes',{requests:[pair('bitcoin')]})).status).toBe(503);expect(calls).toHaveLength(before);
  await writeFile(join(persist,'evidence.json'),JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),bundleSha256:createHash('sha256').update(script).digest('hex'),at:new Date().toISOString(),upstreamPaths:calls,externalRequests:0,services:5,generatedArtifact:true},null,2));console.log('Packaged runtime receipt: '+join(persist,'evidence.json'));
 }finally{await mf?.dispose();}
},60000);
