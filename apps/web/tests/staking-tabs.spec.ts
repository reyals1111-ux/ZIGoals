import {expect, test, type Page} from '@playwright/test';

// Session M, Part A3 (QA2-06): Staking no longer shows the Goal workspace tabs ("Goals · Positions") under its title.
// Since #57 "Positions" pointed to /app/staking#positions, the page itself, and neither tab ever showed as current there.
// Positions stay reachable as before: on Staking itself, and from the Goals tab "Positions" and a Goal's own page.
async function start(page: Page, showcase: boolean) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
  if (showcase) { await page.goto('/app/settings'); await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click(); await page.waitForURL('**/app'); }
}

for (const showcase of [true, false]) {
  test(`Staking has no Goal workspace tabs and keeps its Positions section (${showcase ? 'Showcase' : 'empty'})`, async ({page}) => {
    await start(page, showcase);
    await page.goto('/app/staking');
    await expect(page.locator('main h1')).toHaveText('Staking');
    await expect(page.locator('#positions')).toBeAttached();
    await expect(page.getByRole('navigation', {name: 'Goal workspace'})).toHaveCount(0);
  });
}

test('Goals and a Goal\'s page keep the Goal workspace tabs, and "Positions" still lands on Staking\'s Positions', async ({page}) => {
  await start(page, true);
  await page.goto('/app/goals');
  const tabs = page.getByRole('navigation', {name: 'Goal workspace'});
  await expect(tabs.getByRole('link', {name: 'Positions', exact: true})).toHaveAttribute('href', '/app/staking#positions');
  await tabs.getByRole('link', {name: 'Positions', exact: true}).click();
  await expect(page).toHaveURL(/\/app\/staking#positions$/);
  await expect(page.locator('#positions')).toBeVisible();
  await page.goto('/app/goals');
  // A tracked Goal's own page, found as the freeze check finds it (scripts/desktop-freeze-check.mjs).
  const card = page.locator('main a[href^="/app/goals/tracked/"]').first();
  await card.waitFor({state: 'attached'});
  await page.goto((await card.getAttribute('href'))!.split('#')[0]!);
  await expect(page).toHaveURL(/\/app\/goals\/tracked\/[^/]+$/);
  // Phones hide these tabs on a Goal's page (Session E); they stay in the page, as before.
  await expect(page.locator('nav[aria-label="Goal workspace"]')).toHaveCount(1);
});
