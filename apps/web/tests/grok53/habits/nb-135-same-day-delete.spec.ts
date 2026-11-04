import {expect, test} from '@playwright/test';
import {createHabit, emptyDevice, open, toast} from '../l3-helpers';

/**
 * NB-135/NB-160/NB-181/NB-133 (P-NB-24; N-079, N-088) and PR-043: a habit made by mistake and already ticked today can
 * be archived and deleted for good the same day; Pause and Delete are in the ⋯ menu; archiving says what it did.
 * Bot: Incognito, 03:3x, before the day rolls over.
 */
test.use({viewport: {width: 1280, height: 800}, timezoneId: 'Europe/Brussels'});
test('NB-135: archive and delete for good the same day, with a check-in today; PR-043: the archive is said in a toast', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T02:35:00Z')});
  await emptyDevice(page);
  const card = await createHabit(page, 'Typo habbit');
  await card.getByRole('button', {name: 'Complete Typo habbit'}).click();
  await expect(card.locator('.habit-result')).toHaveText('Complete');
  await card.getByRole('button', {name: 'Options for Typo habbit'}).click();
  const menu = card.getByRole('group', {name: 'Typo habbit options'});
  await expect(menu.getByRole('button', {name: /^Pause from /})).toBeVisible();
  await expect(menu.getByRole('button', {name: 'Delete habit…'})).toBeVisible();
  await menu.getByRole('button', {name: 'Archive habit…'}).click();
  await card.getByRole('alertdialog').getByRole('button', {name: 'Archive habit', exact: true}).click();
  await expect(toast(page)).toContainText('Typo habbit is archived from');
  await card.getByRole('button', {name: 'Delete for good…', exact: true}).click();
  await card.getByLabel('Type the habit’s name to confirm').fill('Typo habbit');
  await card.getByRole('button', {name: 'Delete for good', exact: true}).click();
  await expect(page.getByRole('article', {name: 'Typo habbit', exact: true})).toHaveCount(0);
  await open(page, '/app/habits');
  await expect(page.getByRole('article', {name: 'Typo habbit', exact: true})).toHaveCount(0);
});
