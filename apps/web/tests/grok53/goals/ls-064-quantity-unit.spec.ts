import {expect, test} from '@playwright/test';
import {typeGoalName} from '../../goal-name';
import {seedGoals, stored} from './goal-fixtures';

// Session AL (lane L4, P-LS-64): Lisbon LS-H46. A count goal with no unit was refused only by a form-wide line (and, with
// the chain chosen, took ZIG silently); the Project preview kept "Give your Goal a name." after the name was typed.
// Fresh profile (the chain never chosen), 1920 wide.
test.use({viewport: {width: 1920, height: 1113}});

test('LS-H46: an empty unit is refused under "Goal asset", with focus; typing one clears it and saves in that unit', async ({page}) => {
  await seedGoals(page, [], '/app/goals/new');
  const wizard = page.locator('.unified-wizard');
  await page.getByRole('radio', {name: 'Reach a number of something', exact: true}).check();
  await typeGoalName(page, 'Fictional reading year');
  await page.getByLabel('Target amount', {exact: true}).fill('20');
  await page.getByRole('button', {name: 'Create goal', exact: true}).click();
  const unit = page.getByLabel('Goal asset', {exact: true});
  // Next's route announcer is a page-wide role="alert"; the wizard's message is counted inside the wizard.
  await expect(wizard.getByRole('alert')).toHaveText('Name what you count, for example books or BTC.');
  await expect(unit).toHaveAttribute('aria-invalid', 'true');
  await expect(unit).toBeFocused();
  expect((await stored(page)).goals).toEqual([]);
  await unit.fill('books');
  await expect(wizard.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', {name: 'Create goal', exact: true}).click();
  await expect(page).toHaveURL(/\/app\/goals\/tracked\/\d+$/);
  expect((await stored(page)).goals.map(g => g.asset)).toEqual(['BOOKS']);
});

test('LS-H46: the Project preview reads the name as it is typed, and the name\'s refusal leaves with it', async ({page}) => {
  await seedGoals(page, [], '/app/goals/new');
  const wizard = page.locator('.unified-wizard');
  await page.getByRole('radio', {name: 'Finish a project', exact: true}).check();
  await page.getByLabel('Milestones, one per line').fill('Plan\nBuild');
  await page.getByRole('button', {name: 'Create goal', exact: true}).click();
  await expect(wizard.getByRole('alert')).toHaveText('Give your Goal a name.');
  await typeGoalName(page, 'Fictional shed');
  const preview = page.getByRole('region', {name: 'Goal preview'});
  await expect(preview.getByRole('heading', {level: 3})).toHaveText('Fictional shed');
  await expect(wizard).not.toContainText('Give your Goal a name.');
});
