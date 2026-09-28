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
// One profile: this device's own confirmed upload must not come back as an Unlinked conflict
// when a local edit landed while that upload was in flight (the sync result could not be applied).
test.runIf(process.env.RUN10_BROWSER==='1')('own held upload plus a concurrent local finance write syncs normally on Sync now',async()=>{
 const origin=process.env.RUN11_REVIEW_ORIGIN??'http://127.0.0.1:3112',mf=await createPrivateMiniflare({origin,persist:await mkdtemp(join(tmpdir(),'run11-self-conflict-')),outboundService:async request=>Response.json({id:identity(request.headers.get('authorization'))})});
 const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext(),page=await context.newPage();
 let armed=false,entered,release,writes=0;const held=new Promise(r=>{entered=r;}),resume=new Promise(r=>{release=r;});
 try{
  await context.route('**/api/private-account*',async route=>{const r=route.request(),headers=await r.allHeaders(),req=new Request(r.url(),{method:r.method(),headers,...(r.postData()?{body:r.postData()}:{})});const result=await privateAccountRequest(req,{authOrigin:'https://fixture.supabase.co',publicKey:'public-fixture',syncOrigin:'https://fixture.workers.dev'},async(url,init)=>{const u=new URL(url);if(u.hostname==='fixture.workers.dev'){const response=await mf.dispatchFetch(url,init);if(u.pathname==='/v1/vault'&&init?.method==='POST'){writes++;if(armed){armed=false;entered();await resume;}}return response;}if(u.pathname.endsWith('/verify'))return Response.json({access_token:fixtureToken('browser-'+A,A),expires_in:3600,user:{id:A}});if(u.pathname.endsWith('/user'))return Response.json({id:identity(new Headers(init.headers).get('authorization'))});return Response.json({});});await route.fulfill({status:result.status,headers:{...Object.fromEntries(result.headers),...(result.headers.getSetCookie().length?{'set-cookie':result.headers.getSetCookie().join('\n')}:{})},body:await result.text()});});
  const region=()=>page.getByRole('region',{name:'Encrypted account sync',exact:true});
  const synced=async()=>{await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Sync now'&&!b.disabled));await region().getByText(/Account records synced and acknowledged/).waitFor();};
  const createGoal=async name=>{await page.getByRole('link',{name:'Today',exact:true}).first().click();await page.getByRole('link',{name:'+ Create a goal',exact:true}).click();await page.getByLabel('Goal name',{exact:true}).fill(name);await page.getByRole('radio',{name:'Project',exact:true}).check();await page.getByLabel('Milestones, one per line').fill('Start');for(let i=0;i<3;i++)await page.getByRole('button',{name:'Continue →'}).click();await page.getByRole('button',{name:'Create goal',exact:true}).click();await page.getByTestId('tracked-progress').waitFor();};
  await page.goto(origin+'/app/settings');await page.getByLabel('Email address',{exact:true}).fill('a@example.invalid');await page.getByRole('button',{name:'Send email code',exact:true}).click();await page.getByLabel('Email code',{exact:true}).fill('123456');await page.getByRole('button',{name:'Verify email code',exact:true}).click();await page.getByRole('button',{name:'Create encrypted account vault',exact:true}).click();await page.getByLabel('I saved this vault recovery secret separately.').check();await page.getByRole('button',{name:'Confirm and create vault',exact:true}).click();await synced();
  // First finance write: automatic sync captures it and its upload is held after the cloud accepted it.
  armed=true;await createGoal('Self race first');await held;
  // Second finance write lands while that sync is still running.
  await createGoal('Self race second');release();
  await page.getByRole('link',{name:'Settings',exact:true}).first().click();await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Sync now'&&!b.disabled));
  // Precondition: the held sync published but could not apply its result, so commit() was skipped.
  await region().getByRole('alert').filter({hasText:'Local records changed during sync'}).waitFor();
  const before=writes;await page.getByRole('button',{name:'Sync now',exact:true}).click();
  await Promise.race([synced(),region().getByRole('alert').filter({hasText:/Unlinked|Conflicting/}).waitFor().then(async()=>{throw Error('Own upload reported as conflict: '+await region().getByRole('alert').innerText());})]);
  expect(await region().getByRole('alert').count()).toBe(0);expect(writes).toBeGreaterThan(before);
  await page.getByRole('link',{name:'Goals',exact:true}).first().click();for(const name of ['Self race first','Self race second'])await page.getByRole('heading',{name,exact:true}).waitFor();
 }finally{release();await browser.close();await mf.dispose();}
},60000);
