// Stage 8 row B3 in the browser (Session L rehearsal): Health stays on the device until its own explicit consent.
// Before consent the Worker holds no Health record for the account (only other sections); after consent on one device
// Health is uploaded; another device receives it only after its own consent. Real Chrome (a desktop and a 390×844
// mobile context), the production app, the real route handler and private-sync Worker in Miniflare, fixture sign-in.
import {test,expect} from 'vitest';
import {ACCOUNTS,BROWSER,accountUi,anyCodeProvider,launchChrome,privateWorkers,reviewOrigin,routeAccount,sessionToken,workerRecords} from './harness.mjs';

test.runIf(BROWSER)('Health is uploaded only after consent, and another device receives it only after its own consent',async()=>{
 const origin=reviewOrigin(),workers=await privateWorkers({origin}),browser=await launchChrome(),provider=anyCodeProvider();
 try{
  const a=await browser.newContext(),b=await browser.newContext({viewport:{width:390,height:844},isMobile:true});
  await routeAccount(a,{mf:workers.mf,provider});await routeAccount(b,{mf:workers.mf,provider});
  const pa=await a.newPage(),pb=await b.newPage(),ua=accountUi(pa),ub=accountUi(pb);
  const HABIT='Stage 8 consent habit';
  const domains=async()=>{
   const {status,body}=await workerRecords(workers.mf,{origin,token:await sessionToken(a,origin),account:ACCOUNTS.a});
   expect(status).toBe(200);expect(body.cursor).toBeNull();
   return new Set(body.records.filter(r=>!r.deleted).map(r=>r.domain));
  };
  const water=page=>page.getByRole('region',{name:'Water journal'});
  // With an open vault the consent turns on only after its own asynchronous check, so wait for the ticked state.
  const consent=async ui=>{await ui.healthConsent().click();await expect.poll(()=>ui.healthConsent().isChecked()).toBe(true);};
  // Device A: a vault without Health consent, one Health entry and one Habit.
  await ua.settings();await ua.signIn('a@example.invalid');const recovery=await ua.createVault({health:false});
  expect(await ua.healthConsent().isChecked()).toBe(false);
  await ua.go('Health');await pa.getByRole('button',{name:'Add 250 mL',exact:true}).click();await water(pa).getByText('250 mL recorded',{exact:false}).waitFor();
  await ua.go('Habits');await pa.getByRole('button',{name:'+ New habit',exact:true}).click();await pa.getByLabel('Start from template').selectOption('read');await pa.getByLabel('Habit title',{exact:true}).fill(HABIT);await pa.getByRole('button',{name:'Create habit',exact:true}).click();await pa.getByRole('article',{name:HABIT,exact:true}).waitFor();
  await ua.go('Settings');await ua.syncNow();
  let held=await domains();
  expect(held.has('habits')).toBe(true);expect(held.has('health')).toBe(false);
  // Device B without consent: the Habit arrives, Health does not.
  await ub.settings();await ub.signIn('a@example.invalid');await ub.unlock(recovery,{health:false});
  await ub.go('Habits');await pb.getByRole('article',{name:HABIT,exact:true}).waitFor();
  await ub.go('Health');await water(pb).waitFor();expect(await water(pb).innerText()).not.toContain('250 mL recorded');
  // Consent on device A: Health is uploaded.
  await consent(ua);await ua.syncNow();
  held=await domains();expect(held.has('health')).toBe(true);
  // Device B still without consent: still no Health.
  await ub.go('Settings');await ub.syncNow();
  await ub.go('Health');await water(pb).waitFor();expect(await water(pb).innerText()).not.toContain('250 mL recorded');
  // Consent on device B: Health arrives.
  await ub.go('Settings');await consent(ub);await ub.syncNow();
  await ub.go('Health');await water(pb).getByText('250 mL recorded',{exact:false}).waitFor();
  await a.close();await b.close();
 }finally{await browser.close();await workers.mf.dispose();}
},90000);
