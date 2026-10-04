import {expect,test} from '@playwright/test';

/**
 * Session P (PR 1, 1.4): while sign-ups are closed, the provider refuses a code for an address that is not on the invite
 * list, and the relay answers 403 INVITE_ONLY with its own words (lib/server/private-account.ts, with the provider's
 * exact refusal as fixtures in its tests). The panel shows those words, keeps the address, offers no code field and
 * starts no cooldown, on desktop and on phones.
 */
const INVITE_ONLY='ZIGoals is invite-only right now. Ask the person who invited you, or request an invite at contact@zigoals.app.';

test('asking for a code with an uninvited address says ZIGoals is invite-only, and nothing else changes',async({page})=>{
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
 // No account was selected and no session flag written by the refusal.
 expect(await page.evaluate(()=>[...Object.keys(localStorage),...Object.keys(sessionStorage)].filter(key=>/account/.test(key)))).toEqual([]);
 // Help explains the same thing, with the address to write to.
 await page.goto('/app/help');
 const question=page.locator('.help-question').filter({hasText:'invite-only'});
 await expect(question).toHaveCount(1);await question.locator('summary').click();
 await expect(question.getByRole('link',{name:'contact@zigoals.app',exact:true})).toHaveAttribute('href','mailto:contact@zigoals.app');
});
