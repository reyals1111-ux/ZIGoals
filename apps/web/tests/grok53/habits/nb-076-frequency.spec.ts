import {expect, test} from '@playwright/test';
import {emptyDevice, open} from '../l3-helpers';
import {openHabitMoreOptions} from '../../habit-form-helpers';

/** NB-076/NB-158 (P-NB-23; H-008): a "3× per week" habit's card says how the week stands, not only "0 / 1 time today". */
test.use({viewport: {width: 1280, height: 800}, timezoneId: 'Europe/Brussels'});
test('NB-076/NB-158: a 3× per week habit shows "0 / 3 this week", then "1 / 3" after a check-in', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T09:00:00Z')});
  await emptyDevice(page);
  await open(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('Gym');
  // Fix-up FX-L3: by role; an exact label match on a <label> wrapping a <select> also reads the options' words.
  await page.getByRole('combobox', {name: 'Schedule', exact: true}).selectOption('frequency');
  // The Schedule <label> also holds its options' words ("X times per period"), so a label-text match found the <select> too.
  await page.getByRole('textbox', {name: 'Times per period', exact: true}).fill('3');
  await openHabitMoreOptions(page);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  const card = page.getByRole('article', {name: 'Gym', exact: true});
  // Session AL (COPY_AUDIT, deliberate; fourth pass PR-061/NB-076): a one-a-day "3× per week" count is the week itself
  // ("0 / 3 this week" in the count, no "0 / 1 time today"), and today's state is its own line.
  await expect(card.locator('.habit-count')).toHaveText('0 / 3 this week');
  await card.getByRole('button', {name: /^Complete Gym$/}).click();
  await expect(card.locator('.habit-count')).toHaveText('1 / 3 this week');
});
