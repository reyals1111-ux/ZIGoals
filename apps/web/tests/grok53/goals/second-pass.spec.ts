import {expect, test} from '@playwright/test';
import {goal, project, seedGoals, stored} from './goal-fixtures';
import {AVERAGE_GOALS_KEY} from '../../../lib/average-goals/store';

// Session AL (lane L4, second pass): the rows finished in this pass, in the bot's conditions (fresh profile, 1280–1920).
test.use({viewport: {width: 1920, height: 1080}});

const cash = {id: 'cash', providerId: 'Fictional cash', sourceType: 'MANUAL', network: 'manual', account: 'local', asset: 'USD', denom: 'USD', quantity: '20000', decimals: 2, verification: 'MANUAL', sync: 'MANUAL', liquidity: 'LIQUID', observedAt: '2026-11-04T08:00:00.000Z', provenance: 'User entry', assetClass: 'Cash', valuation: {value: '20000', currency: 'USD', decimals: 2, source: 'MANUAL', observedAt: '2026-11-04T08:00:00.000Z'}};

test('DV-025b (P-DV-31): lowering the target below what is counted reads as reached, with no celebration', async ({page}) => {
  await seedGoals(page, [goal('61', {name: 'Fictional emergency fund', target: '100000'})], '/app/goals/tracked/61', {positions: [cash], allocations: [{goalId: '61', positionId: 'cash', quantity: '20000'}]} as never);
  const edit = page.locator('#edit-goal');
  await edit.locator('summary').first().click();
  await edit.getByLabel(/target/i).first().fill('50');
  await edit.getByRole('button', {name: /Save Goal details/i}).click();
  await expect(page.locator('.goal-reached-by-edit')).toContainText('No celebration for an edit');
  await expect(page.locator('.goal-finished')).toHaveCount(0);
  const g = (await stored(page)).goals[0]!;
  expect((g.lifecycle ?? []).map(e => e.kind)).toEqual(['target_changed']);
});

test('DV-117 (P-DV-80): an empty filter says what belongs there and where to start it', async ({page}) => {
  await seedGoals(page, [], '/app/activity');
  await page.getByRole('navigation', {name: 'Activity categories'}).getByRole('button', {name: 'Habit', exact: true}).click();
  const timeline = page.getByRole('region', {name: 'Unified private activity'});
  await expect(timeline).toContainText('No habit check-ins yet.');
  await expect(timeline.getByRole('link', {name: 'Log one on Habits →'})).toHaveAttribute('href', '/app/habits');
});

test('DV-054c/DV-047c (P-DV-73), DV-169 (P-DV-74): an average goal shows in Activity, and each chip counts its own list', async ({page}) => {
  await seedGoals(page, [goal('62', {name: 'Fictional fund'})], '/app/goals');
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({version: 1, goals: [{id: 'sleep1', name: 'Fictional sleep average', metric: 'sleep-hours', unit: 'h a night', target: 7, direction: 'at-least', windowDays: 14, status: 'active', createdAt: '2026-11-03T08:00:00.000Z', entries: [{day: '2026-11-03', value: 7.5}]}]})), AVERAGE_GOALS_KEY);
  await page.goto('/app/activity');
  const timeline = page.getByRole('region', {name: 'Unified private activity'});
  await expect(timeline).toContainText('Average goal started');
  await expect(timeline).toContainText('Day logged · Fictional sleep average');
  const nav = page.getByRole('navigation', {name: 'Activity categories'});
  await nav.getByRole('button', {name: 'Goal', exact: true}).click();
  const shown = await timeline.locator('.activity-event').count();
  await expect(nav.getByRole('button', {name: 'Goal', exact: true}).locator('.activity-filter-count')).toHaveText(` · ${shown}`);
  // Session AL (deliberate): sleep nights, tasks and habit archive/delete rows are listed now (DV-172, DV-206, Tasks in
  // Activity), so the footer names only what still isn't.
  // Session AL (COPY_AUDIT, deliberate; fourth pass PR-065): the footer also names the money log.
  await expect(timeline).toContainText('Not listed here: journal entries, notes, and the spending and income you log under Wealth');
});

test('DV-036d (P-DV-76): the source cards show their part of the list', async ({page}) => {
  await seedGoals(page, [goal('63')], '/app/activity');
  await page.getByRole('button', {name: 'Every kind of wealth', exact: true}).click();
  await expect(page.getByRole('navigation', {name: 'Activity categories'}).getByRole('button', {name: 'Wealth', exact: true})).toHaveAttribute('aria-pressed', 'true');
});

test('DV-102/DV-043e (P-DV-61): the card ⋯ opens the goal to edit or close; a closed card keeps a ⋯ with Reopen', async ({page}) => {
  await seedGoals(page, [goal('64', {name: 'Fictional bike'}), goal('65', {name: 'Fictional closed', status: 'closed'})], '/app/goals?filter=all');
  await page.getByRole('button', {name: 'Options for Fictional bike'}).click();
  // Session AO (DV-040g, deliberate): items are menuitems now
  await expect(page.getByRole('menuitem', {name: 'Edit details'})).toHaveAttribute('href', '/app/goals/tracked/64#edit-goal');
  // Session AO (DV-040g, deliberate): items are menuitems now
  await expect(page.getByRole('menuitem', {name: 'Close…'})).toHaveAttribute('href', '/app/goals/tracked/64#goal-status');
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: 'Options for Fictional closed'}).click();
  // Session AO (DV-040g, deliberate): items are menuitems now
  await expect(page.getByRole('menuitem', {name: 'Reopen…'})).toBeVisible();
});

test('BUG-019/DV-022a (P-DV-63): one fitting artwork per goal on Cards and the Vision board', async ({page}) => {
  await seedGoals(page, [goal('66', {name: 'Run a 10K', type: 'PROJECT', decimals: 0, target: '1', milestones: [{id: '1', title: 'Run 5 km', done: false}]})], '/app/goals');
  await expect(page.locator('[data-goal-key="private:66"] .scene-track')).toHaveCount(1);
  await page.goto('/app/goals?view=board');
  await expect(page.locator('.vision-tile .scene-track')).toHaveCount(1);
});

test('DV-019e-1/DV-040a (P-DV-59): a project\'s milestones move up and down', async ({page}) => {
  await seedGoals(page, [project('67', ['Plan', 'Build', 'Ship'])], '/app/goals/tracked/67');
  await page.locator('#milestones > summary').click();
  await page.getByRole('button', {name: 'Move Ship up'}).click();
  await expect.poll(async () => (await stored(page)).goals[0]!.milestones.map(m => m.title)).toEqual(['Plan', 'Ship', 'Build']);
});

test('DV-083a/DV-176/DV-183 (P-DV-38): an idea is the library template; its title is the goal name', async ({page}) => {
  await seedGoals(page, [], '/app/goals/new');
  await page.getByRole('button', {name: 'Start from the idea: Read 12 books'}).click();
  await expect(page.getByLabel('Goal name')).toHaveValue('Read 12 books');
  await expect(page.getByRole('radio', {name: 'Reach a number of something', exact: true})).toBeChecked();
  await expect(page.getByLabel('Target amount', {exact: true})).toHaveValue('12');
  await expect(page.getByRole('link', {name: /Browse all \d+ templates/})).toHaveAttribute('href', '/app/goals/templates');
});

test('DV-064 (P-DV-36): a draft brought back untouched asks nothing on the way out', async ({page}) => {
  await seedGoals(page, [], '/app/goals');
  await page.evaluate(() => sessionStorage.setItem('zigoals:draft:goal-wizard:v1', JSON.stringify({name: 'Fictional draft', type: 'VALUE', target: '100', date: '', notes: '', milestones: '', category: 'Custom', asset: ''})));
  await page.goto('/app/goals/new');
  await expect(page.getByLabel('Goal name')).toHaveValue('Fictional draft');
  let asked = false;
  page.on('dialog', dialog => { asked = true; void dialog.dismiss(); });
  await page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'Health', exact: true}).click();
  await expect(page).toHaveURL(/\/app\/health$/);
  expect(asked).toBe(false);
});
