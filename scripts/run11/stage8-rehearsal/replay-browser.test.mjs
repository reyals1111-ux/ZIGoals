// Stage 8 row B6 in the browser (Session L rehearsal): a funding and its correction (a history reversal) reach the
// cloud exactly once, even when the acknowledgement of the upload that carries them is lost, by a reload while the
// reply is held, or by a dropped connection and a retry. Both devices end with one contribution and one reversal.
// Real Chrome (desktop and a 390×844 mobile context), the production app, the real route handler and private-sync
// Worker in Miniflare, fixture sign-in.
//
// A sync stages encrypted chunks, then publishes one head (catalog) write. The reload rehearsal loses the head
// write's acknowledgement; the retry rehearsal drops the first chunk write's. Both edits are made offline, before the
// upload whose acknowledgement is lost, so no edit follows a lost acknowledgement. An edit made after one is the known ADR-006 false conflict, documented by X1–X4
// (scripts/run11/sync-lost-ack*.test.*); it is not repeated here.
import {test,expect} from 'vitest';
import {BROWSER,accountUi,anyCodeProvider,launchChrome,privateWorkers,reviewOrigin,routeAccount} from './harness.mjs';

/** The head (catalog) record id (apps/web/lib/vault/cloud-sync.ts). */
const HEAD='00000000-0000-4000-8000-000000000001';

async function openModule(page,id){const section=page.locator('#'+id);if(await section.getAttribute('open')===null)await section.locator('summary').first().click();return section;}
/** The Goal timeline rows of one kind (as in scripts/run11/packaged-goal-journey.mjs). */
async function timeline(page,kind){
 const panel=page.getByRole('region',{name:'Goal timeline',exact:true});
 await panel.getByLabel('Event type',{exact:true}).selectOption(kind);
 await panel.getByRole('status').filter({hasText:'retained events'}).waitFor();
 return panel.locator('li').evaluateAll(rows=>rows.map(row=>row.id));
}
async function openGoal(page,ui,name){
 await ui.go('Goals');await page.getByRole('button',{name:'Active',exact:true}).click();
 await page.locator('.goal-card').filter({has:page.getByRole('heading',{name,exact:true})}).getByRole('link',{name,exact:true}).click();
 await page.getByTestId('tracked-progress').waitFor();
}
async function createValueGoal(page,ui,name){
 await ui.go('Goals');await page.locator('.page-heading').getByRole('link',{name:'+ Create a goal',exact:true}).click();
 await page.getByLabel('Goal name',{exact:true}).fill(name);await page.getByRole('radio',{name:'Value',exact:true}).check();
 await page.getByLabel('Target amount',{exact:true}).fill('1000');
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'Continue →',exact:true}).click();
 await page.getByRole('button',{name:'Create goal',exact:true}).click();await page.getByTestId('tracked-progress').waitFor();
}
/** One 200 USD cash contribution, then its reversal: the steps of packaged-goal-journey.mjs. */
async function fundAndReverse(page,note){
 await page.getByRole('button',{name:'Fund Goal',exact:true}).first().click();const dialog=page.getByRole('dialog',{name:'Fund your Goal',exact:true});
 await dialog.getByRole('button',{name:'Cash',exact:true}).click();await dialog.getByLabel('Asset name',{exact:true}).fill('Stage 8 rehearsal cash');await dialog.getByLabel('Cash amount',{exact:true}).fill('200');
 await dialog.getByRole('button',{name:'Continue with this asset',exact:true}).click();await dialog.getByLabel('Note (optional)',{exact:true}).fill(note);
 await dialog.getByRole('button',{name:'Preview contribution',exact:true}).click();await dialog.getByRole('button',{name:'Confirm & fund Goal',exact:true}).click();await dialog.waitFor({state:'hidden'});
 await (await openModule(page,'allocate')).getByText('Allocated to this Goal: 200 USD',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Reverse history entry',exact:true}).click();const correction=page.getByRole('dialog',{name:'Review history correction',exact:true});
 await correction.getByRole('button',{name:'Confirm history reversal',exact:true}).click();await correction.waitFor({state:'hidden'});
}

async function rehearse(mode){
 const origin=reviewOrigin(),workers=await privateWorkers({origin}),browser=await launchChrome(),provider=anyCodeProvider();
 // Armed once: the Worker applies the target write, then its reply is held until after a reload (the head write) or
 // dropped (the first write).
 let armed=false,writes=0,entered,release;const reached=new Promise(r=>{entered=r;}),held=new Promise(r=>{release=r;});
 const afterVault=async(method,operation)=>{
  if(method!=='POST')return;writes++;
  if(!armed||(mode==='reload'&&!operation?.changes?.some(row=>row.id===HEAD)))return;
  armed=false;entered();if(mode==='retry')return 'drop';await held;
 };
 try{
  const a=await browser.newContext(),b=await browser.newContext({viewport:{width:390,height:844},isMobile:true});
  const network=await routeAccount(a,{mf:workers.mf,provider,afterVault});await routeAccount(b,{mf:workers.mf,provider});
  const pa=await a.newPage(),pb=await b.newPage(),ua=accountUi(pa),ub=accountUi(pb);
  const GOAL=`Stage 8 ${mode} goal`,NOTE=`Stage 8 ${mode} receipt`;
  await ua.settings();await ua.signIn('a@example.invalid');const recovery=await ua.createVault();
  await createValueGoal(pa,ua,GOAL);await ua.go('Settings');await ua.syncNow();
  await ub.settings();await ub.signIn('a@example.invalid');await ub.unlock(recovery);
  // The funding and its reversal, made offline on device A.
  await openGoal(pa,ua,GOAL);await network.setOffline(true);await fundAndReverse(pa,NOTE);
  const original={contribution:await timeline(pa,'contribution'),reversal:await timeline(pa,'reversal')};
  expect([original.contribution.length,original.reversal.length]).toEqual([1,1]);
  // Back online: the upload is applied by the Worker, but its acknowledgement is lost.
  await network.setOffline(false);await ua.go('Settings');armed=true;const before=writes;
  await pa.getByRole('button',{name:'Sync now',exact:true}).click();await reached;
  if(mode==='reload'){
   await pa.reload();release();
   await ua.access().getByRole('button',{name:'Check account status',exact:true}).click();
   await pa.getByLabel('Vault recovery secret',{exact:true}).waitFor();await ua.unlock(recovery);
  }else{
   await ua.syncRegion().getByRole('alert').waitFor();await ua.syncNow();
  }
  expect(writes).toBeGreaterThan(before+1);
  await ua.syncNow();
  expect(await ua.syncRegion().getByRole('alert').count()).toBe(0);
  // Exactly one contribution and one reversal on both devices, the same entries.
  await openGoal(pa,ua,GOAL);
  expect({contribution:await timeline(pa,'contribution'),reversal:await timeline(pa,'reversal')}).toEqual(original);
  await ub.syncNow();await openGoal(pb,ub,GOAL);
  expect({contribution:await timeline(pb,'contribution'),reversal:await timeline(pb,'reversal')}).toEqual(original);
  await a.close();await b.close();
 }finally{release();await browser.close();await workers.mf.dispose();}
}

test.runIf(BROWSER)('a reload while the head write\'s acknowledgement is held replays the funding and its correction exactly once',()=>rehearse('reload'),90000);
test.runIf(BROWSER)('a dropped acknowledgement of the first write and a retry replay the funding and its correction exactly once',()=>rehearse('retry'),90000);
