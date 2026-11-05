import {expect, test} from '@playwright/test';
import {emptyDevice, hydrated, offline, open} from '../l3-helpers';

/**
 * Session AL Part 13 (PR-002, PR-019, PR-023, PR-082; NOVA review 2 M5): one fact, one figure on every page.
 * Showcase: "Drink water" is 2 liters linked to the water journal, so Today's water tile, Health's water journal and the
 * habit card all say 1 liter today; Goals and Today count the same active goals. Fresh profile: nothing logged is "—"
 * with its reason on Today's tile, never "0 mL". Desktop 1280×800, Brussels, 15:00 local (never the real clock).
 */
test.use({viewport: {width: 1280, height: 800}, timezoneId: 'Europe/Brussels'});

test('Showcase: water and the Drink water habit agree on Today, Health and Habits; Goals and Today count 7 active goals', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T14:00:00Z')});
  await offline(page);
  await page.goto('/app/settings');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('/app/settings'); await hydrated(page);
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app'); await hydrated(page);
  const tile = page.getByRole('article', {name: 'Focus: water today'});
  await expect(tile.locator('strong')).toHaveText('1,000 mL');
  await expect(tile).toContainText('of 2,000 mL today');
  await open(page, '/app/health');
  await expect(page.getByRole('region', {name: 'Water journal', exact: true})).toContainText('1,000 mL recorded');
  await expect(page.getByRole('region', {name: 'Water journal', exact: true})).toContainText('2,000 mL personal target');
  await open(page, '/app/habits');
  const card = page.getByRole('article', {name: 'Drink water', exact: true});
  await expect(card.locator('.habit-count')).toHaveText('1 / 2 liters');
  await open(page, '/app/goals');
  await expect(page.locator('.goals-figures div').filter({hasText: 'Active'}).locator('strong')).toHaveText('7');
  await expect(page.locator('.goals-figures div').filter({hasText: 'Finished'}).locator('strong')).toHaveText('3');
});

test('fresh profile: Today\'s water tile says "—" and why, never a measured 0 mL', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T14:00:00Z')});
  await emptyDevice(page);
  await open(page, '/app');
  const tile = page.getByRole('article', {name: 'Focus: water today'});
  await expect(tile.locator('strong')).toHaveText('—');
  await expect(tile).toContainText('No water logged yet today');
  await expect(tile).not.toContainText('0 mL');
});
