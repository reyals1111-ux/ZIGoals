import {expect, test} from '@playwright/test';
import {verifiedLink} from '../../../packages/ecosystem-registry/src/verified-links';
import {earnRoutes, seedShowcase} from './earn-fixtures';

/**
 * Session AF (L1, ADR-028 H5, H34): guide mode. "Open Valdora" opens a new tab exactly at the verified registry URL (an
 * anchor with noopener noreferrer, never window.open, never a frame) and the step panel stays in ZIGoals; the app page
 * itself never asks the ecosystem site for anything. The new tab is answered by a stub here, so no test reaches Valdora.
 */
test('Open Valdora opens the registry URL in a new tab and keeps the step panel here', async ({page, context, baseURL}) => {
  const origin = new URL(baseURL!).origin;
  await context.route(url => url.origin !== origin, route => route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>'}));
  await seedShowcase(page);
  const requests = await earnRoutes(page);
  await page.goto('/app/earn#valdora');
  const open = page.locator('#valdora').getByRole('link', {name: /^Open Valdora/});
  await expect(open).toHaveAttribute('href', verifiedLink('valdora', 'stake').url);
  await expect(open).toHaveAttribute('target', '_blank');
  await expect(open).toHaveAttribute('rel', 'noopener noreferrer');
  const [tab] = await Promise.all([context.waitForEvent('page'), open.click()]);
  await tab.waitForLoadState('domcontentloaded').catch(() => undefined);
  expect(tab.url()).toBe('https://valdora.finance/stake');
  // noopener: the new tab has no handle back to ZIGoals.
  expect(await tab.evaluate(() => window.opener)).toBeNull();
  await tab.close();
  const panel = page.getByRole('region', {name: 'Guide: Stake ZIG on Valdora for stZIG'});
  await expect(panel).toBeVisible();
  await expect(panel.locator('li[aria-current="step"]')).toContainText('Connect Wallet');
  await panel.getByRole('button', {name: 'Next step', exact: true}).click();
  await expect(panel.locator('li[aria-current="step"]')).toContainText('at least the minimum');
  await expect(panel.getByText('Step 2 of 5')).toBeVisible();
  await panel.getByRole('button', {name: 'Back', exact: true}).click();
  await expect(panel.getByText('Step 1 of 5')).toBeVisible();
  // The page under the panel still works (not a modal), and Escape closes the panel with focus back on the link.
  await expect(page.locator('#oroswap')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(open).toBeFocused();
  expect(requests.filter(url => url.includes('valdora.finance'))).toEqual([]);
  expect(requests.filter(url => !url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:'))).toEqual([]);
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('every guide opens its own registry URL', async ({page, context, baseURL}) => {
  const origin = new URL(baseURL!).origin;
  await context.route(url => url.origin !== origin, route => route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>'}));
  await seedShowcase(page);
  await earnRoutes(page);
  await page.goto('/app/earn');
  for (const [name, url, title] of [
    ['Open Keplr staking', verifiedLink('zig-finance', 'keplr-staking').url, 'Stake ZIG in Keplr'],
    ['Open OroSwap', verifiedLink('oroswap', 'swap').url, 'Swap on OroSwap'],
    ['Open OroSwap pools', verifiedLink('oroswap', 'pools').url, 'Add liquidity on OroSwap'],
  ] as const) {
    const link = page.getByRole('link', {name: new RegExp(`^${name}`)}).first();
    await link.scrollIntoViewIfNeeded();
    const [tab] = await Promise.all([context.waitForEvent('page'), link.click()]);
    await tab.waitForLoadState('domcontentloaded').catch(() => undefined);
    expect(tab.url()).toBe(url);
    await tab.close();
    await expect(page.getByRole('region', {name: `Guide: ${title}`})).toBeVisible();
    await page.getByRole('button', {name: 'Close the guide'}).click();
  }
});
