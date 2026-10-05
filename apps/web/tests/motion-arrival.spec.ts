import {expect,test,type Page} from '@playwright/test';
import {closeMore,isPhone,navLink} from './phone-nav';

// Records every arrival mark and every logo intro clip inserted during a page load, even if removed again.
const RECORDER=()=>{const seen={arrive:[] as string[],intro:0};Object.assign(window,{motionSeen:seen});new MutationObserver(records=>{for(const r of records){if(r.type==='attributes'&&(r.target as Element).hasAttribute('data-arrive'))seen.arrive.push((r.target as Element).tagName+':'+(r.target as HTMLElement).dataset.arrive+((r.target as HTMLElement).dataset.arriveMetric!==undefined?'+metric':''));for(const n of r.addedNodes)if(n instanceof Element&&(n.matches('video.logo-intro')||n.querySelector('video.logo-intro')))seen.intro++;}}).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-arrive']});};
type Seen={arrive:string[];intro:number};
const seen=(page:Page)=>page.evaluate(()=>(window as unknown as {motionSeen:Seen}).motionSeen);
async function showcase(page:Page){
 await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'Offline fictional motion fixture'}}));
 await page.addInitScript(RECORDER);
 await page.goto('/app/settings');await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
}
/** Layout boxes in the first viewport, where arrivals play, so an in-flight entrance must match the settled page exactly. Transforms are
 * neutralised for one synchronous read (author !important outranks animations) and boxes are compared at sub-pixel precision; summing
 * integer offsetLeft/offsetTop instead rounds per offsetParent level, and a card mid-animation briefly becomes that offsetParent. */
const layout=(page:Page)=>page.evaluate(()=>{const still=document.createElement('style');still.textContent='*,*::before,*::after{transform:none!important;translate:none!important;scale:none!important;rotate:none!important}';document.head.append(still);const boxes=[...document.querySelectorAll('main h1,main details,main strong,main section,main article,.app-sidebar .brand-logo,.app-nav a')].map(e=>{const r=e.getBoundingClientRect();return [e.tagName,r.left+scrollX,r.top+scrollY,r.width,r.height];}).filter(([,,y])=>(y as number)<innerHeight).map(b=>b.map(v=>typeof v==='number'?v.toFixed(2):v).join(':'));still.remove();return boxes;});

test('a newly selected page arrives once: nav pop and light sweep, title sweep, card settle, figure shine, and no layout change',async({page},info)=>{
 // Session U Part 3: a click into Health is a full page load unless this document already allows the camera (or an
 // account is open), so Health's own camera permission applies (lib/health-navigation.ts; the full load is covered by
 // health-camera-navigation.spec.ts). This spec is about arrivals within one document, so its documents report the
 // camera as allowed and Health stays a soft navigation, as it does for an open account.
 await page.addInitScript(()=>Object.defineProperty(Document.prototype,'permissionsPolicy',{configurable:true,get:()=>({allowsFeature:(feature:string)=>feature==='camera'})}));
 await showcase(page);
 const nav=page.getByRole('navigation',{name:'Main navigation'}),habits=nav.getByRole('link',{name:'Habits',exact:true});
 await habits.click();await page.waitForURL('**/app/habits');
 await expect(habits).toHaveAttribute('aria-current','page');
 await expect.poll(async()=>(await seen(page)).arrive).toEqual(expect.arrayContaining(['A:']));
 // The title's sweep is its own one-time nebula entrance (Part 18.5: one white→nebula style for every title), which ends mid-to-right.
 await expect(page.locator('main h1 .nebula-flow')).toHaveAttribute('data-entrance','once');
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
 // On a phone (Session E) Wealth sits in the More sheet: its arrival is the More tab's (a button), and it is checked there.
 const phone=await isPhone(page),navMark=(m:string)=>m==='A:'||(phone&&m==='BUTTON:');
 for(const name of ['Health','Wealth']){await (await navLink(page,name)).click();await page.waitForURL(`**/app/${name.toLowerCase()}`);await expect(await navLink(page,name)).toHaveAttribute('aria-current','page');await closeMore(page);await expect.poll(()=>page.locator('[data-arrive]').count(),{timeout:4000}).toBe(0);}
 expect((await seen(page)).arrive.filter(m=>m.endsWith('+metric')).length).toBeGreaterThanOrEqual(1);
 // Returning to an item plays its arrival again, once.
 expect((await seen(page)).arrive.filter(navMark).length).toBe(3);
 await nav.getByRole('link',{name:'Today',exact:true}).click();await page.waitForURL(/\/app$/);
 await expect.poll(()=>page.locator('[data-arrive]').count(),{timeout:4000}).toBe(0);
 expect((await seen(page)).arrive.filter(navMark).length).toBe(4);
 await page.screenshot({path:info.outputPath('today-arrived.png')});
});

for(const setting of ['reduced motion','Motion Off'] as const)
 test(`${setting}: no arrival marks, no nav animation and no logo intro`,async({page})=>{
  if(setting==='reduced motion')await page.emulateMedia({reducedMotion:'reduce'});
  else await page.addInitScript(()=>localStorage.setItem('zigoals:motion:v1','off'));
  await showcase(page);
  for(const name of ['Habits','Wealth','Goals']){await (await navLink(page,name)).click();await page.waitForURL(`**/app/${name.toLowerCase()}`);await expect(await navLink(page,name)).toHaveAttribute('aria-current','page');await closeMore(page);}
  await page.waitForTimeout(900);
  expect(await seen(page)).toEqual({arrive:[],intro:0});
  await expect(page.locator('.app-sidebar img.brand-logo')).toHaveAttribute('alt','ZIGoals');
  expect(await page.locator('.app-sidebar img.brand-logo').evaluate(e=>getComputedStyle(e).opacity)).toBe('1');
 });

// The logo intro's own checks (once per session, the hand-over to the static Z, failures, every layout) live in
// tests/logo-fold.spec.ts since Session I extended it to the owner's fold film on desktop, tablets and phones.
