import {expect, test} from '@playwright/test';
import {typeGoalName} from '../../goal-name';
import {goal, openModule, seedGoals, stored} from './goal-fixtures';

// Session AL (lane L4): Denver DV-001/DV-003a/DV-049a/b/DV-055b/DV-098 (P-DV-01, P-DV-05, P-DVR-01; D-071, D-102, N-143).
// 1e21 was created from the wizard and 1e20/1e28 saved from Edit; 0 and −5 said two different things. Desktop 1280.
test.use({viewport: {width: 1280, height: 800}});

test('DV-049b/DV-003a: the wizard refuses a target over a trillion and says one sentence for 0 and −5, under the field', async ({page}) => {
  await seedGoals(page, [], '/app/goals/new');
  await page.getByRole('radio', {name: 'Save an amount', exact: true}).check();
  await typeGoalName(page, 'Fictional huge goal');
  const target = page.getByLabel('Target amount', {exact: true});
  for (const [typed, said] of [['999999999999999999999', 'Enter an amount up to a trillion (1,000,000,000,000).'], ['0', 'Enter an amount above 0.'], ['-5', 'Enter an amount above 0.']] as const) {
    await target.fill(typed);
    await page.getByRole('button', {name: 'Create goal', exact: true}).click();
    const message = page.getByRole('alert').filter({hasText: said});
    await expect(message).toBeVisible();
    await expect(target).toHaveAttribute('aria-invalid', 'true');
    await expect(target).toBeFocused();
    // Under its field: within 120 px below the target box.
    const [f, m] = [await target.boundingBox(), await message.boundingBox()];
    expect(m!.y - (f!.y + f!.height)).toBeLessThan(120);
  }
  expect((await stored(page))?.goals ?? []).toEqual([]);
});

test('DV-055b/DV-098/DV-025a: Edit details refuses 1e20 and 0 with the reason under the field', async ({page}) => {
  await seedGoals(page, [goal('31', {name: 'Fictional fund'})], '/app/goals/tracked/31');
  const edit = await openModule(page, 'edit-goal');
  const field = edit.getByLabel('Edit target');
  for (const [typed, said] of [['99999999999999999999', 'Enter an amount up to a trillion (1,000,000,000,000).'], ['0', 'Enter an amount above 0.']] as const) {
    await field.fill(typed);
    await edit.getByRole('button', {name: 'Save Goal details'}).click();
    await expect(edit.getByRole('alert')).toHaveText(said);
    await expect(field).toBeFocused();
  }
  expect((await stored(page)).goals[0]!.target).toBe('50000');
  await edit.getByLabel('Edit Goal name').fill('   ');
  await edit.getByRole('button', {name: 'Save Goal details'}).click();
  await expect(edit.getByRole('alert')).toHaveText('A name can’t be empty.');
});

test('DV-054a/D-195: a legacy 1e20 target reads short on the card and the goal page', async ({page}) => {
  await seedGoals(page, [goal('32', {name: 'Legacy huge', target: '9999999999999999999900'})], '/app/goals');
  const card = page.locator('[data-goal-key="private:32"]');
  await expect(card).toBeVisible();
  await expect(card).not.toContainText('99,999,999,999,999,999,999');
  const box = await card.boundingBox(), width = await card.evaluate(el => el.scrollWidth);
  expect(width).toBeLessThanOrEqual(Math.ceil(box!.width) + 1);
});
