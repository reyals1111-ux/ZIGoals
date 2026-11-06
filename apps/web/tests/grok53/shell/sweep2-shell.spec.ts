import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

/**
 * Session AL sweep 2 (L10a third pass requests; LA-024 / N-LS-05). Fresh profile; every /api request answers 503.
 * - The sidebar's "ZIGoals home" link: its name is its aria-label, and the wordmark beside the Z logo is hidden from
 *   assistive technology (axe image-redundant-alt: the logo's alt "ZIGoals" beside the text "ZIGoals"). The logo's alt
 *   stays (pinned by tests/motion-arrival.spec.ts). The phone's More sheet keeps its readable wordmark.
 * - NOVA's two side panels sit inside the shell's <main>: named regions, not complementary landmarks
 *   (axe landmark-complementary-is-top-level); no complementary landmark is left inside NOVA's frame.
 */
test.beforeEach(async ({page}) => { await offlineApi(page); });

test('the sidebar link is named once: wordmark hidden, logo alt kept (1440)', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await freshDevice(page);
  await page.goto('/app'); await hydrated(page);
  const home = page.locator('.app-sidebar a.brand');
  await expect(home).toHaveAttribute('aria-label', 'ZIGoals home');
  await expect(home.locator('.brand-wordmark')).toHaveAttribute('aria-hidden', 'true');
  await expect(home.locator('img.brand-logo')).toHaveAttribute('alt', 'ZIGoals');
  await expect(page.getByRole('link', {name: 'ZIGoals home'})).toHaveCount(1);
});

test('the phone\'s More sheet keeps a readable wordmark (390)', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await freshDevice(page);
  await page.goto('/app'); await hydrated(page);
  await page.getByRole('button', {name: 'More', exact: true}).click();
  const word = page.locator('.phone-more-signature .brand-wordmark');
  await expect(word).toBeVisible();
  await expect(word).not.toHaveAttribute('aria-hidden', 'true');
});

test('NOVA: the side panels are named regions inside main, no complementary landmark left there (1440)', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await freshDevice(page);
  await page.evaluate(() => localStorage.setItem('zigoals:nova:v1', JSON.stringify({version: 1, openingSeen: true})));
  await page.goto('/app/nova'); await hydrated(page);
  await expect(page.locator('aside.nova-left')).toHaveAttribute('role', 'region');
  await expect(page.getByRole('main').getByRole('region', {name: /navigation$/})).toBeVisible();
  await page.getByRole('button', {name: 'Show Behind the intelligence'}).click();
  const right = page.getByRole('region', {name: 'Behind the intelligence'});
  await expect(right).toBeVisible();
  await expect(page.locator('aside.nova-right:not([aria-busy])')).toHaveAttribute('role', 'region');
  await expect(page.locator('.nova-frame').getByRole('complementary')).toHaveCount(0);
});
