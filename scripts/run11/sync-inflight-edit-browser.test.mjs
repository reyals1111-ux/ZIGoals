import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {privateAccountRequest} from '../../apps/web/lib/server/private-account';
import {createPrivateMiniflare,fixtureToken} from './private-runtime.mjs';
import {armSyncCompletion} from './sync-completion.mjs';
import {createRequestLog} from './sync-diagnostics.mjs';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),{chromium}=require('@playwright/test');
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const identity=header=>JSON.parse(Buffer.from(header.slice(7).split('.')[1],'base64url').toString()).sub;
const SUCCESS='Account records synced and acknowledged';

async function runtime(){
 let devices=0;
 const origin=process.env.RUN11_REVIEW_ORIGIN??'http://127.0.0.1:3112',mf=await createPrivateMiniflare({origin,persist:await mkdtemp(join(tmpdir(),'run11-inflight-')),outboundService:async request=>Response.json({id:identity(request.headers.get('authorization'))})});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 // Each device gets its own session token. `hooks.before`/`hooks.after` may hold a Worker vault request.
 async function device(){
  const context=await browser.newContext(),page=await context.newPage(),token=fixtureToken('device-'+crypto.randomUUID(),A),hooks={before:null,after:null},log=createRequestLog(`device ${++devices}`);
  // Records any paused or conflict state the sync panel shows while mounted. A pause is sticky
  // (automatic sync stays off until the user acts), so it is still visible whenever Settings opens.
  await context.addInitScript(()=>{window.__syncPauses=[];const check=()=>{const region=document.querySelector('[aria-label="Encrypted account sync"]');if(!region)return;const alert=region.querySelector('[role="alert"]'),text=region.textContent??'';if(alert||text.includes('Needs attention'))window.__syncPauses.push(((alert?.textContent??'')+' | '+text).slice(0,300));};new MutationObserver(check).observe(document,{subtree:true,childList:true,characterData:true});});
  await context.route('**/api/private-account*',async route=>{const r=route.request(),headers=await r.allHeaders(),req=new Request(r.url(),{method:r.method(),headers,...(r.postData()?{body:r.postData()}:{})}),started=Date.now();const result=await privateAccountRequest(req,{authOrigin:'https://fixture.supabase.co',publicKey:'public-fixture',syncOrigin:'https://fixture.workers.dev'},async(url,init)=>{const u=new URL(url);if(u.hostname==='fixture.workers.dev'){const vault=u.pathname==='/v1/vault',method=init?.method??'GET';const held=vault&&!!(hooks.before||hooks.after),sent=Date.now();if(vault)await hooks.before?.(method);let response;try{response=await mf.dispatchFetch(url,init);}catch(error){log.failed(method,url,error,Date.now()-sent,held);throw error;}if(vault)await hooks.after?.(method);await log.worker(method,url,response,Date.now()-sent,held);return response;}if(u.pathname.endsWith('/verify'))return Response.json({access_token:token,expires_in:3600,user:{id:A}});if(u.pathname.endsWith('/user'))return Response.json({id:identity(new Headers(init.headers).get('authorization'))});return Response.json({});});await log.app(r.method(),r.url(),r.postData(),result,Date.now()-started);await route.fulfill({status:result.status,headers:{...Object.fromEntries(result.headers),...(result.headers.getSetCookie().length?{'set-cookie':result.headers.getSetCookie().join('\n')}:{})},body:await result.text()});});
  const region=()=>page.getByRole('region',{name:'Encrypted account sync',exact:true}),pauses=()=>page.evaluate(()=>window.__syncPauses);
  const signIn=async email=>{await page.goto(origin+'/app/settings');await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByRole('button',{name:'Send email code',exact:true}).click();await page.getByLabel('Email code',{exact:true}).fill('123456');await page.getByRole('button',{name:'Verify email code',exact:true}).click();};
  const enroll=async()=>{await signIn('a@example.invalid');await page.getByRole('button',{name:'Create encrypted account vault',exact:true}).click();const recovery=await page.getByLabel('New vault recovery secret',{exact:true}).inputValue();await page.getByLabel('I saved this vault recovery secret separately.').check();const created=await armSyncCompletion(page);await page.getByRole('button',{name:'Confirm and create vault',exact:true}).click();await created();return recovery;};
  const unlock=async recovery=>{await signIn('a@example.invalid');await page.getByLabel('Vault recovery secret',{exact:true}).fill(recovery);const synced=await armSyncCompletion(page);await page.getByRole('button',{name:'Unlock account vault',exact:true}).click();await synced();};
  // Client-side navigation only: a reload would lock the in-memory vault session.
  const createGoal=async name=>{await page.getByRole('link',{name:'Goals',exact:true}).first().click();await page.locator('.page-heading').getByRole('link',{name:'+ Create a goal',exact:true}).click();await page.getByLabel('Goal name',{exact:true}).fill(name);await page.getByRole('radio',{name:'Project',exact:true}).check();await page.getByLabel('Milestones, one per line').fill('Start');for(let i=0;i<3;i++)await page.getByRole('button',{name:'Continue →'}).click();await page.getByRole('button',{name:'Create goal',exact:true}).click();await page.getByTestId('tracked-progress').waitFor();};
  const hasGoals=async names=>{await page.getByRole('link',{name:'Goals',exact:true}).first().click();for(const name of names)await page.getByRole('heading',{name,exact:true}).waitFor();};
  const settled=()=>page.waitForFunction(success=>document.querySelector('[aria-label="Encrypted account sync"]')?.textContent?.includes(success)&&[...document.querySelectorAll('button')].some(b=>b.textContent==='Sync now'&&!b.disabled),SUCCESS);
  const settings=()=>page.getByRole('link',{name:'Settings',exact:true}).first().click();
  return {page,hooks,region,pauses,enroll,unlock,createGoal,hasGoals,settled,settings};
 }
 return {device,close:async()=>{await browser.close();await mf.dispose();}};
}
const gate=()=>{let open;const opened=new Promise(r=>{open=r;});return {opened,open};};

// A local edit made while this device's upload is in flight is a normal outcome: automatic sync
// uploads it with one follow-up and never pauses. Nothing here clicks "Sync now".
test.runIf(process.env.RUN10_BROWSER==='1')('an edit during an in-flight upload syncs automatically without pausing',async()=>{
 const rt=await runtime(),a=await rt.device();const held=gate(),resume=gate();
 try{
  const recovery=await a.enroll();
  let armed=true;a.hooks.after=async method=>{if(armed&&method==='POST'){armed=false;held.open();await resume.opened;}};
  await a.createGoal('In-flight first');await held.opened;
  await a.createGoal('In-flight second');resume.open();
  await a.settings();
  // Automatic sync must settle to success on its own; a pause fails immediately with what it showed.
  const outcome=await Promise.race([a.page.waitForFunction(success=>{const region=document.querySelector('[aria-label="Encrypted account sync"]');return region?.textContent?.includes(success)&&[...document.querySelectorAll('button')].some(b=>b.textContent==='Sync now'&&!b.disabled);},SUCCESS,{timeout:30000}).then(()=>'synced'),a.page.waitForFunction(()=>window.__syncPauses.length>0,undefined,{timeout:30000}).then(()=>'paused')]);
  expect({outcome,pauses:await a.pauses()}).toEqual({outcome:'synced',pauses:[]});
  expect(await a.region().getByRole('alert').count()).toBe(0);
  // The cloud holds the latest edit: a second device that only unlocks receives both Goals.
  const b=await rt.device();await b.unlock(recovery);
  await b.hasGoals(['In-flight first','In-flight second']);
  expect(await a.pauses()).toEqual([]);
 }finally{resume.open();await rt.close();}
},90000);

// Guard: another device's finance change that this device has not seen is still a real conflict
// and pauses automatic sync for review, exactly as before.
test.runIf(process.env.RUN10_BROWSER==='1')('another device finance edit still pauses automatic sync for review',async()=>{
 const rt=await runtime(),a=await rt.device();const held=gate(),resume=gate();
 try{
  const recovery=await a.enroll();
  // Both devices first share one synced finance baseline, so the later edits are a financial conflict.
  let aWrites=0;a.hooks.after=async method=>{if(method==='POST')aWrites++;};await a.createGoal('Shared baseline');await expect.poll(()=>aWrites,{timeout:30000}).toBeGreaterThan(0);await a.settings();await a.settled();a.hooks.after=null;
  const b=await rt.device();await b.unlock(recovery);await b.hasGoals(['Shared baseline']);
  // Hold A's next cloud read before it reaches the Worker, so A reads only after B has published.
  let armed=true;a.hooks.before=async method=>{if(armed&&method==='GET'){armed=false;held.open();await resume.opened;}};
  await a.createGoal('Device A edit');await held.opened;
  let bWrites=0;b.hooks.after=async method=>{if(method==='POST')bWrites++;};
  await b.createGoal('Device B edit');await expect.poll(()=>bWrites,{timeout:30000}).toBeGreaterThan(0);await b.settings();await b.settled();
  resume.open();await a.settings();
  await a.region().getByRole('alert').filter({hasText:'Conflicting financial changes'}).waitFor({timeout:30000});
  await a.region().getByText('Needs attention. Automatic sync paused.').waitFor();
 }finally{resume.open();await rt.close();}
},90000);

// Session K (account-browser b-first): the sync panel's actions and its automatic sync share one "running" flag. An
// automatic sync sets it the moment its 1 s debounce fires, but the panel only shows itself busy on React's next
// render, so the buttons still look enabled for a moment. These two cases pin that moment deterministically: the
// automatic sync's debounce timer is captured in the page, so the test decides exactly when it fires.
const captureDebounce=page=>page.evaluate(()=>{const real=window.setTimeout;window.setTimeout=function(fn,ms,...rest){if(ms===1000&&typeof fn==='function'){window.setTimeout=real;window.__fireAutoSync=()=>fn(...rest);return real(()=>{},2_000_000);}return real(fn,ms,...rest);};window.dispatchEvent(new Event('focus'));});

// A click that lands right after an automatic sync started (the button still enabled on screen) must not vanish:
// the review opens as soon as that sync ends.
test.runIf(process.env.RUN10_BROWSER==='1')('a review asked for just as an automatic sync starts opens when that sync ends',async()=>{
 const rt=await runtime(),a=await rt.device();const held=gate(),resume=gate();
 try{
  await a.enroll();await a.settled();
  await a.page.getByText('Cloud copies by section',{exact:true}).click();
  const review=a.page.getByRole('button',{name:'Review section deletion',exact:true});await expect.poll(()=>review.isEnabled()).toBe(true);
  // Hold the automatic sync's first cloud read, so it is still running when the click arrives.
  let armed=true;a.hooks.before=async method=>{if(armed&&method==='GET'){armed=false;held.open();await resume.opened;}};
  await captureDebounce(a.page);
  // The automatic sync starts and, in the same task, before React renders the busy state, the person's click arrives.
  await a.page.evaluate(()=>{window.__fireAutoSync();[...document.querySelectorAll('button')].find(b=>b.textContent==='Review section deletion').click();});
  await held.opened;resume.open();
  await a.page.getByLabel('Section recovery secret',{exact:true}).waitFor({timeout:15000});
  expect(await a.region().getByRole('alert').count()).toBe(0);
 }finally{resume.open();await rt.close();}
},90000);

// "Automatic sync pauses during review": an automatic sync that was already scheduled when a review began must not
// run while the review is open.
test.runIf(process.env.RUN10_BROWSER==='1')('an automatic sync scheduled before a review began does not run during the review',async()=>{
 const rt=await runtime(),a=await rt.device();
 try{
  await a.enroll();await a.settled();
  await a.page.getByText('Cloud copies by section',{exact:true}).click();
  await captureDebounce(a.page);
  await a.page.getByRole('button',{name:'Review section deletion',exact:true}).click();
  await a.page.getByLabel('Section recovery secret',{exact:true}).waitFor();
  let requests=0;a.hooks.before=async()=>{requests++;};
  // The debounce armed before the review fires now, while the review is open.
  await a.page.evaluate(()=>window.__fireAutoSync());
  await a.page.waitForTimeout(1500);
  expect(requests).toBe(0);
  await expect.poll(()=>a.page.getByLabel('Section recovery secret',{exact:true}).isVisible()).toBe(true);
  expect(await a.region().getByRole('alert').count()).toBe(0);
 }finally{await rt.close();}
},90000);
