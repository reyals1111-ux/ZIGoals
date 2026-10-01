import {expect,test,type Page} from '@playwright/test';
import {closeMore,isPhone,mainNav,navLink,openMore} from './phone-nav';

// Session E, Part 2: the phone shell. Phone sizes are set explicitly so both projects run them (the desktop project with a
// fine pointer, the mobile project with a coarse one); the landscape case needs the coarse pointer.
const PAGES=['/app','/app/goals','/app/staking','/app/habits','/app/health','/app/wealth','/app/markets','/app/ecosystem','/app/activity','/app/settings'];
const LOCKED=new Set(['/app','/app/goals','/app/staking','/app/habits','/app/health','/app/wealth','/app/markets','/app/activity']);
const MORE=['Wealth','Markets','Staking','Ecosystem','Activity','Settings'];
test.beforeEach(async({page})=>{await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'LOCAL_FIXTURE_ONLY'}}));});
async function showcase(page:Page){await page.goto('/app/settings');await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');}

/** Boxes of the honesty labels, the lock, the page title and the bars, in viewport coordinates, after the page settled. */
async function firstScreen(page:Page,path:string){
 await page.goto(path);await expect(page.locator('main h1').first()).toBeVisible();
 await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy','true');
 return page.evaluate(()=>{
  const box=(selector:string)=>{const e=document.querySelector(selector);if(!e)return null;const r=e.getBoundingClientRect();return r.width&&r.height?{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}:null;};
  const label=document.querySelector('.app-topbar .network-banner strong') as HTMLElement|null;
  return {height:innerHeight,width:innerWidth,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
   testnet:box('.app-topbar .network-banner strong'),testnetText:label?.textContent,labelWhole:label?label.scrollWidth<=label.clientWidth&&label.scrollHeight<=label.clientHeight&&getComputedStyle(label).textOverflow!=='ellipsis':false,
   labelLines:label?Math.round(label.getBoundingClientRect().height/parseFloat(getComputedStyle(label).lineHeight)):0,
   mode:box('.mode-strip'),modeText:document.querySelector('.mode-strip')?.textContent??'',showcase:box('.showcase-banner strong'),
   lock:box('.layout-lock'),balance:box('.wallet-balance'),title:box('main h1'),topbar:box('.phone-topbar'),tabbar:box('.phone-tabbar'),sidebar:box('.app-sidebar')};
 });
}

for(const [width,height] of [[390,844],[360,800]] as const)
 test(`${width}x${height}: honesty labels and the layout lock sit on the first screen of every page, clear of the bars`,async({page})=>{
  test.setTimeout(120000);
  await page.setViewportSize({width,height});
  for(const path of PAGES){
   const s=await firstScreen(page,path);
   expect(s.overflow,path).toBeLessThanOrEqual(0);
   expect(s.sidebar,path).toBeNull();expect(s.topbar,path).not.toBeNull();expect(s.tabbar,path).not.toBeNull();
   // The testnet label: whole, never clipped or ellipsised, and on the first screen below the top bar.
   expect(s.testnetText,path).toBe('ZIGCHAIN TESTNET · PUBLIC ALPHA');expect(s.labelWhole,path).toBe(true);
   if(width===360)expect(s.labelLines,path).toBe(1);
   expect(s.testnet!.top,path).toBeGreaterThanOrEqual(s.topbar!.bottom-1);expect(s.testnet!.bottom,path).toBeLessThanOrEqual(s.tabbar!.top);
   expect(s.modeText,path).toContain('LOCAL SIMULATION');expect(s.mode!.top+18,path).toBeLessThanOrEqual(s.tabbar!.top);
   if(LOCKED.has(path)){
    // Part 18.4's place (right after the balance), now on the first screen, never under a bar or over the title.
    expect(s.lock,path).not.toBeNull();expect(s.lock!.bottom,path).toBeLessThanOrEqual(s.tabbar!.top);expect(s.lock!.top,path).toBeGreaterThanOrEqual(s.topbar!.bottom);
    expect(s.lock!.left,path).toBeGreaterThanOrEqual(s.balance!.right-1);expect(s.lock!.bottom,path).toBeLessThanOrEqual(s.title!.top);
    expect(s.lock!.width,path).toBeGreaterThanOrEqual(44);expect(s.lock!.height,path).toBeGreaterThanOrEqual(44);
   }else expect(s.lock,path).toBeNull();
  }
 });

test('Showcase: its label is on the first screen of every page and Exit stays one tap away',async({page})=>{
 test.setTimeout(120000);
 await page.setViewportSize({width:390,height:844});await showcase(page);
 for(const path of PAGES){
  const s=await firstScreen(page,path);
  expect(s.showcase,path).not.toBeNull();expect(s.showcase!.bottom,path).toBeLessThanOrEqual(s.tabbar!.top);
  await expect(page.getByRole('button',{name:'Exit Showcase',exact:true})).toBeInViewport();
 }
});

test('landscape phone: the strip folds into single rows and the title stays on the first screen',async({page,isMobile})=>{
 test.skip(!isMobile,'The landscape phone layout needs a coarse pointer; a desktop window this size keeps its layout.');
 await page.setViewportSize({width:844,height:390});
 for(const path of ['/app/habits','/app/health','/app/goals']){
  const s=await firstScreen(page,path);
  expect(s.overflow,path).toBeLessThanOrEqual(0);expect(s.labelWhole,path).toBe(true);
  expect(s.title!.top,path).toBeLessThan(s.tabbar!.top);expect(s.lock!.bottom,path).toBeLessThanOrEqual(s.tabbar!.top);
 }
});

test('tabs, the More sheet, Settings and back links navigate with real links, aria-current and focus return',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/app');await expect(page.locator('main h1')).toBeVisible();
 const nav=mainNav(page);
 for(const [name,url] of [['Goals','/app/goals'],['Habits','/app/habits'],['Health','/app/health'],['Today','/app']] as const){
  const tab=nav.getByRole('link',{name,exact:true});
  await expect(tab).toHaveAttribute('href',url);
  const box=(await tab.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  await tab.click();await page.waitForURL(url==='/app'?/\/app$/:`**${url}`);await expect(tab).toHaveAttribute('aria-current','page');
 }
 // More lists the other six, in the sidebar's order; each is a real link that closes the sheet and marks More current.
 const more=nav.getByRole('button',{name:'More',exact:true});
 await expect(more).toHaveAttribute('aria-expanded','false');
 const sheet=await openMore(page);
 await expect(more).toHaveAttribute('aria-expanded','true');
 expect(await sheet.getByRole('link').allTextContents()).toEqual(MORE);
 for(const link of await sheet.getByRole('link').all()){const b=(await link.boundingBox())!;expect(b.height).toBeGreaterThanOrEqual(44);}
 await page.keyboard.press('Escape');await expect(sheet).toBeHidden();await expect(more).toBeFocused();
 await (await navLink(page,'Markets')).click();await page.waitForURL('**/app/markets');
 await expect(sheet).toBeHidden();await expect(more).toHaveAttribute('data-current','true');
 await openMore(page);await expect(sheet.getByRole('link',{name:'Markets',exact:true})).toHaveAttribute('aria-current','page');await closeMore(page);
 // Settings is one tap away in the top bar, as a real link.
 const settings=page.locator('.phone-topbar').getByRole('link',{name:'Settings',exact:true});
 await settings.click();await page.waitForURL('**/app/settings');await expect(settings).toHaveAttribute('aria-current','page');
 // Detail pages step back to their list; the top bar names the page once its own title scrolls away.
 await page.goto('/app/goals/new');await expect(page.locator('main h1')).toBeVisible();
 const back=page.getByRole('link',{name:'Back to Goals',exact:true});await expect(back).toBeVisible();
 await expect(page.locator('.phone-title')).toHaveText('New Goal');
 await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
 await expect(page.locator('.phone-topbar')).toHaveAttribute('data-title-shown','');
 await back.click();await page.waitForURL('**/app/goals');
});

test('status details: labels stay whole, the long sentences open on demand, and the toggle is named and stateful',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/app/habits');await expect(page.locator('main h1')).toBeVisible();
 const toggle=page.getByRole('button',{name:'Status details',exact:true}),sentence=page.locator('.app-topbar .network-banner > span');
 await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(sentence).toBeHidden();
 await expect(page.getByRole('button',{name:'Local demo',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Connect Keplr',exact:true})).toBeVisible();
 await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');
 await expect(sentence).toBeVisible();await expect(sentence).toHaveText('Simulation + wallet connection only. No blockchain transactions or financial signatures.');
 expect(await page.locator('.mode-strip').evaluate(e=>e.scrollHeight<=e.clientHeight+1)).toBe(true);
 await toggle.click();await expect(sentence).toBeHidden();
});

test('without JavaScript a phone still shows the tab bar, the top bar and the honesty labels',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const page=await context.newPage();
 await page.goto('/app/goals');
 await expect(page.locator('.phone-tabbar')).toBeVisible();await expect(page.locator('.phone-topbar')).toBeVisible();
 await expect(page.locator('.app-topbar .network-banner')).toContainText('ZIGCHAIN TESTNET · PUBLIC ALPHA');await expect(page.locator('.mode-strip')).toBeVisible();
 // Nothing is clamped without the status toggle.
 await expect(page.locator('.app-topbar .network-banner > span')).toBeVisible();
 await context.close();
});

test('desktop and tablet keep the sidebar and never render the phone chrome',async({page})=>{
 for(const [width,height] of [[1440,900],[1024,768],[820,1180]] as const){
  await page.setViewportSize({width,height});await page.goto('/app/habits');await expect(page.locator('main h1')).toBeVisible();
  if(await isPhone(page))continue;
  await expect(page.locator('.app-sidebar')).toBeVisible();
  await expect(page.locator('.phone-topbar, .phone-tabbar, .phone-status-toggle')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.dataset.phoneStatus)).toBeUndefined();
 }
});

test('a stalled private read (Session D): the notice sits under the honesty strip with phone gutters, Retry within reach',async({page})=>{
 test.setTimeout(60000);
 await page.setViewportSize({width:390,height:844});
 // Today settings point at the durable vault, and every open of it stalls (as in private-read-delay.spec.ts).
 await page.addInitScript(()=>{
  localStorage.setItem('zigoals:settings:v1',JSON.stringify({schemaVersion:100,kind:'zigoals-indexeddb-pointer',database:'zigoals-private-vault-v1',protocol:1}));
  const open=IDBFactory.prototype.open;
  IDBFactory.prototype.open=function(name:string,version?:number){return name==='zigoals-private-vault-v1'?{} as IDBOpenDBRequest:open.call(this,name,version);};
 });
 await page.goto('/app');
 const panel=page.locator('.private-read-delay');
 await expect(panel).toBeVisible({timeout:15000});
 await expect(page.locator('main')).toBeHidden();
 await expect(page.locator('.app-topbar .network-banner')).toContainText('ZIGCHAIN TESTNET · PUBLIC ALPHA');await expect(page.locator('.mode-strip')).toBeVisible();
 const p=(await panel.boundingBox())!,strip=(await page.locator('.app-topbar').boundingBox())!,tabs=(await page.locator('.phone-tabbar').boundingBox())!;
 expect(p.x).toBeGreaterThanOrEqual(12);expect(p.x+p.width).toBeLessThanOrEqual(390-12);
 expect(p.y).toBeGreaterThanOrEqual(strip.y+strip.height);expect(p.y).toBeLessThan(tabs.y);
 const retry=(await panel.getByRole('button',{name:'Retry'}).boundingBox())!;expect(retry.height).toBeGreaterThanOrEqual(44);expect(retry.y+retry.height).toBeLessThanOrEqual(tabs.y);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test('the names CI journeys click stay visible links on a phone: Today, Goals, Habits, Health, Wealth and Settings',async({page})=>{
 // scripts/run10 and scripts/run11 open these pages with getByRole('link',{name,exact:true}).first() at 390x844.
 await page.setViewportSize({width:390,height:844});await page.goto('/app');await expect(page.locator('main h1')).toBeVisible();
 for(const [name,url] of [['Wealth','/app/wealth'],['Settings','/app/settings'],['Goals','/app/goals'],['Habits','/app/habits'],['Health','/app/health'],['Today','/app']] as const){
  const link=page.getByRole('link',{name,exact:true}).first();await expect(link).toBeVisible();
  const box=(await link.boundingBox())!;expect(box.width,name).toBeGreaterThanOrEqual(44);expect(box.height,name).toBeGreaterThanOrEqual(44);
  await link.click();await page.waitForURL(url==='/app'?/\/app$/:`**${url}`);await expect(page.locator('main h1')).toBeVisible();
 }
});
