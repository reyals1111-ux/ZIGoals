import {expect, test} from '@playwright/test';
import {openModule, project, seedGoals} from './goal-fixtures';

// Session AL (lane L4): Denver DV-046a/b, DV-088, DV-112, DV-113 (P-DV-71, P-DV-72, P-DVR-37/38; G-033, G-035, BUG-040),
// DV-046f/DV-054e (P-DV-78). Every Close wrote "Goal closed" twice; milestone rows said only "Goal milestones changed";
// Activity never named its time zone. Desktop, fresh profile, Europe/Brussels.
test.use({viewport: {width: 1280, height: 800}, timezoneId: 'Europe/Brussels'});

test('DV-046a/b: one row per Close, and a tick names its milestone', async ({page}) => {
  await seedGoals(page, [project('91', ['Plan', 'Build'], 0)], '/app/goals/tracked/91');
  const milestones = await openModule(page, 'milestones');
  // Session AL (CI 1632, deliberate; a race recorded at fifth-pass:51 in CI 1629, second sighting here): the box is
  // controlled and follows the goal's store write a moment after the click (components/platform/goal-milestones.tsx:84),
  // so `check()`, which reads `checked` right after its click, can see it still open. The same tick, then the same
  // "checked" expectation, waited for as for any other state.
  const build = milestones.getByRole('checkbox', {name: 'Build'});
  await build.click();
  await expect(build).toBeChecked();
  await expect(page.getByRole('status').filter({hasText: 'Milestone done: “Build”.'})).toBeVisible();
  const status = await openModule(page, 'goal-status');
  await status.getByRole('button', {name: 'Close goal and release allocations', exact: true}).click();
  await page.getByRole('button', {name: 'Confirm close', exact: true}).click();
  await page.goto('/app/activity');
  const feed = page.locator('.unified-activity');
  await expect(feed.getByRole('link', {name: 'Milestone ticked: “Build”'})).toHaveCount(1);
  await expect(feed.getByRole('link', {name: 'Goal closed', exact: true})).toHaveCount(1);
  await expect(feed).not.toContainText('Goal milestones changed');
  await expect(feed).not.toContainText('Saved Goal creation date');
  await expect(page.getByText(/Times are shown in Europe\/Brussels\./)).toBeVisible();
});
