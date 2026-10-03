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
const described=locator=>locator.evaluate(input=>(input.getAttribute('aria-describedby')??'').split(/\s+/).filter(Boolean).map(id=>document.getElementById(id)?.textContent??'').join(' '));
/** Signs in through the real account handler and opens a new encrypted vault; `check` runs with the unlocked Settings page. `local` runs first, before sign-in. */
async function withOpenVault(prefix,check,local){
 const origin=process.env.RUN11_REVIEW_ORIGIN??'http://127.0.0.1:3112',mf=await createPrivateMiniflare({origin,persist:await mkdtemp(join(tmpdir(),prefix)),outboundService:async request=>Response.json({id:identity(request.headers.get('authorization'))})});
 const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({acceptDownloads:true}),page=await context.newPage();
 try{
  await context.route('**/api/private-account*',async route=>{const r=route.request(),headers=await r.allHeaders(),req=new Request(r.url(),{method:r.method(),headers,...(r.postData()?{body:r.postData()}:{})});const result=await privateAccountRequest(req,{authOrigin:'https://fixture.supabase.co',publicKey:'public-fixture',syncOrigin:'https://fixture.workers.dev'},async(url,init)=>{const u=new URL(url);if(u.hostname==='fixture.workers.dev')return mf.dispatchFetch(url,init);if(u.pathname.endsWith('/verify'))return Response.json({access_token:fixtureToken('browser-'+A,A),expires_in:3600,user:{id:A}});if(u.pathname.endsWith('/user'))return Response.json({id:identity(new Headers(init.headers).get('authorization'))});return Response.json({});});await route.fulfill({status:result.status,headers:{...Object.fromEntries(result.headers),...(result.headers.getSetCookie().length?{'set-cookie':result.headers.getSetCookie().join('\n')}:{})},body:await result.text()});});
  await local?.(page,origin);
  await page.goto(origin+'/app/settings');await page.getByLabel('Email address',{exact:true}).fill('a@example.invalid');await page.getByRole('button',{name:'Send email code',exact:true}).click();await page.getByLabel('Email code',{exact:true}).fill('123456');await page.getByRole('button',{name:'Verify email code',exact:true}).click();
  await page.getByRole('button',{name:'Create encrypted account vault',exact:true}).click();await page.getByLabel('I saved this vault recovery secret separately.').check();await page.getByRole('button',{name:'Confirm and create vault',exact:true}).click();
  await page.getByRole('region',{name:'Encrypted account sync',exact:true}).getByText(/Account records synced and acknowledged/).waitFor();
  await check(page);
 }finally{await browser.close();await mf.dispose();}
}
// When Health consent is refused, the refusal describes the checkbox itself, so it is announced with the control and not only as a separate alert.
test.runIf(process.env.RUN10_BROWSER==='1')('a refused Health consent is described by its refusal message',()=>withOpenVault('run11-health-consent-a11y-',async page=>{
 const region=page.getByRole('region',{name:'Encrypted account sync',exact:true}),consent=region.getByRole('checkbox',{name:/^Sync my Health records with this account\./});
 expect(await described(consent),'no refusal is linked before one is shown').toBe('');
 // Health is held locally, as after deleting its cloud section: turning consent on is refused.
 await page.evaluate(id=>new Promise((resolve,reject)=>{const open=indexedDB.open('zigoals-account-sync-v1');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const store=open.result.transaction('state','readwrite').objectStore('state'),get=store.get(id);get.onsuccess=()=>{const put=store.put({...get.result,heldDomains:['health']},id);put.onerror=()=>reject(put.error);put.onsuccess=()=>{open.result.close();resolve();};};get.onerror=()=>reject(get.error);};}),A);
 await consent.click();
 await region.getByRole('alert').getByText(refusal,{exact:true}).waitFor();
 expect(await consent.isChecked(),'the refused consent stays off').toBe(false);
 expect(await described(consent),'the refusal describes the Health consent checkbox').toBe(refusal);
}),60000);
// Copying local records into the account: each choice is labelled, and a disabled choice says what it is waiting for.
test.runIf(process.env.RUN10_BROWSER==='1')('local-copy choices are labelled and say why they are unavailable',()=>withOpenVault('run11-attach-a11y-',async page=>{
 const attach=page.getByRole('region',{name:'Copy local records to account',exact:true});
 expect(await attach.locator('input[type=checkbox]').evaluateAll(inputs=>inputs.map(input=>!!input.id&&[...input.labels].some(label=>label.htmlFor===input.id))),'every section choice has an explicit label').toEqual([true,true,true,true]);
 const health=attach.getByRole('checkbox',{name:'Health',exact:true});
 expect(await health.isDisabled(),'Health needs its sync permission first').toBe(true);
 expect(await described(health)).toBe('Health requires its separate sync permission above. Keep referenced Goals or assets together with their Today widgets where needed.');
 await attach.getByRole('checkbox',{name:'Habits',exact:true}).check();await attach.getByRole('button',{name:'Review selected local records',exact:true}).click();
 // Session M (owner decision M2): the copy happens in place, with no file to download first, so the approval has
 // nothing to wait for; it is still explicit and never ticked on the user's behalf.
 const approve=attach.getByRole('checkbox',{name:'Copy these records into this account. The originals stay on this device.',exact:true});
 await approve.waitFor();
 expect(await approve.evaluate(input=>!!input.id&&[...input.labels].some(label=>label.htmlFor===input.id)),'the copy approval has an explicit label').toBe(true);
 expect(await approve.isEnabled(),'nothing to download first').toBe(true);
 expect(await described(approve),'nothing left to wait for').toBe('');
 expect(await approve.isChecked(),'nothing is approved on the user\'s behalf').toBe(false);
 expect(await attach.getByRole('button',{name:'Copy selected records and sync',exact:true}).isDisabled(),'the copy waits for the approval').toBe(true);
},async(page,origin)=>{
 // A local Habit, so there is something to copy.
 await page.goto(origin+'/app/habits');await page.getByRole('button',{name:'+ New habit',exact:true}).click();await page.getByLabel('Start from template').selectOption('read');await page.getByLabel('Habit title',{exact:true}).fill('Fictional local before sign-in');await page.getByRole('button',{name:'Create habit',exact:true}).click();await page.getByText('Fictional local before sign-in',{exact:true}).first().waitFor();
}),60000);
