import {expect, test, type Page} from '@playwright/test';

/**
 * Session AV Part 2 ([TIER 3] (PWA), ADR-045 D-PWA, owner amendment 6): a friend with the previous version open never sees
 * a crash after a new Alpha is deployed. Proven here with Playwright's own request interception only (nothing test-only
 * ships in the app): the files the old version would load later answer 404 as after a deploy, a page change is answered
 * by a server of another version, and the server names another build. Fictional data; every /api call answers 503.
 */
const NOTE = 'A new version of ZIGoals is ready.';
const OTHER_BUILD = 'f'.repeat(40);
async function fresh(page: Page, path = '/app/health') {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.addInitScript(() => { if (!localStorage.getItem('zigoals:onboarding:v1')) localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); });
  await page.goto(path);
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached'});
  // The parts the page loads right after its first paint are in before the "deploy" (a deploy meets a page that has settled).
  await page.waitForLoadState('networkidle');
}
/** The app's own server now names another build on every page, as after a deploy. */
async function serverServes(page: Page, build: string) {
  await page.route(url => url.pathname === '/app', async route => {
    if (route.request().method() !== 'HEAD') return route.fallback();
    await route.fulfill({status: 200, headers: {'x-zigoals-build': build, 'cache-control': 'no-store'}, body: ''});
  });
}
/** From now on the previous version's files are gone (404) and the server names another build, as after a deploy; the next
 * full page load is the new version. */
async function deploy(page: Page) {
  const state = {gone: true, documents: 0};
  await serverServes(page, OTHER_BUILD);
  await page.route(url => url.pathname.startsWith('/_next/static/'), route => state.gone ? route.fulfill({status: 404, body: 'gone'}) : route.fallback());
  page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) { state.documents += 1; state.gone = false; } });
  return state;
}
const crashed = (page: Page) => page.getByRole('heading', {name: 'This page could not be shown.'});
const documentsOf = (page: Page) => { const seen = {n: 0}; page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) seen.n += 1; }); return seen; };

test('a part of the replaced version is gone: the page reloads once into the newest version and opens it', async ({page}) => {
  await fresh(page);
  const state = await deploy(page);
  // The Measurements view is loaded on demand: after the deploy its file no longer exists.
  await page.getByRole('tab', {name: 'Measurements', exact: true}).click();
  await expect.poll(() => state.documents, {timeout: 15_000}).toBe(1);
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached'});
  await expect(page.getByRole('form', {name: 'Body measurement entry'})).toBeVisible({timeout: 15_000});
  await expect(crashed(page)).toHaveCount(0);
  await expect(page.getByText('Your measurements could not be opened.', {exact: false})).toHaveCount(0);
  // Exactly one reload.
  await page.waitForTimeout(1500);
  expect(state.documents).toBe(1);
});

test('the same version (a refused file, no deploy): nothing reloads; the part says it could not be opened', async ({page}) => {
  await fresh(page);
  const seen = documentsOf(page);
  // Only the Measurements view's own file is refused (known by a literal only it holds), as the network can refuse one file.
  await page.route(url => url.pathname.startsWith('/_next/static/chunks/'), async route => {
    const response = await route.fetch(), text = await response.text();
    if (text.includes('Body measurement entry')) return route.fulfill({status: 404, body: 'gone'});
    await route.fulfill({response, body: text});
  });
  await page.getByRole('tab', {name: 'Measurements', exact: true}).click();
  await expect(page.getByText('Your measurements could not be opened. Reload the page to try again.', {exact: true})).toBeVisible();
  await page.waitForTimeout(1500);
  expect(seen.n).toBe(0);
  await expect(page.getByRole('status').filter({hasText: NOTE})).toHaveCount(0);
});

test('after the reload into another version the page says "Updated to the newest version." once', async ({page}) => {
  await fresh(page, '/app');
  // The tab's own mark, as the previous version's page left it just before reloading (lib/sw/update-recovery.ts).
  await page.evaluate(() => sessionStorage.setItem('zigoals:update-reload:v1', JSON.stringify({at: Date.now(), from: 'an-older-build'})));
  await page.reload();
  await expect(page.getByText('Updated to the newest version.', {exact: true})).toBeVisible({timeout: 15_000});
  await page.reload();
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached'});
  await page.waitForTimeout(2500);
  await expect(page.getByText('Updated to the newest version.', {exact: true})).toHaveCount(0);
});

test('never while the person is busy, and never in a loop: the "new version is ready" note instead', async ({page}) => {
  await fresh(page, '/app/notes');
  await serverServes(page, OTHER_BUILD);
  const seen = documentsOf(page);
  const fail = () => page.evaluate(() => { void Promise.reject(Object.assign(new Error('Loading chunk 9001 failed.'), {name: 'ChunkLoadError'})); });
  // Half a note typed: the failure holds the reload, and the note offers it.
  const field = page.locator('main').getByRole('textbox').first();
  await field.fill('Half a fictional thought');
  await fail();
  const note = page.getByRole('status').filter({hasText: NOTE});
  await expect(note).toBeVisible();
  await page.waitForTimeout(1000);
  expect(seen.n).toBe(0);
  await expect(field).toHaveValue('Half a fictional thought');
  // The field emptied: the next failure reloads once; a failure right after that reload shows the note, not a second reload.
  await note.getByRole('button', {name: 'Later'}).click();
  await field.fill('');
  await Promise.all([page.waitForEvent('load'), fail()]);
  expect(seen.n).toBe(1);
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached'});
  await fail();
  await expect(page.getByRole('status').filter({hasText: NOTE})).toBeVisible();
  await page.waitForTimeout(1000);
  expect(seen.n).toBe(1);
  await expect(note.getByRole('button', {name: 'Reload'})).toHaveCSS('min-height', '44px');
});

test('a page change answered by a server of another version loads the new version fully, with no crash', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await fresh(page, '/app');
  let documents = 0;
  page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents += 1; });
  // Every page-data answer now comes from another deployment (Next compares it with this page's own build).
  await page.route(url => url.searchParams.has('_rsc'), async route => { const response = await route.fetch(); await route.fulfill({response, headers: {...response.headers(), 'x-nextjs-deployment-id': 'another-deployment'}}); });
  const nav = page.getByRole('navigation').first().getByRole('link', {name: 'Habits', exact: true});
  if (await nav.isVisible()) await nav.click(); else await page.getByRole('link', {name: 'Habits', exact: true}).first().click();
  await page.waitForURL('**/app/habits');
  await expect.poll(() => documents, {timeout: 15_000}).toBe(1);
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(crashed(page)).toHaveCount(0);
  expect(errors.filter(e => /module factory|ChunkLoadError|Loading chunk/i.test(e))).toEqual([]);
});

test('an open tab hears that its server now serves another version: the note, and Reload loads it', async ({page}) => {
  await fresh(page, '/app');
  await serverServes(page, OTHER_BUILD);
  // The tab comes back to the front (the check runs at most every ten minutes, here for the first time).
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const note = page.getByRole('status').filter({hasText: NOTE});
  await expect(note).toBeVisible();
  await Promise.all([page.waitForEvent('load'), note.getByRole('button', {name: 'Reload'}).click()]);
  await expect(page.locator('main h1').first()).toBeVisible();
});
