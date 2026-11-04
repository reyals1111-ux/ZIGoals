import {expect, test} from '@playwright/test';
import {emptyDevice, open} from '../l3-helpers';
import {openHabitMoreOptions} from '../../habit-form-helpers';

/**
 * NB-058 (P-NB-18), NB-056/NB-053 (P-NB-17; N-164, BUG-026): no weekday ticked is refused AT the weekdays (not a generic
 * line by the button); Mon + Wed ticked after a failed submit and a Measurement change save as Mon + Wed.
 * Bot: desktop, Light, ~02:0x.
 */
test.use({viewport: {width: 1280, height: 800}, timezoneId: 'Europe/Brussels'});
test('NB-058/NB-056: weekday ticks survive a refused submit and a Measurement change; the refusal sits at the weekdays', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T01:05:00Z')});
  await emptyDevice(page, {theme: 'light'});
  await open(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('   ');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.locator('.habit-editor .field-error')).toHaveText('Habit title: Give the habit a name.');
  await page.getByLabel('Habit title', {exact: true}).fill('Swim');
  await page.getByLabel('Schedule', {exact: true}).selectOption('weekdays');
  const days = page.getByRole('group', {name: 'Scheduled weekdays'});
  for (const d of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) await days.getByLabel(d, {exact: true}).uncheck();
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(days.locator('.field-error')).toHaveText('Scheduled weekdays: Choose at least one day.');
  await days.getByLabel('Monday', {exact: true}).check();
  await days.getByLabel('Wednesday', {exact: true}).check();
  await openHabitMoreOptions(page);
  await page.getByLabel('Measurement').selectOption('count');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.getByRole('article', {name: 'Swim', exact: true})).toContainText('Mon · Wed');
});
