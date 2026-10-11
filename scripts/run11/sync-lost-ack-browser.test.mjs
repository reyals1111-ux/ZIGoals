// ADR-006 (option A2, Session P) in the browser: the final head write of a sync is applied by the private-sync Worker,
// but its reply never reaches the page (a dropped connection). A Goal created afterwards must sync without a conflict
// review: the replay applies the confirmation the journal kept beside the queued write, so this device's own upload is
// not mistaken for another device's. Real Chrome, the production app, the real route handler and Worker in Miniflare,
// fixture sign-in (the Stage 8 rehearsal harness). Three variants: the next sync in the same page; a reload and unlock
// after the edit; the page closed and the profile reopened after the edit. A second, phone-sized device then sees every
// Goal. Against the build before the fix every variant reports "Conflicting financial changes".
import {test,expect} from 'vitest';
import {BROWSER,accountUi,anyCodeProvider,launchChrome,privateWorkers,reviewOrigin,routeAccount} from './stage8-rehearsal/harness.mjs';

/** The head (catalog) record id (apps/web/lib/vault/cloud-sync.ts). */
const HEAD='00000000-0000-4000-8000-000000000001';
async function createValueGoal(page,ui,name){
 await ui.go('Goals');await page.locator('.page-heading').getByRole('link',{name:'+ Create a goal',exact:true}).click();
 await page.getByLabel('Goal name',{exact:true}).fill(name);await page.getByRole('radio',{name:'Value',exact:true}).check();
 await page.getByLabel('Target amount',{exact:true}).fill('1000');
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'Continue →',exact:true}).click();
 await page.getByRole('button',{name:'Create goal',exact:true}).click();await page.getByTestId('tracked-progress').waitFor();
}
async function unlockAfterReload(page,ui,recovery){
 await ui.access().getByRole('button',{name:'Check account status',exact:true}).click();
 await page.getByLabel('Vault recovery secret',{exact:true}).waitFor();await ui.unlock(recovery);
}
const conflict=ui=>ui.syncRegion().getByRole('alert').filter({hasText:/Unlinked|Conflicting/}).waitFor().then(async()=>{throw Error('Own upload reported as a conflict: '+await ui.syncRegion().getByRole('alert').innerText());});

async function rehearse(variant){
 const origin=reviewOrigin(),workers=await privateWorkers({origin}),browser=await launchChrome(),provider=anyCodeProvider();
 // Armed once: the Worker applies the head write, and its reply is dropped before the page sees it.
 let armed=false,dropped=0,entered;const reached=new Promise(r=>{entered=r;});
 const afterVault=async(method,operation)=>{if(method!=='POST'||!armed||!operation?.changes?.some(row=>row.id===HEAD))return;armed=false;dropped++;entered();return 'drop';};
 try{
  const a=await browser.newContext();await routeAccount(a,{mf:workers.mf,provider,afterVault});
  let pa=await a.newPage(),ua=accountUi(pa);
  const name=n=>`Lost ack ${variant} ${n}`;
  await ua.settings();await ua.signIn('a@example.invalid');const recovery=await ua.createVault();
  await createValueGoal(pa,ua,name('first'));await ua.go('Settings');await ua.syncNow();
  // The second Goal's upload loses the acknowledgement of its head write; the panel reports the dropped connection.
  await createValueGoal(pa,ua,name('second'));await ua.go('Settings');armed=true;
  await pa.getByRole('button',{name:'Sync now',exact:true}).click();await reached;
  await ua.syncRegion().getByRole('alert').waitFor();expect(dropped).toBe(1);
  // The edit after the lost acknowledgement (automatic sync is paused by the error, so it stays local for now).
  await createValueGoal(pa,ua,name('third'));await ua.go('Settings');
  // A reload or a reopened profile locks the vault; the unlock's own sync is then the replay, and the confirmation must
  // have survived in the journal for it to complete without a review. Without the fix every variant reports
  // "Conflicting financial changes" here (checked against the build before it).
  if(variant==='reload'){await pa.waitForURL(/\/app\/settings$/);await pa.reload();await Promise.race([unlockAfterReload(pa,ua,recovery),conflict(ua)]);}
  if(variant==='reopen'){await pa.close();pa=await a.newPage();ua=accountUi(pa);await ua.settings();await Promise.race([unlockAfterReload(pa,ua,recovery),conflict(ua)]);}
  await Promise.race([ua.syncNow(),conflict(ua)]);
  expect(await ua.syncRegion().getByRole('alert').count()).toBe(0);
  await Promise.race([ua.syncNow(),conflict(ua)]);
  // A second device, phone-sized, sees all three Goals.
  const b=await browser.newContext({viewport:{width:390,height:844},isMobile:true});await routeAccount(b,{mf:workers.mf,provider});
  const pb=await b.newPage(),ub=accountUi(pb);await ub.settings();await ub.signIn('a@example.invalid');await ub.unlock(recovery);
  await ub.go('Goals');await pb.getByRole('button',{name:'Active',exact:true}).click();
  for(const n of ['first','second','third'])await pb.getByRole('heading',{name:name(n),exact:true}).waitFor();
  await a.close();await b.close();
 }finally{await browser.close();await workers.mf.dispose();}
}

test.runIf(BROWSER)('a lost acknowledgement of the final write, then an edit in the same page, syncs without a conflict review',()=>rehearse('same page'),120000);
test.runIf(BROWSER)('a lost acknowledgement, an edit, then a reload and unlock, syncs without a conflict review',()=>rehearse('reload'),120000);
test.runIf(BROWSER)('a lost acknowledgement, an edit, then the page closed and the profile reopened, syncs without a conflict review',()=>rehearse('reopen'),120000);
