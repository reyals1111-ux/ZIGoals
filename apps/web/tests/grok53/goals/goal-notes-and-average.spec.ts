import {expect, test} from '@playwright/test';
import {goal, seedGoals} from './goal-fixtures';
import {AVERAGE_GOALS_KEY} from '../../../lib/average-goals/store';

// Session AL (lane L4): Denver DV-030 (P-DV-54): 2,000-character notes printed ~60 lines in the goal header at 1920 Light and
// pushed Remaining and Fund below the fold. DV-052a/b (P-DV-02, P-DV-10): an average goal took 25 h of sleep a night and
// "Remove this goal" deleted at once with no confirm or Undo.

test.describe('1920 Light', () => {
  test.use({viewport: {width: 1920, height: 1080}, colorScheme: 'light'});
  test('DV-030: long notes fold to four lines with "Show all notes"', async ({page}) => {
    await seedGoals(page, [goal('51', {name: 'Fictional notes goal', notes: 'Long note. '.repeat(180).slice(0, 2000)})], '/app/goals/tracked/51');
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    const notes = page.locator('.goal-notes-text');
    expect((await notes.boundingBox())!.height).toBeLessThan(140);
    await expect(page.getByTestId('tracked-progress').getByText('Remaining')).toBeInViewport();
    const toggle = page.getByRole('button', {name: 'Show all notes'});
    await toggle.click();
    await expect(page.getByRole('button', {name: 'Show less'})).toHaveAttribute('aria-expanded', 'true');
    expect((await notes.boundingBox())!.height).toBeGreaterThan(140);
  });
});

test.describe('average goals', () => {
  test.use({viewport: {width: 1280, height: 800}});
  test('DV-052a/b: 25 h of sleep is refused; Remove asks first and the one Undo brings the goal back', async ({page}) => {
    await seedGoals(page, [], '/app/goals/average/new?template=sleep-7h');
    await page.getByLabel('Target').fill('25');
    await page.getByRole('button', {name: 'Save goal', exact: true}).click();
    await expect(page.getByText(/Enter hours of sleep from 0 to 24 hours\.|at most 24/)).toBeVisible();
    await page.getByLabel('Target').fill('7.5');
    await page.getByRole('button', {name: 'Save goal', exact: true}).click();
    await expect(page).toHaveURL(/\/app\/goals\/average\//);
    await page.getByLabel('h a night').fill('30');
    await page.getByRole('button', {name: 'Save the day'}).click();
    await expect(page.locator('#average-entry-error')).toBeVisible();
    await page.getByRole('button', {name: 'Remove this goal'}).click();
    const ask = page.getByRole('alertdialog', {name: 'Remove this goal?'});
    await expect(ask).toContainText('You can undo this right after.');
    await ask.getByRole('button', {name: 'Remove', exact: true}).click();
    await expect(page).toHaveURL(/\/app\/goals$/);
    const toast = page.locator('.aa-toast').filter({hasText: 'removed.'});
    await toast.getByRole('button', {name: /Undo/}).click();
    await expect.poll(() => page.evaluate(key => (JSON.parse(localStorage.getItem(key) ?? '{"goals":[]}') as {goals: unknown[]}).goals.length, AVERAGE_GOALS_KEY)).toBe(1);
  });
});
