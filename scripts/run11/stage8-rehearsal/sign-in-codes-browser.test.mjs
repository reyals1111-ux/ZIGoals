// Stage 8 rows A1–A4 in the browser (Session L rehearsal): what a person sees in Settings when a code is wrong,
// expired or reused, and when a second code is requested too soon, even after a reload that resets the on-screen
// countdown. Real Chrome, the production app, the real route handler, admission and private-sync Workers in Miniflare,
// and a stand-in provider (harness.mjs). Real inboxes and the provider's own rules stay with Stage 8.
import {test,expect} from 'vitest';
import {BROWSER,CODE_REFUSED,COOLDOWN_REFUSED,accountUi,admissionWorker,codeProvider,hasSession,launchChrome,privateWorkers,reviewOrigin,routeAccount} from './harness.mjs';

test.runIf(BROWSER)('the sign-in panel refuses wrong, expired and reused codes without a session, and a second code only after the cooldown',async()=>{
 const origin=reviewOrigin(),email='a1@example.invalid',start=Date.now();
 const workers=await privateWorkers({origin}),admission=await admissionWorker(),provider=codeProvider({ttl:5*60_000}),browser=await launchChrome();
 try{
  await admission.at(start);
  const context=await browser.newContext(),page=await context.newPage(),ui=accountUi(page);
  await routeAccount(context,{mf:workers.mf,provider,admit:admission.admit});
  const send=()=>page.getByRole('button',{name:/^Send email code/});
  const signedOut=async()=>{
   expect(await hasSession(context)).toBe(false);
   expect(await page.evaluate(()=>sessionStorage.getItem('zigoals:account:selector:v1'))).toBeNull();
   expect(await page.getByRole('button',{name:'Create encrypted account vault',exact:true}).count()).toBe(0);
   expect(await page.getByLabel('Vault recovery secret',{exact:true}).count()).toBe(0);
  };
  await ui.settings();await ui.requestCode(email);
  await ui.access().getByText('If this address can receive a code, check your inbox.',{exact:false}).waitFor();
  // A4: the button counts down and stays disabled.
  await expect.poll(()=>send().textContent()).toMatch(/^Send email code \((5[0-9]|60)s\)$/);
  expect(await send().isDisabled()).toBe(true);
  const first=provider.latest(email);
  // A1: a wrong code.
  await ui.enterCode('000000');
  await ui.access().getByText(CODE_REFUSED,{exact:true}).waitFor();
  await signedOut();
  // A2: the right code after it expired.
  provider.advance(5*60_000+1);
  await ui.enterCode(first);
  await expect.poll(()=>provider.refusals.length).toBe(2);
  await ui.access().getByText(CODE_REFUSED,{exact:true}).waitFor();
  await signedOut();
  // A4: a reload resets the on-screen countdown, but the admission Worker still refuses, before the provider.
  await page.reload();
  await expect.poll(()=>send().isDisabled()).toBe(false);
  await ui.requestCode(email);
  await ui.access().getByText(COOLDOWN_REFUSED,{exact:true}).waitFor();
  await expect.poll(()=>send().textContent()).toMatch(/^Send email code \((5[0-9]|60)s\)$/);
  expect(provider.sends).toEqual([email]);
  await signedOut();
  // After the cooldown, a new code arrives and signs in.
  await admission.at(start+61_000);await page.reload();
  await ui.requestCode(email);await expect.poll(()=>provider.sends.length).toBe(2);
  const second=provider.latest(email);expect(second).not.toBe(first);
  await ui.enterCode(second);await ui.verified();
  await ui.access().getByText('Account verified.',{exact:false}).waitFor();
  expect(await hasSession(context)).toBe(true);
  // A3: sign out, request a new code, then enter the code that was already used.
  await ui.access().getByRole('button',{name:'Sign out',exact:true}).click();
  await ui.access().getByText(/Signed out/).waitFor();
  expect(await hasSession(context)).toBe(false);
  await admission.at(start+122_000);await page.reload();
  await ui.requestCode(email);await expect.poll(()=>provider.sends.length).toBe(3);
  await ui.enterCode(second);
  await expect.poll(()=>provider.refusals.length).toBe(3);
  await ui.access().getByText(CODE_REFUSED,{exact:true}).waitFor();
  await signedOut();
  // The newest code still works.
  await ui.enterCode(provider.latest(email));await ui.verified();
  expect(await hasSession(context)).toBe(true);
  expect(provider.refusals).toEqual(['invalid','expired','reused']);
  await context.close();
 }finally{await browser.close();await admission.close();await workers.mf.dispose();}
},90000);
