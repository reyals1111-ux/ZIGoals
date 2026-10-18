import {expect, test} from '@playwright/test';
import {earnRoutes, seedShowcase} from './earn-fixtures';

/**
 * Session AF (L1): the Earn hub on a phone in WebKit (390 × 844; evidence label: WebKit, never "Safari on an iPhone").
 * The chip index is a rail under the top bar that scrolls sideways on its own while the page never does; every chip is
 * a 44 px target; the guide opens as a bottom sheet above the tab bar and leaves the page usable.
 */
test.use({viewport: {width: 390, height: 844}});
test.beforeEach(async ({browserName}, info) => {
  test.skip(browserName !== 'webkit', 'WebKit only: the Chrome suite covers the phone layout in earn-hub.spec.ts (mobile).');
  test.skip(info.project.name !== 'mobile', 'A phone check: the iPhone project only.');
});

test('the Earn hub at 390 px in WebKit: chip rail, no sideways scroll, 44 px targets, the guide as a bottom sheet', async ({page, context, baseURL}) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const origin = new URL(baseURL!).origin;
  await context.route(url => url.origin !== origin, route => route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>'}));
  await seedShowcase(page);
  await earnRoutes(page);
  await page.goto('/app/earn');
  await expect(page.locator('main h1').first()).toHaveText('Make your money work');
  await expect(page.locator('[data-live-figure="native-apr"]')).toHaveAttribute('data-state', 'ok');
  await page.waitForLoadState('networkidle', {timeout: 10_000}).catch(() => undefined);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  const rail = page.locator('.earn-chips-rail');
  expect(await rail.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  for (const chip of await rail.getByRole('link').all()) expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.locator('#safety').scrollIntoViewIfNeeded();
  const top = (await page.locator('.earn-chips').boundingBox())!.y;
  expect(top).toBeGreaterThanOrEqual(0);
  expect(top).toBeLessThan(140);
  // The guide: a sheet at the bottom, above the tab bar, with 44 px buttons.
  const open = page.locator('#valdora').getByRole('link', {name: /^Open Valdora/});
  await open.scrollIntoViewIfNeeded();
  const [tab] = await Promise.all([context.waitForEvent('page'), open.click()]);
  await tab.close();
  const sheet = page.getByRole('region', {name: 'Guide: Stake ZIG on Valdora for stZIG'});
  await expect(sheet).toBeVisible();
  const box = (await sheet.boundingBox())!;
  expect(box.x).toBeLessThanOrEqual(1);
  expect(box.width).toBeGreaterThanOrEqual(388);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  for (const button of await sheet.getByRole('button').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await sheet.getByRole('button', {name: 'Close the guide'}).click();
  await expect(sheet).toHaveCount(0);
  expect(errors).toEqual([]);
});
