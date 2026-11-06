import {expect, test} from '@playwright/test';
import {emptyDevice, hydrated, open} from '../l3-helpers';

/** NB-077 (P-NB-19; BUG-077): a typed new habit survives F5 in the same tab; "Start blank" clears it. */
test.use({viewport: {width: 1280, height: 800}});
test('NB-077/BUG-077: the new-habit draft is kept across a reload', async ({page}) => {
  await emptyDevice(page);
  await open(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('Evening walk');
  await page.reload(); await hydrated(page);
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await expect(page.getByLabel('Habit title', {exact: true})).toHaveValue('Evening walk');
  await expect(page.getByLabel('Habit title', {exact: true})).toBeFocused();
  await page.getByRole('button', {name: 'Start blank'}).click();
  await expect(page.getByLabel('Habit title', {exact: true})).toHaveValue('');
});
