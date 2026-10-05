import {expect,test} from '@playwright/test';

/**
 * Session U Part 5 (FIX_PLAN A2): the relay gives every code request that passes admission one answer, byte for byte
 * (lib/server/private-account.ts, with the provider's exact refusals as fixtures in its tests), so the panel reads the
 * same for an invited and an uninvited address, and Help says what to do when no code arrives. Session P's invite-only
 * answer (403 INVITE_ONLY) came from relays before Session U; the panel still shows its words if one answers that way.
 */
const ANSWER='If this address has an invite, a code is on its way. Check your inbox and spam folder, and wait at least 60 seconds before requesting another.';
const SHOWN='If this address has an invite, a code is on its way. Check your inbox and spam folder. You can request another in 60 seconds.';
const INVITE_ONLY='ZIGoals is invite-only right now. Ask the person who invited you, or request an invite at contact@zigoals.app.';

test('asking for a code reads the same for every address, and Help says what to do when none arrives',async({page})=>{
 const sends:string[]=[];
 await page.route('**/api/private-account*',route=>{
  const request=route.request();if(request.method()==='GET')return route.fulfill({json:{signedIn:false}});
  const body=request.postDataJSON();expect(body.action).toBe('send');sends.push(body.email);
  return route.fulfill({json:{message:ANSWER}});
 });
 const shown:string[]=[];
 for(const address of ['invited@example.com','stranger@example.com']){
  await page.goto('/app/settings');
  const access=page.getByRole('region',{name:'Email account access'});
  await access.getByLabel('Email address',{exact:true}).fill(address);
  await access.getByRole('button',{name:'Send email code',exact:true}).click();
  await expect(access.getByRole('status').filter({hasText:'a code is on its way'})).toHaveText(SHOWN);
  await expect(access.getByRole('button',{name:/^Send email code \(\d+s\)$/})).toBeDisabled();
  shown.push(await access.getByRole('status').filter({hasText:'a code is on its way'}).innerText());
 }
 expect(sends).toEqual(['invited@example.com','stranger@example.com']);expect(shown[0]).toBe(shown[1]);
 // No account was selected and no session flag written by asking.
 expect(await page.evaluate(()=>[...Object.keys(localStorage),...Object.keys(sessionStorage)].filter(key=>/account/.test(key)))).toEqual([]);
 await page.goto('/app/help');
 const question=page.locator('.help-question').filter({hasText:'none arrived'});
 await expect(question).toHaveCount(1);await question.locator('summary').click();
 await expect(question).toContainText('check your spam folder');await expect(question).toContainText('never tells anyone which addresses are invited');
 await expect(question.getByRole('link',{name:'contact@zigoals.app',exact:true})).toHaveAttribute('href','mailto:contact@zigoals.app');
});

test('an older relay’s invite-only answer is still shown in its words, and nothing else changes',async({page})=>{
 const sends:string[]=[];
 await page.route('**/api/private-account*',route=>{
  const request=route.request();if(request.method()==='GET')return route.fulfill({json:{signedIn:false}});
  const body=request.postDataJSON();expect(body.action).toBe('send');sends.push(body.email);
  return route.fulfill({status:403,json:{error:'INVITE_ONLY',message:INVITE_ONLY}});
 });
 await page.goto('/app/settings');
 const access=page.getByRole('region',{name:'Email account access'});
 await access.getByLabel('Email address',{exact:true}).fill('friend@example.com');
 await access.getByRole('button',{name:'Send email code',exact:true}).click();
 await expect(access.getByRole('status').filter({hasText:'invite-only'})).toHaveText(INVITE_ONLY);
 expect(sends).toEqual(['friend@example.com']);
 await expect(access.getByLabel('Email code',{exact:true})).toHaveCount(0);
 await expect(access.getByRole('button',{name:'Send email code',exact:true})).toBeEnabled();
 await expect(access.getByLabel('Email address',{exact:true})).toHaveValue('friend@example.com');
 expect(await page.evaluate(()=>[...Object.keys(localStorage),...Object.keys(sessionStorage)].filter(key=>/account/.test(key)))).toEqual([]);
});
