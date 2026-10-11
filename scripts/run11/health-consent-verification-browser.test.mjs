import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {privateAccountRequest} from '../../apps/web/lib/server/private-account';
import {createPrivateMiniflare,fixtureToken} from './private-runtime.mjs';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),{chromium}=require('@playwright/test');
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const identity=header=>JSON.parse(Buffer.from(header.slice(7).split('.')[1],'base64url').toString()).sub;
// Health consent chosen while the email code is still being verified must never be silently dropped:
// either the choice survives sign-in and takes effect, or the checkbox cannot be ticked until the account is ready.
test.runIf(process.env.RUN10_BROWSER==='1')('Health consent ticked during email verification is kept or not yet offered',async()=>{
 const origin=process.env.RUN11_REVIEW_ORIGIN??'http://127.0.0.1:3112',mf=await createPrivateMiniflare({origin,persist:await mkdtemp(join(tmpdir(),'run11-health-consent-')),outboundService:async request=>Response.json({id:identity(request.headers.get('authorization'))})});
 const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext(),page=await context.newPage();
 let entered,release;const held=new Promise(r=>{entered=r;}),resume=new Promise(r=>{release=r;});
 try{
  await context.route('**/api/private-account*',async route=>{const r=route.request(),headers=await r.allHeaders(),req=new Request(r.url(),{method:r.method(),headers,...(r.postData()?{body:r.postData()}:{})});const result=await privateAccountRequest(req,{authOrigin:'https://fixture.supabase.co',publicKey:'public-fixture',syncOrigin:'https://fixture.workers.dev'},async(url,init)=>{const u=new URL(url);if(u.hostname==='fixture.workers.dev')return mf.dispatchFetch(url,init);if(u.pathname.endsWith('/verify')){entered();await resume;return Response.json({access_token:fixtureToken('browser-'+A,A),expires_in:3600,user:{id:A}});}if(u.pathname.endsWith('/user'))return Response.json({id:identity(new Headers(init.headers).get('authorization'))});return Response.json({});});await route.fulfill({status:result.status,headers:{...Object.fromEntries(result.headers),...(result.headers.getSetCookie().length?{'set-cookie':result.headers.getSetCookie().join('\n')}:{})},body:await result.text()});});
  const region=page.getByRole('region',{name:'Encrypted account sync',exact:true}),consent=page.getByLabel('Sync my Health records with this account.',{exact:false});
  await page.goto(origin+'/app/settings');await page.getByLabel('Email address',{exact:true}).fill('a@example.invalid');await page.getByRole('button',{name:'Send email code',exact:true}).click();await page.getByLabel('Email code',{exact:true}).fill('123456');
  // The code is submitted and verification is in flight: this is the moment the user ticks Health consent.
  await page.getByRole('button',{name:'Verify email code',exact:true}).click();await held;
  const offered=await consent.isEnabled();
  if(offered)await consent.check();
  else await region.getByText('Finishing sign-in…',{exact:true}).waitFor();
  release();
  await page.getByRole('button',{name:'Create encrypted account vault',exact:true}).waitFor();
  if(!offered){await expect(consent.isEnabled()).resolves.toBe(true);expect(await region.getByText('Finishing sign-in…',{exact:true}).count()).toBe(0);await consent.check();}
  expect(await consent.isChecked(),'Health consent was silently dropped when sign-in finished').toBe(true);
  await page.getByRole('button',{name:'Create encrypted account vault',exact:true}).click();await page.getByLabel('I saved this vault recovery secret separately.').check();await page.getByRole('button',{name:'Confirm and create vault',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Sync now'&&!b.disabled));await region.getByText(/Account records synced and acknowledged/).waitFor();
  // Effective: consent is still on for the unlocked session that just synced.
  expect(await consent.isChecked(),'Health consent was lost after the vault opened').toBe(true);expect(await region.getByRole('alert').count()).toBe(0);
  const syncedDomains=()=>page.evaluate(id=>new Promise((resolve,reject)=>{const open=indexedDB.open('zigoals-account-sync-v1');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const get=open.result.transaction('state').objectStore('state').get(id);get.onerror=()=>reject(get.error);get.onsuccess=()=>{open.result.close();resolve(Object.keys(get.result?.base??{}));};};}),A);
  expect(await syncedDomains()).not.toContain('health');
  await page.getByRole('link',{name:'Health',exact:true}).first().click();await page.getByRole('button',{name:'Add 250 mL',exact:true}).click();await page.getByRole('region',{name:'Water journal'}).getByText('250 mL recorded',{exact:false}).waitFor();
  // The automatic sync after this Health write acknowledges a Health base only when consent reached the session.
  await expect.poll(syncedDomains,{timeout:15000,message:'Health was not part of an acknowledged sync'}).toContain('health');
 }finally{release();await browser.close();await mf.dispose();}
},60000);
