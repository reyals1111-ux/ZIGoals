import {expect,test,type Page} from '@playwright/test';

// Session E, Part 3: every page laid out for a phone. Sizes are set explicitly so both projects run these checks.
const PAGES=['/app','/app/goals','/app/goals/new','/app/staking','/app/habits','/app/health','/app/wealth','/app/markets','/app/ecosystem','/app/activity','/app/settings'];
test.beforeEach(async({page})=>{await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'LOCAL_FIXTURE_ONLY'}}));});
async function showcase(page:Page){await page.goto('/app/settings');await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');}
async function open(page:Page,path:string){await page.goto(path);await expect(page.locator('main h1').first()).toBeVisible();await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy','true');}

for(const [width,height] of [[390,844],[360,800],[320,568]] as const)
 test(`${width}x${height}: no page scrolls sideways and every title starts on the first screen, above the tab bar`,async({page})=>{
  test.setTimeout(150000);
  await page.setViewportSize({width,height});await showcase(page);
  for(const path of PAGES){
   await open(page,path);
   const r=await page.evaluate(()=>({over:document.documentElement.scrollWidth-document.documentElement.clientWidth,title:document.querySelector('main h1')!.getBoundingClientRect().top,tabs:document.querySelector('.phone-tabbar')!.getBoundingClientRect().top}));
   expect(r.over,path).toBeLessThanOrEqual(0);expect(r.title,path).toBeLessThan(r.tabs);
  }
 });

test('Wealth: the total follows the title, so the figure is on the first screen',async({page})=>{
 await page.setViewportSize({width:390,height:664});await showcase(page);await open(page,'/app/wealth');
 const total=page.locator('.wealth-hero-total strong').first();await expect(total).toBeVisible();
 const box=(await total.boundingBox())!,tabs=(await page.locator('.phone-tabbar').boundingBox())!;
 expect(box.y+box.height).toBeLessThanOrEqual(tabs.y);
 // Still one total, labelled as before; Add asset leads the actions.
 await expect(page.locator('.wealth-hero-total')).toHaveCount(1);await expect(page.locator('.wealth-hero-total')).toContainText('TRACKED WEALTH');
 await expect(page.locator('.wealth-actions .primary')).toHaveText('+ Add asset');
});

test('phone default orders: Health title, date, counters; Habits check-ins before charts; Wealth holdings after the total; a saved order still wins',async({page})=>{
 await page.setViewportSize({width:390,height:844});await showcase(page);
 await open(page,'/app/health');
 const order=await page.evaluate(()=>['.page-heading','.health-date-strip','.exercise-counters','.health-toolbar'].map(s=>document.querySelector(s)!.getBoundingClientRect().top));
 expect([...order].sort((a,b)=>a-b)).toEqual(order);
 await expect(page.getByLabel('Journal date')).toHaveCount(1);
 await open(page,'/app/habits');
 const items=(r:string)=>page.evaluate(r=>[...document.querySelectorAll<HTMLElement>(`[data-layout-region="${r}"]`)].map(e=>e.dataset.layoutItem),r);
 expect(await items('habits:body')).toEqual(['habits:overview','habits:list','habits:consistency','habits:rhythm']);
 await open(page,'/app/wealth');
 expect((await items('wealth:body')).slice(0,5)).toEqual(['wealth:pulse','wealth:holdings','wealth:composition','wealth:mix','wealth:watchlist']);
 expect((await items('wealth:body')).at(-1)).toBe('wealth:allocation');
 // An order saved on this device wins over the phone default.
 await page.evaluate(()=>sessionStorage.setItem('zigoals:layout:v1',JSON.stringify({version:1,pages:{habits:{body:{order:['habits:rhythm','habits:consistency','habits:overview','habits:list']}}}})));
 await open(page,'/app/habits');
 expect(await items('habits:body')).toEqual(['habits:rhythm','habits:consistency','habits:overview','habits:list']);
});

test('Settings on a phone: a grouped list under the title goes to every section; desktop keeps its chips',async({page})=>{
 await page.setViewportSize({width:390,height:844});await open(page,'/app/settings');
 const list=page.getByRole('navigation',{name:'Settings sections'});await expect(list).toBeVisible();
 await expect(page.locator('.settings-sections')).toBeHidden();
 // 13 rows before Session P; PR 3 adds "Export everything" and "Weekly review day"; PR 4 "Reminders when closed" and "Guide on this device"; Session T "ZIGi · your AI".
 // Session W Part 24 (deliberate): six groups like the page's, and seven rows for its new sections (import, pages, time zone, wrap-up, music, links, chess).
 const rows=list.getByRole('link');expect(await rows.count()).toBe(25);
 expect(await list.getByRole('heading',{level:2}).allTextContents()).toEqual(['Data & privacy','Your app','Your areas','Account & devices','ZIGi','Help & diagnostics']);
 await expect(list.getByRole('link',{name:'Show the welcome again',exact:true})).toHaveAttribute('href','/app/welcome');
 for(const link of await rows.all()){
  const href=(await link.getAttribute('href'))!;if(href==='/app/welcome')continue;expect(href).toMatch(/^#[a-z-]+$/);
  await expect(page.locator(href),href).toHaveCount(1);
  const box=(await link.boundingBox())!;expect(box.height,href).toBeGreaterThanOrEqual(44);
 }
 // The first rows (backups, privacy) are on the first screen.
 const backups=list.getByRole('link',{name:'Backups & restore',exact:true});await expect(backups).toBeInViewport();
 await backups.click();await expect(page.locator('#private-vault')).toBeInViewport();
 await page.setViewportSize({width:1280,height:800});await page.reload();await expect(page.locator('main h1')).toBeVisible();
 await expect(page.locator('.phone-settings-list')).toHaveCount(0);await expect(page.locator('.settings-sections')).toBeVisible();
});

test('landscape phone: no sideways scroll and the title on the first screen on every page',async({page,isMobile})=>{
 test.skip(!isMobile,'The landscape phone layout needs a coarse pointer; a desktop window this size keeps its layout.');
 test.setTimeout(150000);
 await page.setViewportSize({width:844,height:390});await showcase(page);
 for(const path of PAGES){
  await open(page,path);
  const r=await page.evaluate(()=>({over:document.documentElement.scrollWidth-document.documentElement.clientWidth,title:document.querySelector('main h1')!.getBoundingClientRect().top,tabs:document.querySelector('.phone-tabbar')!.getBoundingClientRect().top}));
  expect(r.over,path).toBeLessThanOrEqual(0);expect(r.title,path).toBeLessThan(r.tabs);
 }
});
