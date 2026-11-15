import {expect,test,type Page} from '@playwright/test';
import {isPhone,navLink,openMore} from './phone-nav';
import {chooseChain} from './chain-choice';
import {openSettings} from './settings-open';
// Session AK X1 (RELEASE_REVIEW R2–R5): this spec tests the full navigation, money tools included.
// A person chooses that module, so the spec chooses the chain first, as a person does (tests/chain-choice.ts).
test.beforeEach(async ({page}) => { await chooseChain(page); });

async function showcase(page:Page){
 await page.route('**/api/market-**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"fixture offline"}'}));
 await openSettings(page);await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
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
  // Session AL (COPY_AUDIT, deliberate): DV-256 — the decorative "Your Financial Orbit" banner at the sheet's foot is gone;
  // the wordmark still signs the sheet off, readable (tests/grok53/shell/sweep2-shell.spec.ts).
  const sheet=await openMore(page),word=sheet.locator('.brand-wordmark');
  await expect(sheet.locator('.phone-more-descriptor')).toHaveCount(0);await expect(sheet).not.toContainText(/Your Financial Orbit/i);await expect(word).toBeVisible();
  // Session I: the "Shape & Fold / Your Own Future" tagline is gone everywhere (the Today swan mark carries those words).
  await expect(sheet.locator('.phone-more-tagline')).toHaveCount(0);await expect(sheet).not.toContainText(/Shape & Fold|Your Own Future/i);
  await page.keyboard.press('Escape');
 }else{
  // Session AF Gate C (design critique; deliberate, stronger): in a window up to 1000 px tall the Z logo is the compact
  // 85 × 96, so that all sixteen destinations, Help last, fit a 900 px window (checked below); a taller window keeps the
  // full logo, still at least 130 × 150 (checked below at 1080 px).
  const tall=(page.viewportSize()?.height??720)>1000;
  expect(mark.width).toBeGreaterThanOrEqual(tall?130:84);expect(mark.height).toBeGreaterThanOrEqual(tall?150:95);expect(Math.abs(mark.x+mark.width/2-(sidebar.x+sidebar.width/2))).toBeLessThanOrEqual(2);
  await expect(brand.locator('.brand-wordmark')).toBeHidden();await expect(page.locator('.app-sidebar>.product-descriptor')).toBeHidden();
  await expect(page.locator('.app-sidebar .quick-add-trigger')).toBeHidden();
  const nav=(await page.getByRole('navigation',{name:'Main navigation'}).boundingBox())!;
  // Session I: above the planet, Today's own mark (the swan, which carries "Shape & Fold / Your Own Future" in its artwork)
  // takes the wordmark's place; the separate tagline is gone. tests/page-marks.spec.ts covers every page.
  const destination=page.locator('.sidebar-destination'),box=destination.locator('.sidebar-mark'),art=box.locator('.sidebar-mark-figure img');
  await expect(box).toHaveAttribute('data-mark','today-swan');await expect(destination).not.toContainText('Your Financial Orbit');
  await expect.poll(()=>art.evaluate(i=>(i as HTMLImageElement).complete?(i as HTMLImageElement).currentSrc:'')).toMatch(/\/brand\/marks\/today-swan(-2x)?\.webp$/);
  await expect(art).toHaveAttribute('alt','');await expect(art).toHaveAttribute('aria-hidden','true');
  const settings=(await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Settings',exact:true}).boundingBox())!,m=(await box.boundingBox())!,planet=(await destination.locator('.sidebar-horizon').boundingBox())!;
  expect(nav.y).toBeGreaterThanOrEqual(mark.y+mark.height);
  expect(m.y).toBeGreaterThanOrEqual(settings.y+settings.height);expect(planet.y).toBeGreaterThanOrEqual(m.y+m.height-1);
  await expect(destination.locator('.sidebar-star')).toHaveAttribute('aria-hidden','true');
  await expect(destination.locator('small, .sidebar-tagline')).toHaveCount(0);
  expect(await page.evaluate(()=>document.body.textContent)).not.toMatch(/Shape & Fold|Your Own Future/i);
  // Session AF Gate C (design critique): at 1440 × 900 every destination shows, Help's whole row with room to spare below
  // it (Earn, Governance and the Checklist had pushed the Checklist, Settings and Help under the edge); at 1440 × 1080 the
  // logo is the full one again.
  const main=page.getByRole('navigation',{name:'Main navigation'}),help=main.getByRole('link',{name:'Help',exact:true});
  await page.setViewportSize({width:1440,height:900});
  // (Governance hidden until shown since Session AG Polish 3, ADR-032 L19; it had been 16, then 15.) Session AK: NOVA (owner
  // follow-up 2, N2): 16. Session AK G2 (R2-10): Tasks, Notes and the Journal are 'compact', not in the desktop sidebar.
  // Session AL (owner decision O4, deliberate): NOVA moved to the sidebar's Apps group (tests/grok53/shell/o4-sidebar-apps.spec.ts): 15.
  await expect.poll(()=>main.getByRole('link').count()).toBe(15);
  await page.locator('.app-sidebar').evaluate(s=>{s.scrollTop=0;});
  await expect.poll(async()=>{const b=(await help.boundingBox())!;return b.y+b.height;}).toBeLessThanOrEqual(900-24);
  const compact=(await logo.boundingBox())!;expect(compact.width).toBeGreaterThanOrEqual(84);expect(compact.height).toBeGreaterThanOrEqual(95);
  await page.setViewportSize({width:1440,height:1080});
  await expect.poll(async()=>(await logo.boundingBox())!.height).toBeGreaterThanOrEqual(150);
  expect((await logo.boundingBox())!.width).toBeGreaterThanOrEqual(130);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
 await brand.screenshot({path:info.outputPath('brand.png')});
});

test('navigation keeps one order, glides its highlight and moves aria-current and focus at once',async({page})=>{
 await showcase(page);
 const nav=page.getByRole('navigation',{name:'Main navigation'});
 if(await isPhone(page)){
  // Phone experience (Session E; five tabs since Session AB-Design): the tabs, then the More sheet with the others, in the
  // same order (the Showcase shows Chess since Session W Part 14).
  expect(await nav.getByRole('link').allTextContents()).toEqual(['Today','Goals','Habits','Health','Wealth']);
  await openMore(page);
  expect(await nav.getByRole('link').allTextContents()).toEqual(['Today','Goals','Habits','Health','Wealth','Earn','Markets','Staking','Portfolio','Ecosystem','Chess','Activity','NOVA','Checklist','Tasks','Notes','Journal','Journey','Settings','Help']); // Session AK: NOVA (N2) and, Session AK G2 (RELEASE_REVIEW_2 R2-10, deliberate), Tasks, Notes and the Journal, navigation extras of More before the Journey. Session AB-Design Phase 2 (deliberate, ADR-024): the Journey row while Gamify is on. Session AF (ADR-028): Earn opens the money group; the Checklist is a row of More (H68). Session AG Polish 3 (deliberate, ADR-032 L19): Governance hidden until shown, in the Showcase too
  await page.keyboard.press('Escape');
  // The active tab's pill glides to the new tab (a running transform transition), then settles.
  const pill=page.locator('.phone-tab-pill'),habits=nav.getByRole('link',{name:'Habits',exact:true});
  // Session U Part 4: the glide is recorded from before the click (transitionrun), so a 320 ms glide that ends before the
  // first poll on a loaded runner is still seen; the poll below then proves it settled.
  await pill.evaluate(e=>{const runs:string[]=[];Object.assign(window,{pillRuns:runs});e.addEventListener('transitionrun',event=>runs.push((event as TransitionEvent).propertyName));});
  await habits.click();
  await expect(habits).toHaveAttribute('aria-current','page');
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {pillRuns:string[]}).pillRuns.includes('transform'))).toBe(true);
  await expect.poll(()=>pill.evaluate(e=>e.getAnimations().length)).toBe(0);
  expect(await page.locator('.phone-tabs').evaluate(e=>getComputedStyle(e).getPropertyValue('--tab-index').trim())).toBe('2');
  const positions=await navLink(page,'Staking');
  await positions.focus();await page.keyboard.press('Enter');
  await page.waitForURL('**/app/staking');
  // Focus returns to More, which now marks the current section; the link itself carries aria-current.
  const more=page.getByRole('button',{name:'More',exact:true});
  await expect(more).toBeFocused();await expect(more).toHaveAttribute('data-current','true');
  await openMore(page);await expect(positions).toHaveAttribute('aria-current','page');
  await expect(nav.getByRole('link',{name:'Goals',exact:true})).not.toHaveAttribute('aria-current','page');
  return;
 }
 // The Showcase's visible set (Chess included, Session W Part 14) applies once the page knows it is the Showcase.
 // Session AF (ADR-028): Earn opens the money group; the Checklist sits before Settings.
 // Session AG Polish 3 (deliberate, ADR-032 L19, owner Part 8): Governance is hidden until shown, in the Showcase too.
 // Session AK: NOVA (N2). Session AK G2 (R2-10): Tasks, Notes and the Journal are 'compact', not in the desktop sidebar.
 // Session AL (owner decision O4, deliberate): NOVA is in the sidebar's Apps group, not the main list.
 await expect.poll(()=>nav.getByRole('link').allTextContents()).toEqual(['Today','Goals','Habits','Health','Wealth','Earn','Markets','Staking','Portfolio','Ecosystem','Chess','Activity','Checklist','Settings','Help']);
 const glide=page.locator('.nav-glide'),markets=nav.getByRole('link',{name:'Markets',exact:true});
 // Session U Part 4: the glide's moving state and the nav's data-gliding are recorded from before the click (a
 // MutationObserver), so a glide that ends before the first check on a loaded runner is still seen.
 await page.evaluate(()=>{
  const seen:string[]=[];Object.assign(window,{glideSeen:seen});
  new MutationObserver(()=>{seen.push(`state:${document.querySelector('.nav-glide')?.getAttribute('data-state')}`,`gliding:${document.querySelector('.app-nav')?.hasAttribute('data-gliding')}`);}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['data-state','data-gliding']});
 });
 await markets.click();
 await expect(markets).toHaveAttribute('aria-current','page');
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {glideSeen:string[]}).glideSeen.includes('state:moving'))).toBe(true);
 expect(await page.evaluate(()=>(window as unknown as {glideSeen:string[]}).glideSeen.includes('gliding:true'))).toBe(true);
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
  await (await navLink(page,'Markets')).click();await page.waitForURL('**/app/markets'); // Wealth is a tab now; Markets is More's (Session AB-Design)
  await expect(page.getByRole('button',{name:'More',exact:true})).toHaveAttribute('data-current','true');
  expect(await pill.evaluate(e=>getComputedStyle(e).transitionDuration.split(',').every(d=>parseFloat(d)===0))).toBe(true);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>localStorage.setItem('zigoals:motion:v1','off'));await page.reload();
  // Health opens with a full page load (Session U Part 3, camera access): wait for it before reading the new page.
  await nav.getByRole('link',{name:'Health',exact:true}).click();await page.waitForURL('**/app/health');
  await expect(nav.getByRole('link',{name:'Health',exact:true})).toHaveAttribute('aria-current','page');
  // The new page applies Motion Off when it hydrates (MotionPreferenceSync), which can come after its load event.
  await expect(page.locator('html')).toHaveAttribute('data-app-motion','off');
  expect(await pill.evaluate(e=>getComputedStyle(e).transitionDuration.split(',').every(d=>parseFloat(d)===0))).toBe(true);
  await expect(page.locator('.workspace main>div').first()).toHaveCSS('animation-name','none');
  return;
 }
 await nav.getByRole('link',{name:'Wealth',exact:true}).click();
 await expect(nav.getByRole('link',{name:'Wealth',exact:true})).toHaveAttribute('aria-current','page');
 await expect(page.locator('.nav-glide')).not.toHaveAttribute('data-state',/./);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>localStorage.setItem('zigoals:motion:v1','off'));await page.reload();
 // Health opens with a full page load (Session U Part 3): until the new page's styles apply, the server-rendered phone
 // tab bar still counts as visible, so the assertions wait for the load.
 await nav.getByRole('link',{name:'Health',exact:true}).click();await page.waitForURL('**/app/health');
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
 // CI16 (CI 1569, desktop): the star lives about 1.8 s; on a loaded runner one poll's evaluate took 2 s, so the star the
 // poll saw had already left when the separate aria-hidden check began. The same three facts (inside the Today hero,
 // animating, aria-hidden="true") are now read together the moment the star is added, so its short life is never missed.
 await page.evaluate(()=>{const w=window as unknown as {__heroStar:string[]};w.__heroStar=[];new MutationObserver(()=>{const s=document.querySelector('.hero-star');if(s&&!w.__heroStar.length)w.__heroStar.push(`${!!s.closest('.today-hero')}:${s.getAttribute('aria-hidden')}:${s.getAnimations({subtree:true}).length>0}`);}).observe(document.body,{childList:true,subtree:true});});
 await nav.getByRole('link',{name:'Today',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {__heroStar?:string[]}).__heroStar?.[0]??'not yet')).toBe('true:true:true');
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
