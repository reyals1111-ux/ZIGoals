import {expect, test} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {EARLIER_LINKS, WHATS_NEW_LINKS} from '../components/for-you/whats-new-card';

// The one-time "What's new" card (Session P, owner addition 4): once per device, never during onboarding, links to Help.
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });
const seed = async (page: import('@playwright/test').Page) => {
  const {records} = buildShowcase('2026-09-20');
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true})});
};

test('a brand-new device sees the welcome and no "What\'s new" card', async ({page}) => {
  await page.goto('/app');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.getByRole('region', {name: 'A few new things.'})).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), WHATS_NEW_KEY)).toBeNull();
});

test('after onboarding the card lists the Help entries, is dismissed once per device and writes nothing on view', async ({page}) => {
  await seed(page);
  await page.goto('/app');
  const card = page.getByRole('region', {name: 'A few new things.'});
  await expect(card).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), WHATS_NEW_KEY)).toBeNull();
  const links = card.getByRole('link');
  await expect(links).toHaveCount(WHATS_NEW_LINKS.length);
  for (const [index, link] of WHATS_NEW_LINKS.entries()) { await expect(links.nth(index)).toHaveText(link.label); await expect(links.nth(index)).toHaveAttribute('href', link.href); }
  const got = card.getByRole('button', {name: 'Got it', exact: true});
  expect((await got.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await got.click();
  await expect(card).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), WHATS_NEW_KEY)).toBe(JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}));
  await page.reload();
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.getByRole('region', {name: 'A few new things.'})).toHaveCount(0);
});

test('a link opens its Help answer; the earlier release\'s links wait under "Earlier updates"', async ({page}) => {
  await seed(page);
  await page.goto('/app');
  const card = page.getByRole('region', {name: 'A few new things.'});
  // Session W Part 24: no promise that everything stays on this device (Spotify and chess reach their own sites).
  await expect(card).toContainText('Each one is optional, and nothing changes until you use it.');
  await expect(card).not.toContainText('stays on this device');
  // Session X-Local Part 8: this release's links are the card's own; Session W's wait under "Earlier updates" with Session V's.
  await card.getByRole('link', {name: 'ZIGi comes alive: the real art, idle, emotions'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-your-ai-alive$/);
  await expect(page.locator('#help-your-ai-alive')).toHaveAttribute('open', '');
  await page.goto('/app');
  await expect(card.getByRole('link', {name: 'Sleep and sleep debt'})).toHaveCount(0);
  await expect(card.getByRole('link', {name: 'Habits that tick themselves off from Health'})).toHaveCount(0);
  await card.getByText('Earlier updates', {exact: true}).click();
  const earlier = card.locator('.whats-new-earlier').getByRole('link');
  await expect(earlier).toHaveCount(EARLIER_LINKS.length);
  await card.getByRole('link', {name: 'Sleep and sleep debt'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-w-sleep$/);
  await expect(page.locator('#help-w-sleep')).toHaveAttribute('open', '');
  await page.goto('/app');
  await card.getByText('Earlier updates', {exact: true}).click();
  await card.getByRole('link', {name: 'Habits that tick themselves off from Health'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-auto-checkins$/);
  await expect(page.locator('#help-auto-checkins')).toHaveAttribute('open', '');
  await expect(page.locator('#help-auto-checkins')).toContainText('Tapping the habit yourself always wins');
});
