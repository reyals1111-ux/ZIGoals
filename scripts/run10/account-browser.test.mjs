import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {decryptBackup} from '../../apps/web/lib/vault/backup.ts';
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
 async function synced(page){await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Sync now'&&!b.disabled),{},{timeout:10000});const panel=page.getByRole('region',{name:'Encrypted account sync',exact:true});try{await panel.getByText(/Account records synced and acknowledged/).waitFor({timeout:8000});}catch(e){console.log('Sync diagnostic',await panel.getByRole('status').allTextContents(),await panel.getByRole('alert').allTextContents());throw e;}}
 try{
  const a=await context(),b=await context(true),pa=await a.newPage(),pb=await b.newPage();
  // Existing local records stay separate through sign-in and only copy after explicit protected review.
  await pa.goto(origin+'/app/habits');await pa.getByRole('button',{name:'+ New habit',exact:true}).click();await pa.getByLabel('Start from template').selectOption('read');await pa.getByLabel('Habit title',{exact:true}).fill('Fictional local before sign-in');await pa.getByRole('button',{name:'Create habit',exact:true}).click();
  await pa.getByRole('article',{name:'Fictional local before sign-in',exact:true}).waitFor();
  await login(pa);await pa.getByLabel('Sync my Health records with this account.',{exact:false}).check();await pa.getByRole('button',{name:'Create encrypted account vault',exact:true}).click();const recovery=await pa.getByLabel('New vault recovery secret',{exact:true}).inputValue();await pa.getByLabel('I saved this vault recovery secret separately.').check();await pa.getByRole('button',{name:'Confirm and create vault',exact:true}).click();await synced(pa);
  const attach=pa.getByRole('region',{name:'Copy local records to account',exact:true});
  await attach.getByRole('checkbox',{name:'Habits',exact:true}).check();await attach.getByRole('button',{name:'Review selected local records',exact:true}).click();await attach.getByText(/habits: 1/).waitFor();
  expect(await attach.getByRole('button',{name:'Copy selected records and sync'}).isDisabled()).toBe(true);
  const copySecret=await attach.getByLabel('Local copy backup secret',{exact:true}).inputValue();expect(copySecret.length).toBeGreaterThan(20);
  await attach.getByLabel('I saved this local-copy backup secret separately.').check();
  const downloadEvent=pa.waitForEvent('download');await attach.getByRole('button',{name:'Download protected local copy'}).click();const download=await downloadEvent;
  const reader=await download.createReadStream();let protectedFile='';for await(const chunk of reader)protectedFile+=chunk.toString();expect(protectedFile).not.toContain('Fictional local before sign-in');expect(JSON.parse(protectedFile).format).toBe('zigoals-encrypted-backup');expect((await decryptBackup(protectedFile,copySecret)).habits).toContain('Fictional local before sign-in');
  await attach.getByLabel('I saved the backup file and want these selected records copied into this account.').check();await attach.getByRole('button',{name:'Copy selected records and sync'}).click();await synced(pa);
  // Originals remain a separate local source; populated account sections refuse a repeated import.
  await attach.getByRole('button',{name:'Review selected local records',exact:true}).click();await pa.getByRole('region',{name:'Encrypted account sync',exact:true}).getByRole('alert').filter({hasText:'already contains'}).waitFor();
  await pa.getByRole('button',{name:'Sync now',exact:true}).click();await synced(pa);
  // Client navigation preserves the memory-only unlocked session.
  await pa.getByRole('link',{name:'Habits',exact:true}).first().click();await pa.getByRole('button',{name:'+ New habit',exact:true}).click();await pa.getByLabel('Start from template').selectOption('read');await pa.getByLabel('Habit title',{exact:true}).fill('Fictional synchronized reading');await pa.getByRole('button',{name:'Create habit',exact:true}).click();
  await pa.getByRole('link',{name:'Settings',exact:true}).first().click();await pa.getByRole('button',{name:'Sync now',exact:true}).click();await synced(pa);
  await pa.getByRole('link',{name:'Health',exact:true}).first().click();await pa.getByRole('button',{name:'Foods & recipes',exact:true}).click();await pa.getByRole('button',{name:'New food',exact:true}).click();
  const food=pa.getByRole('form',{name:'Food details'});for(const [label,value]of [['Food name','Fictional encrypted oats'],['Serving weight (g)','40'],['Calories (kcal)','150'],['Protein (g)','5'],['Carbs (g)','27'],['Fat (g)','3']])await food.getByLabel(label).fill(value);await food.getByRole('button',{name:'Save food',exact:true}).click();await pa.getByRole('button',{name:'Diary',exact:true}).click();
  const meal=pa.getByRole('form',{name:'Log a meal',exact:true});await meal.getByLabel('Food or recipe').selectOption({label:'Fictional encrypted oats · food'});await meal.getByRole('button',{name:'Log to diary'}).click();
  await pa.getByRole('link',{name:'Today',exact:true}).first().click();await pa.getByRole('link',{name:'+ Create a goal',exact:true}).click();await pa.getByLabel('Goal name',{exact:true}).fill('Fictional encrypted project');await pa.getByRole('radio',{name:'Project',exact:true}).check();await pa.getByLabel('Milestones, one per line').fill('Read evidence\nReview');for(let i=0;i<3;i++)await pa.getByRole('button',{name:'Continue →'}).click();await pa.getByRole('button',{name:'Create goal',exact:true}).click();await pa.getByTestId('tracked-progress').waitFor();
  await pa.getByRole('link',{name:'Today',exact:true}).first().click();await pa.getByRole('button',{name:'Customize Today',exact:true}).click();await pa.getByRole('button',{name:'Add widget',exact:true}).click();const editor=pa.getByRole('dialog',{name:'Add a widget'});await editor.getByRole('combobox',{name:'Metric',exact:true}).selectOption('water');await editor.getByLabel('Title (optional)').fill('Fictional synced nutrition');await editor.getByRole('button',{name:'Save widget'}).click();try{await pa.getByRole('article',{name:'Fictional synced nutrition',exact:true}).waitFor({timeout:7000});}catch(e){console.log('Widget save diagnostics',await pa.locator('[role=alert]').allTextContents(),await pa.locator('[role=status]').allTextContents());throw e;}
  await pa.getByRole('link',{name:'Settings',exact:true}).first().click();await pa.getByRole('button',{name:'Sync now',exact:true}).click();await synced(pa);
  await login(pb);await pb.getByLabel('Sync my Health records with this account.',{exact:false}).check();await pb.getByLabel('Vault recovery secret',{exact:true}).fill(recovery);await pb.getByRole('button',{name:'Unlock account vault',exact:true}).click();await synced(pb);
  await pb.getByRole('link',{name:'Today',exact:true}).first().click();await pb.getByRole('article',{name:'Fictional synced nutrition',exact:true}).waitFor();
  await pb.getByRole('link',{name:'Health',exact:true}).first().click();await pb.getByRole('region',{name:'Breakfast diary'}).getByText('Fictional encrypted oats',{exact:true}).waitFor();
  await pb.getByRole('link',{name:'Goals',exact:true}).first().click();await pb.getByRole('heading',{name:'Fictional encrypted project',exact:true}).waitFor();
  await pb.getByRole('link',{name:'Habits',exact:true}).first().click();await pb.getByRole('article',{name:'Fictional synchronized reading',exact:true}).waitFor();await pb.getByRole('article',{name:'Fictional local before sign-in',exact:true}).waitFor();
  await pb.getByRole('article',{name:'Fictional synchronized reading',exact:true}).getByRole('button',{name:'Complete Fictional synchronized reading',exact:true}).click();
  await pb.getByRole('link',{name:'Settings',exact:true}).first().click();await pb.getByRole('button',{name:'Sync now',exact:true}).click();await synced(pb);
  await pa.getByRole('button',{name:'Sync now',exact:true}).click();await synced(pa);await pa.getByRole('link',{name:'Habits',exact:true}).first().click();await pa.getByRole('article',{name:'Fictional synchronized reading',exact:true}).getByRole('button',{name:'Undo completion for Fictional synchronized reading',exact:true}).waitFor();
  // Cold reload requires the separate vault secret; accepted account data survives.
  await pb.reload();await pb.getByLabel('Vault recovery secret',{exact:true}).fill(recovery);await pb.getByLabel('Sync my Health records with this account.',{exact:false}).check();await pb.getByRole('button',{name:'Unlock account vault',exact:true}).click();await synced(pb);
  // Two independent offline app edits merge by their stable water-entry identities.
  for(const page of [pa,pb]){await page.getByRole('link',{name:'Health',exact:true}).first().click();await page.getByRole('button',{name:'Add 250 mL',exact:true}).waitFor();}await a.setOffline(true);await b.setOffline(true);
  await pa.getByRole('button',{name:'Add 250 mL',exact:true}).click();await pa.getByRole('region',{name:'Water journal'}).getByText('250 mL recorded',{exact:false}).waitFor();await pb.getByRole('button',{name:'Add 500 mL',exact:true}).click();await pb.getByRole('region',{name:'Water journal'}).getByText('500 mL recorded',{exact:false}).waitFor();
  await b.setOffline(false);await pb.getByRole('link',{name:'Settings',exact:true}).first().click();await pb.getByRole('button',{name:'Sync now',exact:true}).click();await synced(pb);
  await a.setOffline(false);await pa.getByRole('link',{name:'Settings',exact:true}).first().click();await pa.getByRole('button',{name:'Sync now',exact:true}).click();await synced(pa);await pa.getByRole('link',{name:'Health',exact:true}).first().click();await pa.getByRole('region',{name:'Water journal'}).getByText('750 mL recorded',{exact:false}).waitFor({timeout:5000});
  await pb.getByRole('button',{name:'Sync now',exact:true}).click();await synced(pb);await pb.getByRole('link',{name:'Health',exact:true}).first().click();await pb.getByRole('region',{name:'Water journal'}).getByText('750 mL recorded',{exact:false}).waitFor();await pb.getByRole('link',{name:'Settings',exact:true}).first().click();
  const tokenA=(await a.cookies(origin+'/api/private-account')).find(c=>c.name==='zigoals_session').value;
  const raw=await (await mf.dispatchFetch('https://fixture.workers.dev/v1/vault',{headers:{origin,authorization:'Bearer '+tokenA,'x-zigoals-account':account}})).text();for(const marker of ['Fictional synchronized reading','Fictional encrypted oats','Fictional encrypted project','Fictional synced nutrition'])expect(raw).not.toContain(marker);expect(JSON.parse(raw).records.length).toBeGreaterThan(1);
  await pa.getByRole('link',{name:'Settings',exact:true}).first().click();await pa.getByRole('button',{name:'Refresh sessions',exact:true}).click();await pa.getByRole('button',{name:'Revoke other sessions',exact:true}).click();await pa.getByRole('button',{name:'Confirm session revocation',exact:true}).click();await pa.getByRole('region',{name:'Account sessions',exact:true}).getByText('1 session(s) revoked.',{exact:false}).waitFor();
  await pb.bringToFront();await pb.evaluate(()=>window.dispatchEvent(new Event('focus')));await pb.getByRole('region',{name:'Encrypted account sync',exact:true}).getByText('Account access changed. Sign in and unlock again.',{exact:true}).waitFor();expect(await pb.getByRole('button',{name:'Sync now',exact:true}).count()).toBe(0);
  await pa.goto(origin+'/app/habits');expect(await pa.getByRole('article',{name:'Fictional synchronized reading',exact:true}).count()).toBe(0);
  await pa.goto(origin+'/app/settings');await pa.getByRole('button',{name:'Sign out',exact:true}).click();await pa.getByRole('link',{name:'Habits',exact:true}).first().click();await pa.getByRole('article',{name:'Fictional local before sign-in',exact:true}).waitFor();expect(await pa.getByRole('article',{name:'Fictional synchronized reading',exact:true}).count()).toBe(0);
  await a.close();await b.close();
 }finally{await browser.close();await mf.dispose();}
},90000);
