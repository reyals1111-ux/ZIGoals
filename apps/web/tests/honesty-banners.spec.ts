import {expect,test,type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY,presetSettings} from '../lib/dashboard-settings';
import {createEmptyHealth,HEALTH_STORAGE_KEY} from '../lib/health';
import {ACCOUNT_SELECTOR} from '../lib/account-session';

// Part 15: the testnet bar and the mode strip follow the app mode. A private store that is loading, unreadable,
// corrupt or written by a newer build must never hide them (deploy #12 hid both when Today settings failed to read).
const PAGES=['/app','/app/goals','/app/staking','/app/habits','/app/health','/app/wealth','/app/markets','/app/ecosystem','/app/activity','/app/settings'];
const UNREADABLE='Private data could not be read. It has not been changed.';
test.beforeEach(async({page})=>{await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'LOCAL_FIXTURE_ONLY'}}));});
async function expectBanners(page:Page,path:string){
 await expect(page.locator('.app-topbar'),path).toBeVisible();
 await expect(page.locator('.app-topbar .network-banner'),path).toContainText('ZIGCHAIN TESTNET · PUBLIC ALPHA');
 await expect(page.locator('.mode-strip'),path).toBeVisible();
 await expect(page.locator('.mode-strip'),path).toContainText('LOCAL SIMULATION');
}

const stores=[
 {name:'Today settings written by a newer build',key:DASHBOARD_SETTINGS_KEY,value:JSON.stringify({...presetSettings('balanced'),schemaVersion:3}),unreadableOn:['/app']}, // v2 is read since Session P (timezone phase 3); 3 is the next unknown version
 {name:'corrupt Today settings',key:DASHBOARD_SETTINGS_KEY,value:'{"schemaVersion":1,"kind":"zigoals-settings",',unreadableOn:['/app']},
 {name:'Health with a field this build does not know',key:HEALTH_STORAGE_KEY,value:JSON.stringify({...createEmptyHealth(),futureGroup:{version:1}}),unreadableOn:['/app','/app/health']},
 {name:'corrupt Health',key:HEALTH_STORAGE_KEY,value:'not json',unreadableOn:['/app','/app/health']},
];
for(const store of stores)
 test(`${store.name}: the honesty banners stay on every main page and the read error shows where it belongs`,async({page})=>{
  await page.addInitScript(({key,value})=>{if(!sessionStorage.getItem('fixture-seeded')){localStorage.setItem(key,value);sessionStorage.setItem('fixture-seeded','1');}},{key:store.key,value:store.value});
  for(const path of PAGES){
   await page.goto(path);await expect(page.locator('main h1').first(),path).toBeVisible();
   await expectBanners(page,path);
   if(store.unreadableOn.includes(path))await expect(page.getByText(UNREADABLE).first(),path).toBeVisible();
  }
  // Nothing was rewritten or dropped along the way.
  expect(await page.evaluate(key=>localStorage.getItem(key),store.key)).toBe(store.value);
 });

test('a damaged account selection keeps the honesty banners and says so',async({page})=>{
 await page.addInitScript(key=>sessionStorage.setItem(key,'{"version":9}'),ACCOUNT_SELECTOR);
 for(const path of PAGES){
  await page.goto(path);await expect(page.locator('main h1').first(),path).toBeVisible();
  await expectBanners(page,path);
  await expect(page.locator('.workspace-status'),path).toContainText('Account selection needs attention');
 }
});

test.describe('while private stores are still loading',()=>{
 // Without scripts the page stays in its server-rendered state: no private store has been read yet.
 test.use({javaScriptEnabled:false});
 test('the honesty banners are already visible on every main page',async({page})=>{
  for(const path of PAGES){
   await page.goto(path);
   await expect(page.locator('.workspace'),path).toHaveAttribute('aria-busy','true');
   await expectBanners(page,path);
  }
 });
});

test('a readable Health/Habits-only Today still hides the financial bars, as chosen',async({page})=>{
 await page.addInitScript(({key,value})=>{if(!sessionStorage.getItem('fixture-seeded')){localStorage.setItem(key,value);sessionStorage.setItem('fixture-seeded','1');}},{key:DASHBOARD_SETTINGS_KEY,value:JSON.stringify(presetSettings('habits-health'))});
 await page.goto('/app/habits');await expect(page.locator('main h1').first()).toBeVisible();
 await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy','true');
 await expect(page.locator('.app-topbar')).toHaveCount(0);await expect(page.locator('.mode-strip')).toHaveCount(0);
});
