import {expect, test} from '@playwright/test';
import {HABITS_KEY} from '../../../lib/habits';
import {createHabit, emptyDevice, open, toast} from '../l3-helpers';

/**
 * Session AL second pass (lane L3), Denver's Habits rows on a fresh profile at the bot's width (desktop 1280×800):
 * DV-187 (delete for good: short promise, any letter case, the one Undo toast restores the record), DV-131 (a quit day
 * reads "On track today" and its slips), DV-241 (a 3-a-week target in one plain sentence), DV-188a/c (a blank title is
 * said under its field; Cancel with unsaved edits asks first), DV-128 (a save is said in the toast, the page keeps no
 * stale "Habit created."), DV-047a (Activity's habit row says "Done", not "1 / 1 completed"). Fictional data only.
 */
test.use({viewport: {width: 1280, height: 800}, timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => { await page.clock.install({time: new Date('2026-11-04T10:00:00Z')}); await emptyDevice(page); });

test('DV-187/DV-186a: delete for good matches any letter case; the toast Undo restores the stored habit', async ({page}) => {
  const card = await createHabit(page, 'T9 Weekly run');
  await card.getByRole('button', {name: 'Options for T9 Weekly run'}).click();
  // Session AO (DV-040g, deliberate): items are menuitems now
  await card.getByRole('menu', {name: 'T9 Weekly run options'}).getByRole('menuitem', {name: 'Archive habit…'}).click();
  await expect(card.getByRole('alertdialog')).toContainText('you can restore it later, or delete it for good from Archived.');
  await card.getByRole('alertdialog').getByRole('button', {name: 'Archive habit', exact: true}).click();
  // Fix-up FX-L3: with nothing recorded today the archive starts today, so the habit leaves the Today list at once (by
  // design: "It leaves your lists today"); "Delete for good…" is then reached from Archived, as the confirmation says.
  await expect(toast(page)).toContainText('T9 Weekly run is archived today.');
  await page.getByRole('group', {name: 'Filter habits'}).getByRole('button', {name: 'Archived', exact: true}).click();
  const details = card.locator('summary[aria-label="Details for T9 Weekly run"]');
  if (!await card.locator('details.habit-more').evaluate(el => (el as HTMLDetailsElement).open)) await details.click();
  await card.getByRole('button', {name: 'Delete for good…', exact: true}).click();
  const confirm = card.getByRole('form', {name: 'Delete T9 Weekly run for good'});
  await expect(confirm).toContainText('Delete “T9 Weekly run” for good?');
  await expect(confirm).not.toContainText('stay in your records without its name');
  await confirm.getByLabel('Type the habit’s name to confirm').fill('t9 weekly run');
  await confirm.getByRole('button', {name: 'Delete for good', exact: true}).click();
  await expect(page.getByRole('article', {name: 'T9 Weekly run', exact: true})).toHaveCount(0);
  await expect(toast(page)).toContainText('“T9 Weekly run” was deleted for good.');
  await toast(page).getByRole('button', {name: 'Undo deleting T9 Weekly run', exact: true}).click();
  await expect(toast(page)).toContainText('“T9 Weekly run” is back in Archived.');
  const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).habits.map((h: {title: string}) => h.title), HABITS_KEY);
  expect(stored).toEqual(['T9 Weekly run']);
});

test('DV-131: a quit habit reads its slips and "On track today", never "Complete" beside "Stayed on track"', async ({page}) => {
  await open(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('T9 No sugar');
  await page.locator('.habit-more-options > summary').click();
  await page.getByLabel('Habit type').selectOption('quit');
  // DV-242/DV-132: no disabled target fields for a quit habit, a reason instead.
  await expect(page.getByLabel('Target value')).toHaveCount(0);
  await expect(page.getByText('A quit habit has no target')).toBeVisible();
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  const card = page.getByRole('article', {name: 'T9 No sugar', exact: true});
  await expect(card.locator('.habit-count')).toHaveText('0 slips today');
  await card.getByRole('button', {name: 'Stayed on track for T9 No sugar'}).click();
  await expect(card.locator('.habit-result')).toHaveText('On track today');
});

test('DV-241: a three-a-week habit says its target in one plain sentence', async ({page}) => {
  await open(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  // Fix-up FX-L3: by role; an exact label match on a <label> wrapping a <select> also reads the options' words.
  await page.getByRole('combobox', {name: 'Schedule', exact: true}).selectOption('frequency');
  // The Schedule <label> also holds its options' words ("X times per period"), so a label-text match found the <select> too.
  await page.getByRole('textbox', {name: 'Times per period', exact: true}).fill('3');
  await page.locator('.habit-more-options > summary').click();
  await expect(page.getByText('Each check-in counts 1 time; you aim for 3 check-ins a week.')).toBeVisible();
  await expect(page.getByText(/1 times|each time, /)).toHaveCount(0);
});

test('DV-188a/DV-188c/DV-128: blank title said under its field; Cancel with edits asks first; saves are said in the toast', async ({page}) => {
  await open(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.getByLabel('Habit title', {exact: true})).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Habit title: Give the habit a name.')).toBeVisible();
  await page.getByLabel('Habit title', {exact: true}).fill('Stretch');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(toast(page)).toContainText('Habit created');
  const card = page.getByRole('article', {name: 'Stretch', exact: true});
  await card.getByRole('button', {name: 'Edit Stretch', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('Stretch more');
  await page.getByRole('button', {name: 'Cancel', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Discard changes', exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Discard changes', exact: true}).click();
  await expect(page.getByRole('article', {name: 'Stretch', exact: true})).toBeVisible();
  // DV-128: no page status line still saying "Habit created." after later actions.
  await expect(page.locator('main p[role="status"]').filter({hasText: 'Habit created'})).toHaveCount(0);
});

test('DV-047a: an Activity habit row says "Done", not "1 / 1 completed"', async ({page}) => {
  const card = await createHabit(page, 'Walk outside');
  await card.getByRole('button', {name: 'Complete Walk outside'}).click();
  await open(page, '/app/activity');
  await expect(page.getByText(/Walk outside/).first()).toBeVisible();
  await expect(page.locator('main')).toContainText('· Done');
  await expect(page.locator('main')).not.toContainText('1 / 1 completed');
});
