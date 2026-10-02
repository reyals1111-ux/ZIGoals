import {expect,test,type Page} from '@playwright/test';
import {isPhone,navLink,openMore} from './phone-nav';

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
  // Phone experience (Session E): the Z logo leads the phone top bar and Quick add sits beside it; the sidebar gives way,
  // and its wordmark, "Your Financial Orbit" and signature sit in the More sheet, the descriptor above the wordmark.
  await expect(page.locator('.app-sidebar')).toBeHidden();
  const bar=(await page.locator('.phone-topbar').boundingBox())!;expect(mark.x).toBeLessThanOrEqual(24);expect(mark.y+mark.height).toBeLessThanOrEqual(bar.y+bar.height);
  await expect(page.locator('.sidebar-signature')).toBeHidden();await expect(page.locator('.phone-topbar .quick-add-trigger')).toBeVisible();
  const sheet=await openMore(page),descriptor=sheet.locator('.phone-more-descriptor'),word=sheet.locator('.brand-wordmark');
  await expect(descriptor).toHaveText('Your Financial Orbit');await expect(word).toBeVisible();
  expect((await descriptor.boundingBox())!.y+(await descriptor.boundingBox())!.height).toBeLessThanOrEqual((await word.boundingBox())!.y+1);
  // Session I: the "Shape & Fold / Your Own Future" tagline is gone everywhere (the Today swan mark carries those words).
  await expect(sheet.locator('.phone-more-tagline')).toHaveCount(0);await expect(sheet).not.toContainText(/Shape & Fold|Your Own Future/i);
  await page.keyboard.press('Escape');
 }else{
  expect(mark.width).toBeGreaterThanOrEqual(130);expect(mark.height).toBeGreaterThanOrEqual(150);expect(Math.abs(mark.x+mark.width/2-(sidebar.x+sidebar.width/2))).toBeLessThanOrEqual(2);
  await expect(brand.locator('.brand-wordmark')).toBeHidden();await expect(page.locator('.app-sidebar>.product-descriptor')).toBeHidden();
  await expect(page.locator('.app-sidebar .quick-add-trigger')).toBeHidden();
  const nav=(await page.getByRole('navigation',{name:'Main navigation'}).boundingBox())!;
  // Session I: above the planet, Today's own mark (the swan, which carries "Shape & Fold / Your Own Future" in its artwork)
  // takes the wordmark's place; the separate tagline is gone. tests/page-marks.spec.ts covers every page.
  const destination=page.locator('.sidebar-destination'),box=destination.locator('.sidebar-mark'),art=box.locator('.sidebar-mark-figure img');
  await expect(box).toHaveAttribute('data-mark','today-swan');await expect(destination).not.toContainText('Your Financial Orbit');
  await expect.poll(()=>art.evaluate(i=>(i as HTMLImageElement).complete?(i as HTMLImageElement).currentSrc:'')).toMatch(/\/brand\/marks\/today-swan(@2x)?\.webp$/);
  await expect(art).toHaveAttribute('alt','');await expect(art).toHaveAttribute('aria-hidden','true');
  const settings=(await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Settings',exact:true}).boundingBox())!,m=(await box.boundingBox())!,planet=(await destination.locator('.sidebar-horizon').boundingBox())!;
  expect(nav.y).toBeGreaterThanOrEqual(mark.y+mark.height);
  expect(m.y).toBeGreaterThanOrEqual(settings.y+settings.height);expect(planet.y).toBeGreaterThanOrEqual(m.y+m.height-1);
  await expect(destination.locator('.sidebar-star')).toHaveAttribute('aria-hidden','true');
  await expect(destination.locator('small, .sidebar-tagline')).toHaveCount(0);
  expect(await page.evaluate(()=>document.body.textContent)).not.toMatch(/Shape & Fold|Your Own Future/i);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
 await brand.screenshot({path:info.outputPath('brand.png')});
});

test('navigation keeps one order, glides its highlight and moves aria-current and focus at once',async({page})=>{
 await showcase(page);
 const nav=page.getByRole('navigation',{name:'Main navigation'});
 if(await isPhone(page)){
  // Phone experience (Session E): four tabs, then the More sheet with the other six, in the same order.
  expect(await nav.getByRole('link').allTextContents()).toEqual(['Today','Goals','Habits','Health']);
  await openMore(page);
  expect(await nav.getByRole('link').allTextContents()).toEqual(['Today','Goals','Habits','Health','Wealth','Markets','Staking','Portfolio','Ecosystem','Activity','Settings']);
  await page.keyboard.press('Escape');
  // The active tab's pill glides to the new tab (a running transform transition), then settles.
  const pill=page.locator('.phone-tab-pill'),habits=nav.getByRole('link',{name:'Habits',exact:true});
  await habits.click();
  await expect(habits).toHaveAttribute('aria-current','page');
  await expect.poll(()=>pill.evaluate(e=>e.getAnimations().length)).toBeGreaterThan(0);
  await expect.poll(()=>pill.evaluate(e=>e.getAnimations().length)).toBe(0);
  expect(await page.locator('.phone-tabs').evaluate(e=>getComputedStyle(e).getPropertyValue('--tab-index').trim())).toBe('2');
  const positions=await navLink(page,'Staking');
  await positions.focus();await page.keyboard.press('Enter');
  await page.waitForURL('**/app/staking');
  // Focus returns to More, which now marks the current section; the link itself carries aria-current.
  const more=nav.getByRole('button',{name:'More',exact:true});
  await expect(more).toBeFocused();await expect(more).toHaveAttribute('data-current','true');
  await openMore(page);await expect(positions).toHaveAttribute('aria-current','page');
  await expect(nav.getByRole('link',{name:'Goals',exact:true})).not.toHaveAttribute('aria-current','page');
  return;
 }
 expect(await nav.getByRole('link').allTextContents()).toEqual(['Today','Goals','Habits','Health','Wealth','Markets','Staking','Portfolio','Ecosystem','Activity','Settings']);
 const glide=page.locator('.nav-glide'),markets=nav.getByRole('link',{name:'Markets',exact:true});
 await markets.click();
 await expect(markets).toHaveAttribute('aria-current','page');
 await expect(glide).toHaveAttribute('data-state','moving');
 await expect(page.locator('.app-nav')).toHaveAttribute('data-gliding','');
 await expect(glide).toHaveAttribute('data-state','done');
 await expect(page.locator('.app-nav')).not.toHaveAttribute('data-gliding','');
 const positions=nav.getByRole('link',{name:'Staking',exact:true});
 await positions.focus();await page.keyboard.press('Enter');
 await page.waitForURL('**/app/staking');
 await expect(positions).toHaveAttribute('aria-current','page');await expect(positions).toBeFocused();
 await expect(nav.getByRole('link',{name:'Goals',exact:true})).not.toHaveAttribute('aria-current','page');
});

test('reduced motion and the Off preference switch the navigation glide and page entrance off',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await showcase(page);
 const nav=page.getByRole('navigation',{name:'Main navigation'});
 if(await isPhone(page)){
  // Phone experience (Session E): the tab pill never glides under reduced motion or Motion Off.
  const pill=page.locator('.phone-tab-pill');
  await (await navLink(page,'Wealth')).click();await page.waitForURL('**/app/wealth');
  await expect(nav.getByRole('button',{name:'More',exact:true})).toHaveAttribute('data-current','true');
  expect(await pill.evaluate(e=>getComputedStyle(e).transitionDuration.split(',').every(d=>parseFloat(d)===0))).toBe(true);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>localStorage.setItem('zigoals:motion:v1','off'));await page.reload();
  await nav.getByRole('link',{name:'Health',exact:true}).click();
  await expect(nav.getByRole('link',{name:'Health',exact:true})).toHaveAttribute('aria-current','page');
  expect(await pill.evaluate(e=>getComputedStyle(e).transitionDuration.split(',').every(d=>parseFloat(d)===0))).toBe(true);
  await expect(page.locator('.workspace main>div').first()).toHaveCSS('animation-name','none');
  return;
 }
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
