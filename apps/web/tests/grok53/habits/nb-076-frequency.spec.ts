import {expect, test} from '@playwright/test';
import {emptyDevice, open} from '../l3-helpers';
import {openHabitMoreOptions} from '../../habit-form-helpers';

/** NB-076/NB-158 (P-NB-23; H-008): a "3× per week" habit's card says how the week stands, not only "0 / 1 time today". */
test.use({viewport: {width: 1280, height: 800}, timezoneId: 'Europe/Brussels'});
test('NB-076/NB-158: a 3× per week habit shows "0 of 3 this week", then "1 of 3" after a check-in', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T09:00:00Z')});
  await emptyDevice(page);
  await open(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('Gym');
  await page.getByLabel('Schedule', {exact: true}).selectOption('frequency');
  await page.getByLabel('Times per period').fill('3');
  await openHabitMoreOptions(page);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  const card = page.getByRole('article', {name: 'Gym', exact: true});
  await expect(card.locator('.habit-period-progress')).toHaveText('0 of 3 this week');
  await card.getByRole('button', {name: /^Complete Gym$/}).click();
  await expect(card.locator('.habit-period-progress')).toHaveText('1 of 3 this week');
});
