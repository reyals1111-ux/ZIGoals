import {expect,test,type Page} from '@playwright/test';

async function showcase(page:Page){
 await page.route('**/api/market-**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"fixture offline"}'}));
 await page.goto('/app/settings');await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
}

test('the glowing Z sits above the wordmark, loads the right density and stays decorative',async({page},info)=>{
 await showcase(page);
 const brand=page.getByRole('link',{name:'ZIGoals home',exact:true}),logo=brand.locator('img.brand-logo');
 await expect(logo).toBeVisible();await expect(logo).toHaveAttribute('alt','');
 await expect.poll(()=>logo.evaluate(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
 const density=await page.evaluate(()=>devicePixelRatio),source=await logo.evaluate(img=>(img as HTMLImageElement).currentSrc);
 expect(source).toMatch(density>=2.5?/zigoals-z-192\.webp$/:density>=1.5?/zigoals-z-(128|192)\.webp$/:/zigoals-z-(64|128)\.webp$/);
 const mark=(await logo.boundingBox())!,word=(await brand.locator('.brand-wordmark').boundingBox())!;
 expect(mark.y+mark.height).toBeLessThanOrEqual(word.y+1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
 await brand.screenshot({path:info.outputPath('brand.png')});
});
