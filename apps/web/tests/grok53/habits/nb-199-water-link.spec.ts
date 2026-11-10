import {expect, test} from '@playwright/test';
import {emptyDevice, hydrated, logWaterOnHealth, open} from '../l3-helpers';

/**
 * NB-082/NB-199/NB-200/NB-201 (P-NB-28; N-056, N-086, N-015, N-169) and MO-125: a "Drink water, 2 liters" habit reads the
 * water journal, including the 2 L logged before the habit existed; Today, Habits and Health say one number; and when the
 * entry that ticked it off is removed, the habit is due again. Bot: desktop, shared profile, 04:44–04:48.
 */
test.use({viewport: {width: 1280, height: 800}, timezoneId: 'Europe/Brussels'});
test('NB-199/NB-200: the Drink water idea is done by the 2 L already logged; MO-125: removing the water opens it again', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T03:48:00Z')});
  await emptyDevice(page);
  await logWaterOnHealth(page, 1750);
  await logWaterOnHealth(page, 250);
  await open(page, '/app/habits');
  const ideas = page.getByRole('group', {name: 'Start with an idea'});
  await ideas.getByRole('button', {name: /^Add Drink water/}).click();
  const card = page.getByRole('article', {name: 'Drink water', exact: true});
  await expect(card.locator('.habit-count')).toContainText('2 / 2', {timeout: 40_000}); // ticked from the journal (the check runs on load and every 30 s)
  await expect(card.locator('.habit-result')).toHaveText('Complete');
  await page.reload(); await hydrated(page);
  await expect(page.getByRole('article', {name: 'Drink water', exact: true}).locator('.habit-result')).toHaveText('Complete');
  // One number: Today's line and tile say the journal's 2,000 mL.
  await open(page, '/app');
  await expect(page.locator('[data-today-line]')).toContainText('2,000 mL water');
  await expect(page.getByRole('article', {name: 'Focus: water today'}).locator('strong')).toHaveText('2,000 mL');
  // MO-125: remove the 250 mL entry on Health; the habit is due again on Habits.
  await open(page, '/app/health');
  await page.getByRole('button', {name: 'Remove water 250'}).click();
  await open(page, '/app/habits');
  await expect(page.getByRole('article', {name: 'Drink water', exact: true}).locator('.habit-result')).toHaveText('Due', {timeout: 40_000});
});
