import {expect, test} from '@playwright/test';
import {FOR_YOU_OPEN} from '../components/for-you/for-you';
import {isPhone} from './phone-nav';

// Today's "For you" area (Session P, owner addition 2): at most two cards open, the rest behind one "Show more" row.
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('Showcase: at most two cards are open and the rest fold behind Show more', async ({page}) => {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  const area = page.getByRole('region', {name: 'For you', exact: true});
  await expect(area).toBeVisible();
  const open = area.locator('> .for-you-slot');
  expect(await open.count()).toBeLessThanOrEqual(await isPhone(page) ? FOR_YOU_OPEN.phone : FOR_YOU_OPEN.wide);
  expect(await open.count()).toBeGreaterThan(0);
  const fold = area.getByRole('button', {name: /^Show more \(\d+\)$/});
  if (await fold.count()) {
    const folded = Number((await fold.textContent())!.match(/\((\d+)\)/)![1]);
    const body = area.locator('.for-you-fold .phone-fold-body');
    await expect(body).toBeHidden();
    expect((await fold.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await fold.click();
    await expect(area.getByRole('button', {name: 'Hide', exact: true})).toBeVisible();
    await expect(body.locator('.for-you-slot')).toHaveCount(folded);
    await expect(body).toBeVisible();
  }
  // Nothing is written by viewing: the Showcase session copy keeps every key as loaded.
  const keys = await page.evaluate(() => Object.keys(sessionStorage).filter(k => k.includes('zigoals')).sort());
  await page.reload();
  await expect(area).toBeVisible();
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter(k => k.includes('zigoals')).sort())).toEqual(keys);
});

test('a brand-new device has no For you area', async ({page}) => {
  await page.goto('/app');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.getByRole('region', {name: 'For you', exact: true})).toHaveCount(0);
});
