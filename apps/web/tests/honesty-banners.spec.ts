import {expect,test,type Page} from '@playwright/test';
import {ALPHA_LABEL,ALPHA_SENTENCE,aboutAlpha,alphaNotice,expectAlphaFacts,inAboutAlpha} from './ab-shell';
import {DASHBOARD_SETTINGS_KEY,presetSettings} from '../lib/dashboard-settings';
import {ALPHA_ESSENTIALS} from '../components/shell/alpha-notice';
import {createEmptyHealth,HEALTH_STORAGE_KEY} from '../lib/health';
import {ACCOUNT_SELECTOR} from '../lib/account-session';

// Part 15: the testnet bar and the mode strip follow the app mode. A private store that is loading, unreadable,
// corrupt or written by a newer build must never hide them (deploy #12 hid both when Today settings failed to read).
const PAGES=['/app','/app/goals','/app/staking','/app/habits','/app/health','/app/wealth','/app/markets','/app/ecosystem','/app/activity','/app/settings'];
const UNREADABLE='Private data could not be read. It has not been changed.';
test.beforeEach(async({page})=>{await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'LOCAL_FIXTURE_ONLY'}}));});
async function expectBanners(page:Page,path:string){
 // Session AB-Design (owner request 8, ADR-024 D7; assertion re-pointed, as strict): the compact notice at the top and the
 // footer's disclaimer line carry the label, the sentence and the mode on every page; without a wallet the label says
 // practice money (Session Z-Cloud Part 4.3). Session AC (owner finding 3, TIER 3 public-safety labels): the footer's
 // line moved to Settings' facts block; from every page the notice is checked there and the block is reached in-app.
 await expectAlphaFacts(page,path);
 await expect(alphaNotice(page),path).toBeVisible();
 await inAboutAlpha(page,about=>expect(about.locator('.mode-strip'),path).toBeVisible());
}

const stores=[
 {name:'Today settings written by a newer build',key:DASHBOARD_SETTINGS_KEY,value:JSON.stringify({...presetSettings('balanced'),schemaVersion:4}),unreadableOn:['/app']}, // v3 is read since Session W; 4 is the next unknown version
 {name:'corrupt Today settings',key:DASHBOARD_SETTINGS_KEY,value:'{"schemaVersion":1,"kind":"zigoals-settings",',unreadableOn:['/app']},
 {name:'Health with a field this build does not know',key:HEALTH_STORAGE_KEY,value:JSON.stringify({...createEmptyHealth(),futureGroup:{version:1}}),unreadableOn:['/app','/app/health']},
 {name:'corrupt Health',key:HEALTH_STORAGE_KEY,value:'not json',unreadableOn:['/app','/app/health']},
];
for(const store of stores)
 test(`${store.name}: the honesty banners stay on every main page and the read error shows where it belongs`,async({page})=>{
  // Session AC: each of the 10 pages also reaches Settings' facts block in the app (through More on a phone) and back.
  test.slow();
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
 test.slow(); // Session AC: the facts block is reached from each of the 10 pages, twice.
 await page.addInitScript(key=>sessionStorage.setItem(key,'{"version":9}'),ACCOUNT_SELECTOR);
 for(const path of PAGES){
  await page.goto(path);await expect(page.locator('main h1').first(),path).toBeVisible();
  await expectBanners(page,path);
  // Session AC: the storage line left the footer with the facts; it is read in Settings' facts block from every page.
  await inAboutAlpha(page,about=>expect(about.locator('.workspace-status'),path).toContainText('Account selection needs attention'));
 }
});

test.describe('while private stores are still loading',()=>{
 // Without scripts the page stays in its server-rendered state: no private store has been read yet.
 test.use({javaScriptEnabled:false});
 test('the honesty banners are already visible on every main page',async({page})=>{
  for(const path of PAGES){
   await page.goto(path);
   await expect(page.locator('.workspace'),path).toHaveAttribute('aria-busy','true');
   // Without scripts there is no in-app navigation (the phone's More sheet needs them): the notice here, and the facts
   // block from Settings' own server HTML, the same facts the footer's server line carried until Session AC.
   await expect(alphaNotice(page).locator('strong'),path).toHaveText(ALPHA_LABEL);await expect(alphaNotice(page),path).toBeVisible();
   // As expectAlphaFacts does with scripts: the notice also carries the sentence wherever the screen is wider than a phone.
   if(page.viewportSize()!.width>=768)await expect(alphaNotice(page),path).toContainText(ALPHA_SENTENCE);
   // Session AC (owner item 8): without scripts the page stays hidden, so the notice itself shows the essentials (financial
   // execution disabled, unaudited alpha, never share secrets) on every page and width, in Settings' words.
   await expect(alphaNotice(page).locator('.alpha-notice-essentials'),path).toHaveText(ALPHA_ESSENTIALS);await expect(alphaNotice(page).locator('.alpha-notice-essentials'),path).toBeVisible();
   await expect(page.locator('.site-footer .network-banner, .site-footer .mode-strip'),path).toHaveCount(0);
  }
  // Without scripts the workspace stays hidden until the stores are read (every page, Settings too), so the block is
  // asserted in Settings' server HTML, word for word; while loading, the visible facts are the notice's (above).
  await page.goto('/app/settings');
  const about=aboutAlpha(page);await expect(about).toHaveCount(1);
  await expect(about.locator('.network-banner strong')).toHaveText(ALPHA_LABEL);await expect(about.locator('.network-banner')).toContainText(ALPHA_SENTENCE);
  await expect(about.locator('.mode-strip')).toContainText('LOCAL SIMULATION');await expect(about).toContainText('Browser storage is not a backup.');
 });
});

test('a readable Health/Habits-only Today still hides the financial bars, as chosen',async({page})=>{
 await page.addInitScript(({key,value})=>{if(!sessionStorage.getItem('fixture-seeded')){localStorage.setItem(key,value);sessionStorage.setItem('fixture-seeded','1');}},{key:DASHBOARD_SETTINGS_KEY,value:JSON.stringify(presetSettings('habits-health'))});
 await page.goto('/app/habits');await expect(page.locator('main h1').first()).toBeVisible();
 await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy','true');
 await expect(alphaNotice(page)).toHaveCount(0);await expect(page.locator('.site-footer .network-banner, .site-footer .mode-strip')).toHaveCount(0);
 // Session AC: Settings' facts block follows the same choice (no money facts), while its non-financial facts stay.
 await inAboutAlpha(page,async about=>{await expect(about.locator('.network-banner, .mode-strip')).toHaveCount(0);await expect(about).toContainText('Browser storage is not a backup.');},{back:false});
});
