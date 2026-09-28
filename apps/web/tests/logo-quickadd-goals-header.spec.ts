import {expect,test,type Page} from '@playwright/test';

async function showcase(page:Page){
 await page.route('**/api/market-**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"fixture offline"}'}));
 await page.goto('/app/settings');await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
}
const OPTIONS=['Goal','Asset','Contribution','Habit','Health entry'];

test('the Today hero Quick add is the primary action and opens the same Quick add options',async({page,isMobile})=>{
 await showcase(page);
 const hero=page.locator('.today-hero'),trigger=hero.getByRole('button',{name:'+ Quick add',exact:true});
 await expect(trigger).toHaveClass(/\bprimary\b/);await expect(hero.getByRole('link',{name:'+ Create a goal',exact:true})).toHaveCount(0);
 const box=(await trigger.boundingBox())!;expect(box.height).toBeGreaterThanOrEqual(44);
 const options=page.getByRole('navigation',{name:'Quick add actions'}).locator('strong');
 await trigger.click();await expect(page.getByRole('dialog',{name:'What would you like to add?'})).toBeVisible();
 expect(await options.allTextContents()).toEqual(OPTIONS);
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(trigger).toBeFocused();
 if(isMobile){
  // The mobile header keeps its own Quick add, with the same options.
  const header=page.locator('.app-sidebar .quick-add-trigger');await header.click();
  expect(await options.allTextContents()).toEqual(OPTIONS);await page.keyboard.press('Escape');await expect(header).toBeFocused();
 }
 await trigger.click();await page.getByRole('navigation',{name:'Quick add actions'}).getByRole('link').filter({hasText:'Goal'}).click();
 await page.waitForURL('**/app/goals/new');
});
