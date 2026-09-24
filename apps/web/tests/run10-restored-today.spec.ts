import {expect,test} from '@playwright/test';

test('approved Today hierarchy, copy and rail coexist with saved widgets',async({page,isMobile},info)=>{
 await page.setViewportSize({width:isMobile?390:1440,height:900});
 await page.route('**/api/market-**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"fixture offline"}'}));
 await page.goto('/app/settings');
 await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();
 await page.waitForURL('**/app');
 await expect(page.getByRole('heading',{name:"Today's Goals, Habits & Health = Tomorrow's Wealth"})).toBeVisible();
 await expect(page.locator('.today-hero-copy')).toContainText('Set goals. Build habits. Protect your health.');
 await expect(page.locator('.today-hero-copy')).toContainText('Make room for a brighter tomorrow.');
 await expect(page.locator('.play-medallion')).toBeVisible();
 await expect(page.locator('.hero-pillars')).toContainText('Give your ZIG a purpose.');
 await expect(page.locator('.hero-pillars')).toContainText('Build habits. Live well.');
 await expect(page.locator('.hero-pillars')).toContainText('ZIGChain vision · Alpha simulation.');
 for(const selector of ['.life-wealth-orbit','.today-intelligence','.today-action-modules','.today-goals','.progress-summary','.today-daily .habits-today','.today-daily .health-today','.today-rail .account-panel','.today-rail .staking-card','.today-rail .destination-panel','.today-rail .recent-panel','.dashboard-widget-area','#how-it-works'])await expect(page.locator(selector)).toHaveCount(1);
 const order=await page.evaluate(()=>{const life=document.querySelector('.life-wealth-orbit')!,attention=document.querySelector('.today-intelligence')!,goals=document.querySelector('.today-goals')!,rail=document.querySelector('.today-rail')!,main=document.querySelector('.today-primary')!;return {lifeBeforeAttention:!!(life.compareDocumentPosition(attention)&Node.DOCUMENT_POSITION_FOLLOWING),attentionBeforeGoals:!!(attention.compareDocumentPosition(goals)&Node.DOCUMENT_POSITION_FOLLOWING),railBesideMain:main.parentElement===rail.parentElement,scroll:document.documentElement.scrollWidth,viewport:innerWidth};});
 expect(order).toMatchObject({lifeBeforeAttention:true,attentionBeforeGoals:true,railBesideMain:true});
 expect(order.scroll).toBeLessThanOrEqual(order.viewport);
 await page.screenshot({path:info.outputPath(`restored-today-${isMobile?'mobile':'desktop'}.png`),fullPage:true,animations:'disabled'});
});
