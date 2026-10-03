// "Remember on this device" (Session M, Part B2; ADR-008; owner decision M1) against the real private-sync Worker in
// Miniflare, in real Chrome with the production app and fixture sign-in. A remembered device opens the vault again
// without the recovery secret after a reload, in a new tab and after 15 idle minutes; Lock now and Forget this device
// make it ask again. A key rotation on another device, a sign-out and another account's sign-in invalidate it, and the
// old material never opens the newer epoch: the old secret is refused there and the new one is needed once.
import {test,expect} from 'vitest';
import {armSyncCompletion} from '../sync-completion.mjs';
import {BROWSER,accountUi,anyCodeProvider,launchChrome,privateWorkers,reviewOrigin,routeAccount} from './harness.mjs';

const REMEMBER='Remember on this device — don’t use on shared computers',REMEMBERED='This device is remembered: ZIGoals opens your account records here without the recovery secret.';
/** Whether this browser holds a remembered record, read without creating anything. */
const deviceRecords=page=>page.evaluate(async()=>{if(!(await indexedDB.databases()).some(db=>db.name==='zigoals-device-unlock-v1'))return 0;return new Promise(resolve=>{const r=indexedDB.open('zigoals-device-unlock-v1');r.onsuccess=()=>{const c=r.result.transaction('devices').objectStore('devices').count();c.onsuccess=()=>{r.result.close();resolve(c.result);};};});});
function remembering(page){
 const ui=accountUi(page),lock=()=>ui.syncRegion().getByRole('button',{name:'Lock account vault',exact:true}),secret=()=>page.getByLabel('Vault recovery secret',{exact:true});
 return {...ui,lock,secret,
  /** Opened without anything typed: the vault controls show and the first sync completes. */
  async reopened(){await lock().waitFor();expect(await secret().count()).toBe(0);},
  async createRemembered(){
   await page.getByRole('button',{name:'Create encrypted account vault',exact:true}).click();
   const recovery=await page.getByLabel('New vault recovery secret',{exact:true}).inputValue();
   await page.getByLabel('I saved this vault recovery secret separately.').check();
   const box=ui.syncRegion().getByRole('checkbox',{name:REMEMBER,exact:true});expect(await box.isChecked()).toBe(false);await box.check();
   const done=await armSyncCompletion(page);await page.getByRole('button',{name:'Confirm and create vault',exact:true}).click();await done();
   await ui.syncRegion().getByText(REMEMBERED).waitFor();return recovery;
  },
  async unlockRemembered(recovery){
   await secret().fill(recovery);await ui.syncRegion().getByRole('checkbox',{name:REMEMBER,exact:true}).check();
   const done=await armSyncCompletion(page);await ui.syncRegion().getByRole('button',{name:'Unlock account vault',exact:true}).click();await done();
   await ui.syncRegion().getByText(REMEMBERED).waitFor();
  },
 };
}

test.runIf(BROWSER)('a remembered device reopens after a reload, in a new tab and after 15 idle minutes, until Forget or Lock now',async()=>{
 const origin=reviewOrigin(),workers=await privateWorkers({origin}),browser=await launchChrome();
 try{
  const context=await browser.newContext();await routeAccount(context,{mf:workers.mf,provider:anyCodeProvider()});
  const page=await context.newPage(),ui=remembering(page);
  await ui.settings();await ui.signIn('a@example.invalid');const recovery=await ui.createRemembered();
  expect(await deviceRecords(page)).toBe(1);
  // Reload: no secret.
  await page.reload();await ui.reopened();
  // A new tab on Today, then Settings by the sidebar: no secret there either.
  const second=await context.newPage(),other=remembering(second);
  await second.goto(origin+'/app');await other.go('Settings');await other.reopened();
  await second.close();
  // Settings in a new tab may still lock the other tabs, as before (account-browser L72-L74), depending on whether it
  // verified the account before this tab's own reopen adopted it. A remembered tab opens again without the secret
  // as soon as it is used again.
  await page.bringToFront();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await ui.reopened();
  // 15 minutes without interaction: a remembered device stays open (M1 c).
  const idle=await context.newPage(),later=remembering(idle);await idle.clock.install();
  await later.settings();await later.reopened();
  await idle.clock.fastForward('16:00');await idle.waitForTimeout(1500);await later.reopened();
  // Forget this device: this tab stays open (M1 f), and then the idle lock applies again.
  await later.syncRegion().getByRole('button',{name:'Forget this device',exact:true}).click();
  await later.syncRegion().getByText('This device is no longer remembered. Unlocking again needs the recovery secret.').waitFor();
  expect(await deviceRecords(idle)).toBe(0);await later.lock().waitFor();
  await idle.clock.fastForward('16:00');await later.access().getByText('Account records locked.',{exact:true}).waitFor();
  await idle.close();
  // Remember again, then Lock now: it locks and forgets (M1 d); a reload asks for the secret.
  await page.reload();await ui.secret().waitFor();await ui.unlockRemembered(recovery);
  await ui.lock().click();await ui.access().getByText('Account records locked.',{exact:true}).waitFor();await expect.poll(()=>deviceRecords(page)).toBe(0);
  await page.reload();await ui.secret().waitFor();
  await context.close();
 }finally{await browser.close();await workers.mf.dispose();}
},120000);

test.runIf(BROWSER)('rotation on another device, sign-out and another account invalidate it; old material never opens the newer epoch',async()=>{
 const origin=reviewOrigin(),workers=await privateWorkers({origin}),browser=await launchChrome(),provider=anyCodeProvider();
 try{
  const a=await browser.newContext(),b=await browser.newContext();
  await routeAccount(a,{mf:workers.mf,provider});await routeAccount(b,{mf:workers.mf,provider});
  const pa=await a.newPage(),pb=await b.newPage(),ua=remembering(pa),ub=remembering(pb);
  await ua.settings();await ua.signIn('a@example.invalid');const recovery=await ua.createRemembered();
  await ub.settings();await ub.signIn('a@example.invalid');await ub.unlockRemembered(recovery);
  await pb.reload();await ub.reopened();
  // Device A rotates the vault key: a new random root at the next epoch and a new recovery secret.
  await pa.getByText('Rotate vault encryption',{exact:true}).click();await pa.getByRole('button',{name:'Prepare key rotation',exact:true}).click();
  const next=await pa.getByLabel('New rotation recovery secret',{exact:true}).inputValue();expect(next).not.toBe(recovery);
  await pa.getByLabel('I saved the new rotation recovery secret separately.').check();await pa.getByRole('button',{name:'Activate new vault key',exact:true}).click();
  await pa.getByText(/Vault key rotated and activated/).waitFor();
  // A forgot itself before rotating; B's record names the old manifest and is deleted at its next open.
  expect(await deviceRecords(pa)).toBe(0);
  await pb.reload();await ub.secret().waitFor();expect(await deviceRecords(pb)).toBe(0);
  // The old secret does not open the newer epoch; the new one does, once.
  await ub.secret().fill(recovery);await ub.syncRegion().getByRole('button',{name:'Unlock account vault',exact:true}).click();
  await ub.syncRegion().getByRole('alert').filter({hasText:'Unlock or integrity check failed'}).waitFor();
  await ub.unlockRemembered(next);await pb.reload();await ub.reopened();
  // Sign-out forgets every remembered device on that browser.
  await ub.access().getByRole('button',{name:'Sign out',exact:true}).click();await ub.access().getByText(/Signed out/).waitFor();
  await expect.poll(()=>deviceRecords(pb)).toBe(0);
  // Another account signing in on a remembered browser: A's record goes, B's account opens nothing of A's.
  await pa.reload();await ua.secret().waitFor();await ua.unlockRemembered(next);expect(await deviceRecords(pa)).toBe(1);
  await a.clearCookies();await pa.reload();await ua.access().getByRole('button',{name:'Send email code',exact:true}).waitFor();
  await ua.signIn('b@example.invalid');
  await pa.getByRole('button',{name:'Create encrypted account vault',exact:true}).waitFor();await expect.poll(()=>deviceRecords(pa)).toBe(0);
  await a.close();await b.close();
 }finally{await browser.close();await workers.mf.dispose();}
},120000);
