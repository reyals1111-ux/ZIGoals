import {expect, test} from '@playwright/test';
import {HEALTH_STORAGE_KEY} from '../../../lib/health';
import {emptyDevice, open, toast} from '../l3-helpers';

/**
 * NB-081/NB-089 (P-NB-27): Today's "Add 250 mL" toast offers Undo; Undo must remove THAT entry from the Health store, and
 * every page must say so (Today's tile, Health's water journal, after a reload too). Bot: desktop 1280×800, Dark, 02:13.
 */
test.use({viewport: {width: 1280, height: 800}, timezoneId: 'Europe/Brussels'});
test('NB-081/NB-089: Today water toast Undo removes the entry from the store and from every page', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T01:13:00Z')}); // 02:13 Brussels
  await emptyDevice(page, {theme: 'dark'});
  await open(page, '/app');
  const tile = page.getByRole('article', {name: 'Focus: water today'});
  await tile.getByRole('button', {name: /^Add 250 mL of water$/}).click();
  await expect(toast(page)).toContainText('Water logged: 250 mL.');
  await expect(tile.locator('strong')).toHaveText('250 mL');
  await toast(page).getByRole('button', {name: /^Undo/}).click();
  await expect(toast(page)).toContainText('Water entry removed.');
  // Session AL (Part 13, deliberate; NOVA review 2 M5): nothing logged is "—", never a measured "0 mL", with NOVA's words.
  await expect(tile.locator('strong')).toHaveText('—');
  await expect(tile).toContainText('No water logged yet today');
  // The store itself: no water entry left.
  const water = await page.evaluate(k => (JSON.parse(localStorage.getItem(k) ?? '{}').daily?.water ?? []).length, HEALTH_STORAGE_KEY);
  expect(water).toBe(0);
  await page.reload(); await open(page, '/app');
  await expect(page.getByRole('article', {name: 'Focus: water today'}).locator('strong')).toHaveText('—');
  await expect(page.getByRole('article', {name: 'Focus: water today'})).toContainText('No water logged yet today');
  await open(page, '/app/health');
  await expect(page.getByRole('region', {name: 'Water journal'})).toContainText('No water entries yet');
});
