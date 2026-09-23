import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('**/api/market-**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"fixture offline"}'}));});
test('Health-only setup persists and customization saves, hides, reorders and removes configuration',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/app');
 await page.getByRole('button',{name:/^Health-only/}).click();
 const preset=page.getByRole('dialog',{name:'Choose your Today layout'});await expect(preset).toBeVisible();await preset.getByRole('button',{name:'Apply layout'}).click();await expect(preset).not.toBeVisible();
 await expect(page.locator('.personalized-today')).toHaveAttribute('data-interests','health');
 await expect(page.getByRole('region',{name:'Today financial intelligence'})).toHaveCount(0);
 await expect(page.locator('.dashboard-widget')).toHaveCount(4);
 await page.reload();await expect(page.locator('.personalized-today')).toHaveAttribute('data-interests','health');
 await page.getByRole('button',{name:'Customize Today',exact:true}).click();await page.getByRole('button',{name:'Add widget',exact:true}).click();
 const editor=page.getByRole('dialog',{name:'Add a widget'});await editor.getByRole('combobox',{name:'Metric',exact:true}).selectOption('macros');await editor.getByLabel('Title (optional)').fill('My nourishment');await editor.getByRole('button',{name:'Save widget'}).click();
 const card=page.getByRole('article',{name:'My nourishment',exact:true});await expect(card).toBeVisible();await card.getByRole('button',{name:'Move My nourishment up',exact:true}).click();
 await expect(page.locator('.dashboard-widget').nth(3)).toHaveAttribute('aria-label','My nourishment');await expect(card).toBeFocused();
 await card.getByRole('button',{name:'Hide',exact:true}).click();await expect(card).toHaveAttribute('data-hidden','true');await page.getByRole('button',{name:'Finish customizing'}).click();await expect(card).toHaveCount(0);
 await page.getByRole('button',{name:'Customize Today',exact:true}).click();await card.getByRole('button',{name:'Show',exact:true}).click();await card.getByRole('button',{name:'Edit',exact:true}).click();await page.getByRole('dialog',{name:'Edit widget'}).getByLabel('Title (optional)').fill('Meals at a glance');await page.getByRole('button',{name:'Save widget',exact:true}).click();
 await page.reload();await expect(page.getByRole('article',{name:'Meals at a glance'})).toBeVisible();await page.getByRole('button',{name:'Customize Today',exact:true}).click();await page.getByRole('article',{name:'Meals at a glance'}).getByRole('button',{name:'Remove',exact:true}).click();await expect(page.getByRole('article',{name:'Meals at a glance'})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('health-personalized-390.png'),fullPage:true});
});
test('all four presets preview before applying; summary stays before attention; Escape preserves settings',async({page},info)=>{
 await page.goto('/app');await page.getByRole('button',{name:'Customize Today',exact:true}).click();
 for(const preset of ['Wealth','Habits + Health','Health-only','Balanced']){
  await page.getByRole('button',{name:'Choose preset',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Choose your Today layout'});await dialog.getByRole('radio',{name:new RegExp(`^${preset.replace(/[+]/g,'\\+')}`)}).check();await expect(dialog.getByRole('heading',{name:'Layout preview'})).toBeVisible();await dialog.getByRole('button',{name:'Apply layout'}).click();await expect(dialog).not.toBeVisible();await page.screenshot({path:info.outputPath(`preset-${preset.replace(/\W/g,'')}.png`),fullPage:true});
 }
 await page.getByRole('button',{name:'Add widget',exact:true}).click();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Add widget',exact:true})).toBeFocused();
 for(const width of [320,360,390,430,768,1440]){await page.setViewportSize({width,height:900});await expect.poll(()=>page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({class:e.className,parent:e.parentElement?.className,text:e.textContent?.slice(0,80),right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).slice(0,8)}))).toMatchObject({width,scroll:width,overflow:[]});}
 const order=await page.evaluate(()=>{const summary=document.querySelector('.dashboard-summary'),attention=document.querySelector('.today-pulse-stack');return !!summary&&!!attention&&!!(summary.compareDocumentPosition(attention)&Node.DOCUMENT_POSITION_FOLLOWING);});expect(order).toBe(true);
});
