import {expect, test} from '@playwright/test';
import {SOL, addMoneyFixtures, ready} from './add-money-fixtures';

/**
 * Session AF (L2b, Part 4; A2.2–A2.5): Add money at phone width (390 × 844), run in WebKit by playwright.webkit.config.ts
 * (evidence labelled "WebKit", never "Safari on an iPhone") and in Chrome by the main config. No sideways scroll, every
 * choice a 44 px target, the warning on screen before the hand-off, nothing opened at the provider.
 */
test.use({viewport: {width: 390, height: 844}});
test('phone: the steps fit, every choice is 44 px, the network warning shows, the hand-off is a new-tab link', async ({page}) => {
  const hits = await addMoneyFixtures(page);
  await ready(page, '/app/wealth/add-money');
  const view = page.locator('.add-money');
  await view.getByRole('group', {name: 'What to buy'}).getByRole('button', {name: /Tether USD/}).click();
  const networks = view.getByRole('group', {name: 'Network'});
  await expect(networks.getByRole('button', {name: /^Solana/})).toHaveAttribute('aria-pressed', 'true');
  await expect(view.locator('[data-network-warning]')).toContainText('Your wallet must be on this network: Solana.');
  await expect(view.getByRole('group', {name: 'Your wallet on this network'}).getByRole('button')).toContainText('Phantom');
  await expect(view.getByRole('link', {name: /Continue on Ramp/})).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(view.locator('.add-money-address code')).toHaveText(SOL);
  for (const control of await view.locator('button, summary, a').all()) {
    if (!await control.isVisible()) continue;
    const box = (await control.boundingBox())!;
    expect(box.height, await control.textContent() ?? '').toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  expect(hits).toEqual([]);
});
