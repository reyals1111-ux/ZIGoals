import {expect, test, type Page} from '@playwright/test';
import {LOGO_INTRO_KEY} from '../components/logo-intro-decision';

// Help → "Install ZIGoals on your iPhone" and "Keep my data on this device" (Session L). Detection uses features only:
// the mobile project emulates an iPhone with Chrome, which has no navigator.standalone, so it must not be told it is in
// an iPhone browser. Apple's flag and the display mode are stubbed to stand in for Safari and an installed app.
const status = (page: Page) => page.locator('#install .install-guide .help-status');
const keep = (page: Page) => page.getByRole('button', {name: 'Keep my data on this device', exact: true});
const keepStatus = (page: Page) => page.locator('#install .keep-data').getByRole('status');
async function open(page: Page) { await page.goto('/app/help'); await expect(page.getByRole('heading', {level: 1, name: 'Help.'})).toBeVisible(); }
const storageSnapshot = (page: Page) => page.evaluate(() => ({local: {...localStorage}, session: {...sessionStorage}}));

test('without Apple\'s flag or an installed display mode, the guide gives the general iPhone steps', async ({page}) => {
  await open(page);
  await expect(status(page)).toHaveText('On your iPhone, follow these steps in Safari.');
  const steps = page.locator('#install .help-steps > li');
  await expect(steps).toHaveCount(4);
  await expect(steps.nth(1)).toHaveText('Tap Share, then Add to Home Screen.');
  await expect(page.locator('#install')).toContainText('The installed app keeps its own copy of your data, separate from Safari.');
});

test('an Apple browser is asked to add ZIGoals to the Home Screen', async ({page}) => {
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'standalone', {configurable: true, get: () => false}));
  await open(page);
  await expect(status(page)).toHaveText(/^You’re in a browser\. Add ZIGoals to your Home Screen/);
});

for (const [name, stub] of [
  ['Apple\'s standalone flag', () => Object.defineProperty(Navigator.prototype, 'standalone', {configurable: true, get: () => true})],
  ['the standalone display mode', () => { const real = window.matchMedia.bind(window); window.matchMedia = query => query === '(display-mode: standalone)' ? {matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false} : real(query); }],
] as const) test(`an installed app is recognised from ${name}`, async ({page}) => {
  await page.addInitScript(stub);
  await open(page);
  await expect(status(page)).toHaveText('You’re using ZIGoals as an installed app. Keep opening it from its icon.');
});

/** Stands in for the browser's StorageManager; counts calls. */
function storageStub(page: Page, answer: 'yes' | 'no' | 'throws' | 'missing') {
  return page.addInitScript(answer => {
    const calls = {persist: 0, persisted: 0};
    Object.defineProperty(window, 'keepCalls', {value: calls});
    if (answer === 'missing') { Object.defineProperty(Navigator.prototype, 'storage', {configurable: true, get: () => undefined}); return; }
    const manager = navigator.storage;
    Object.defineProperty(manager, 'persisted', {configurable: true, value: async () => { calls.persisted++; return false; }});
    Object.defineProperty(manager, 'persist', {configurable: true, value: async () => { calls.persist++; if (answer === 'throws') throw Error('no answer'); return answer === 'yes'; }});
  }, answer);
}
const calls = (page: Page) => page.evaluate(() => (window as unknown as {keepCalls: {persist: number; persisted: number}}).keepCalls);

test('viewing Help only reads the state: nothing is asked and nothing is written', async ({page}) => {
  // The shell's once-per-session logo intro is the one writer here that is not Help's, and it is kept out of the
  // comparison twice (Session P): reduced motion declines it, and its session flag is set up front, so a media
  // emulation the browser applies late still finds it played (seen once in CI, run 37070729686: under reduced motion
  // the intro wrote its flag on the mobile project, between the two snapshots). The intro decides after hydration, so
  // each snapshot waits for that decision (data-logo-intro on <html>, logo-intro.tsx) instead of trusting the load event.
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.addInitScript(key => { try { sessionStorage.setItem(key, 'played'); } catch { /* storage denied */ } }, LOGO_INTRO_KEY);
  await storageStub(page, 'yes');
  const decided = () => expect(page.locator('html')).toHaveAttribute('data-logo-intro', /^(reduced-motion|played|hidden)$/);
  await page.goto('/app/settings');await decided();const before = await storageSnapshot(page);
  await open(page);await decided();
  await expect(keepStatus(page)).toHaveText('Your browser hasn’t promised this yet.');
  expect(await calls(page)).toEqual({persist: 0, persisted: 1});
  expect(await storageSnapshot(page)).toEqual(before);
});

for (const [answer, text] of [
  ['yes', 'Done. Your browser will keep ZIGoals’ data on this device unless someone clears it.'],
  ['no', 'Your browser didn’t promise this for now. It decides by itself, based on how you use ZIGoals. Installing ZIGoals on your Home Screen and opening it regularly helps.'],
  ['throws', 'Your browser didn’t answer. Nothing changed; you can try again later.'],
] as const) test(`one tap asks once and shows the browser's answer (${answer})`, async ({page}) => {
  await storageStub(page, answer);await open(page);
  await keep(page).click();
  await expect(keepStatus(page)).toHaveText(text);
  expect((await calls(page)).persist).toBe(1);
});

test('a browser without the Storage API is told plainly, and the button is off', async ({page}) => {
  await storageStub(page, 'missing');await open(page);
  await expect(keepStatus(page)).toHaveText('This browser can’t make this promise. Installing ZIGoals and opening it regularly still helps.');
  await expect(keep(page)).toBeDisabled();
});
