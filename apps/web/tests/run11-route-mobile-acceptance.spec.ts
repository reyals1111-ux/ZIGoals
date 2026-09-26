import {test,expect} from '@playwright/test';
// Inventory is observed UI, not a claim that every control was exercised.
// Existing journey tests provide action/save/reload/error acceptance.
test('observe public and private route controls with fictional Showcase detail links',async({page},info)=>{
 await page.route('**/api/market-**',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"fixture offline"}'}));
 await page.goto('/app/settings');await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
 const routes=new Set(['/','/app','/app/goals','/app/goals/new','/app/goals/tracked','/app/goals/positions','/app/wealth','/app/habits','/app/health','/app/markets','/app/ecosystem','/app/activity','/app/settings']);const inventory=[];
 for(const route of routes){
  const response=await page.goto(route);expect(response?.status()??(await page.request.get(route)).status(),route).toBe(200);await expect(page.locator('main')).toBeVisible();await expect(page.locator('main h1').first()).toBeVisible();
  const controls=await page.locator('main').evaluate(root=>[...root.querySelectorAll('a,button,input,select,summary')].filter(el=>el.getClientRects().length).map(el=>({tag:el.tagName.toLowerCase(),name:el.getAttribute('aria-label')||el.textContent?.trim().replace(/\s+/g,' ').slice(0,120)||el.getAttribute('name')||'',href:el.getAttribute('href'),disabled:el.hasAttribute('disabled')})));
  inventory.push({route,heading:await page.locator('main h1').first().innerText(),controls});
  for(const c of controls)if(c.href&&/^\/app\/(goals\/(tracked\/)?|wealth\/asset\/)[^/?]+$/.test(c.href)&&!c.href.endsWith('/new')&&routes.size<30)routes.add(c.href);
 }
 expect(inventory.length).toBeGreaterThanOrEqual(13);await info.attach('observed-route-control-inventory',{body:JSON.stringify({viewport:page.viewportSize(),fixture:'Showcase fictional',scope:'visible observed controls; action acceptance is in referenced journey suites',inventory},null,2),contentType:'application/json'});
});
test('landscape and shortened keyboard-height food form retains draft and reachable save',async({page},info)=>{
 await page.setViewportSize({width:844,height:390});await page.goto('/app/health');await page.getByRole('button',{name:'Foods & recipes',exact:true}).click();await page.getByRole('button',{name:'New food',exact:true}).click();const food=page.getByRole('form',{name:'Food details'});
 const name='Fictional landscape meal with a deliberately long descriptive name';await food.getByLabel('Food name',{exact:true}).fill(name);await food.getByLabel('Serving weight (g)',{exact:true}).fill('40');await food.getByLabel('Calories (kcal)',{exact:true}).fill('150');
 await page.setViewportSize({width:390,height:360});await food.getByLabel('Food name',{exact:true}).focus();await expect(food.getByLabel('Food name',{exact:true})).toHaveValue(name);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const save=food.getByRole('button',{name:'Save food',exact:true});await save.scrollIntoViewIfNeeded();await expect(save).toBeInViewport();await save.focus();await page.keyboard.press('Enter');await expect(page.getByRole('status').filter({hasText:'Food saved'})).toBeVisible();
 await page.setViewportSize({width:844,height:390});await page.reload();await page.getByRole('button',{name:'Foods & recipes',exact:true}).click();await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('landscape-food-844.png')});
});
