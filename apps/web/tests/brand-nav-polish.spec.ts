import {expect,test,type Page} from '@playwright/test';

async function showcase(page:Page){
 await page.route('**/api/market-**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"fixture offline"}'}));
 await page.goto('/app/settings');await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
}

test('the Z logo leads the sidebar, loads the right density and is named ZIGoals',async({page,isMobile},info)=>{
 await showcase(page);
 const brand=page.getByRole('link',{name:'ZIGoals home',exact:true}),logo=brand.locator('img.brand-logo');
 await expect(logo).toBeVisible();await expect(logo).toHaveAttribute('alt','ZIGoals');
 await expect.poll(()=>logo.evaluate(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
 const density=await page.evaluate(()=>devicePixelRatio),source=await logo.evaluate(img=>(img as HTMLImageElement).currentSrc);
 expect(source).toMatch(isMobile?/zigoals-logo-(160|320)\.webp$/:density>=2.5?/zigoals-logo-480\.webp$/:density>=1.5?/zigoals-logo-(320|480)\.webp$/:/zigoals-logo-(160|320)\.webp$/);
 const mark=(await logo.boundingBox())!,sidebar=(await page.locator('.app-sidebar').boundingBox())!;
 if(isMobile){
  const word=(await brand.locator('.brand-wordmark').boundingBox())!;expect(mark.y+mark.height).toBeLessThanOrEqual(word.y+1);
  await expect(page.locator('.sidebar-signature')).toBeHidden();await expect(page.locator('.app-sidebar>.product-descriptor')).toBeVisible();
  await expect(page.locator('.app-sidebar .quick-add-trigger')).toBeVisible();
 }else{
  expect(mark.width).toBeGreaterThanOrEqual(130);expect(mark.height).toBeGreaterThanOrEqual(150);expect(Math.abs(mark.x+mark.width/2-(sidebar.x+sidebar.width/2))).toBeLessThanOrEqual(2);
  await expect(brand.locator('.brand-wordmark')).toBeHidden();await expect(page.locator('.app-sidebar>.product-descriptor')).toBeHidden();
  await expect(page.locator('.app-sidebar .quick-add-trigger')).toBeHidden();
  const nav=(await page.getByRole('navigation',{name:'Main navigation'}).boundingBox())!;
  const destination=page.locator('.sidebar-destination'),word=destination.locator('.brand-wordmark'),tagline=destination.locator('small');
  await expect(word).toBeVisible();await expect(destination).not.toContainText('Your Financial Orbit');
  const settings=(await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Settings',exact:true}).boundingBox())!,w=(await word.boundingBox())!,t=(await tagline.boundingBox())!,planet=(await destination.locator('.sidebar-horizon').boundingBox())!;
  expect(nav.y).toBeGreaterThanOrEqual(mark.y+mark.height);
  expect(w.y).toBeGreaterThanOrEqual(settings.y+settings.height);expect(planet.y).toBeGreaterThanOrEqual(w.y+w.height-1);expect(t.y).toBeGreaterThanOrEqual(w.y+w.height);
  // UI design pass: the two-line signature sits between the wordmark and the planet; no text covers the horizon.
  expect(planet.y).toBeGreaterThanOrEqual(t.y+t.height-1);await expect(tagline).toHaveText('Shape & Fold, Your Own FutureShape & FoldYour Own Future');
  await expect(destination.getByText('Shape & Fold, Your Own Future',{exact:true})).toHaveCount(1);await expect(destination.locator('.sidebar-star')).toHaveAttribute('aria-hidden','true');
  expect(await tagline.evaluate(e=>getComputedStyle(e).backgroundImage)).toContain('linear-gradient');
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
 await brand.screenshot({path:info.outputPath('brand.png')});
});

test('navigation keeps one order, glides its highlight and moves aria-current and focus at once',async({page})=>{
 await showcase(page);
 const nav=page.getByRole('navigation',{name:'Main navigation'});
 expect(await nav.getByRole('link').allTextContents()).toEqual(['Today','Goals','Habits','Health','Wealth','Markets','Stake / Positions','Ecosystem','Activity','Settings']);
 const glide=page.locator('.nav-glide'),markets=nav.getByRole('link',{name:'Markets',exact:true});
 await markets.click();
 await expect(markets).toHaveAttribute('aria-current','page');
 await expect(glide).toHaveAttribute('data-state','moving');
 await expect(page.locator('.app-nav')).toHaveAttribute('data-gliding','');
 await expect(glide).toHaveAttribute('data-state','done');
 await expect(page.locator('.app-nav')).not.toHaveAttribute('data-gliding','');
 const positions=nav.getByRole('link',{name:'Stake / Positions',exact:true});
 await positions.focus();await page.keyboard.press('Enter');
 await page.waitForURL('**/app/goals/positions');
 await expect(positions).toHaveAttribute('aria-current','page');await expect(positions).toBeFocused();
 await expect(nav.getByRole('link',{name:'Goals',exact:true})).not.toHaveAttribute('aria-current','page');
});

test('reduced motion and the Off preference switch the navigation glide and page entrance off',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await showcase(page);
 const nav=page.getByRole('navigation',{name:'Main navigation'});
 await nav.getByRole('link',{name:'Wealth',exact:true}).click();
 await expect(nav.getByRole('link',{name:'Wealth',exact:true})).toHaveAttribute('aria-current','page');
 await expect(page.locator('.nav-glide')).not.toHaveAttribute('data-state',/./);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>localStorage.setItem('zigoals:motion:v1','off'));await page.reload();
 await nav.getByRole('link',{name:'Health',exact:true}).click();
 await expect(nav.getByRole('link',{name:'Health',exact:true})).toHaveAttribute('aria-current','page');
 await expect(page.locator('.nav-glide')).not.toHaveAttribute('data-state',/./);
 await expect(page.locator('.workspace main>div').first()).toHaveCSS('animation-name','none');
});

test('the hero star rises once per visit, never on re-render, and leaves only the untouched artwork',async({page})=>{
 await showcase(page);
 const star=page.locator('.today-hero .hero-star'),nav=page.getByRole('navigation',{name:'Main navigation'});
 await expect(star).toHaveCount(0,{timeout:6000});
 await page.getByRole('button',{name:'Customize Today',exact:true}).click();await page.waitForTimeout(600);
 await expect(star).toHaveCount(0);
 await nav.getByRole('link',{name:'Health',exact:true}).click();await page.waitForURL('**/app/health');
 await nav.getByRole('link',{name:'Today',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>document.querySelector('.hero-star')?.getAnimations({subtree:true}).length??0)).toBeGreaterThan(0);
 await expect(star).toHaveAttribute('aria-hidden','true');
 await expect(star).toHaveCount(0,{timeout:6000});
 await expect(page.locator('.slogan-entrance')).toHaveText("Today's Goals, Habits & Health = Tomorrow's Wealth");
});

test('reduced motion and the Off preference never show the hero star',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await showcase(page);
 await expect(page.locator('.hero-star')).toHaveCount(0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>localStorage.setItem('zigoals:motion:v1','off'));
 const nav=page.getByRole('navigation',{name:'Main navigation'});
 await nav.getByRole('link',{name:'Health',exact:true}).click();await page.waitForURL('**/app/health');
 await nav.getByRole('link',{name:'Today',exact:true}).click();await page.waitForURL(/\/app$/);
 await expect(page.locator('.hero-star')).toHaveCount(0);
});
