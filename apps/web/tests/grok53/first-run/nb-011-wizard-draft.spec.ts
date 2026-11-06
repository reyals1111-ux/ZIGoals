import {expect, test} from '@playwright/test';
import {emptyDevice, hydrated, open} from '../l3-helpers';

/** NB-011 (P-NB-09): a reload in the middle of the welcome returns to the same step with every pick kept. Bot: reload at Step 3. */
test.use({viewport: {width: 1280, height: 800}});
test('NB-011: the welcome keeps its step and picks across a reload; NB-246: skipping after picks says they are not kept', async ({page}) => {
  await emptyDevice(page, {welcomeSeen: false});
  await open(page, '/app/welcome');
  const flow = page.locator('main');
  await flow.getByRole('button', {name: 'Let’s begin', exact: true}).click();
  await flow.getByRole('checkbox', {name: /^Habits/}).check();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await expect(flow.getByRole('heading', {level: 1, name: 'Two or three things to focus on.'})).toBeVisible();
  await flow.getByRole('checkbox', {name: /^Read more/}).check();
  await expect(flow.getByText('1 of 3 chosen')).toBeVisible();
  await expect(flow.getByText('Skip setup leaves without saving what you picked.')).toBeVisible();
  await page.reload(); await hydrated(page);
  await expect(flow.getByRole('heading', {level: 1, name: 'Two or three things to focus on.'})).toBeVisible();
  await expect(flow.getByRole('checkbox', {name: /^Read more/})).toBeChecked();
  await flow.getByRole('button', {name: 'Back', exact: true}).click();
  await expect(flow.getByRole('checkbox', {name: /^Habits/})).toBeChecked();
});
