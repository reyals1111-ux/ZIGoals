import {expect, test} from '@playwright/test';
import {typeGoalName} from './goal-name';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';

// Session AH Part 3: DS7 (a second weight of the day is kept), DS9/A3 (Back closes a dialog first; the Goal wizard's
// draft survives a reload), DS8 (why Restore waits).
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });

test('DS7: a second weight on the same day is kept beside the first, by choice', async ({page}) => {
  await page.goto('/app/health'); await hydrated(page);
  await page.getByRole('button', {name: 'Weight', exact: true}).click();
  const weight = page.getByRole('form', {name: 'Weight entry'});
  await weight.getByLabel('Weight (kg)').fill('73');
  await weight.getByRole('button', {name: 'Save weight'}).click();
  const history = page.getByRole('table', {name: 'Weight history'});
  await expect(history).toContainText('73 kg');
  const again = page.getByRole('form', {name: 'Weight entry'});
  await expect(again.getByRole('button', {name: 'Keep both'})).toBeVisible();
  await again.getByLabel('Weight (kg)').fill('72.8');
  await again.getByRole('button', {name: 'Keep both'}).click();
  await expect(history).toContainText('72.8 kg');
  await expect(history).toContainText('73 kg');
  await expect(history.locator('tbody tr')).toHaveCount(2);
});

test('DS9: Back closes Quick add and stays on the page; closing it with × leaves history as it was', async ({page, isMobile}) => {
  await page.goto('/app/goals'); await page.goto('/app'); await hydrated(page);
  const trigger = page.locator(isMobile ? '.phone-topbar .quick-add-trigger' : '.today-hero .quick-add-trigger');
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/app$/);
  await trigger.click();
  await page.getByRole('button', {name: 'Close Quick add'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // × takes the dialog's own history entry back off; Back is pressed once that has happened (CI run 1210 raced it).
  await expect.poll(() => page.evaluate(() => (history.state as {__zigoalsLayer?: unknown} | null)?.__zigoalsLayer ?? null)).toBeNull();
  await page.goBack();
  await expect(page).toHaveURL(/\/app\/goals$/);
});

test('DS9: the Goal wizard\'s draft survives a reload, and "Start over" clears it', async ({page}) => {
  await page.goto('/app/goals/new'); await hydrated(page);
  await typeGoalName(page, 'Fictional draft plan');
  await page.getByLabel('Target amount', {exact: true}).fill('1500');
  page.once('dialog', d => void d.accept());
  await page.reload(); await hydrated(page);
  await expect(page.getByText('Your unfinished Goal is back, as you left it.')).toBeVisible();
  await expect(page.getByLabel('Goal name', {exact: true})).toHaveValue('Fictional draft plan');
  await expect(page.getByLabel('Target amount', {exact: true})).toHaveValue('1500');
  await page.getByRole('button', {name: 'Start over'}).click();
  await expect(page.getByLabel('Goal name', {exact: true})).toHaveValue('');
  page.once('dialog', d => void d.accept());
  await page.reload(); await hydrated(page);
  await expect(page.getByText('Your unfinished Goal is back, as you left it.')).toHaveCount(0);
});
