import {expect, test} from '@playwright/test';
import {life, project, seedGoals} from './goal-fixtures';

// Session AL (lane L4): Denver DV-042 / DV-043a/b / DV-058a (P-DV-22, P-DV-23, P-DVR-10; D-238, B-009). A goal completed
// (4/4) then closed read "FINISHED 0", left the Completed filter and the Hall, and its ring read 99 % under "100 %".
test.use({viewport: {width: 1280, height: 800}});
const closedWin = () => project('81', ['Plan', 'Build', 'Ship', 'Celebrate'], 4, {status: 'closed', lifecycle: [life('completed', 0, '2026-11-04T08:00:00.000Z'), life('closed', 0, '2026-11-04T08:30:00.000Z')]});

test('DV-042/DV-058a: a goal finished then closed counts as finished, in Completed and on the Hall', async ({page}) => {
  await seedGoals(page, [closedWin()], '/app/goals');
  await expect(page.locator('.goals-figures')).toContainText(/Finished\s*1/);
  await page.getByRole('button', {name: /^Completed/}).click();
  await expect(page.getByRole('heading', {name: 'Fictional read project', exact: true})).toBeVisible();
  const hall = page.getByRole('region', {name: 'Hall of achievements'});
  await expect(hall.locator('.hall-title')).toHaveText(['Fictional read project']);
  await expect(hall).not.toContainText('mark it complete on its page');
});

test('DV-043a/b: the Vision board and the Tree say "Finished · closed", ring and words alike', async ({page}) => {
  await seedGoals(page, [closedWin()], '/app/goals?view=board');
  await page.getByRole('button', {name: 'All', exact: true}).click();
  await expect(page.locator('.vision-tile').first()).toContainText('Finished · closed');
  await expect(page.locator('.vision-tile').first()).not.toContainText('100% of the way');
  await page.goto('/app/goals?view=tree');
  await page.getByRole('button', {name: 'All', exact: true}).click();
  await expect(page.locator('.goal-tree-node').first()).toContainText('Finished · closed');
});
