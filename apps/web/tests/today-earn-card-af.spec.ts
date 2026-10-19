import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {EARN_PATH_KEY} from '../lib/af-earn-keys';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';

/**
 * Session AF (P1.30, ADR-028 H104): Today's "Learn to stake, earn and swap — in 30 minutes" card is one of the For you
 * cards, added only while it shows: a person with records but no position on ZIGChain sees it (on a phone behind the
 * one "Show more" row, like every For you card), "Start here" opens Earn's Start-here path, and "Not now" takes it off
 * this device's Today, written in `zigoals:earn-path:v1`, so it stays away after a reload. Offline fixture.
 */
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

async function seed(page: Page) {
  const {records} = buildShowcase('2026-10-19');
  await page.goto('/app/settings');
  await page.evaluate(values => { sessionStorage.clear(); localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); },
    {...records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]})});
  await page.goto('/app');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
}
/** The card's For you slot, opening "Show more" first when the card waits behind it (always on a phone). */
async function earnSlot(page: Page) {
  const area = page.getByRole('region', {name: 'For you', exact: true});
  await expect(area).toBeVisible();
  const slot = area.locator('#for-you-earn-start');
  const fold = area.getByRole('button', {name: /^Show more \(\d+\)$/});
  if (!(await slot.isVisible()) && await fold.count()) await fold.click();
  return slot;
}

test('a newcomer with no position sees the Earn card in For you; Start here opens Earn\'s path', async ({page}) => {
  await seed(page);
  const slot = await earnSlot(page);
  await expect(slot).toBeVisible();
  await expect(slot.getByRole('heading', {name: 'Learn to stake, earn and swap — in 30 minutes', exact: true})).toBeVisible();
  await expect(slot.getByRole('link', {name: 'Start here', exact: true})).toHaveAttribute('href', '/app/earn#start-here');
  const notNow = slot.getByRole('button', {name: 'Not now', exact: true});
  const box = (await notNow.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  // One card, never twice, and not outside For you.
  await expect(page.locator('.today-earn-card')).toHaveCount(1);
});

test('"Not now" takes the card off this device\'s Today, and it stays away after a reload', async ({page}) => {
  await seed(page);
  const slot = await earnSlot(page);
  await slot.getByRole('button', {name: 'Not now', exact: true}).click();
  await expect(page.locator('#for-you-earn-start')).toHaveCount(0);
  expect(JSON.parse((await page.evaluate(k => localStorage.getItem(k), EARN_PATH_KEY))!).todayCard).toBe('dismissed');
  await page.reload();
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.getByRole('region', {name: 'For you', exact: true})).toBeVisible();
  await expect(page.locator('#for-you-earn-start')).toHaveCount(0);
  await expect(page.locator('.today-earn-card')).toHaveCount(0);
});
