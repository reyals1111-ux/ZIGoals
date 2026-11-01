import {expect, test, type Page} from '@playwright/test';
import {habitMoreOptions, openHabitMoreOptions} from './habit-form-helpers';

/**
 * Session AK D1 (FIRST_RUN_REVIEW FR-17, owner decision 5): a new habit asks the title, the time of day and the schedule;
 * how it is counted (habit type, measurement, unit, target value, target period) waits under "More options". The fold is
 * closed for a new habit and opens by itself on edit, from a template, and on a refusal inside it, where the refused
 * field takes the focus. Both projects. The habit cards are not part of this change.
 */
test.use({timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date('2026-09-15T10:00:00.000Z')});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
});
const COUNTING = ['Habit type', 'Measurement', 'Unit', 'Target value', 'Target period'];
async function newHabit(page: Page) {
  await page.goto('/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await expect(page.getByLabel('Habit title', {exact: true})).toBeVisible();
}

test('a new habit: More options is closed, holds how it is counted, and opens from the keyboard', async ({page}) => {
  await newHabit(page);
  const fold = habitMoreOptions(page), summary = fold.locator(':scope > summary');
  await expect(fold).not.toHaveAttribute('open', /.*/);
  for (const label of COUNTING) await expect(page.getByLabel(label, {exact: true}), label).toBeHidden();
  for (const label of ['Habit title', 'Time of day', 'Schedule', 'Category / area']) await expect(page.getByLabel(label, {exact: true}), label).toBeVisible();
  await expect(summary).toContainText('More options');
  await expect(summary).toContainText('how it is counted');
  expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(fold).toHaveAttribute('open', '');
  await expect(page.getByRole('group', {name: 'How it is counted', exact: true})).toBeVisible();
  for (const label of COUNTING) await expect(page.getByLabel(label, {exact: true}), label).toBeVisible();
  // The defaults of a blank habit are kept: build, count, 1 time, per day.
  await expect(page.getByLabel('Habit type', {exact: true})).toHaveValue('build');
  await expect(page.getByLabel('Measurement', {exact: true})).toHaveValue('count');
  await expect(page.getByLabel('Unit', {exact: true})).toHaveValue('times');
  await expect(page.getByLabel('Target value', {exact: true})).toHaveValue('1');
  await expect(page.getByLabel('Target period', {exact: true})).toHaveValue('day');
  await page.keyboard.press('Enter');
  await expect(fold).not.toHaveAttribute('open', /.*/);
});

test('a template fills how it is counted and opens More options', async ({page}) => {
  await newHabit(page);
  await page.getByLabel('Start from template').selectOption('walk');
  await expect(habitMoreOptions(page)).toHaveAttribute('open', '');
  await expect(page.getByLabel('Measurement', {exact: true})).toBeVisible();
  await expect(page.getByLabel('Measurement', {exact: true})).toHaveValue('quantity');
  await expect(page.getByLabel('Unit', {exact: true})).toHaveValue('steps');
  await expect(page.getByLabel('Target value', {exact: true})).toHaveValue('8000');
});

test('editing a counted habit opens More options with its target in view', async ({page}) => {
  await newHabit(page);
  await page.getByLabel('Habit title', {exact: true}).fill('Fictional reading');
  await openHabitMoreOptions(page);
  await page.getByLabel('Measurement', {exact: true}).selectOption('duration');
  await page.getByLabel('Target value', {exact: true}).fill('25');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  const card = page.getByRole('article', {name: 'Fictional reading', exact: true});
  await expect(card).toBeVisible();
  await card.getByRole('button', {name: 'Edit Fictional reading', exact: true}).click();
  await expect(habitMoreOptions(page)).toHaveAttribute('open', '');
  await expect(page.getByLabel('Measurement', {exact: true})).toBeVisible();
  await expect(page.getByLabel('Measurement', {exact: true})).toHaveValue('duration');
  await expect(page.getByLabel('Target value', {exact: true})).toBeVisible();
  await expect(page.getByLabel('Target value', {exact: true})).toHaveValue('25');
});

test('a refusal inside a closed More options opens it and the refused field takes the focus', async ({page}) => {
  await newHabit(page);
  await page.getByLabel('Habit title', {exact: true}).fill('Fictional stretch');
  const fold = habitMoreOptions(page), summary = fold.locator(':scope > summary');
  await openHabitMoreOptions(page);
  const target = page.getByLabel('Target value', {exact: true});
  await target.fill('two');
  await summary.click();
  await expect(fold).not.toHaveAttribute('open', /.*/);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(fold).toHaveAttribute('open', '');
  await expect(target).toBeVisible();
  await expect(target).toHaveAttribute('aria-invalid', 'true');
  await expect(target).toBeFocused();
  await expect(page.getByRole('alert').filter({hasText: /^Target value: /})).toBeVisible();
  await expect(page.getByRole('article', {name: 'Fictional stretch', exact: true})).toHaveCount(0);

  // A required field the browser checks (a cleared unit) opens the fold the same way.
  await target.fill('2');
  const unit = page.getByLabel('Unit', {exact: true});
  await unit.fill('');
  await summary.click();
  await expect(fold).not.toHaveAttribute('open', /.*/);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(fold).toHaveAttribute('open', '');
  await expect(unit).toBeVisible();
  await expect(unit).toBeFocused();
  await expect(page.getByRole('article', {name: 'Fictional stretch', exact: true})).toHaveCount(0);
  await unit.fill('times');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.getByRole('article', {name: 'Fictional stretch', exact: true})).toBeVisible();
});
