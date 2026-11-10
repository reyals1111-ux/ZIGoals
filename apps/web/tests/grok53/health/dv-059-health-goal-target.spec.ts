import {expect, test} from '@playwright/test';
import {freshHealth} from './al-health-helpers';
import {hydrated} from '../../ah-helpers';

// Session AL lane L2, for L4 (P-DV-02, P-DV-06, P-DV-39): Denver DV-059/DV-027b (99,999,999 steps a day was saved),
// DV-027a (an empty name or target said nothing) and DV-181 (the weight template opened Health goals with nothing chosen).
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1280, height: 900}});

test('DV-059/DV-027a: the target is checked against the one limits table, each message under its field', async ({page}) => {
  await freshHealth(page);
  await page.goto('/app/goals'); await hydrated(page);
  await page.getByRole('button', {name: '+ Health goal'}).click();
  const creator = page.getByRole('region', {name: 'New health goal'});
  await creator.getByRole('button', {name: 'Create health goal'}).click();
  await expect(creator.locator('.field-error').first()).toHaveText('Give the goal a name.');
  await expect(creator.getByLabel('Target')).toHaveAttribute('aria-invalid', 'true');
  await creator.getByLabel('Name').fill('Walk more');
  await creator.getByLabel('Target').fill('99999999');
  await creator.getByRole('button', {name: 'Create health goal'}).click();
  await expect(creator.locator('.field-error')).toHaveText('Enter a whole number from 0 to 100,000 steps.');
  await expect(creator.getByLabel('Target')).toBeFocused();
  await creator.getByLabel('Target').fill('10000');
  await creator.getByRole('button', {name: 'Create health goal'}).click();
  await expect(page.getByText('Health goal created.')).toBeVisible();
});

test('DV-181: ?health-goal=weight opens the creator with Weight chosen', async ({page}) => {
  await freshHealth(page);
  await page.goto('/app/goals?health-goal=weight#goals-health'); await hydrated(page);
  const creator = page.getByRole('region', {name: 'New health goal'});
  await expect(creator.getByLabel('Measure')).toHaveValue('weight');
  await expect(creator.getByLabel('Direction')).toBeVisible();
});
