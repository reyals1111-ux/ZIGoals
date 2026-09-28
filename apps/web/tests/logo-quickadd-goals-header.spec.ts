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

test('the Goals header reads "Your Goals" and the cards follow one compact controls row',async({page,isMobile})=>{
 await showcase(page);await page.goto('/app/goals');
 const title=page.getByRole('heading',{level:1,name:'Your Goals',exact:true});
 await expect(title).toBeVisible();await expect(page.getByRole('heading',{name:'Your goals.',exact:true})).toHaveCount(0);
 await expect(title.locator('.nebula-text')).toHaveText('Your Goals');
 expect(await title.locator('.nebula-text').evaluate(e=>getComputedStyle(e).backgroundImage)).toContain('linear-gradient');
 await expect(page.getByText('A destination worth building',{exact:true})).toBeVisible();await expect(page.getByText('Small steps. A bigger future. Every plan starts with you.',{exact:true})).toBeVisible();
 const create=page.getByRole('link',{name:'+ Create a goal',exact:true}),t=(await title.boundingBox())!,c=(await create.boundingBox())!;
 await expect(create).toHaveAttribute('href','/app/goals/new');
 // Directly right of the title on its line.
 expect(c.x).toBeGreaterThanOrEqual(t.x+t.width);expect(c.x-(t.x+t.width)).toBeLessThanOrEqual(32);expect(Math.abs((c.y+c.height/2)-(t.y+t.height/2))).toBeLessThanOrEqual(8);
 const toolbar=page.locator('.goals-toolbar'),controls=toolbar.locator(':scope a, :scope button'),count=toolbar.getByText(/^\d+ destinations?$/);
 await expect(toolbar.getByRole('navigation',{name:'Goal workspace'})).toBeVisible();await expect(toolbar.getByRole('navigation',{name:'Goal views'})).toBeVisible();await expect(count).toBeVisible();
 const tops=new Set((await controls.evaluateAll(els=>els.map(e=>Math.round(e.getBoundingClientRect().top)))));expect(tops.size).toBeLessThanOrEqual(isMobile?2:1);
 for(const box of await controls.evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {h:r.height,w:r.width,font:parseFloat(s.fontSize)};}))){expect(box.h).toBeGreaterThanOrEqual(44);expect(box.font).toBeGreaterThanOrEqual(14);}
 expect(parseFloat(await count.evaluate(e=>getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(14);
 const subtitle=(await page.getByText('Small steps. A bigger future. Every plan starts with you.',{exact:true}).boundingBox())!,bar=(await toolbar.boundingBox())!,grid=(await page.getByRole('region',{name:'Your goals',exact:true}).boundingBox())!;
 expect(bar.y-(subtitle.y+subtitle.height)).toBeLessThanOrEqual(32);expect(grid.y-(bar.y+bar.height)).toBeLessThanOrEqual(32);
 // The filters still filter.
 await toolbar.getByRole('button',{name:'All',exact:true}).click();await expect(toolbar.getByRole('button',{name:'All',exact:true})).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
});
