import {expect, test} from '@playwright/test';

// The one link to Help in Settings (Session L): there exactly once, under the page title, 44 px tall, and it opens Help.
const NAME = 'Help: install on iPhone, keep your data safe, send feedback →';

test('Settings links to Help exactly once, near the top, and back', async ({page}) => {
  await page.goto('/app/settings');
  // Session Z-Cloud Part 4.11: Help is also the navigation's last entry (the sidebar, and More on a phone). The page itself
  // still links to it exactly once; every other Help link is a navigation entry named "Help", exactly one per navigation
  // that has it (the sidebar always does; the phone's tab bar holds More's).
  await expect(page.locator('main a[href="/app/help"]')).toHaveCount(1);
  await expect(page.locator('nav.app-nav a[href="/app/help"]')).toHaveCount(1);
  const others = await page.locator('a[href="/app/help"]:not(main a)').evaluateAll(links => links.map(a => {
    const nav = a.closest('nav');
    return {text: a.textContent!.trim(), nav: nav ? [...document.querySelectorAll('nav')].indexOf(nav) : -1};
  }));
  expect(others.every(l => l.text === 'Help' && l.nav >= 0), JSON.stringify(others)).toBe(true);
  expect(new Set(others.map(l => l.nav)).size, JSON.stringify(others)).toBe(others.length);
  const link = page.getByRole('link', {name: NAME, exact: true});
  await expect(link).toBeVisible();await expect(link).toBeInViewport();
  expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await link.click();
  await expect(page).toHaveURL(/\/app\/help$/);
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Help.');
  await page.getByRole('link', {name: '← Back to Settings', exact: true}).click();
  await expect(page).toHaveURL(/\/app\/settings$/);
  await expect(page.getByRole('link', {name: NAME, exact: true})).toBeVisible();
});
