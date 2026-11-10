import {expect, test} from '@playwright/test';
import {createHabit, emptyDevice, open} from '../l3-helpers';

/** Session AL third pass (lane L3): Habits rows. Fresh empty profile, every /api request answered 503. */

test('LS-054 (P-LS-67): a second habit with a name already in use is asked about once, at 375 px', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await emptyDevice(page);
  await createHabit(page, 'QA Stretch');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('qa stretch ');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  const ask = page.locator('.habit-same-name');
  await expect(ask).toContainText('You already have a habit called “qa stretch”.');
  await expect(page.getByRole('article', {name: 'QA Stretch'})).toHaveCount(1);
  await ask.getByRole('button', {name: 'Change the name', exact: true}).click();
  await expect(page.getByLabel('Habit title', {exact: true})).toBeFocused();
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await page.locator('.habit-same-name').getByRole('button', {name: 'Create it anyway', exact: true}).click();
  await expect(page.getByRole('article', {name: /^qa stretch$/i})).toHaveCount(2);
});

test('D-203 (P-DVR-34): the habit ⋯ menu names the habit once, not on every item', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await emptyDevice(page);
  const card = await createHabit(page, 'Fictional evening walk around the park');
  await card.getByRole('button', {name: 'Options for Fictional evening walk around the park'}).click();
  const menu = page.getByRole('group', {name: 'Fictional evening walk around the park options'});
  await expect(menu.getByRole('button', {name: 'Add Fictional evening walk around the park check-in to Today'})).toHaveText('Add check-in to Today');
  await expect(menu.getByRole('button', {name: 'Add Fictional evening walk around the park streak to Today'})).toHaveText('Add streak to Today');
});

test('GAP-085 (P-PR-48): each habit has its own page with its history, consistency and actions', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await emptyDevice(page);
  const card = await createHabit(page, 'Fictional read');
  await createHabit(page, 'Fictional walk');
  await card.getByRole('button', {name: 'Options for Fictional read'}).click();
  await page.getByRole('link', {name: 'Open its own page', exact: true}).click();
  await expect(page).toHaveURL(/\/app\/habits\?habit=/);
  await expect(page.getByRole('group', {name: 'One habit'}).getByRole('heading', {name: 'Fictional read'})).toBeVisible();
  await expect(page.getByRole('article', {name: 'Fictional walk'})).toHaveCount(0);
  const only = page.getByRole('article', {name: 'Fictional read', exact: true});
  await expect(only.locator('details.habit-details[open]').first()).toBeVisible();
  await page.getByRole('link', {name: '← All habits', exact: true}).click();
  await expect(page.getByRole('article', {name: 'Fictional walk', exact: true})).toBeVisible();
});

test('GAP-095 (P-DVG-31): Routines offer a study routine and a weekly reset', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await emptyDevice(page);
  await open(page, '/app/habits');
  const templates = page.getByRole('group', {name: 'Routine templates'});
  await expect(templates.getByText('Study routine')).toBeVisible();
  await expect(templates.getByText('Weekly reset')).toBeVisible();
});

test('R16: the Habit journal timezone is a quiet fold under the footnote, pointing to Settings', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await emptyDevice(page);
  await open(page, '/app/habits');
  const fold = page.locator('details.habit-timezone');
  await expect(fold).not.toHaveClass(/\bpanel\b/);
  await fold.getByText('Habit journal timezone', {exact: true}).click();
  await expect(fold.getByRole('link', {name: 'Settings → Your time zone'})).toHaveAttribute('href', '/app/settings#time-zone');
});
