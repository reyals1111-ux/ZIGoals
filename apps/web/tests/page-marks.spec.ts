import {expect,test,type Page} from '@playwright/test';
import {isPhone,openMore} from './phone-nav';

/**
 * Session I, Part 2: the sidebar page marks, the navigation groups and the Staking rename.
 * Session K, Part 6 (owner decision): the six pages without a fold of their own show the Today swan; on every page the
 * figure stays where it was, and its words sit larger on the planet, below the horizon and clear of the star.
 */
async function showcase(page:Page){
 await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'Offline fictional marks fixture'}}));
 await page.goto('/app/settings');await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
}
const MARKS:[string,string][]=[
 ['/app','today-swan'],['/app/goals','goals-lotus'],['/app/goals/tracked/9201','goals-lotus'],['/app/habits','habits-butterfly'],['/app/health','health-heart'],
 ['/app/wealth','wealth-bull'],['/app/wealth/asset/showcase-btc','wealth-bull'],
 ['/app/markets','today-swan'],['/app/staking','today-swan'],['/app/portfolio','today-swan'],['/app/ecosystem','today-swan'],['/app/activity','today-swan'],['/app/settings','today-swan'],
];
/** Each figure's natural height at 160 px wide (the mark files' own ratio), and the words' display size (1.6x their size in the mark). */
const SIZE:Record<string,{figure:number;words:[number,number]}>={'today-swan':{figure:148,words:[188,49]},'goals-lotus':{figure:152,words:[89,31]},'habits-butterfly':{figure:153,words:[99,31]},'health-heart':{figure:150,words:[100,31]},'wealth-bull':{figure:167,words:[152,33]}};
const box=async(page:Page,selector:string)=>(await page.locator(selector).first().boundingBox())!;

test('each life page shows its own mark, every other page the Today swan; figure and words are decorative 1x/2x images',async({page})=>{
 test.setTimeout(90000);
 const requested:string[]=[];page.on('request',r=>{if(/\/brand\/(marks|words)\//.test(r.url()))requested.push(new URL(r.url()).pathname);});
 await page.emulateMedia({reducedMotion:'reduce'});
 await showcase(page);
 for(const [path,name] of MARKS){
  await page.goto(path);await expect(page.locator('main h1').first()).toBeVisible();
  const mark=page.locator('.sidebar-destination .sidebar-mark');
  await expect(mark,path).toHaveAttribute('data-mark',name);
  if(await isPhone(page))continue;
  // The "ZIGoals" wordmark no longer stands in for a mark anywhere in the sidebar destination.
  await expect(page.locator('.sidebar-destination .brand-wordmark'),path).toHaveCount(0);
  for(const [part,dir] of [['figure','marks'],['words','words']] as const){
   const picture=mark.locator(`.sidebar-mark-${part}`),art=picture.locator('img'),source=picture.locator('source');
   await expect(source,`${path} ${part}`).toHaveAttribute('srcset',`/brand/${dir}/${name}.webp 1x, /brand/${dir}/${name}-2x.webp 2x`);
   await expect(art,`${path} ${part}`).toHaveAttribute('alt','');await expect(art,`${path} ${part}`).toHaveAttribute('aria-hidden','true');
   await expect.poll(()=>art.evaluate(i=>(i as HTMLImageElement).complete?(i as HTMLImageElement).currentSrc:''),{message:`${path} ${part}`}).toMatch(new RegExp(`/brand/${dir}/${name}(-2x)?\\.webp$`));
  }
  const figure=mark.locator('.sidebar-mark-figure img'),words=mark.locator('.sidebar-mark-words img');
  await expect(figure,path).toHaveAttribute('width','160');expect(Number(await figure.getAttribute('height')),path).toBe(SIZE[name]!.figure);
  expect(await figure.evaluate(i=>(i as HTMLImageElement).naturalWidth),path).toBeGreaterThanOrEqual(720);
  // The chosen words file (1x here; -2x on high-density screens) is at least as wide as the words are drawn, so they
  // are never upscaled. naturalWidth is already corrected for the file's density.
  const [w,h]=SIZE[name]!.words;await expect(words,path).toHaveAttribute('width',String(w));await expect(words,path).toHaveAttribute('height',String(h));
  expect(await words.evaluate(i=>(i as HTMLImageElement).naturalWidth>=(i as HTMLImageElement).getBoundingClientRect().width-0.5),path).toBe(true);
 }
 // A phone never shows the sidebar planet, so it downloads neither figures nor words.
 if(await isPhone(page))expect(requested).toEqual([]);
 else{expect(requested.some(p=>p.startsWith('/brand/marks/'))).toBe(true);expect(requested.some(p=>p.startsWith('/brand/words/'))).toBe(true);}
});

test('the Shape & Fold tagline text is gone from the sidebar, the More sheet and every other place in the app',async({page})=>{
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
 // Between two pages that both show the swan nothing fades: it is the same mark.
 await page.evaluate(()=>{(window as unknown as {markSeen:{phases:string[]}}).markSeen.phases=[];});
 await nav.getByRole('link',{name:'Settings',exact:true}).click();await page.waitForURL('**/app/settings');await page.waitForTimeout(400);
 expect(await page.evaluate(()=>(window as unknown as {markSeen:{phases:string[]}}).markSeen.phases)).toEqual([]);
 for(const setting of ['reduced motion','Motion Off'] as const){
  if(setting==='reduced motion')await page.emulateMedia({reducedMotion:'reduce'});else{await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>localStorage.setItem('zigoals:motion:v1','off'));}
  await page.goto('/app');
  await page.evaluate(()=>{const seen={phases:[] as string[]};Object.assign(window,{markSeen:seen});new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n instanceof HTMLElement&&n.matches('.sidebar-mark-layer'))seen.phases.push(`${n.dataset.mark}:${n.dataset.phase??'static'}`);}).observe(document.querySelector('.sidebar-destination')!,{subtree:true,childList:true});});
  await nav.getByRole('link',{name:'Health',exact:true}).click();await page.waitForURL('**/app/health');
  await expect(page.locator('.sidebar-mark')).toHaveAttribute('data-mark','health-heart');await page.waitForTimeout(400);
  expect(await page.evaluate(()=>(window as unknown as {markSeen:{phases:string[]}}).markSeen.phases),setting).toEqual(['health-heart:static']);
 }
});

test('figure and words never overlap the navigation, the horizon or the star, and nothing clips, at every desktop size',async({page,isMobile})=>{
 test.skip(isMobile,'The sidebar planet and its marks are the desktop sidebar.');
 test.setTimeout(150000);
 await page.emulateMedia({reducedMotion:'reduce'});
 await showcase(page);
 // The five marks, plus one page that shows the swan as a stand-in.
 const pages=['/app','/app/goals','/app/habits','/app/health','/app/wealth','/app/markets'];
 for(const [width,height] of [[1024,768],[1180,820],[1280,720],[1440,900],[1920,1080],[1280,640],[1440,600],[1024,600]] as const){
  await page.setViewportSize({width,height});
  let planetOnToday:{x:number;y:number;width:number;height:number}|undefined;
  for(const path of pages){
   await page.goto(path);await expect(page.locator('main h1').first()).toBeVisible();
   await expect.poll(()=>page.locator('.sidebar-mark-words img').evaluate(i=>(i as HTMLImageElement).complete&&(i as HTMLImageElement).currentSrc.includes('/brand/words/'))).toBe(true);
   // Measured with the sidebar scrolled to its end, so the destination is in view even where the sidebar scrolls.
   await page.locator('.app-sidebar').evaluate(e=>{e.scrollTop=e.scrollHeight;});
   const where=`${width}x${height} ${path}`;
   const settings=await box(page,'.app-nav a[href="/app/settings"]'),mark=await box(page,'.sidebar-mark'),planet=await box(page,'.sidebar-horizon'),star=await box(page,'.sidebar-star');
   const destination=await box(page,'.sidebar-destination'),figure=await box(page,'.sidebar-mark-figure img'),words=await box(page,'.sidebar-mark-words img');
   // The figure is where it always was: 160 px wide, resting on the bottom of the fixed mark box, above the planet.
   expect(mark.y,where).toBeGreaterThanOrEqual(settings.y+settings.height);
   expect(planet.y,where).toBeGreaterThanOrEqual(mark.y+mark.height-.5);
   expect(figure.width,where).toBeCloseTo(160,0);expect(figure.y+figure.height,where).toBeCloseTo(mark.y+mark.height,0);
   // The words: below the horizon line (its rim shows at most 34 px below the planet's top), clear of the star and its
   // glow (18 px around it), and wholly inside the destination, so nothing is cut off.
   expect(words.y,where).toBeGreaterThanOrEqual(planet.y+48);
   const glow={x:star.x-18,y:star.y-18,right:star.x+star.width+18,bottom:star.y+star.height+18};
   const clearOfGlow=words.y>=glow.bottom||words.x>=glow.right||words.x+words.width<=glow.x;
   expect(clearOfGlow,`${where}: words ${JSON.stringify(words)} glow ${JSON.stringify(glow)}`).toBe(true);
   expect(words.x,where).toBeGreaterThanOrEqual(destination.x+8);expect(words.x+words.width,where).toBeLessThanOrEqual(destination.x+destination.width-8);
   expect(words.y+words.height,where).toBeLessThanOrEqual(destination.y+destination.height-8);
   // Centred on the sidebar, and the planet never moves between pages.
   expect(Math.abs(words.x+words.width/2-(destination.x+destination.width/2)),where).toBeLessThan(1);
   planetOnToday??=planet;expect(planet,where).toEqual(planetOnToday);
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
  expect(await sheet.getByRole('link').allTextContents()).toEqual(['Wealth','Markets','Staking','Portfolio','Ecosystem','Activity','Settings']);
  const gaps=await rows.evaluateAll(items=>items.map((item,i)=>i?item.getBoundingClientRect().top-items[i-1]!.getBoundingClientRect().bottom:0));
  const gap=(i:number)=>gaps[i]!;
  // Portfolio (Session I, Part 11) sits in the money group: the group gaps are now before Markets (1) and Ecosystem (4).
  expect(gap(1)).toBeGreaterThan(gap(2)+8);expect(gap(4)).toBeGreaterThan(gap(5)+8);expect(Math.abs(gap(2)-gap(5))).toBeLessThan(1);expect(Math.abs(gap(3)-gap(2))).toBeLessThan(1);
  await expect(sheet.locator('hr, [role=separator]')).toHaveCount(0);
  return;
 }
 const links=nav.getByRole('link');
 expect(await links.allTextContents()).toEqual(['Today','Goals','Habits','Health','Wealth','Markets','Staking','Portfolio','Ecosystem','Activity','Settings']);
 const gaps=await links.evaluateAll(items=>items.map((item,i)=>i?item.getBoundingClientRect().top-items[i-1]!.getBoundingClientRect().bottom:0));
 const gap=(i:number)=>gaps[i]!;
 // Space, not a line: the gap before Markets and before Ecosystem is clearly larger than inside a group.
 // With Portfolio in the money group (Session I, Part 11), Ecosystem is item 8.
 expect(gap(5)).toBeGreaterThan(gap(1)+15);expect(gap(8)).toBeGreaterThan(gap(1)+15);expect(Math.abs(gap(6)-gap(1))).toBeLessThan(1);expect(Math.abs(gap(7)-gap(1))).toBeLessThan(1);
 await expect(nav.locator('hr, [role=separator], .nav-divider')).toHaveCount(0);
 // Keyboard order follows the visual order.
 await page.getByRole('link',{name:'ZIGoals home',exact:true}).focus();
 const order:string[]=[];
 for(let i=0;i<11;i++){await page.keyboard.press('Tab');order.push(await page.evaluate(()=>document.activeElement?.textContent?.trim()??''));}
 expect(order).toEqual(['Today','Goals','Habits','Health','Wealth','Markets','Staking','Portfolio','Ecosystem','Activity','Settings']);
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
