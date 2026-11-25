import {webkitCancelled} from './webkit-cancelled';
import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {afterGoto} from './settings-open';

/**
 * Session AW (owner amendment 7; ADR-046 Part 6): this session's key new flows in CI's WebKit phone set (390 × 844, the
 * iPhone project, the Showcase's records): FR-TJ-7's Habits (the first Complete on the first screen), a programme day
 * (a step ticked and undone), Read aloud absent without a local voice (a network voice is never offered), an activity's
 * calories as "you entered", and a round 7 named timer (its strip while it runs). Each page opens with no page error
 * (WebKit's cancelled router prefetches excepted, as in webkit-phone). Evidence label: WebKit. Chrome runs the same
 * features in their own aw-*.spec files.
 */
const DAY = '2026-11-17';
test.use({viewport: {width: 390, height: 844}, timezoneId: 'Europe/Brussels'});
type Voice = {name: string; lang: string; localService: boolean; default?: boolean; voiceURI: string};
const NETWORK: Voice = {name: 'Google US English', lang: 'en-US', localService: false, default: true, voiceURI: 'Google US English'};
async function onlyNetworkVoice(page: Page) {
  await page.addInitScript((voice: Voice) => {
    const synth = {speaking: false, paused: false, pending: false, onvoiceschanged: null, getVoices: () => [voice], speak() { (window as unknown as {__spoke: number}).__spoke = 1; }, cancel() { /* nothing */ }, pause() { /* nothing */ }, resume() { /* nothing */ }, addEventListener() { /* nothing */ }, removeEventListener() { /* nothing */ }};
    Object.defineProperty(window, 'speechSynthesis', {configurable: true, get: () => synth});
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {configurable: true, writable: true, value: class { text: string; voice = null; constructor(t: string) { this.text = t; } }});
  }, NETWORK);
}
const errors: {at: number; message: string}[] = [], navigations: number[] = [];
test.beforeEach(async ({page, browserName}, info) => {
  test.skip(browserName !== 'webkit', 'The WebKit job\'s phone set; Chrome covers these flows in the aw-*.spec files.');
  test.skip(info.project.name !== 'mobile', 'A phone set: the iPhone project only.');
  errors.length = 0; navigations.length = 0;
  page.on('pageerror', e => errors.push({at: Date.now(), message: e.message}));
  page.on('request', r => { if (r.isNavigationRequest() && r.frame() === page.mainFrame()) navigations.push(Date.now()); });
  await page.clock.install({time: new Date(`${DAY}T10:30:00+01:00`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings'); await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); },
    {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]})});
});
test.afterEach(() => { expect(errors.filter(e => !webkitCancelled(e, navigations)).map(e => e.message), 'no page error').toEqual([]); });
async function open(page: Page, path: string) { await page.goto(path); await afterGoto(page, path.split('?')[0]!); }

test('FR-TJ-7: on a phone the first Complete is on the first screen, below the top bar', async ({page}) => {
  await open(page, '/app/habits');
  const complete = page.locator('.habits-workspace .habit-grid > .habit-card .habit-check-actions button[aria-pressed]').first();
  await expect(complete).toBeVisible();
  const m = await complete.evaluate(b => ({top: b.getBoundingClientRect().top + scrollY, bar: document.querySelector('.phone-topbar')?.getBoundingClientRect().bottom ?? 0, height: innerHeight}));
  expect(m.bar, JSON.stringify(m)).toBeGreaterThan(0);
  expect(m.top - m.bar, JSON.stringify(m)).toBeLessThanOrEqual(m.height);
});

test('a programme day: a step ticked and undone; no Read aloud with only a network voice', async ({page}) => {
  await onlyNetworkVoice(page);
  await open(page, '/app/guided?programme=run-5k');
  const card = page.getByRole('article', {name: '0 to 5 km in 8 weeks'}).first();
  await expect(card).toBeVisible();
  const done = card.getByRole('button', {name: /^Done: /}).first();
  const label = (await done.getAttribute('aria-label')) ?? (await done.textContent()) ?? '';
  await done.click();
  await expect(card.getByRole('button', {name: label.replace(/^Done: /, 'Undo: ')})).toBeVisible();
  await expect(page.getByRole('button', {name: /^Read aloud/})).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as {__spoke?: number}).__spoke ?? 0)).toBe(0);
});

test('an activity\'s calories show only as "you entered"', async ({page}) => {
  await open(page, '/app/health?view=activity');
  const walk = page.locator('article.health-library-row').filter({has: page.getByRole('heading', {name: 'Showcase walk', exact: true})}).first();
  await expect(walk).toContainText('kcal · you entered');
  await expect(page.locator('main')).not.toContainText(/kcal used|burned about/i);
});

test('a named timer: started from Tasks, its strip on the page while it runs', async ({page}) => {
  await open(page, '/app/tasks');
  await page.getByRole('button', {name: 'More views'}).click();
  await page.getByRole('navigation', {name: 'Task views'}).getByRole('button', {name: 'Timers'}).click();
  const sheet = page.getByRole('dialog', {name: 'Timers'});
  await expect(sheet).toBeVisible();
  await sheet.getByLabel('Name').fill('Fictional pasta');
  await sheet.getByLabel('Minutes').fill('9');
  await sheet.getByRole('button', {name: 'Start', exact: true}).click();
  await sheet.getByRole('button', {name: 'Close'}).click();
  await expect(page.getByRole('group', {name: 'Timers running'})).toContainText('Fictional pasta');
});
