import {expect, test} from '@playwright/test';
import {createHabit, emptyDevice, open, toast} from '../l3-helpers';

/**
 * Session AL third pass (lane L3): Today rows. Fresh empty profile, fixed clock and zone (09:00 Brussels, after the
 * default 07:00 wake), every /api request answered 503. Production build of main expected to FAIL, the branch to PASS.
 */
test.use({timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => { await page.clock.setFixedTime(new Date('2026-11-05T08:00:00Z')); });

test('NB-138 (P-NB-43): Today logs last night in one tap, with an Undo that removes exactly that night', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await emptyDevice(page);
  await open(page, '/app');
  const tile = page.getByRole('article', {name: 'Focus: sleep'});
  await expect(tile.getByText('No night logged')).toBeVisible();
  await tile.getByRole('button', {name: 'Log 7 hours of sleep last night'}).click();
  await expect(toast(page)).toContainText('Last night saved: 7 h of sleep.');
  await expect(tile.locator('strong')).toHaveText('7 h 00 min');
  await toast(page).getByRole('button', {name: /Undo/}).click();
  await expect(tile.getByText('No night logged')).toBeVisible();
  // The Health page agrees: no night is left behind.
  await open(page, '/app/health?view=sleep');
  await expect(page.getByText('Last night is already logged')).toHaveCount(0);
});

test('TK-148/N-TK-21 (P-TK-26): with records kept, "Make Today yours" waits after the data and can be put away', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await emptyDevice(page);
  await createHabit(page, 'Fictional stretch');
  await open(page, '/app');
  const card = page.locator('.dashboard-welcome');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Your records are already on Today.');
  // After the data: Today's focus comes first in reading order.
  const focus = await page.getByRole('heading', {name: 'Today’s focus'}).boundingBox(), make = await card.boundingBox();
  expect(make!.y).toBeGreaterThan(focus!.y);
  await card.getByRole('button', {name: 'Keep this layout and hide this', exact: true}).click();
  await expect(page.locator('.dashboard-welcome')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('main h1').first()).toBeAttached();
  await expect(page.locator('.dashboard-welcome')).toHaveCount(0);
});

test('LS-024/LC-014 (P-LS-34): Today and Habits count the same habits due today', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await emptyDevice(page);
  const one = await createHabit(page, 'Fictional read');
  await createHabit(page, 'Fictional walk');
  await one.getByRole('button', {name: 'Complete Fictional read', exact: true}).click();
  await open(page, '/app');
  await expect(page.locator('[data-today-line]')).toContainText('1 of 2 habits');
  await open(page, '/app/habits');
  await expect(page.getByRole('region', {name: 'Today’s habit progress'})).toContainText('1');
  await expect(page.getByRole('region', {name: 'Today’s habit progress'})).toContainText('2');
});

test('T-070 (P-DVR-81, Q7 replay): a long unbroken name never pushes Today sideways at 375 px', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await emptyDevice(page);
  const long = 'Fictional' + 'x'.repeat(70);
  const card = await createHabit(page, long);
  await card.getByRole('button', {name: `Complete ${long}`, exact: true}).click();
  await open(page, '/app');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test('Q24: ZIGoals Wrapped\'s Today card stays away on a new device in November (fewer than 30 logged days)', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await emptyDevice(page);
  await createHabit(page, 'Fictional stretch');
  await open(page, '/app');
  await expect(page.locator('.today-wrapped-card')).toHaveCount(0);
});
