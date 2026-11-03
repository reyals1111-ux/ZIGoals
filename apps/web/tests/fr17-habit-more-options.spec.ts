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
// A select inside its <label> takes the chosen option's words into the label's text, so getByLabel(exact) misses it;
// the control's own accessible name is exact (combobox or textbox, by role).
const field = (page: Page, name: string) => page.getByRole('combobox', {name, exact: true}).or(page.getByRole('textbox', {name, exact: true}));
const COUNTING = ['Habit type', 'Measurement', 'Unit', 'Target value', 'Target period'];
async function newHabit(page: Page) {
  await page.goto('/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await expect(field(page, 'Habit title')).toBeVisible();
}

test('a new habit: More options is closed, holds how it is counted, and opens from the keyboard', async ({page}) => {
  await newHabit(page);
  const fold = habitMoreOptions(page), summary = fold.locator(':scope > summary');
  await expect(fold).not.toHaveAttribute('open', /.*/);
  for (const label of COUNTING) await expect(field(page, label), label).toBeHidden();
  for (const label of ['Habit title', 'Time of day', 'Schedule', 'Category / area']) await expect(field(page, label), label).toBeVisible();
  await expect(summary).toContainText('More options');
  await expect(summary).toContainText('how it is counted');
  expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(fold).toHaveAttribute('open', '');
  await expect(page.getByRole('group', {name: 'How it is counted', exact: true})).toBeVisible();
  for (const label of COUNTING) await expect(field(page, label), label).toBeVisible();
  // The defaults of a blank habit are kept: build, count, 1 time, per day.
  await expect(field(page, 'Habit type')).toHaveValue('build');
  await expect(field(page, 'Measurement')).toHaveValue('count');
  await expect(field(page, 'Unit')).toHaveValue('times');
  await expect(field(page, 'Target value')).toHaveValue('1');
  await expect(field(page, 'Target period')).toHaveValue('day');
  await page.keyboard.press('Enter');
  await expect(fold).not.toHaveAttribute('open', /.*/);
});

test('a template fills how it is counted and opens More options', async ({page}) => {
  await newHabit(page);
  await page.getByLabel('Start from template').selectOption('walk');
  await expect(habitMoreOptions(page)).toHaveAttribute('open', '');
  await expect(field(page, 'Measurement')).toBeVisible();
  await expect(field(page, 'Measurement')).toHaveValue('quantity');
  await expect(field(page, 'Unit')).toHaveValue('steps');
  await expect(field(page, 'Target value')).toHaveValue('8000');
});

test('editing a counted habit opens More options with its target in view', async ({page}) => {
  await newHabit(page);
  await field(page, 'Habit title').fill('Fictional reading');
  await openHabitMoreOptions(page);
  await field(page, 'Measurement').selectOption('duration');
  await field(page, 'Target value').fill('25');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  const card = page.getByRole('article', {name: 'Fictional reading', exact: true});
  await expect(card).toBeVisible();
  await card.getByRole('button', {name: 'Edit Fictional reading', exact: true}).click();
  await expect(habitMoreOptions(page)).toHaveAttribute('open', '');
  await expect(field(page, 'Measurement')).toBeVisible();
  await expect(field(page, 'Measurement')).toHaveValue('duration');
  await expect(field(page, 'Target value')).toBeVisible();
  await expect(field(page, 'Target value')).toHaveValue('25');
});

test('a refusal inside a closed More options opens it and the refused field takes the focus', async ({page}) => {
  await newHabit(page);
  await field(page, 'Habit title').fill('Fictional stretch');
  const fold = habitMoreOptions(page), summary = fold.locator(':scope > summary');
  await openHabitMoreOptions(page);
  const target = field(page, 'Target value');
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
  const unit = field(page, 'Unit');
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
