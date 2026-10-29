import {expect, test, type Page} from '@playwright/test';

/**
 * Session AJ (item 8): the owner's decisions themselves, pinned in the browser (the unit pins I5 and ST5 are in
 * lib/owner-decisions.test.ts). A later change to one of these has to say it is changing an owner decision.
 * - GO3: the Goal wizard keeps its four steps, and "Create goal" is there on step 1.
 * - TO1: Today is on by default (bare /app opens Today) and can be switched off.
 * - ZI5: ZIGi's sharing switches and "Include Health" show before any AI is connected.
 */
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}})); });
async function freshDevice(page: Page) {
  await page.goto('/app/settings');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); });
}
const hydrated = (page: Page) => expect(page.locator('html')).toHaveAttribute('data-app-hydrated', '', {timeout: 20_000});

test('GO3: the Goal wizard has its four steps, and "Create goal" is offered on step 1', async ({page}) => {
  await freshDevice(page);
  await page.goto('/app/goals/new'); await hydrated(page);
  const steps = page.getByRole('list', {name: 'Goal creation progress'}).getByRole('listitem');
  await expect(steps).toHaveText([/^1\s*Purpose$/, /^2\s*Optional sources$/, /^3\s*Optional Habit$/, /^4\s*Review$/]);
  await expect(steps.first()).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('button', {name: 'Create goal', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Continue →', exact: true})).toBeVisible();
});

test('TO1: bare /app opens Today by default, and Today can be switched off', async ({page}) => {
  await freshDevice(page);
  await page.goto('/app'); await hydrated(page);
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.locator('.today-hero')).toBeVisible();
  await page.goto('/app/settings#your-pages'); await hydrated(page);
  const today = page.locator('#your-pages').getByRole('switch', {name: 'Today', exact: true});
  await expect(today).toBeChecked();
  await today.click(); // a controlled switch: the saved choice turns it off a moment later
  await expect(today).not.toBeChecked();
  await expect(page.locator('#your-pages')).toContainText('Today is hidden. You can show it again here at any time.');
  await page.goto('/app'); await hydrated(page);
  await expect(page).not.toHaveURL(/\/app$/);
  await expect(page.locator('main h1').first()).toBeVisible();
});

test('ZI5: the sharing switches and "Include Health" show before any AI is connected', async ({page}) => {
  await freshDevice(page);
  await page.goto('/app/settings'); await hydrated(page);
  const privacy = page.getByRole('region', {name: 'Privacy & data'});
  await expect(privacy).toContainText('What each page may share', {timeout: 30_000});
  await expect(privacy).toContainText('These apply once you connect your own AI. With no AI connected, nothing leaves this device');
  await expect(privacy.getByRole('switch', {name: /^Include Health/})).toBeAttached();
  expect(await privacy.getByRole('switch').count()).toBeGreaterThan(3);
});
