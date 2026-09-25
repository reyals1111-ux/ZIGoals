import {test,expect} from '@playwright/test';
const fixtureAccount='10000000-0000-4000-8000-000000000001';
for(const width of [320,390])test(`fixture email access stays locked and preserves separate local Health at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});let signedIn=false;
 await page.route('**/api/private-account*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(request.method()==='GET'){
   if(url.searchParams.get('action')==='status')return route.fulfill({json:signedIn?{signedIn:true,accountId:fixtureAccount}:{signedIn:false}});
   expect(request.headers()['x-zigoals-account']).toBe(fixtureAccount);return route.fulfill({json:{protocol:1,revision:0,manifest:null,records:[],cursor:null}});
  }
  const body=request.postDataJSON();if(body.action==='verify'){expect(body.email).toBe('fixture@example.com');signedIn=true;return route.fulfill({json:{signedIn:true,accountId:fixtureAccount}});}
  if(body.action==='signout'){signedIn=false;return route.fulfill({json:{signedOut:true,remoteRevocationConfirmed:true}});}
  expect(body.action).toBe('send');return route.fulfill({json:{message:'Fixture code requested; no email sent.'}});
 });
 await page.goto('/app/health');await page.getByRole('button',{name:'Add 250 mL',exact:true}).click();await expect(page.getByRole('region',{name:'Water journal'})).toContainText('250 mL recorded');
 const before=await page.evaluate(()=>localStorage.getItem('zigoals:health:v1'));
 await page.goto('/app/settings');let access=page.getByRole('region',{name:'Email account access'});await access.getByLabel('Email address',{exact:true}).fill('fixture@example.com');await access.getByRole('button',{name:'Send email code',exact:true}).click();await expect(access.getByRole('button',{name:/Send email code/})).toBeDisabled();await access.getByLabel('Email code',{exact:true}).fill('123456');await access.getByRole('button',{name:'Verify email code',exact:true}).click();await expect(access).toContainText('Account verified');await expect(access).toContainText('Account records locked');
 await expect(page.getByRole('button',{name:'Create encrypted account vault'})).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('zigoals:health:v1'))).toBe(before);
 await page.reload();access=page.getByRole('region',{name:'Email account access'});await expect(access).toContainText('Account records locked');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 await page.goto('/app/health');await expect(page.getByRole('region',{name:'Water journal'})).toHaveCount(0);await expect(page.locator('main')).not.toContainText('250 mL recorded');await expect(page.getByRole('link',{name:'Open backup settings'})).toBeVisible();
 await page.goto('/app/settings');access=page.getByRole('region',{name:'Email account access'});await expect(access).toContainText('Account verified');await access.getByRole('button',{name:'Sign out',exact:true}).click();await expect(access).toContainText('Signed out');
 await page.goto('/app/health');await expect(page.getByRole('region',{name:'Water journal'})).toContainText('250 mL recorded');expect(await page.evaluate(()=>localStorage.getItem('zigoals:health:v1'))).toBe(before);
});
test('unconfigured email access explains unavailable setup without attempting provider calls',async({page})=>{
 await page.route('**/api/private-account*',route=>route.fulfill({status:503,json:{error:'HOSTED_CONFIGURATION_REQUIRED'}}));await page.goto('/app/settings');const access=page.getByRole('region',{name:'Email account access'});await expect(access).toContainText('not configured');await expect(access.getByRole('button',{name:'Send email code',exact:true})).toBeDisabled();expect(await page.evaluate(()=>sessionStorage.getItem('zigoals:account:selector:v1'))).toBeNull();
});
