import {expect, test} from '@playwright/test';
import {typeGoalName} from '../../goal-name';
import {seedGoals, stored} from './goal-fixtures';

// Session AL (lane L4): Denver DV-016a/b, DV-031a (P-DV-07, P-DV-58, P-DVR-25; L-024). A 150-character milestone passed step
// 1 and "Use at most 100 characters." showed on step 2, where there is no milestone field; duplicates were accepted.
test.use({viewport: {width: 1920, height: 1113}});

// Next's route announcer is a page-wide role="alert" of its own; the wizard's messages are counted inside the wizard.
test('DV-016a: a too-long milestone line is refused on step 1, under the box, with focus', async ({page}) => {
  await seedGoals(page, [], '/app/goals/new');
  const wizard = page.locator('.unified-wizard');
  await page.getByRole('radio', {name: 'Finish a project', exact: true}).check();
  await typeGoalName(page, 'Fictional 10K');
  const box = page.getByLabel('Milestones, one per line');
  await box.fill(`Run 3 km\n${'x'.repeat(150)}`);
  await page.getByRole('button', {name: 'Continue →'}).click();
  // Session AO (T-014, deliberate): the creator has three steps.
  await expect(page.getByText('Step 1 of 3')).toBeVisible();
  await expect(wizard.getByRole('alert')).toHaveText('Milestone 2 is 150 characters long; use at most 100.');
  await expect(box).toBeFocused();
  await box.fill('Run 3 km without stopping\nRest\nRun 3 km without stopping');
  await expect(wizard.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', {name: 'Create goal', exact: true}).click();
  await expect(wizard.getByRole('alert')).toHaveText('Milestones 1 and 3 have the same name. Give each step its own name.');
  expect((await stored(page))?.goals ?? []).toEqual([]);
});

test('DV-031a: fixing the date clears its message', async ({page}) => {
  await seedGoals(page, [], '/app/goals/new');
  const wizard = page.locator('.unified-wizard');
  await page.getByRole('radio', {name: 'Save an amount', exact: true}).check();
  await typeGoalName(page, 'Fictional trip');
  await page.getByLabel('Target amount', {exact: true}).fill('1200');
  const date = page.getByLabel('Target date (optional)');
  await date.evaluate((el: HTMLInputElement) => { el.removeAttribute('min'); });
  await date.fill('2020-01-01');
  await page.getByRole('button', {name: 'Continue →'}).click();
  await expect(wizard.getByRole('alert')).toHaveText('Choose today or a future target date.');
  await date.fill('2030-01-01');
  await expect(wizard.getByRole('alert')).toHaveCount(0);
});
