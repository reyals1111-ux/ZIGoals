import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {privateAccountRequest} from '../../apps/web/lib/server/private-account.ts';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const requireWorker=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {build}=requireWorker('esbuild');
const {Miniflare,convertV4MiniflareOptions}=requireWorker('miniflare');
// Explicit opt-in: requires an already running local Next preview and installed Chrome.
test.skipIf(process.env.RUN10_BROWSER!=='1')('two real browser profiles use encrypted account transport, local durable stores and persistent Worker; auth delivery is a fixture',async()=>{
 const origin='http://127.0.0.1:3110',account='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',persist=await mkdtemp(join(tmpdir(),'run10-browser-vault-'));
 const mf=new Miniflare({...convertV4MiniflareOptions({name:'browser-private-sync',modules:true,script:(await build({entryPoints:[new URL('../../workers/private-sync/worker.mjs',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'})).outputFiles[0].text,compatibilityDate:'2026-09-13',durableObjects:{VAULTS:{className:'PrivateVault',useSQLite:true}},durableObjectsPersist:persist,bindings:{AUTH_ORIGIN:'https://fixture.supabase.co',AUTH_PUBLIC_KEY:'public-fixture',APP_ORIGIN:origin},outboundService:async()=>Response.json({id:account})}),resourcePersistencePath:persist});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 async function context(mobile=false){const token='fixture-'+crypto.randomUUID();const c=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile});
  await c.route('**/api/private-account*',async route=>{const r=route.request(),headers=await r.allHeaders();const req=new Request(r.url(),{method:r.method(),headers,...(r.postData()?{body:r.postData()}: {})});
   const result=await privateAccountRequest(req,{authOrigin:'https://fixture.supabase.co',publicKey:'public-fixture',syncOrigin:'https://fixture.workers.dev'},async(url,init)=>{
    const path=new URL(url).pathname;if(new URL(url).hostname==='fixture.workers.dev')return mf.dispatchFetch(url,init);
    if(path.endsWith('/verify'))return Response.json({access_token:token,expires_in:3600,user:{id:account}});
    if(path.endsWith('/user'))return Response.json({id:account});return Response.json({});
   });if(result.status>=400)console.log('Fixture adapter status',r.method(),result.status,'origin',headers.origin??'absent');await route.fulfill({status:result.status,headers:Object.fromEntries(result.headers),body:await result.text()});});return c;}
 async function login(page){await page.goto(origin+'/app/settings');await page.getByLabel('Email address',{exact:true}).fill('fixture@example.invalid');await page.getByRole('button',{name:'Send email code',exact:true}).click();try{await page.getByLabel('Email code',{exact:true}).fill('123456',{timeout:10000});}catch(e){console.log('Email fixture UI',await page.getByRole('region',{name:'Email account access'}).innerText());throw e;}await page.getByRole('button',{name:'Verify email code',exact:true}).click();}
 async function synced(page){await page.getByRole('region',{name:'Encrypted account sync',exact:true}).getByText(/Account records synced and acknowledged/).waitFor();}
 try{
  const a=await context(),b=await context(true),pa=await a.newPage(),pb=await b.newPage();
  await login(pa);await pa.getByRole('button',{name:'Create encrypted account vault',exact:true}).click();const recovery=await pa.getByLabel('New vault recovery secret',{exact:true}).inputValue();await pa.getByLabel('I saved this vault recovery secret separately.').check();await pa.getByRole('button',{name:'Confirm and create vault',exact:true}).click();await synced(pa);
  // Client navigation preserves the memory-only unlocked session.
  await pa.getByRole('link',{name:'Habits',exact:true}).first().click();await pa.getByRole('button',{name:'+ New habit',exact:true}).click();await pa.getByLabel('Start from template').selectOption('read');await pa.getByLabel('Habit title',{exact:true}).fill('Fictional synchronized reading');await pa.getByRole('button',{name:'Create habit',exact:true}).click();
  await pa.getByRole('link',{name:'Settings',exact:true}).first().click();await pa.getByRole('button',{name:'Sync now',exact:true}).click();await synced(pa);
  await login(pb);await pb.getByLabel('Vault recovery secret',{exact:true}).fill(recovery);await pb.getByRole('button',{name:'Unlock account vault',exact:true}).click();await synced(pb);
  await pb.getByRole('link',{name:'Habits',exact:true}).first().click();await pb.getByRole('article',{name:'Fictional synchronized reading',exact:true}).waitFor();
  await pb.getByRole('article',{name:'Fictional synchronized reading',exact:true}).getByRole('button',{name:'Complete Fictional synchronized reading',exact:true}).click();
  await pb.getByRole('link',{name:'Settings',exact:true}).first().click();await pb.getByRole('button',{name:'Sync now',exact:true}).click();await synced(pb);
  await pa.getByRole('button',{name:'Sync now',exact:true}).click();await synced(pa);await pa.getByRole('link',{name:'Habits',exact:true}).first().click();await pa.getByRole('article',{name:'Fictional synchronized reading',exact:true}).getByRole('button',{name:'Undo completion for Fictional synchronized reading',exact:true}).waitFor();
  const tokenA=(await a.cookies(origin+'/api/private-account')).find(c=>c.name==='zigoals_session').value;
  const raw=await (await mf.dispatchFetch('https://fixture.workers.dev/v1/vault',{headers:{origin,authorization:'Bearer '+tokenA,'x-zigoals-account':account}})).text();expect(raw).not.toContain('Fictional synchronized reading');expect(JSON.parse(raw).records.length).toBeGreaterThan(1);
  await pa.getByRole('link',{name:'Settings',exact:true}).first().click();await pa.getByRole('button',{name:'Refresh sessions',exact:true}).click();await pa.getByRole('button',{name:'Revoke other sessions',exact:true}).click();await pa.getByRole('button',{name:'Confirm session revocation',exact:true}).click();await pa.getByRole('region',{name:'Account sessions',exact:true}).getByText('1 session(s) revoked.',{exact:false}).waitFor();
  await pb.bringToFront();await pb.evaluate(()=>window.dispatchEvent(new Event('focus')));await pb.getByRole('region',{name:'Encrypted account sync',exact:true}).getByText('Account access changed. Sign in and unlock again.',{exact:true}).waitFor();expect(await pb.getByRole('button',{name:'Sync now',exact:true}).count()).toBe(0);
  await pa.goto(origin+'/app/habits');expect(await pa.getByRole('article',{name:'Fictional synchronized reading',exact:true}).count()).toBe(0);
  await a.close();await b.close();
 }finally{await browser.close();await mf.dispose();}
},90000);
