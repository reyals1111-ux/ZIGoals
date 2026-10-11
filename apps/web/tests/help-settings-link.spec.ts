import {expect, test} from '@playwright/test';

// The one link to Help in Settings (Session L): there exactly once, under the page title, 44 px tall, and it opens Help.
const NAME = 'Help: install on iPhone, keep your data safe, send feedback →';

test('Settings links to Help exactly once, near the top, and back', async ({page}) => {
  await page.goto('/app/settings');
  // Session Z-Cloud Part 4.11: Help is also the navigation's last entry (the sidebar, and More on a phone). The page itself
  // still links to it exactly once; every other Help link is a navigation entry named "Help": at most two in the page
  // (the sidebar, and More's row on a phone), exactly one in the sidebar, and one per navigation a person can reach (a
  // computer's phone chrome can still be in the page, hidden, until the layout is known, so the last check counts what
  // shows, once the page has settled).
  await expect(page.locator('main a[href="/app/help"]')).toHaveCount(1);
  await expect(page.locator('nav.app-nav a[href="/app/help"]')).toHaveCount(1);
  const others = (await page.locator('a[href="/app/help"]:not(main a)').allTextContents()).map(text => text.trim());
  expect(others.length).toBeLessThanOrEqual(2);
  expect(others.every(text => text === 'Help'), JSON.stringify(others)).toBe(true);
  const reachable = () => page.locator('a[href="/app/help"]:not(main a)').evaluateAll(links => links.filter(a => a.getClientRects().length > 0).map(a => {
    const box = a.closest('nav, [role="dialog"]');
    return box ? [...document.querySelectorAll('nav, [role="dialog"]')].indexOf(box) : -1;
  }));
  await expect.poll(async () => { const boxes = await reachable(); return boxes.every(b => b >= 0) && new Set(boxes).size === boxes.length; }, {message: 'one Help entry per navigation that shows'}).toBe(true);
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
