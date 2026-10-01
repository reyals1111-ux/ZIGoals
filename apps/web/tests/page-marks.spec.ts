import {expect,test,type Page} from '@playwright/test';
import {isPhone,openMore} from './phone-nav';

/** Session I, Part 2: the sidebar page marks, the navigation groups and the Staking rename. */
async function showcase(page:Page){
 await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'Offline fictional marks fixture'}}));
 await page.goto('/app/settings');await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
}
const MARKS:[string,string|null][]=[
 ['/app','today-swan'],['/app/goals','goals-lotus'],['/app/goals/tracked/9201','goals-lotus'],['/app/habits','habits-butterfly'],['/app/health','health-heart'],
 ['/app/wealth','wealth-bull'],['/app/wealth/asset/showcase-btc','wealth-bull'],
 ['/app/markets',null],['/app/staking',null],['/app/ecosystem',null],['/app/activity',null],['/app/settings',null],
];
const box=async(page:Page,selector:string)=>(await page.locator(selector).first().boundingBox())!;

test('each life page shows its own mark above the planet; every other page keeps the ZIGoals wordmark',async({page})=>{
 test.setTimeout(90000);
 const marks:string[]=[];page.on('request',r=>{if(r.url().includes('/brand/marks/'))marks.push(r.url());});
 await page.emulateMedia({reducedMotion:'reduce'});
 await showcase(page);
 for(const [path,name] of MARKS){
  await page.goto(path);await expect(page.locator('main h1').first()).toBeVisible();
  const mark=page.locator('.sidebar-destination .sidebar-mark');
  await expect(mark,path).toHaveAttribute('data-mark',name??'wordmark');
  if(await isPhone(page))continue;
  if(!name){
   await expect(mark.locator('img'),path).toHaveCount(0);await expect(mark.locator('.brand-wordmark'),path).toHaveText('ZIGoals');
   continue;
  }
  const art=mark.locator('img'),source=mark.locator('source');
  // 1x and @2x files, an explicit size in the file's own ratio, and decorative (the page title names the page).
  await expect(source,path).toHaveAttribute('srcset',`/brand/marks/${name}.webp 1x, /brand/marks/${name}@2x.webp 2x`);
  await expect(art,path).toHaveAttribute('alt','');await expect(art,path).toHaveAttribute('aria-hidden','true');
  await expect(art,path).toHaveAttribute('width','160');expect(Number(await art.getAttribute('height')),path).toBeGreaterThan(140);
  await expect.poll(()=>art.evaluate(i=>(i as HTMLImageElement).complete?(i as HTMLImageElement).currentSrc:''),{message:path}).toMatch(new RegExp(`/brand/marks/${name}(@2x)?\\.webp$`));
  expect(await art.evaluate(i=>(i as HTMLImageElement).naturalWidth),path).toBeGreaterThanOrEqual(720);
 }
 // A phone never shows the sidebar planet, so it never downloads a mark.
 if(await isPhone(page))expect(marks).toEqual([]);else expect(marks.length).toBeGreaterThan(0);
});

test('the Shape & Fold tagline is gone from the sidebar, the More sheet and every other place in the app',async({page})=>{
 await showcase(page);
 for(const path of ['/app','/app/goals','/app/settings']){
  await page.goto(path);await expect(page.locator('main h1').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.textContent),path).not.toMatch(/Shape\s*&\s*Fold|Your Own Future/i);
  await expect(page.locator('.sidebar-tagline, .phone-more-tagline')).toHaveCount(0);
 }
 if(await isPhone(page)){const sheet=await openMore(page);await expect(sheet).not.toContainText(/Shape & Fold|Your Own Future/i);}
});

test('changing pages crossfades the marks once with motion on, and swaps them at once under reduced motion and Motion Off',async({page,isMobile})=>{
 test.skip(isMobile,'The sidebar planet and its marks are the desktop sidebar.');
 await showcase(page);
 // Record every mark layer that fades in (a new layer) or out (the previous layer, kept for the fade), even briefly.
 await page.evaluate(()=>{const seen={phases:[] as string[]};Object.assign(window,{markSeen:seen});const note=(n:Node)=>{if(n instanceof HTMLElement&&n.matches('.sidebar-mark-layer[data-phase]'))seen.phases.push(`${n.dataset.mark}:${n.dataset.phase}`);};new MutationObserver(records=>{for(const r of records){if(r.type==='attributes')note(r.target);else r.addedNodes.forEach(note);}}).observe(document.querySelector('.sidebar-destination')!,{subtree:true,childList:true,attributes:true,attributeFilter:['data-phase']});});
 const nav=page.getByRole('navigation',{name:'Main navigation'});
 await nav.getByRole('link',{name:'Goals',exact:true}).click();await page.waitForURL('**/app/goals');
 await expect(page.locator('.sidebar-mark')).toHaveAttribute('data-mark','goals-lotus');
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {markSeen:{phases:string[]}}).markSeen.phases.slice().sort())).toEqual(['goals-lotus:in','today-swan:out']);
 // One layer again afterwards, and the planet never moved.
 const planet=await box(page,'.sidebar-horizon');
 await expect(page.locator('.sidebar-mark-layer')).toHaveCount(1);
 for(const [name,path] of [['Habits','/app/habits'],['Markets','/app/markets']] as const){await nav.getByRole('link',{name,exact:true}).click();await page.waitForURL(`**${path}`);await expect(page.locator('.sidebar-mark-layer')).toHaveCount(1);expect(await box(page,'.sidebar-horizon')).toEqual(planet);}
 for(const setting of ['reduced motion','Motion Off'] as const){
  if(setting==='reduced motion')await page.emulateMedia({reducedMotion:'reduce'});else{await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>localStorage.setItem('zigoals:motion:v1','off'));}
  await page.goto('/app');
  await page.evaluate(()=>{const seen={phases:[] as string[]};Object.assign(window,{markSeen:seen});new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n instanceof HTMLElement&&n.matches('.sidebar-mark-layer'))seen.phases.push(`${n.dataset.mark}:${n.dataset.phase??'static'}`);}).observe(document.querySelector('.sidebar-destination')!,{subtree:true,childList:true});});
  await nav.getByRole('link',{name:'Health',exact:true}).click();await page.waitForURL('**/app/health');
  await expect(page.locator('.sidebar-mark')).toHaveAttribute('data-mark','health-heart');await page.waitForTimeout(400);
  expect(await page.evaluate(()=>(window as unknown as {markSeen:{phases:string[]}}).markSeen.phases),setting).toEqual(['health-heart:static']);
 }
});

test('the mark never overlaps the navigation or the planet, at laptop, tablet and short window heights',async({page,isMobile})=>{
 test.skip(isMobile,'The sidebar planet and its marks are the desktop sidebar.');
 await showcase(page);
 for(const [width,height] of [[1440,900],[1280,720],[1024,768],[1180,820],[1280,640]] as const){
  await page.setViewportSize({width,height});
  for(const path of ['/app','/app/wealth','/app/markets']){
   await page.goto(path);await expect(page.locator('main h1').first()).toBeVisible();
   const settings=await box(page,'.app-nav a[href="/app/settings"]'),mark=await box(page,'.sidebar-mark'),planet=await box(page,'.sidebar-horizon');
   const where=`${width}x${height} ${path}`;
   expect(mark.y,where).toBeGreaterThanOrEqual(settings.y+settings.height);
   expect(planet.y,where).toBeGreaterThanOrEqual(mark.y+mark.height-.5);
   // The sidebar scrolls as before, never sideways.
   expect(await page.locator('.app-sidebar').evaluate(e=>e.scrollWidth-e.clientWidth),where).toBe(0);
  }
 }
});

test('navigation groups: life areas, money tools, the rest; spaced not divided, and tab order follows what is seen',async({page})=>{
 await showcase(page);
 const nav=page.getByRole('navigation',{name:'Main navigation'});
 if(await isPhone(page)){
  // The tab bar is unchanged; More keeps the same groups: Wealth / Markets, Staking / Ecosystem, Activity, Settings.
  expect(await nav.getByRole('link').allTextContents()).toEqual(['Today','Goals','Habits','Health']);
  const sheet=await openMore(page),rows=sheet.locator('.phone-more-list > li');
  expect(await sheet.getByRole('link').allTextContents()).toEqual(['Wealth','Markets','Staking','Ecosystem','Activity','Settings']);
  const gaps=await rows.evaluateAll(items=>items.map((item,i)=>i?item.getBoundingClientRect().top-items[i-1]!.getBoundingClientRect().bottom:0));
  const gap=(i:number)=>gaps[i]!;
  expect(gap(1)).toBeGreaterThan(gap(2)+8);expect(gap(3)).toBeGreaterThan(gap(4)+8);expect(Math.abs(gap(2)-gap(4))).toBeLessThan(1);
  await expect(sheet.locator('hr, [role=separator]')).toHaveCount(0);
  return;
 }
 const links=nav.getByRole('link');
 expect(await links.allTextContents()).toEqual(['Today','Goals','Habits','Health','Wealth','Markets','Staking','Ecosystem','Activity','Settings']);
 const gaps=await links.evaluateAll(items=>items.map((item,i)=>i?item.getBoundingClientRect().top-items[i-1]!.getBoundingClientRect().bottom:0));
 const gap=(i:number)=>gaps[i]!;
 // Space, not a line: the gap before Markets and before Ecosystem is clearly larger than inside a group.
 expect(gap(5)).toBeGreaterThan(gap(1)+15);expect(gap(7)).toBeGreaterThan(gap(1)+15);expect(Math.abs(gap(6)-gap(1))).toBeLessThan(1);
 await expect(nav.locator('hr, [role=separator], .nav-divider')).toHaveCount(0);
 // Keyboard order follows the visual order.
 await page.getByRole('link',{name:'ZIGoals home',exact:true}).focus();
 const order:string[]=[];
 for(let i=0;i<10;i++){await page.keyboard.press('Tab');order.push(await page.evaluate(()=>document.activeElement?.textContent?.trim()??''));}
 expect(order).toEqual(['Today','Goals','Habits','Health','Wealth','Markets','Staking','Ecosystem','Activity','Settings']);
 // The narrow-tablet header: the last group starts its own row, and Quick add (below the nav) follows it in tab order.
 await page.setViewportSize({width:820,height:1180});await page.goto('/app/goals');await expect(page.locator('main h1')).toBeVisible();
 const today=await box(page,'.app-nav a[href="/app"]'),ecosystem=await box(page,'.app-nav a[href="/app/ecosystem"]'),staking=await box(page,'.app-nav a[href="/app/staking"]');
 expect(ecosystem.x).toBeCloseTo(today.x,0);expect(ecosystem.y).toBeGreaterThan(today.y+today.height-1);expect(staking.y).toBeCloseTo(today.y,0);
 await page.locator('.app-nav a[href="/app/settings"]').focus();await page.keyboard.press('Tab');
 await expect(page.locator('.app-sidebar .quick-add-trigger')).toBeFocused();
});

test('Staking: the renamed page keeps every Position reachable, and the old address redirects (307) to it',async({page,request})=>{
 await showcase(page);
 // A temporary redirect from the former address, query kept; no browser caches it.
 const old=await request.get('/app/goals/positions?from=bookmark',{maxRedirects:0});
 expect(old.status()).toBe(307);expect(new URL(old.headers().location!,'http://x').pathname+new URL(old.headers().location!,'http://x').search).toBe('/app/staking?from=bookmark');
 await page.goto('/app/goals/positions#positions');await expect(page).toHaveURL(/\/app\/staking#positions$/);
 await expect(page.locator('main h1')).toHaveText('Staking');
 await expect(page.locator('#positions')).toBeVisible();await expect(page.getByRole('heading',{name:'Positions & allocations',exact:true})).toBeVisible();
 // The Goals workspace tab "Positions" lands on that section.
 await page.goto('/app/goals');await page.getByRole('navigation',{name:'Goal workspace'}).getByRole('link',{name:'Positions',exact:true}).click();
 await expect(page).toHaveURL(/\/app\/staking#positions$/);
 // The nav item is "Staking" everywhere, and it is current on the page.
 if(!(await isPhone(page)))await expect(page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Staking',exact:true})).toHaveAttribute('aria-current','page');
 expect(await page.evaluate(()=>document.documentElement.textContent)).not.toContain('Stake / Positions');
});
