import {expect,test,type Page} from '@playwright/test';

// Records every arrival mark and every logo intro clip inserted during a page load, even if removed again.
const RECORDER=()=>{const seen={arrive:[] as string[],intro:0};Object.assign(window,{motionSeen:seen});new MutationObserver(records=>{for(const r of records){if(r.type==='attributes'&&(r.target as Element).hasAttribute('data-arrive'))seen.arrive.push((r.target as Element).tagName+':'+(r.target as HTMLElement).dataset.arrive+((r.target as HTMLElement).dataset.arriveMetric!==undefined?'+metric':''));for(const n of r.addedNodes)if(n instanceof Element&&(n.matches('video.logo-intro')||n.querySelector('video.logo-intro')))seen.intro++;}}).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-arrive']});};
type Seen={arrive:string[];intro:number};
const seen=(page:Page)=>page.evaluate(()=>(window as unknown as {motionSeen:Seen}).motionSeen);
async function showcase(page:Page){
 await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'Offline fictional motion fixture'}}));
 await page.addInitScript(RECORDER);
 await page.goto('/app/settings');await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
}
/** Layout boxes in the first viewport, where arrivals play (offset geometry ignores transforms), so an in-flight entrance must match the settled page exactly. */
const layout=(page:Page)=>page.evaluate(()=>[...document.querySelectorAll('main h1,main details,main strong,main section,main article,.app-sidebar .brand-logo,.app-nav a')].map(e=>{let x=0,y=0,n=e as HTMLElement|null;const w=(e as HTMLElement).offsetWidth,h=(e as HTMLElement).offsetHeight;while(n){x+=n.offsetLeft;y+=n.offsetTop;n=n.offsetParent as HTMLElement|null;}return [e.tagName,x,y,w,h];}).filter(([,,y])=>(y as number)<innerHeight).map(b=>b.join(':')));

test('a newly selected page arrives once: nav pop and light sweep, title sweep, card settle, figure shine, and no layout change',async({page},info)=>{
 await showcase(page);
 const nav=page.getByRole('navigation',{name:'Main navigation'}),habits=nav.getByRole('link',{name:'Habits',exact:true});
 await habits.click();await page.waitForURL('**/app/habits');
 await expect(habits).toHaveAttribute('aria-current','page');
 await expect.poll(async()=>(await seen(page)).arrive).toEqual(expect.arrayContaining(['A:','H1:tint','SPAN:shine']));
 await expect.poll(async()=>(await seen(page)).arrive.some(m=>m.endsWith(':card'))).toBe(true);
 const moving=await layout(page);
 await page.screenshot({path:info.outputPath('habits-arriving.png')});
 // Every mark is a single pass and is removed afterwards; the layout never moved.
 await expect.poll(()=>page.locator('[data-arrive]').count(),{timeout:4000}).toBe(0);
 expect(await layout(page)).toEqual(moving);
 const title=page.locator('main h1');
 expect(await title.evaluate(e=>[getComputedStyle(e).backgroundImage,getComputedStyle(e).getPropertyValue('-webkit-text-fill-color')===getComputedStyle(e).color])).toEqual(['none',true]);
 // Interaction after arrival never replays it.
 const before=(await seen(page)).arrive.length;
 await page.locator('.habit-filter-bar button').nth(1).click();await page.waitForTimeout(400);
 expect((await seen(page)).arrive.length).toBe(before);
 // Key figures in view get one shine: the Health calories and the Wealth total.
 for(const name of ['Health','Wealth']){await nav.getByRole('link',{name,exact:true}).click();await expect(nav.getByRole('link',{name,exact:true})).toHaveAttribute('aria-current','page');await expect.poll(()=>page.locator('[data-arrive]').count(),{timeout:4000}).toBe(0);}
 expect((await seen(page)).arrive.filter(m=>m.endsWith('+metric')).length).toBeGreaterThanOrEqual(1);
 // Returning to an item plays its arrival again, once.
 expect((await seen(page)).arrive.filter(m=>m==='A:').length).toBe(3);
 await nav.getByRole('link',{name:'Today',exact:true}).click();await page.waitForURL(/\/app$/);
 await expect.poll(()=>page.locator('[data-arrive]').count(),{timeout:4000}).toBe(0);
 expect((await seen(page)).arrive.filter(m=>m==='A:').length).toBe(4);
 await page.screenshot({path:info.outputPath('today-arrived.png')});
});

for(const setting of ['reduced motion','Motion Off'] as const)
 test(`${setting}: no arrival marks, no nav animation and no logo intro`,async({page})=>{
  if(setting==='reduced motion')await page.emulateMedia({reducedMotion:'reduce'});
  else await page.addInitScript(()=>localStorage.setItem('zigoals:motion:v1','off'));
  await showcase(page);
  const nav=page.getByRole('navigation',{name:'Main navigation'});
  for(const name of ['Habits','Wealth','Goals']){await nav.getByRole('link',{name,exact:true}).click();await expect(nav.getByRole('link',{name,exact:true})).toHaveAttribute('aria-current','page');}
  await page.waitForTimeout(900);
  expect(await seen(page)).toEqual({arrive:[],intro:0});
  await expect(page.locator('.app-sidebar img.brand-logo')).toHaveAttribute('alt','ZIGoals');
  expect(await page.locator('.app-sidebar img.brand-logo').evaluate(e=>getComputedStyle(e).opacity)).toBe('1');
 });

test('the logo intro plays once per browser session on desktop and settles on the static logo without moving it',async({page,isMobile},info)=>{
 await page.addInitScript(RECORDER);
 await page.goto('/app');
 const logo=page.locator('.app-sidebar img.brand-logo');
 await expect(logo).toHaveAttribute('alt','ZIGoals');
 const box=await logo.boundingBox();
 if(isMobile){
  await page.waitForTimeout(1200);expect((await seen(page)).intro).toBe(0);await expect(page.locator('video.logo-intro')).toHaveCount(0);return;
 }
 await expect.poll(async()=>(await seen(page)).intro).toBe(1);
 expect(await page.evaluate(()=>sessionStorage.getItem('zigoals:logo-intro:v1'))).toBe('played');
 const video=page.locator('video.logo-intro');
 const h264=await page.evaluate(()=>document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E"')!=='');
 if(h264){
  // The clip plays muted at 1.5x over the static logo, blended so its black never shows, then hands back to the logo.
  await expect(video).toHaveAttribute('data-state','playing',{timeout:1500});
  expect(await video.evaluate(v=>{const c=v as HTMLVideoElement;return [c.muted,c.playbackRate,getComputedStyle(c).mixBlendMode,getComputedStyle(c).pointerEvents];})).toEqual([true,1.5,'screen','none']);
  await expect(logo).toHaveAttribute('data-intro','playing');
  expect(await page.locator('.app-sidebar').evaluate(e=>e.scrollWidth-e.clientWidth)).toBe(0);
  await page.locator('.app-sidebar').screenshot({path:info.outputPath('logo-intro-playing.png')});
 }
 // Either way (played, or this browser cannot decode the clip) the static logo returns fully and the clip is gone.
 await expect(video).toHaveCount(0,{timeout:8000});
 await expect(logo).not.toHaveAttribute('data-intro');
 expect(await logo.evaluate(e=>getComputedStyle(e).opacity)).toBe('1');
 expect(await logo.boundingBox()).toEqual(box);
 await page.reload();await expect(logo).toBeVisible();await page.waitForTimeout(1600);
 expect((await seen(page)).intro).toBe(0);
});

for(const failure of ['error','not ready'] as const)
 test(`the static logo stays when the intro clip ${failure==='error'?'fails':'is not ready in time'}`,async({page,isMobile})=>{
  test.skip(isMobile,'The intro is desktop only.');
  await page.route('**/media/zigoals-logo-intro.mp4',route=>failure==='error'?route.fulfill({status:404,body:''}):new Promise(()=>{}));
  await page.addInitScript(RECORDER);await page.goto('/app');
  const logo=page.locator('.app-sidebar img.brand-logo');
  await expect.poll(async()=>(await seen(page)).intro).toBe(1);
  await expect(page.locator('video.logo-intro')).toHaveCount(0,{timeout:failure==='error'?1400:2500});
  await expect(logo).not.toHaveAttribute('data-intro');
  expect(await logo.evaluate(e=>getComputedStyle(e).opacity)).toBe('1');
 });
