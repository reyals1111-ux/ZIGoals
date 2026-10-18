import {expect,test,type Page} from '@playwright/test';
import {closeMore,isPhone,mainNav,navLink,openMore} from './phone-nav';
import {ALPHA_LABEL,ALPHA_SENTENCE,aboutAlpha,alphaNotice,expectAlphaMode,openStatusSheet} from './ab-shell';

// Session E, Part 2: the phone shell. Phone sizes are set explicitly so both projects run them (the desktop project with a
// fine pointer, the mobile project with a coarse one); the landscape case needs the coarse pointer.
const PAGES=['/app','/app/goals','/app/staking','/app/habits','/app/health','/app/wealth','/app/markets','/app/ecosystem','/app/activity','/app/settings'];
const LOCKED=new Set(['/app','/app/goals','/app/staking','/app/habits','/app/health','/app/wealth','/app/markets','/app/activity']);
// Session AB-Design (owner request 10, ADR-024 D2): Wealth is the fifth tab; More opens from the top bar.
const MORE=['Markets','Staking','Portfolio','Ecosystem','Activity','Settings','Help'];
test.beforeEach(async({page})=>{await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'LOCAL_FIXTURE_ONLY'}}));});
async function showcase(page:Page){await page.goto('/app/settings');await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');}

/** Boxes of the honesty labels, the lock, the page title and the bars, in viewport coordinates, after the page settled. */
async function firstScreen(page:Page,path:string){
 await page.goto(path);await expect(page.locator('main h1').first()).toBeVisible();
 await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy','true');
 return page.evaluate(()=>{
  const box=(selector:string)=>{const e=document.querySelector(selector);if(!e)return null;const r=e.getBoundingClientRect();return r.width&&r.height?{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}:null;};
  // Session AB-Design (ADR-024 D7): the honesty label is the compact notice's own; the strip's words wait in the Status & wallet sheet and (Session AC) Settings' facts block.
  const label=document.querySelector('.alpha-notice strong') as HTMLElement|null,mode=document.querySelector('.site-footer .mode-strip');
  return {height:innerHeight,width:innerWidth,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
   testnet:box('.alpha-notice'),testnetText:label?.textContent,labelWhole:label?label.scrollWidth<=label.clientWidth&&label.scrollHeight<=label.clientHeight&&getComputedStyle(label).textOverflow!=='ellipsis':false,
   modeBelow:mode?mode.getBoundingClientRect().top>innerHeight:false,modeText:mode?.textContent??'',showcase:box('.showcase-chip'),
   // Session AE (Part 1): the demo balance's box (never asserted) went with the balance; the lock's checks below are unchanged.
   lock:box('.layout-lock'),title:box('main h1'),topbar:box('.phone-topbar'),tabbar:box('.phone-tabbar'),sidebar:box('.app-sidebar')};
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
   // The honesty label: the compact notice (at least 44 px), its label whole, never clipped or ellipsised, on the first screen below the top bar.
   expect(s.testnetText,path).toBe(ALPHA_LABEL);expect(s.labelWhole,path).toBe(true);
   expect(s.testnet!.height,path).toBeGreaterThanOrEqual(44);
   expect(s.testnet!.top,path).toBeGreaterThanOrEqual(s.topbar!.bottom-1);expect(s.testnet!.bottom,path).toBeLessThanOrEqual(s.tabbar!.top);
   // The mode strip's words are kept (the Status sheet and Settings' facts block show them; the footer's disclaimer until
   // Session AC), never on the first screen: the page itself now carries none of them, and they are read in Settings below.
   expect(s.modeText,path).toBe('');expect(s.modeBelow,path).toBe(false);
   if(LOCKED.has(path)){
    // Part 18.4's place (the row's right end), now on the first screen, never under a bar or over the title.
    expect(s.lock,path).not.toBeNull();expect(s.lock!.bottom,path).toBeLessThanOrEqual(s.tabbar!.top);expect(s.lock!.top,path).toBeGreaterThanOrEqual(s.topbar!.bottom);
    expect(s.lock!.top,path).toBeGreaterThanOrEqual(s.testnet!.bottom);expect(s.lock!.bottom,path).toBeLessThanOrEqual(s.title!.top);
    expect(s.lock!.width,path).toBeGreaterThanOrEqual(44);expect(s.lock!.height,path).toBeGreaterThanOrEqual(44);
   }else expect(s.lock,path).toBeNull();
  }
  await expectAlphaMode(page,'LOCAL SIMULATION'); // Session AC: the strip's words, in Settings' facts block
 });

test('Showcase: its label is on the first screen of every page and Exit stays one tap away',async({page})=>{
 test.setTimeout(120000);
 await page.setViewportSize({width:390,height:844});await showcase(page);
 for(const path of PAGES){
  const s=await firstScreen(page,path);
  expect(s.showcase,path).not.toBeNull();expect(s.showcase!.bottom,path).toBeLessThanOrEqual(s.tabbar!.top);
  // Session AB-Design: the tiny chip opens Exit Showcase / Load again, one tap away.
  const chip=page.getByRole('complementary',{name:'Showcase data'});await chip.getByRole('button',{name:'Showcase',exact:true}).click();
  await expect(page.getByRole('button',{name:'Exit Showcase',exact:true})).toBeInViewport();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Exit Showcase',exact:true})).toHaveCount(0);
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
 for(const [name,url] of [['Goals','/app/goals'],['Habits','/app/habits'],['Health','/app/health'],['Wealth','/app/wealth'],['Today','/app']] as const){
  const tab=nav.getByRole('link',{name,exact:true});
  await expect(tab).toHaveAttribute('href',url);
  const box=(await tab.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  await tab.click();await page.waitForURL(url==='/app'?/\/app$/:`**${url}`);await expect(tab).toHaveAttribute('aria-current','page');
 }
 // More (the top bar's button, Session AB-Design) lists the other seven, in the sidebar's order; each is a real link that closes the sheet and marks More current.
 const more=page.getByRole('button',{name:'More',exact:true});
 await expect(more).toHaveAttribute('aria-expanded','false');
 const sheet=await openMore(page);
 await expect(more).toHaveAttribute('aria-expanded','true');
 expect(await sheet.getByRole('link').allTextContents()).toEqual(MORE);
 for(const link of await sheet.getByRole('link').all()){const b=(await link.boundingBox())!;expect(b.height).toBeGreaterThanOrEqual(44);}
 await page.keyboard.press('Escape');await expect(sheet).toBeHidden();await expect(more).toBeFocused();
 await (await navLink(page,'Markets')).click();await page.waitForURL('**/app/markets');
 await expect(sheet).toBeHidden();await expect(more).toHaveAttribute('data-current','true');
 await openMore(page);await expect(sheet.getByRole('link',{name:'Markets',exact:true})).toHaveAttribute('aria-current','page');await closeMore(page);
 // Settings is one tap away as More's last-but-one row (owner decision D2), as a real link.
 const settings=await navLink(page,'Settings');
 await settings.click();await page.waitForURL('**/app/settings');await expect(more).toHaveAttribute('data-current','true');
 // Detail pages step back to their list; the top bar names the page once its own title scrolls away.
 await page.goto('/app/goals/new');await expect(page.locator('main h1')).toBeVisible();
 const back=page.getByRole('link',{name:'Back to Goals',exact:true});await expect(back).toBeVisible();
 await expect(page.locator('.phone-title')).toHaveText('New Goal');
 await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
 await expect(page.locator('.phone-topbar')).toHaveAttribute('data-title-shown','');
 await back.click();await page.waitForURL('**/app/goals');
});

test('More → Status & wallet opens the Status sheet: every notice in full, the wallet buttons, and focus back on More',async({page})=>{
 // Session AB-Design (ADR-024 D7; re-pointed, as strict): the one status line became the compact notice; the sheet opens from More.
 await page.setViewportSize({width:390,height:844});
 await page.goto('/app/habits');await expect(page.locator('main h1')).toBeVisible();
 await expect(alphaNotice(page).locator('strong')).toHaveText(ALPHA_LABEL);
 const sheet=await openStatusSheet(page);
 await expect(sheet).toContainText('PRACTICE MONEY (NO REAL VALUE) · PUBLIC ALPHA');
 await expect(sheet).toContainText('Staking and votes sign in your own wallet (practice or real, your choice). Nothing else moves, and ZIGoals never holds keys.');
 await expect(sheet).toContainText('LOCAL SIMULATION · Mode: this tab · Stored in this browser · No blockchain transactions');
 await expect(sheet.getByRole('button',{name:'Demo records',exact:true})).toBeVisible();await expect(sheet.getByRole('button',{name:'Connect Keplr',exact:true})).toBeVisible();
 for(const button of await sheet.getByRole('button').all()){const b=(await button.boundingBox())!;expect(b.height).toBeGreaterThanOrEqual(44);}
 // Gate C (persona round): the storage line the page shortens ("This device o…") is in the sheet in full.
 await expect(sheet.locator('.phone-status-storage')).toContainText('This device only · account sync is off');
 await sheet.getByRole('button',{name:'Close Status',exact:true}).click();
 await expect(sheet).toBeHidden();await expect(page.getByRole('button',{name:'More',exact:true})).toBeFocused();
 // At 320 px the wallet buttons stack, so no button's words are cut ("Connect Kep").
 await page.setViewportSize({width:320,height:640});
 await openStatusSheet(page);await expect(sheet).toBeVisible();
 for(const name of ['Demo records','Connect Keplr']){const button=sheet.getByRole('button',{name,exact:true});await expect(button).toBeVisible();expect(await button.evaluate(e=>[...e.querySelectorAll('*'),e].every(n=>n.scrollWidth<=n.clientWidth+1||getComputedStyle(n).overflow==='visible')),name).toBe(true);}
});

test('without JavaScript a phone still shows the tab bar, the top bar and the honesty labels',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const page=await context.newPage();
 await page.goto('/app/goals');
 await expect(page.locator('.phone-tabbar')).toBeVisible();await expect(page.locator('.phone-topbar')).toBeVisible();
 // Session AB-Design: the notice is in the page's own HTML (it cannot be closed without scripts) and the footer carries the sentence and the mode.
 // Session AC (owner finding 3): the footer's sentence and mode moved to Settings' facts block, in its server HTML too.
 await expect(alphaNotice(page).locator('strong')).toHaveText(ALPHA_LABEL);await expect(page.locator('.site-footer .mode-strip')).toHaveCount(0);
 // (Without scripts the workspace stays hidden until the stores are read, so the block is read in Settings' server HTML.)
 await page.goto('/app/settings');await expect(aboutAlpha(page).locator('.mode-strip')).toHaveCount(1);await expect(aboutAlpha(page).locator('.mode-strip')).toContainText('LOCAL SIMULATION');
 await expect(aboutAlpha(page).locator('.network-banner')).toContainText(ALPHA_SENTENCE);
 await context.close();
});

test('desktop and tablet keep the sidebar and never render the phone chrome',async({page})=>{
 for(const [width,height] of [[1440,900],[1024,768],[820,1180]] as const){
  await page.setViewportSize({width,height});await page.goto('/app/habits');await expect(page.locator('main h1')).toBeVisible();
  if(await isPhone(page))continue;
  await expect(page.locator('.app-sidebar')).toBeVisible();
  await expect(page.locator('.phone-topbar, .phone-tabbar')).toHaveCount(0);
  // Gate C (the test audit): the line is in the page for phones only by its style; here no one can reach it, by pointer or
  // by assistive technology.
  await expect(page.getByRole('button', {name: /^Status:/})).toHaveCount(0);
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
 await expect(alphaNotice(page).locator('strong')).toHaveText(ALPHA_LABEL); // Session AB-Design: the compact notice stays above the stalled-read panel
 const p=(await panel.boundingBox())!,strip=(await alphaNotice(page).boundingBox())!,tabs=(await page.locator('.phone-tabbar').boundingBox())!;
 expect(p.x).toBeGreaterThanOrEqual(12);expect(p.x+p.width).toBeLessThanOrEqual(390-12);
 expect(p.y).toBeGreaterThanOrEqual(strip.y+strip.height);expect(p.y).toBeLessThan(tabs.y);
 const retry=(await panel.getByRole('button',{name:'Retry'}).boundingBox())!;expect(retry.height).toBeGreaterThanOrEqual(44);expect(retry.y+retry.height).toBeLessThanOrEqual(tabs.y);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test('the names CI journeys click stay visible links on a phone: Today, Goals, Habits, Health and Wealth; Settings through More',async({page})=>{
 // scripts/run10 and scripts/run11 open these pages with getByRole('link',{name,exact:true}).first() at 390x844. Session AB-Design (owner decision D2): Settings is More's row, so those scripts open More first (AB_DESIGN_TO_CLOUD.md).
 await page.setViewportSize({width:390,height:844});await page.goto('/app');await expect(page.locator('main h1')).toBeVisible();
 for(const [name,url] of [['Wealth','/app/wealth'],['Settings','/app/settings'],['Goals','/app/goals'],['Habits','/app/habits'],['Health','/app/health'],['Today','/app']] as const){
  const link=name==='Settings'?await navLink(page,'Settings'):page.getByRole('link',{name,exact:true}).first();await expect(link).toBeVisible();
  const box=(await link.boundingBox())!;expect(box.width,name).toBeGreaterThanOrEqual(44);expect(box.height,name).toBeGreaterThanOrEqual(44);
  await link.click();await page.waitForURL(url==='/app'?/\/app$/:`**${url}`);await expect(page.locator('main h1')).toBeVisible();
 }
});
