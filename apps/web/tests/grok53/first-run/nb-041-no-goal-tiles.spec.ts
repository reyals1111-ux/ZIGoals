import {expect, test} from '@playwright/test';
import {emptyDevice, hydrated, open} from '../l3-helpers';

/**
 * NB-041 (P-NB-10; N-113, BUG-067, N-046): a Habits + Health setup that left Goals and Wealth off sees no "Your goals"
 * tile and no goal panels on Today. The PROTECTED hero and slogan are unchanged (owner decision R28/AF9). Bot: Incognito(2).
 */
for (const width of [1280, 340]) test(`NB-041: Habits + Health only → no goal tiles on Today at ${width} px`, async ({page}) => {
  await page.setViewportSize({width, height: 800});
  await emptyDevice(page, {welcomeSeen: false});
  await open(page, '/app/welcome');
  const flow = page.locator('main');
  await flow.getByRole('button', {name: 'Let’s begin', exact: true}).click();
  await flow.getByRole('checkbox', {name: /^Habits/}).check();
  await flow.getByRole('checkbox', {name: /^Health & food/}).check();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await flow.getByRole('checkbox', {name: /^Read more/}).check();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  for (const step of ['A few things to start with.', 'A quick look around.', 'Keep ZIGoals on your Home Screen.', 'Meet ZIGi.']) {
    await expect(flow.getByRole('heading', {level: 1, name: step})).toBeVisible();
    await flow.getByRole('button', {name: step === 'A quick look around.' ? 'Skip the tour' : 'Continue', exact: true}).click();
  }
  await flow.getByRole('button', {name: 'Finish setup', exact: true}).click();
  await page.waitForURL(/\/app(\/habits|\/health)?$/); await hydrated(page);
  await open(page, '/app');
  await expect(page.getByRole('region', {name: 'Your goals'})).toHaveCount(0);
  await expect(page.locator('.destination-panel')).toHaveCount(0);
  await expect(page.getByRole('article', {name: 'Focus: next goal step'})).toHaveCount(0);
});
