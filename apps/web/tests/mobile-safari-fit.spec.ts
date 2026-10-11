import {expect,test} from '@playwright/test';

/** iPhone Safari zooms into text fields under 16px on focus; larger screens keep the 14px base. */
test('mobile text fields are at least 16px and settings disclosures are comfortable to tap',async({page,isMobile})=>{
 await page.route('**/api/market-**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"fixture offline"}'}));
 await page.goto('/app/settings');await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
 const all:number[]=[];
 for(const route of ['/app/health','/app/wealth','/app/settings','/app/habits','/app/goals']){
  await page.goto(route);await page.waitForTimeout(1200);
  await page.evaluate(()=>document.querySelectorAll('main details:not([open])').forEach(d=>(d as HTMLDetailsElement).open=true));
  const sizes=await page.evaluate(()=>[...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]),select,textarea')].map(e=>parseFloat(getComputedStyle(e).fontSize)));
  all.push(...sizes);if(isMobile&&sizes.length)expect(Math.min(...sizes),route).toBeGreaterThanOrEqual(16);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),route).toBeLessThanOrEqual(0);
 }
 expect(all.length).toBeGreaterThan(0);if(!isMobile)expect(all).toContain(14);
 if(isMobile)for(const summary of await page.locator('.settings-page details:not([class])>summary').all())expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});
