import {expect, test, type Page} from '@playwright/test';

/** Session AA-Cloud Part 6: the Data health page, the offline pill and Undo on the reversible actions. */
test.beforeEach(async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
});
async function showcase(page: Page) {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
}
const undo = (page: Page) => page.getByRole('status').getByRole('button', {name: 'Undo'});

test('Settings → Your data: where each part lives, what this device holds, what ZIGi can see; it changes nothing', async ({page}) => {
  await showcase(page);
  await page.goto('/app/settings');
  await page.getByRole('link', {name: /^Your data/}).click();
  await expect(page).toHaveURL(/\/app\/settings\/data$/);
  await expect(page).toHaveTitle(/Your data/);
  const before = await page.evaluate(() => JSON.stringify(Object.entries(sessionStorage).concat(Object.entries(localStorage)).sort()));
  const synced = page.getByRole('region', {name: 'Synced records'});
  await expect(synced.getByRole('listitem')).toHaveCount(4);
  await expect(synced.getByRole('listitem').filter({hasText: 'Habits and check-ins'})).toContainText(/\d+(\.\d)? (B|kB|MB)/);
  await expect(page.getByRole('region', {name: 'Kept on this device'})).toContainText('Goal plans, life areas, visions and sub-goals');
  await expect(page.getByRole('region', {name: 'Worked out each time'})).toContainText('Calculator results');
  await expect(page.getByRole('region', {name: 'Your copies'})).toContainText('Not recorded');
  await expect(page.getByRole('region', {name: 'What ZIGi can see'})).toContainText(/ZIGi is (off|on)/);
  expect(await page.evaluate(() => JSON.stringify(Object.entries(sessionStorage).concat(Object.entries(localStorage)).sort()))).toBe(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('offline, the header says so in a small pill; nothing is wider than a 360 px phone', async ({page, context, isMobile}) => {
  if (isMobile) await page.setViewportSize({width: 360, height: 780});
  await page.goto('/app/goals');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.locator('.offline-pill')).toHaveCount(0);
  await context.setOffline(true);
  const pill = page.locator('.offline-pill').filter({visible: true});
  await expect(pill).toHaveCount(1);
  await expect(pill).toContainText('Offline');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await context.setOffline(false);
  await expect(page.locator('.offline-pill').filter({visible: true})).toHaveCount(0);
});

test('Undo: a removed favourite and a removed milestone come back in place', async ({page}) => {
  await showcase(page);
  await page.goto('/app/wealth');
  await expect(page.locator('[data-layout-item="wealth:watchlist"]')).toBeVisible();
  const fold = page.locator('[data-layout-item="wealth:watchlist"]').getByRole('button', {name: /Your favourite markets/});
  if (await fold.count()) await fold.click();
  const remove = page.getByRole('button', {name: /^Remove .+ favourite$/}).first();
  await expect(remove).toBeVisible();
  const name = (await remove.getAttribute('aria-label'))!.replace(/^Remove | favourite$/g, '');
  await remove.click();
  await expect(page.getByRole('button', {name: `Remove ${name} favourite`})).toHaveCount(0);
  await undo(page).click();
  await expect(page.getByRole('button', {name: `Remove ${name} favourite`})).toBeVisible();
  // A milestone.
  await page.goto('/app/goals/tracked/9205');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Launch my creative studio');
  await page.locator('summary').filter({hasText: /^Milestones/}).first().click();
  const edit = page.getByRole('button', {name: /^Edit milestone /}).first();
  await expect(edit).toBeVisible();
  const title = (await edit.getAttribute('aria-label'))!.replace(/^Edit milestone /, '');
  await edit.click();
  await page.getByRole('button', {name: 'Remove milestone'}).click();
  await expect(page.getByRole('button', {name: `Edit milestone ${title}`})).toHaveCount(0);
  await undo(page).click();
  await expect(page.getByRole('button', {name: `Edit milestone ${title}`})).toBeVisible();
});
