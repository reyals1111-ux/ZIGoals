import {expect, test} from '@playwright/test';
import {at, DAY1, DAY2, firstFive, freshWeek, hydrated, openAt, setup, ZONE} from './au-helpers';
import {openMealLog} from '../phone-nav';
import {typeGoalName} from '../goal-name';

/**
 * Session AU (ADR-044, the friends dress rehearsal): Sanne on her phone, in the Light theme. No crypto; she wants to sleep
 * better and drink more water. Her first day from the setup, as the rehearsal walked it, with the fixes it led to:
 * - F-3: after a finished setup with no starter goal, Today does not ask her to set up again;
 * - F-1: the first five's "Set a goal" says the page joins her menu, and opens it without "This page is hidden";
 * - F-6: a sleep goal's name points to "Keep an average instead" while the kind is still the money default;
 * - F-MEAL: "Log a meal" opens on "Just describe it"; words alone are logged, calories unknown, and the first five ticks.
 * Phone only (390, the mobile project); named webkit-au-* so CI's WebKit job runs it on an iPhone profile too.
 */
test.skip(({isMobile}) => !isMobile, 'the phone part of Sanne\'s week (her desktop part is tests/au/sanne.spec.ts)');
test.use({timezoneId: ZONE, actionTimeout: 15_000});

test('Sanne, day 1 on the phone: setup, the first five without a hidden page, a sleep goal pointed to an average, a meal in words', async ({page}) => {
  test.setTimeout(150_000);
  await freshWeek(page, 'light', at(DAY1, '08:00'));
  await setup(page, [/^Habits/, /^Health/]);

  // F-3: one way on after the setup, never a second "Set up ZIGoals".
  await expect(firstFive(page)).toBeVisible();
  await expect(page.getByRole('region', {name: 'Set up ZIGoals in about a minute.'})).toHaveCount(0);

  // F-1: Goals was left out of her menu by the setup; the step says so and its tap adds it back.
  const goalStep = firstFive(page).getByRole('listitem').filter({hasText: 'Set a goal'});
  await expect(goalStep).toContainText('Adds Goals to your menu.');
  await goalStep.getByRole('link', {name: 'Set a goal'}).click();
  await page.waitForURL('**/app/goals/new'); await hydrated(page);
  await expect(page.getByRole('region', {name: 'Hidden page'})).toHaveCount(0);

  // F-6: "Elke nacht 8 uur slapen" is a daily number, not money.
  await typeGoalName(page, 'Elke nacht 8 uur slapen');
  const hint = page.locator('.goal-kind-hint');
  await expect(hint).toHaveText(/Following a daily number like sleep, water or steps\?/);
  await expect(hint.getByRole('link', {name: 'Keep an average instead →'})).toHaveAttribute('href', '/app/goals/average/new');

  // F-MEAL: Health's "Log a meal" opens on words first, before "Add your first food".
  await openAt(page, at(DAY1, '08:30'), '/app/health');
  const sheet = await openMealLog(page);
  const words = sheet!.getByRole('form', {name: 'Just describe it'});
  await expect(words).toBeVisible();
  const box = words.getByLabel('What did you eat?');
  expect(await box.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  await box.fill('Yoghurt met muesli');
  await words.getByRole('button', {name: 'Log in words'}).click();
  await expect(words.getByRole('status')).toContainText('Calories unknown');
  await page.keyboard.press('Escape');
  const breakfast = page.getByRole('list', {name: 'Breakfast in words'});
  await expect(breakfast).toContainText('Yoghurt met muesli');
  await expect(breakfast).toContainText('In words · calories unknown');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:meal-words:v1') ?? 'null'));
  expect(stored).toMatchObject({version: 1, entries: [expect.objectContaining({date: DAY1, meal: 'Breakfast', words: 'Yoghurt met muesli'})]});

  // The first five ticks "Log a meal" from the words entry; the next morning it is still ticked.
  await openAt(page, at(DAY2, '07:15'));
  await expect(firstFive(page).getByRole('listitem').filter({hasText: 'Log a meal'})).toContainText('Done.');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
