import {expect, test} from '@playwright/test';
import {offline, settle} from './p6-helpers';

/**
 * Session AV lane 2 (M-9, owner decision): the goal creator's first step has one main button, Continue (Create goal stays
 * beside it, secondary), and the name's length count shows only from 60 characters (no "0 / 80" on an empty name).
 */
test('step 1: Continue is the main button; the name count from 60 characters', async ({page}) => {
  await offline(page);
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(() => localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})));
  await page.goto('/app/goals/new'); await settle(page);
  const actions = page.locator('#goal-wizard-actions');
  await expect(actions.locator('button.primary')).toHaveCount(1);
  await expect(actions.locator('button.primary')).toHaveText('Continue →');
  await expect(actions.getByRole('button', {name: 'Create goal'})).toHaveClass(/secondary/);
  const name = page.getByLabel('Goal name', {exact: true});
  await name.focus();
  await expect(page.locator('.length-counter')).toHaveCount(0);
  await name.fill('A fictional goal');
  await expect(page.locator('.length-counter')).toHaveCount(0);
  await name.fill('A fictional goal with a long name that runs past sixty letters');
  await expect(page.locator('.length-counter')).toBeVisible();
});
