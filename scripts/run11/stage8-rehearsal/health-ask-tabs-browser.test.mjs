// Session Z-Cloud Part 5 (Y38, ADR-019 C36) in the browser: a Health restore's "ask first" reaches the account's other
// tab. Two tabs of one Chrome profile, the production app, the real route handler and private-sync Worker in Miniflare,
// fixture sign-in. An email sign-in in one tab locks the others (Session U B2), so two tabs of one account are open
// together only on a remembered device, whose tabs adopt the account without locking each other (ADR-008). Tab 1 has
// Health sync off; tab 2 turns it on. Tab 1 deletes the Health cloud copy and restores it from this device: it asks
// before Health syncs, and tab 2, whose consent was on, stops syncing Health and asks too.
import {test,expect} from 'vitest';
import {armSyncCompletion} from '../sync-completion.mjs';
import {BROWSER,accountUi,anyCodeProvider,launchChrome,privateWorkers,reviewOrigin,routeAccount} from './harness.mjs';

const CHECK='Your recovery secret, to confirm it’s you',REMEMBER='Remember on this device — don’t use on shared computers';
test.runIf(BROWSER)('a Health restore in one tab turns Health sync off and asks in the other tab of the account',async()=>{
 const origin=reviewOrigin(),workers=await privateWorkers({origin}),browser=await launchChrome(),provider=anyCodeProvider();
 try{
  const context=await browser.newContext({acceptDownloads:true});await routeAccount(context,{mf:workers.mf,provider});
  const one=await context.newPage(),two=await context.newPage(),u1=accountUi(one),u2=accountUi(two);
  const lock=ui=>ui.syncRegion().getByRole('button',{name:'Lock account vault',exact:true});
  // Tab 1: sign in and create a remembered vault, Health sync off.
  await u1.settings();await u1.signIn('a@example.invalid');
  await one.getByRole('button',{name:'Create encrypted account vault',exact:true}).click();
  const recovery=await one.getByLabel('New vault recovery secret',{exact:true}).inputValue();
  await one.getByLabel('I saved this vault recovery secret separately.').check();await u1.syncRegion().getByRole('checkbox',{name:REMEMBER,exact:true}).check();
  const created=await armSyncCompletion(one);await one.getByRole('button',{name:'Confirm and create vault',exact:true}).click();await created();
  expect(await u1.healthConsent().isChecked()).toBe(false);
  await u1.go('Health');await one.getByRole('button',{name:'Add 250 mL',exact:true}).click();await one.getByRole('region',{name:'Water journal'}).getByText('250 mL recorded',{exact:false}).waitFor();
  await u1.go('Settings');await u1.syncNow();
  // Tab 2: the same account opens without the secret; then Health sync is turned on there.
  await two.goto(origin+'/app');await u2.go('Settings');await lock(u2).waitFor();
  // The switch is controlled: it turns on once this account's sync journal was read (a held Health section would refuse).
  await u2.healthConsent().click();await expect.poll(()=>u2.healthConsent().isChecked()).toBe(true);
  // Tab 1, used again: if tab 2's Settings verified the account first, tab 1 was locked and opens again by itself.
  await one.bringToFront();await one.evaluate(()=>window.dispatchEvent(new Event('focus')));await lock(u1).waitFor();
  expect(await u1.healthConsent().isChecked()).toBe(false);
  // Tab 1 deletes the Health cloud copy (the section review, its copy and the secret), then restores it from this tab.
  const section=async(kind,phrase,button)=>{
   await one.getByRole('button',{name:kind,exact:true}).click();
   await one.getByLabel('I saved this section recovery secret separately.').check();
   const download=one.waitForEvent('download');await one.getByRole('button',{name:'Download section recovery copy',exact:true}).click();await download;
   await one.getByLabel('Section confirmation',{exact:true}).fill(phrase);
   if(phrase==='DELETE SECTION')await u1.syncRegion().getByLabel(CHECK,{exact:true}).fill(recovery);
   await one.getByRole('button',{name:button,exact:true}).click();
  };
  await one.getByText('Cloud copies by section',{exact:true}).click();
  await section('Review section deletion','DELETE SECTION','Confirm section deletion');await one.getByText(/Cloud section deleted\. Local records were kept/).waitFor();
  await section('Review restoring local section','RESTORE SECTION','Confirm section restore');
  await one.getByText(/Health sync is off in this tab until you turn it on/).waitFor();
  expect(await u1.healthConsent().isChecked()).toBe(false);
  // Tab 2 heard the ask: Health sync is off there too, with the reason, until it is ticked there.
  await expect.poll(()=>u2.healthConsent().isChecked()).toBe(false);
  await two.getByText('Health was restored in another tab of this account',{exact:false}).waitFor();
  await context.close();
 }finally{await browser.close();await workers.mf.dispose();}
},90000);
