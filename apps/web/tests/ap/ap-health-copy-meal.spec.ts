import {expect, test} from '@playwright/test';
import {openHealth, healthRecord, withDiary} from './ap-health-fixtures';
import {openMealLog} from '../phone-nav';

// Session AP (feature 6, DRAFT for the integrator): a meal of any day copied to any day and meal slot.
test('a breakfast from 3 November becomes today\'s lunch; a later day is a field error', async ({page}) => {
  await openHealth(page, healthRecord(withDiary([{date: '2026-11-03', meal: 'Breakfast'}])));
  // It sits with logging a meal: in the "Log a meal" panel, and in its sheet on a phone (CI 1726, pillar-phone-length).
  await openMealLog(page);
  await page.getByText('Copy a meal to another day or meal', {exact: true}).click();
  const form = page.getByRole('form', {name: 'Copy a meal to another day or meal'});
  await form.getByLabel('From the day').fill('2026-11-03');
  await form.getByLabel('From the meal').selectOption({index: 0});
  await form.getByLabel('To the day').fill('2026-11-20');
  await form.getByRole('button', {name: 'Copy meal'}).click();
  await expect(page.getByRole('alert').filter({hasText: 'Choose today or an earlier day'})).toBeVisible();
  await form.getByLabel('To the day').fill('2026-11-14');
  await form.getByLabel('To the meal').selectOption('Lunch');
  await form.getByRole('button', {name: 'Copy meal'}).click();
  await expect(page.getByRole('region', {name: 'Lunch diary'})).toContainText('Fictional oats');
});
