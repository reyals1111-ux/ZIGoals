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
const refusal='Health is kept locally after cloud deletion. Use Review restoring local section before enabling transfers.';
// When Health consent is refused, the refusal describes the checkbox itself, so it is announced with the control and not only as a separate alert.
test.runIf(process.env.RUN10_BROWSER==='1')('a refused Health consent is described by its refusal message',async()=>{
 const origin=process.env.RUN11_REVIEW_ORIGIN??'http://127.0.0.1:3112',mf=await createPrivateMiniflare({origin,persist:await mkdtemp(join(tmpdir(),'run11-health-consent-a11y-')),outboundService:async request=>Response.json({id:identity(request.headers.get('authorization'))})});
 const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext(),page=await context.newPage();
 try{
  await context.route('**/api/private-account*',async route=>{const r=route.request(),headers=await r.allHeaders(),req=new Request(r.url(),{method:r.method(),headers,...(r.postData()?{body:r.postData()}:{})});const result=await privateAccountRequest(req,{authOrigin:'https://fixture.supabase.co',publicKey:'public-fixture',syncOrigin:'https://fixture.workers.dev'},async(url,init)=>{const u=new URL(url);if(u.hostname==='fixture.workers.dev')return mf.dispatchFetch(url,init);if(u.pathname.endsWith('/verify'))return Response.json({access_token:fixtureToken('browser-'+A,A),expires_in:3600,user:{id:A}});if(u.pathname.endsWith('/user'))return Response.json({id:identity(new Headers(init.headers).get('authorization'))});return Response.json({});});await route.fulfill({status:result.status,headers:{...Object.fromEntries(result.headers),...(result.headers.getSetCookie().length?{'set-cookie':result.headers.getSetCookie().join('\n')}:{})},body:await result.text()});});
  const region=page.getByRole('region',{name:'Encrypted account sync',exact:true}),consent=region.getByRole('checkbox',{name:/^Sync my Health records with this account\./});
  const description=()=>consent.evaluate(input=>(input.getAttribute('aria-describedby')??'').split(/\s+/).filter(Boolean).map(id=>document.getElementById(id)?.textContent??'').join(' '));
  await page.goto(origin+'/app/settings');await page.getByLabel('Email address',{exact:true}).fill('a@example.invalid');await page.getByRole('button',{name:'Send email code',exact:true}).click();await page.getByLabel('Email code',{exact:true}).fill('123456');await page.getByRole('button',{name:'Verify email code',exact:true}).click();
  await page.getByRole('button',{name:'Create encrypted account vault',exact:true}).click();await page.getByLabel('I saved this vault recovery secret separately.').check();await page.getByRole('button',{name:'Confirm and create vault',exact:true}).click();
  await region.getByText(/Account records synced and acknowledged/).waitFor();
  expect(await description(),'no refusal is linked before one is shown').toBe('');
  // Health is held locally, as after deleting its cloud section: turning consent on is refused.
  await page.evaluate(id=>new Promise((resolve,reject)=>{const open=indexedDB.open('zigoals-account-sync-v1');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const store=open.result.transaction('state','readwrite').objectStore('state'),get=store.get(id);get.onsuccess=()=>{const put=store.put({...get.result,heldDomains:['health']},id);put.onerror=()=>reject(put.error);put.onsuccess=()=>{open.result.close();resolve();};};get.onerror=()=>reject(get.error);};}),A);
  await consent.click();
  await region.getByRole('alert').getByText(refusal,{exact:true}).waitFor();
  expect(await consent.isChecked(),'the refused consent stays off').toBe(false);
  expect(await description(),'the refusal describes the Health consent checkbox').toBe(refusal);
 }finally{await browser.close();await mf.dispose();}
},60000);
