import {expect, test} from '@playwright/test';
import {emptyDevice, open, toast} from '../l3-helpers';

/**
 * Session AL sweep 2 (NOVA review M5): with nothing logged today, Today's water tile and Health's water ring say "No water
 * logged yet today", the words NOVA's HUD uses, so their 0 is not read as a measured zero; once a glass is logged the
 * figures read as before. Desktop 1280×800, Brussels at 09:30, fresh profile.
 */
test.use({viewport: {width: 1280, height: 800}, timezoneId: 'Europe/Brussels'});
test('nothing logged: Today and Health say so; a glass, then Undo, back to the same words', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T08:30:00Z')});
  await emptyDevice(page);
  await open(page, '/app');
  const tile = page.getByRole('article', {name: 'Focus: water today'});
  await expect(tile).toContainText('No water logged yet today');
  await tile.getByRole('button', {name: /^Add 250 mL of water$/}).click();
  await expect(tile.locator('strong')).toHaveText('250 mL');
  await expect(tile).not.toContainText('No water logged yet today');
  await toast(page).getByRole('button', {name: /^Undo/}).click();
  await expect(tile).toContainText('No water logged yet today');
  await open(page, '/app/health');
  const water = page.getByRole('region', {name: 'Water journal', exact: true});
  await expect(water.getByRole('img', {name: /^No water logged yet today/})).toBeVisible();
  await expect(water).toContainText('No water logged yet today.');
});
