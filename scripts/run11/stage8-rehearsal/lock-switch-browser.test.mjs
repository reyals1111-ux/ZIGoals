// Stage 8 row A7 in the browser (Session L rehearsal): "Lock account vault" hides account records until the vault is
// unlocked again, and another account sees none of the first account's records. Real Chrome, the production app, the
// real route handler and private-sync Worker in Miniflare, fixture sign-in (any code). No test pressed the lock button
// before this one. Every "not shown" check first waits for something that must be shown on that same page.
import {test,expect} from 'vitest';
import {BROWSER,accountUi,anyCodeProvider,launchChrome,privateWorkers,reviewOrigin,routeAccount} from './harness.mjs';

test.runIf(BROWSER)('locking hides account records until unlocked, and a second account sees none of the first account\'s records',async()=>{
 const origin=reviewOrigin(),workers=await privateWorkers({origin}),browser=await launchChrome();
 try{
  const context=await browser.newContext(),page=await context.newPage(),ui=accountUi(page);
  await routeAccount(context,{mf:workers.mf,provider:anyCodeProvider()});
  const article=title=>page.getByRole('article',{name:title,exact:true});
  const addHabit=async title=>{await ui.go('Habits');await page.getByRole('button',{name:'+ New habit',exact:true}).click();await page.getByLabel('Start from template').selectOption('read');await page.getByLabel('Habit title',{exact:true}).fill(title);await page.getByRole('button',{name:'Create habit',exact:true}).click();await article(title).waitFor();};
  /** Habits while the account is locked: the locked notice is the anchor. */
  const lockedHabits=async()=>{await ui.go('Habits');await expect.poll(()=>page.locator('main').innerText()).toMatch(/Account records are locked/);};
  const signOut=async()=>{await ui.go('Settings');await ui.access().getByRole('button',{name:'Sign out',exact:true}).click();await ui.access().getByText(/Signed out/).waitFor();};
  const A='Stage 8 account A habit',B='Stage 8 account B habit',LOCAL='Stage 8 local habit';
  await ui.settings();await ui.signIn('a@example.invalid');const recoveryA=await ui.createVault();
  await addHabit(A);await ui.go('Settings');await ui.syncNow();
  // Lock: the records disappear from the app.
  await ui.syncRegion().getByRole('button',{name:'Lock account vault',exact:true}).click();
  await ui.access().getByText('Account records locked.',{exact:true}).waitFor();
  await lockedHabits();expect(await article(A).count()).toBe(0);
  // Unlock with the recovery secret: they come back.
  await ui.go('Settings');await ui.access().getByRole('button',{name:'Check account status',exact:true}).click();
  await page.getByLabel('Vault recovery secret',{exact:true}).waitFor();await ui.unlock(recoveryA);
  await ui.go('Habits');await article(A).waitFor();
  // Signed out: this browser's own records, without A's.
  await signOut();await addHabit(LOCAL);expect(await article(A).count()).toBe(0);
  // Account B, before and after creating its own vault: none of A's records, and not the local one either.
  await ui.go('Settings');await ui.signIn('b@example.invalid');
  await lockedHabits();expect(await article(A).count()).toBe(0);
  await ui.go('Settings');await ui.createVault();
  await addHabit(B);expect(await article(A).count()).toBe(0);expect(await article(LOCAL).count()).toBe(0);
  // Back to A: A's record returns, B's does not appear.
  await signOut();await ui.signIn('a@example.invalid');await ui.unlock(recoveryA);
  await ui.go('Habits');await article(A).waitFor();
  expect(await article(B).count()).toBe(0);expect(await article(LOCAL).count()).toBe(0);
  await context.close();
 }finally{await browser.close();await workers.mf.dispose();}
},90000);
