import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';

// Session AH Part 12 (SE14): the optional screen lock. Fictional PIN only.
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });

test('SE14: off by default; a PIN hides a new tab; a wrong PIN says so; a forgotten PIN removes the lock after a wait, records untouched', async ({page, context}) => {
  await page.goto('/app/settings'); await hydrated(page);
  const card = page.locator('#device-lock');
  await expect(card).toContainText('off unless you turn it on');
  await card.getByLabel('PIN (4 to 8 digits)').fill('2468');
  await card.getByLabel('The same PIN again').fill('2468');
  await card.getByRole('button', {name: 'Turn the lock on'}).click();
  await expect(card.getByRole('status')).toContainText('The lock is on.');
  expect(await page.evaluate(() => localStorage.getItem('zigoals:device-lock:v1'))).not.toContain('2468');
  // A new tab asks for the PIN.
  const tab = await context.newPage();
  await offlineApi(tab);
  await tab.clock.install();
  await tab.goto('/app'); await hydrated(tab);
  const lock = tab.getByRole('dialog', {name: 'ZIGoals is locked on this device'});
  await expect(lock).toBeVisible();
  await lock.getByLabel('PIN').fill('1111');
  await lock.getByRole('button', {name: 'Unlock'}).click();
  await expect(lock.getByRole('status')).toHaveText('That PIN is not right. Try again.');
  // Forgot: the lock comes off after a short wait, and ZIGoals opens.
  await lock.getByRole('button', {name: 'Forgot the PIN?'}).click();
  await expect(lock.getByRole('button', {name: 'Remove the lock'})).toBeDisabled();
  await tab.clock.fastForward('01:05');
  await lock.getByRole('button', {name: 'Remove the lock'}).click();
  await expect(lock).toHaveCount(0);
  expect(await tab.evaluate(() => localStorage.getItem('zigoals:device-lock:v1'))).toBeNull();
  await expect(tab.locator('main h1').first()).toBeVisible();
});
