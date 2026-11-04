import {expect, test} from '@playwright/test';
import {createHabit, emptyDevice, toast} from '../l3-helpers';

/** PR-044, NB-068, NB-131, NB-188 (P-NB-26): a skip, with or without a reason, can be undone from its toast and from the card. */
test.use({viewport: {width: 1280, height: 800}, timezoneId: 'Europe/Brussels'});
test('PR-044/NB-068: Skip today offers Undo, which makes the habit due again; a reason is optional', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T09:00:00Z')});
  await emptyDevice(page);
  const card = await createHabit(page, 'Stretch');
  await card.getByRole('button', {name: 'Details for Stretch'}).click();
  await card.getByRole('button', {name: 'Skip today…'}).click();
  await card.getByRole('button', {name: 'Skip today', exact: true}).click(); // no reason picked (NB-188 refused it silently)
  await expect(card.locator('.habit-result')).toHaveText('Skipped');
  await expect(toast(page)).toContainText('Stretch skipped today.');
  await toast(page).getByRole('button', {name: /^Undo/}).click();
  await expect(card.locator('.habit-result')).toHaveText('Due');
  // And from the card itself, without the toast.
  await card.getByRole('button', {name: 'Skip today…'}).click();
  await card.getByRole('button', {name: 'Rest day'}).click();
  await card.getByRole('button', {name: 'Skip today', exact: true}).click();
  await expect(card.locator('.habit-result')).toHaveText('Skipped');
  await card.getByRole('button', {name: 'Undo skip'}).click();
  await expect(card.locator('.habit-result')).toHaveText('Due');
});
